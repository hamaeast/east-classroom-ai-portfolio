import { Suspense } from 'react';
import lazyWithRecovery from '@/lib/lazyWithRecovery';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import AppShell from '@/components/east/AppShell';
import Skills from '@/pages/Skills';

// Lazy-loaded so the initial bundle only includes what's needed to sign in and load the first tab.
const Dashboard = lazyWithRecovery(() => import('@/pages/Dashboard'));
const Partners = lazyWithRecovery(() => import('@/pages/Partners'));
const Projects = lazyWithRecovery(() => import('@/pages/Projects'));
const ServiceHours = lazyWithRecovery(() => import('@/pages/ServiceHours'));
const CheckIns = lazyWithRecovery(() => import('@/pages/CheckIns'));
const Reports = lazyWithRecovery(() => import('@/pages/Reports'));
const StudentReport = lazyWithRecovery(() => import('@/pages/StudentReport'));
const ProjectPitch = lazyWithRecovery(() => import('@/pages/ProjectPitch'));
const MyProjects = lazyWithRecovery(() => import('@/pages/MyProjects'));
const ProjectSnapshot = lazyWithRecovery(() => import('@/pages/ProjectSnapshot'));
const Messages = lazyWithRecovery(() => import('@/pages/Messages'));
const ImportantLinks = lazyWithRecovery(() => import('@/pages/ImportantLinks'));
const StudentLearningSummary = lazyWithRecovery(() => import('@/pages/StudentLearningSummary'));
const Tasks = lazyWithRecovery(() => import('@/pages/Tasks'));
const ThemeSettings = lazyWithRecovery(() => import('@/pages/ThemeSettings'));
const Calendar = lazyWithRecovery(() => import('@/pages/Calendar'));
const Assignments = lazyWithRecovery(() => import('@/pages/Assignments'));
const Grades = lazyWithRecovery(() => import('@/pages/Grades'));
const Goals = lazyWithRecovery(() => import('@/pages/Goals'));
const AdminManagement = lazyWithRecovery(() => import('@/pages/AdminManagement'));
const FacilitationReview = lazyWithRecovery(() => import('@/pages/FacilitationReview'));
const FacilitationRecords = lazyWithRecovery(() => import('@/pages/FacilitationRecords'));
const PGPBuildingGoalReport = lazyWithRecovery(() => import('@/pages/PGPBuildingGoalReport'));
const UsageStats = lazyWithRecovery(() => import('@/pages/UsageStats'));

const PageLoading = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<Navigate to="/login" replace />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/service" element={<ServiceHours />} />
            <Route path="/check-ins" element={<CheckIns />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/student-report" element={<StudentReport />} />
            <Route path="/project-pitch" element={<ProjectPitch />} />
            <Route path="/my-projects" element={<MyProjects />} />
            <Route path="/project-snapshot/:id" element={<ProjectSnapshot />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/important-links" element={<ImportantLinks />} />
            <Route path="/learning-summary" element={<StudentLearningSummary />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/theme" element={<ThemeSettings />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/management" element={<AdminManagement />} />
            <Route path="/facilitation-review" element={<FacilitationReview />} />
            <Route path="/facilitation-records" element={<FacilitationRecords />} />
            <Route path="/pgp-building-goal-report" element={<PGPBuildingGoalReport />} />
            <Route path="/usage-stats" element={<UsageStats />} />
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App