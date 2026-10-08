import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, RefreshCw, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { profileInitials } from '@/lib/initials';
import { messageStatus } from '@/lib/messageStatus';
import { HOUSE_TZ, spDate } from '@/lib/dates';
import { matchesMessageFilters } from '@/lib/messageFilters';
import { recurrenceLabel, type RecurrenceInfo } from '@/lib/recurrence';

const messageDate = new Intl.DateTimeFormat('pt-BR', { timeZone: HOUSE_TZ, day: '2-digit', month: '2-digit' });

interface WhatsAppMessage {
  id: string;
  task_id: string | null;
  user_id: string;
  phone: string;
  message: string;
  status: string;
  error: string | null;
  zapi_message_id: string | null;
  created_at: string;
  task_title?: string;
  employee_name?: string;
  employee_initials?: string;
  task_status?: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selected, setSelected] = useState<WhatsAppMessage | null>(null);
  const [selectedTask, setSelectedTask] = useState<RecurrenceInfo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestVersion = useRef(0);

  useEffect(() => {
    if (!selected?.task_id) { setSelectedTask(null); return; }
    let cancelled = false;
    supabase.from('tasks')
      .select('recurrence_type, recurrence_days, due_date')
      .eq('id', selected.task_id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setSelectedTask((data as RecurrenceInfo) ?? null); });
    return () => { cancelled = true; };
  }, [selected?.task_id]);

  const deleteMessage = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('whatsapp_messages').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      toast({ title: 'Não foi possível apagar', variant: 'destructive' });
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== id));
    setSelected(prev => (prev?.id === id ? null : prev));
  };

  const fetchMessages = useCallback(async (showLoading = true) => {
    const version = ++requestVersion.current;
    if (showLoading) setLoading(true);
    // Fetch messages - we need to join with tasks and profiles manually
    const { data: msgs, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !msgs) {
      if (version !== requestVersion.current) return;
      setLoading(false);
      return;
    }

    // Get unique task_ids and user_ids
    const taskIds = [...new Set(msgs.map(m => m.task_id).filter(Boolean))] as string[];
    const userIds = [...new Set(msgs.map(m => m.user_id))];

    const [tasksRes, profilesRes] = await Promise.all([
      taskIds.length > 0 ? supabase.from('tasks').select('id, title, status').in('id', taskIds) : { data: [] },
      userIds.length > 0 ? supabase.from('profiles').select('id, full_name, initials').in('id', userIds) : { data: [] },
    ]);

    const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t]));
    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

    const enriched = msgs.map(m => ({
      ...m,
      task_title: m.task_id ? (taskMap.get(m.task_id)?.title || 'Tarefa removida') : '—',
      task_status: m.task_id ? taskMap.get(m.task_id)?.status : undefined,
      employee_name: profileMap.get(m.user_id)?.full_name || 'Desconhecido',
      employee_initials: profileMap.get(m.user_id)?.initials || profileInitials(profileMap.get(m.user_id)?.full_name),
    }));

    if (version !== requestVersion.current) return;
    setMessages(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchMessages();
    const refresh = () => { void fetchMessages(false); };
    const channel = supabase
      .channel('admin-whatsapp-messages-' + crypto.randomUUID())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      requestVersion.current += 1;
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  const filtered = messages.filter(m => matchesMessageFilters(m, dateFilter, employeeFilter, statusFilter));
  const dates = [...new Set(messages.map(m => spDate(m.created_at)))].sort().reverse();
  const employees = [...new Map(messages.map(m => [m.user_id, { id: m.user_id, name: m.employee_name || 'Desconhecido', initials: m.employee_initials }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const sentCount = messages.filter(m => m.status === 'sent').length;
  const failedCount = messages.filter(m => m.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[26px] font-bold font-display flex items-center gap-2 min-w-0">
          <MessageSquare className="h-6 w-6 text-primary" />
          Mensagens WhatsApp
        </h1>
        <Button variant="outline" size="icon" onClick={() => void fetchMessages()} disabled={loading} aria-label="Atualizar" title="Atualizar">
          <RefreshCw className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[32px] font-bold">{messages.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[32px] font-bold">{sentCount}</p>
          <p className="text-sm text-muted-foreground">Enviadas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[32px] font-bold">{failedCount}</p>
          <p className="text-sm text-muted-foreground">Falhas</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2 min-w-0">
          <label htmlFor="message-date" className="text-[16px] font-bold">Data</label>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger id="message-date" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as datas</SelectItem>
              {dates.map(date => <SelectItem key={date} value={date}>{date.split('-').reverse().join('/')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 min-w-0">
          <label htmlFor="message-employee" className="text-[16px] font-bold">Funcionário</label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger id="message-employee" className="w-full [&>span]:text-left [&>span]:whitespace-normal"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {employees.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.initials} — {employee.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 min-w-0">
        <label htmlFor="message-status" className="text-[16px] font-bold">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="message-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviadas</SelectItem>
            <SelectItem value="completed">Feitas</SelectItem>
            <SelectItem value="queued">Agendadas</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table className="table-fixed text-[16px] [&_th]:px-2 [&_td]:px-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[58px] text-[14px]">Data</TableHead>
              <TableHead className="w-[56px] text-[14px]" aria-label="Funcionário">Quem</TableHead>
              <TableHead>Tarefa</TableHead>
              <TableHead className="w-[82px] text-[14px]">Status</TableHead>
              <TableHead className="w-[64px]" aria-label="Apagar" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((msg) => (
                <TableRow key={msg.id} className="cursor-pointer" onClick={() => setSelected(msg)}>
                  <TableCell className="text-[14px] whitespace-nowrap">
                    {messageDate.format(new Date(msg.created_at))}
                  </TableCell>
                  <TableCell>
                    <span className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-control-selected text-control-selected-foreground text-[16px] font-bold" title={msg.employee_name} aria-label={msg.employee_name}>
                      {msg.employee_initials}
                    </span>
                  </TableCell>
                  <TableCell className="break-words [overflow-wrap:anywhere] font-medium">{msg.task_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[14px] px-1 py-1 whitespace-nowrap ${messageStatus(msg.status, msg.task_status) === 'completed' ? 'bg-status-completed text-primary-foreground border-status-completed' : 'bg-control text-control-foreground border-control-border'}`}>
                      {messageStatus(msg.status, msg.task_status) === 'completed' ? 'Feita' : msg.status === 'sent' ? 'Enviada' : msg.status === 'queued' ? 'Agendada' : 'Falha'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Apagar mensagem ${msg.task_title}`}
                      disabled={deletingId === msg.id}
                      onClick={() => void deleteMessage(msg.id)}
                    >
                      <Trash2 className="h-6 w-6 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[22px]">{selected?.task_title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-[18px]">
              <p className="text-[16px] text-muted-foreground">
                {messageDate.format(new Date(selected.created_at))} · {selected.employee_name} · {selected.phone}
              </p>
              <p className="whitespace-pre-wrap break-words rounded-lg border border-control-border bg-control p-4 text-control-foreground">
                {selected.message.split('\n').filter(line => !/https?:\/\//.test(line)).join('\n').trim() || selected.message}
              </p>
              {selected.task_id && selectedTask && (
                <>
                  <p className="flex items-center gap-2 text-[16px] font-semibold">
                    <span aria-hidden>🔁</span> {recurrenceLabel(selectedTask)}
                  </p>
                  <Button
                    className="w-full h-14 text-lg font-bold"
                    onClick={() => { setSelected(null); navigate(`/tasks?open=${selected.task_id}`); }}
                  >
                    <ExternalLink className="h-6 w-6" /> Abrir tarefa
                  </Button>
                </>
              )}
              {selected.error && (
                <p className="text-[16px] text-destructive">Erro: {selected.error}</p>
              )}
              <Button
                variant="outline"
                className="w-full text-destructive"
                disabled={deletingId === selected.id}
                onClick={() => void deleteMessage(selected.id)}
              >
                <Trash2 className="h-6 w-6" />
                Apagar mensagem
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
