import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROUTES, getDefaultPortalRoute } from './routeConfig';
import { RoleGuard } from './RoleGuard';
import { AppRedirect } from './AppRedirect';
import { LandingPage } from '../components/LandingPage';
import { AuthPage } from '../components/AuthPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { EmployeeLayout } from '../layouts/EmployeeLayout';
import { AuditorLayout } from '../layouts/AuditorLayout';
import { getActiveRole } from '../services/employeeService';

// Employee Pages
import { MyExpensesPage } from '../pages/employee/MyExpensesPage';
import { SubmitExpensePage } from '../pages/employee/SubmitExpensePage';
import { MyCapsPage } from '../pages/employee/MyCapsPage';
import { TripsPage } from '../pages/employee/TripsPage';

// Auditor Pages
import { ReviewQueuePage } from '../pages/auditor/ReviewQueuePage';
import { AllClaimsPage } from '../pages/auditor/AllClaimsPage';
import { PolicyStudioPage } from '../pages/auditor/PolicyStudioPage';
import { EmployeesPage } from '../pages/auditor/EmployeesPage';
import { ReportsPage } from '../pages/auditor/ReportsPage';
import { SimulatorPage } from '../pages/auditor/SimulatorPage';
import { ExportPage } from '../pages/auditor/ExportPage';
import { ScorecardPage } from '../pages/auditor/ScorecardPage';

// Manage Pages
import { DashboardPage } from '../pages/manage/DashboardPage';
import { PurchasesPage } from '../pages/manage/PurchasesPage';
import { WarrantiesPage } from '../pages/manage/WarrantiesPage';
import { ReturnsPage } from '../pages/manage/ReturnsPage';
import { VaultPage } from '../pages/manage/VaultPage';
import { AnalyticsPage } from '../pages/manage/AnalyticsPage';
import { TimelinePage } from '../pages/manage/TimelinePage';
import { InvoicesPage } from '../pages/manage/InvoicesPage';
import { CreateInvoicePage } from '../pages/manage/CreateInvoicePage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  const { loading } = useAuth();
  const { currentRole } = useWorkspace();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0F172A] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="font-mono-code text-xs text-slate-400">Authenticating Keepr Session...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Marketing & Auth */}
      <Route
        path={ROUTES.HOME}
        element={
          <LandingPage
            onNavigateToAuth={() => navigate(ROUTES.AUTH)}
            onNavigateToApp={() => navigate(getDefaultPortalRoute(currentRole))}
          />
        }
      />
      <Route
        path={ROUTES.AUTH}
        element={
          <AuthPage
            onBackToLanding={() => navigate(ROUTES.HOME)}
            onLoginSuccess={() => navigate(getDefaultPortalRoute(getActiveRole()))}
          />
        }
      />

      {/* Legacy /app route fallback with smart role-based routing */}
      <Route path={ROUTES.APP_LEGACY} element={<AppRedirect />} />
      <Route path="/app/*" element={<AppRedirect />} />

      {/* Employee Portal */}
      <Route
        path={ROUTES.EMPLOYEE.ROOT}
        element={
          <RoleGuard allowedRoles={['employee', 'admin']}>
            <EmployeeLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to={ROUTES.EMPLOYEE.EXPENSES} replace />} />
        <Route path="expenses" element={<MyExpensesPage />} />
        <Route path="submit" element={<SubmitExpensePage />} />
        <Route path="allowances" element={<MyCapsPage />} />
        <Route path="caps" element={<Navigate to={ROUTES.EMPLOYEE.ALLOWANCES} replace />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Auditor & Finance Portal */}
      <Route
        path={ROUTES.AUDITOR.ROOT}
        element={
          <RoleGuard allowedRoles={['finance', 'admin']}>
            <AuditorLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to={ROUTES.AUDITOR.REVIEW_QUEUE} replace />} />
        <Route path="review-queue" element={<ReviewQueuePage />} />
        <Route path="all-expenses" element={<AllClaimsPage />} />
        <Route path="claims" element={<Navigate to={ROUTES.AUDITOR.ALL_EXPENSES} replace />} />
        <Route path="policies" element={<PolicyStudioPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="exports" element={<ExportPage />} />
        <Route path="scorecard" element={<ScorecardPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Manage Tools (Personal asset vault, warranties, invoices) */}
        <Route path="manage/dashboard" element={<DashboardPage />} />
        <Route path="manage/purchases" element={<PurchasesPage />} />
        <Route path="manage/warranties" element={<WarrantiesPage />} />
        <Route path="manage/returns" element={<ReturnsPage />} />
        <Route path="manage/vault" element={<VaultPage />} />
        <Route path="manage/analytics" element={<AnalyticsPage />} />
        <Route path="manage/timeline" element={<TimelinePage />} />
        <Route path="manage/invoices" element={<InvoicesPage />} />
        <Route path="manage/invoices/new" element={<CreateInvoicePage />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
