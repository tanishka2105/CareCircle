import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { CreateProfilePage } from './pages/CreateProfilePage.jsx';
import { JoinCirclePage } from './pages/JoinCirclePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { CircleDirectoryPage } from './pages/CircleDirectoryPage.jsx';
import { MedicationsPage } from './pages/MedicationsPage.jsx';
import { AppointmentsPage } from './pages/AppointmentsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { NotesPage } from './pages/NotesPage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { ElderModePage } from './pages/ElderModePage.jsx';
import { PricingPage } from './pages/PricingPage.jsx';
import { InvitePage } from './pages/InvitePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Connecting to CareCircle...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <Navigate to="/login" replace />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/create"
        element={
          <PublicOnlyRoute>
            <CreateProfilePage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/join"
        element={
          <PublicOnlyRoute>
            <JoinCirclePage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      {/* Authenticated Workspace */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="medications" element={<MedicationsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="circle" element={<CircleDirectoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="elder" element={<ElderModePage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="invite" element={<InvitePage />} />
      </Route>

      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
