import { adminClient, corsHeaders, json, sendWhatsApp, spToday } from "../_shared/whatsapp.ts";
import { assignmentMessage } from '../_shared/assignment-message.ts';

function lastDayOfMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
}

export function shouldReopen(
  t: { recurrence_type: string; recurrence_days: number[] | null; due_date: string | null },
  today: string,
  refDay?: number | null,
): boolean {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (t.recurrence_type === "daily") return true;
  if (t.recurrence_type === "weekly" || t.recurrence_type === "custom") {
    const days = t.recurrence_days || [];
    if (days.length) return days.includes(weekday);
    if (!t.due_date) return false;
    const [dy, dm, dd] = t.due_date.split("-").map(Number);
    return new Date(Date.UTC(dy, dm - 1, dd)).getUTCDay() === weekday;
  }
  if (t.recurrence_type === "monthly") {
    const target = refDay ?? (t.due_date ? Number(t.due_date.split("-")[2]) : null);
    if (!target) return false;
    return d === Math.min(target, lastDayOfMonth(y, m));
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const db = adminClient();
    const today = spToday();

    const { data: tasks, error } = await db.from("tasks")
      .select("id, recurrence_type, recurrence_days, due_date")
      .eq("type", "routine").eq("is_archived", false).eq("status", "completed")
      .neq("recurrence_type", "none");
    if (error) throw error;

    let reopened = 0;
    for (const t of tasks || []) {
      // Idempotency: already on today's (or a future) occurrence → skip
      if (t.due_date && t.due_date >= today) continue;

      let refDay: number | null = null;
      if (t.recurrence_type === "monthly") {
        // Use the first recorded occurrence's day so 31 doesn't drift to 30/28
        const { data: first } = await db.from("task_completions").select("due_date")
          .eq("task_id", t.id).not("due_date", "is", null).order("completed_at", { ascending: true }).limit(1).maybeSingle();
        if (first?.due_date) refDay = Number(first.due_date.split("-")[2]);
      }
      if (!shouldReopen(t, today, refDay)) continue;

      const { error: upErr, count } = await db.from("tasks")
        .update({ status: "pending", due_date: today }, { count: "exact" })
        .eq("id", t.id).eq("status", "completed");
      if (!upErr && count) {
        reopened += count;
        try {
          const [{ data: task }, { data: assignees }] = await Promise.all([
            db.from('tasks').select('title, audio_url, image_urls, created_by').eq('id', t.id).maybeSingle(),
            db.from('task_assignees').select('user_id').eq('task_id', t.id),
          ]);
          if (task && assignees?.length) {
            const [{ data: sender }, { data: people }] = await Promise.all([
              db.from('profiles').select('full_name').eq('id', task.created_by).maybeSingle(),
              db.from('profiles').select('id, phone').in('id', assignees.map(a => a.user_id)),
            ]);
            for (const p of people ?? []) await sendWhatsApp(db, {
              phone: p.phone, user_id: p.id, task_id: t.id, kind: 'task_assigned', ref_id: `${t.id}:${today}`,
              message: assignmentMessage(task.title, today, sender?.full_name ?? 'Admin', today), audio_url: task.audio_url, image_url: task.image_urls?.[0] ?? null,
            });
          }
        } catch (notifyError) { console.error('Recurring task WhatsApp failed:', notifyError); }
      }
    }

    console.log(`reopen-recurring-tasks ${today}: reopened ${reopened} of ${tasks?.length ?? 0} candidates`);
    return json({ today, reopened });
  } catch (e) {
    console.error("reopen-recurring-tasks error", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
