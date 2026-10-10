-- Tarefa repetitiva "apagada" da tela: some até a próxima repetição, sem perder as próximas nem o histórico.
alter table public.tasks add column if not exists cleared_at timestamptz;
