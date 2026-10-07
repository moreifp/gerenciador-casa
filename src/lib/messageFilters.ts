import { spDate } from './dates';
import { messageStatus } from './messageStatus';

interface FilterableMessage {
  created_at: string;
  user_id: string;
  status: string;
  task_status?: string;
}

export function matchesMessageFilters(message: FilterableMessage, date: string, employee: string, status: string): boolean {
  return (date === 'all' || spDate(message.created_at) === date)
    && (employee === 'all' || message.user_id === employee)
    && (status === 'all' || messageStatus(message.status, message.task_status) === status);
}