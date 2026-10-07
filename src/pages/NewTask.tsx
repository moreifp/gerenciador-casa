import TaskForm from '@/components/TaskForm';
import { useApp } from '@/lib/context';
import { Navigate } from 'react-router-dom';

export default function NewTask() {
  const { role } = useApp();
  return role === 'admin' ? <TaskForm /> : <Navigate to="/" replace />;
}
