import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Messages from './Messages';

const realtime = vi.hoisted(() => ({
  taskStatus: 'pending',
  handlers: new Map<string, () => void>(),
  removeChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: async () => ({ data: [{ id: 'message-1', task_id: 'task-1', user_id: 'employee-1', created_at: '2026-10-05T12:00:00Z', status: 'sent' }] }),
        in: async () => ({ data: table === 'tasks'
          ? [{ id: 'task-1', title: 'Tarefa de teste', status: realtime.taskStatus }]
          : [{ id: 'employee-1', full_name: 'Fausto Teste', initials: 'FT' }] }),
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
    channel: () => {
      const channel = {
        on: (_event: string, config: { table: string }, handler: () => void) => {
          realtime.handlers.set(config.table, handler);
          return channel;
        },
        subscribe: (handler: (status: string) => void) => { handler('SUBSCRIBED'); return channel; },
      };
      return channel;
    },
    removeChannel: realtime.removeChannel,
  },
}));

afterEach(() => {
  cleanup();
  realtime.handlers.clear();
  realtime.taskStatus = 'pending';
  vi.clearAllMocks();
});

it('updates the message from sent to completed after a task event, without reloading', async () => {
  const view = render(<MemoryRouter><Messages /></MemoryRouter>);
  await screen.findByText('Enviada');
  realtime.taskStatus = 'completed';
  const onTaskChange = realtime.handlers.get('tasks');
  expect(onTaskChange).toBeDefined();
  onTaskChange?.();
  await screen.findByText('Feita');
  await waitFor(() => expect(screen.queryByText('Enviada')).not.toBeInTheDocument());
  view.unmount();
  expect(realtime.removeChannel).toHaveBeenCalledTimes(1);
});