import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import BiometricLock from "@/components/BiometricLock";
import { isBiometricEnabled } from "@/lib/biometric";
import { AppProvider } from "@/lib/context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import NewTask from "@/pages/NewTask";
import EditTask from "@/pages/EditTask";
import Employees from "@/pages/Employees";
import Messages from "@/pages/Messages";
import Auth from "@/pages/Auth";
import Install from "@/pages/Install";
import Profile from "@/pages/Profile";
import EmployeeDetail from "@/pages/EmployeeDetail";
import ArchivedTasks from "@/pages/ArchivedTasks";
import Expenses from "@/pages/Expenses";
import NewExpense from "@/pages/NewExpense";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const BiometricGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(false);

  if (loading) return null;
  if (user && isBiometricEnabled() && !unlocked) {
    return <BiometricLock onUnlock={() => setUnlocked(true)} />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <BiometricGate>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/tasks/new" element={<NewTask />} />
                <Route path="/tasks/:id/edit" element={<EditTask />} />
                <Route path="/tasks/archived" element={<ArchivedTasks />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/expenses/new" element={<NewExpense />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BiometricGate>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
