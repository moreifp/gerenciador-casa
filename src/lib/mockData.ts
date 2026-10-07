export type UserRole = 'admin' | 'employee';

export interface Employee {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  phone: string;
  address: string;
  admissionDate: string;
  bankDetails: { bank: string; agency: string; account: string; pix?: string };
  documents: { cpf: string; rg: string };
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskProof {
  photoUrl?: string;
  comment?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  description: string;
  title: string;
  assignedTo: string;
  assigneeIds: string[];
  isShared: boolean;
  type: 'routine' | 'one_off';
  dueDate: string;
  status: TaskStatus;
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  proof?: TaskProof;
  response?: string;
  createdAt: string;
}

export const EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Maria Silva',
    role: 'Faxineira',
    photoUrl: '',
    phone: '(11) 98765-4321',
    address: 'Rua das Flores, 123 - São Paulo',
    admissionDate: '2023-03-15',
    bankDetails: { bank: 'Nubank', agency: '0001', account: '123456-7', pix: 'maria@email.com' },
    documents: { cpf: '123.456.789-00', rg: '12.345.678-9' },
  },
  {
    id: 'emp-2',
    name: 'João Santos',
    role: 'Motorista',
    photoUrl: '',
    phone: '(11) 91234-5678',
    address: 'Av. Paulista, 456 - São Paulo',
    admissionDate: '2022-08-01',
    bankDetails: { bank: 'Bradesco', agency: '1234', account: '654321-0' },
    documents: { cpf: '987.654.321-00', rg: '98.765.432-1' },
  },
  {
    id: 'emp-3',
    name: 'Ana Oliveira',
    role: 'Babá',
    photoUrl: '',
    phone: '(11) 99876-5432',
    address: 'Rua Augusta, 789 - São Paulo',
    admissionDate: '2024-01-10',
    bankDetails: { bank: 'Itaú', agency: '5678', account: '111222-3', pix: '99876-5432' },
    documents: { cpf: '456.789.123-00', rg: '45.678.912-3' },
  },
];

const today = new Date().toISOString().split('T')[0];

export const TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Limpar a cozinha',
    description: 'Lavar louça, limpar fogão e bancadas, varrer e passar pano no chão.',
    assignedTo: 'emp-1',
    assigneeIds: ['emp-1'],
    isShared: false,
    type: 'routine',
    dueDate: today,
    status: 'pending',
    recurrenceType: 'daily',
    recurrenceDays: [],
    createdAt: '2025-12-01',
  },
  {
    id: 'task-2',
    title: 'Levar crianças à escola',
    description: 'Buscar as crianças às 7h e deixar no colégio até 7h30.',
    assignedTo: 'emp-2',
    assigneeIds: ['emp-2'],
    isShared: false,
    type: 'routine',
    dueDate: today,
    status: 'in_progress',
    recurrenceType: 'weekly',
    recurrenceDays: [1, 2, 3, 4, 5],
    createdAt: '2025-12-01',
  },
  {
    id: 'task-3',
    title: 'Dar banho no bebê',
    description: 'Banho completo com sabonete neutro e hidratação.',
    assignedTo: 'emp-3',
    assigneeIds: ['emp-3'],
    isShared: false,
    type: 'routine',
    dueDate: today,
    status: 'completed',
    recurrenceType: 'daily',
    recurrenceDays: [],
    proof: {
      photoUrl: '/placeholder.svg',
      comment: 'Banho feito às 15h, tudo tranquilo!',
      completedAt: new Date().toISOString(),
    },
    response: 'Ótimo trabalho, Ana!',
    createdAt: '2025-12-01',
  },
  {
    id: 'task-4',
    title: 'Organizar despensa',
    description: 'Reorganizar prateleiras, verificar validade dos produtos e fazer lista de compras.',
    assignedTo: 'emp-1',
    assigneeIds: ['emp-1'],
    isShared: false,
    type: 'one_off',
    dueDate: today,
    status: 'blocked',
    recurrenceType: 'none',
    recurrenceDays: [],
    proof: {
      comment: 'Porta da despensa está travada, preciso da chave.',
    },
    createdAt: '2025-12-01',
  },
  {
    id: 'task-5',
    title: 'Lavar os carros',
    description: 'Lavagem externa e interna dos dois veículos da garagem.',
    assignedTo: 'emp-2',
    assigneeIds: ['emp-1', 'emp-2'],
    isShared: true,
    type: 'one_off',
    dueDate: today,
    status: 'pending',
    recurrenceType: 'none',
    recurrenceDays: [],
    createdAt: '2025-12-01',
  },
  {
    id: 'task-6',
    title: 'Limpar piscina',
    description: 'Aspirar fundo, limpar bordas e verificar nível de cloro.',
    assignedTo: 'emp-1',
    assigneeIds: ['emp-1'],
    isShared: false,
    type: 'routine',
    dueDate: today,
    status: 'pending',
    recurrenceType: 'custom',
    recurrenceDays: [1, 4],
    createdAt: '2025-12-01',
  },
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'Sem recorrência',
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Personalizada',
};

export const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
