import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROUTES, getDefaultPortalRoute } from './routeConfig';
import { RoleGuard } from './RoleGuard';
import { AppRedirect } from './AppRedirect';
import { EmployeeLayout } from '../layouts/EmployeeLayout';
import { AuditorLayout } from '../layouts/AuditorLayout';
import { getActiveRole } from '../services/employeeService';

// Lazy-loaded Public Pages
const LandingPage = React.lazy(() => import('../components/LandingPage').then((m) => ({ default: m.LandingPage })));
const AuthPage = React.lazy(() => import('../components/AuthPage').then((m) => ({ default: m.AuthPage })));
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Lazy-loaded Employee Pages
const MyExpensesPage = React.lazy(() => import('../pages/employee/MyExpensesPage').then((m) => ({ default: m.MyExpensesPage })));
const SubmitExpensePage = React.lazy(() => import('../pages/employee/SubmitExpensePage').then((m) => ({ default: m.SubmitExpensePage })));
const MyCapsPage = React.lazy(() => import('../pages/employee/MyCapsPage').then((m) => ({ default: m.MyCapsPage })));
const EmployeePoliciesPage = React.lazy(() => import('../pages/employee/EmployeePoliciesPage').then((m) => ({ default: m.EmployeePoliciesPage })));
const TripsPage = React.lazy(() => import('../pages/employee/TripsPage').then((m) => ({ default: m.TripsPage })));

// Lazy-loaded Auditor Pages
const ReviewQueuePage = React.lazy(() => import('../pages/auditor/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage })));
const AllClaimsPage = React.lazy(() => import('../pages/auditor/AllClaimsPage').then((m) => ({ default: m.AllClaimsPage })));
const PolicyStudioPage = React.lazy(() => import('../pages/auditor/PolicyStudioPage').then((m) => ({ default: m.PolicyStudioPage })));
const EmployeesPage = React.lazy(() => import('../pages/auditor/EmployeesPage').then((m) => ({ default: m.EmployeesPage })));
const ReportsPage = React.lazy(() => import('../pages/auditor/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SimulatorPage = React.lazy(() => import('../pages/auditor/SimulatorPage').then((m) => ({ default: m.SimulatorPage })));
const ExportPage = React.lazy(() => import('../pages/auditor/ExportPage').then((m) => ({ default: m.ExportPage })));
const ScorecardPage = React.lazy(() => import('../pages/auditor/ScorecardPage').then((m) => ({ default: m.ScorecardPage })));

// Lazy-loaded Manage Pages
const DashboardPage = React.lazy(() => import('../pages/manage/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PurchasesPage = React.lazy(() => import('../pages/manage/PurchasesPage').then((m) => ({ default: m.PurchasesPage })));
const VaultPage = React.lazy(() => import('../pages/manage/VaultPage').then((m) => ({ default: m.VaultPage })));
const AnalyticsPage = React.lazy(() => import('../pages/manage/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const TimelinePage = React.lazy(() => import('../pages/manage/TimelinePage').then((m) => ({ default: m.TimelinePage })));
const InvoicesPage = React.lazy(() => import('../pages/manage/InvoicesPage').then((m) => ({ default: m.InvoicesPage })));
const CreateInvoicePage = React.lazy(() => import('../pages/manage/CreateInvoicePage').then((m) => ({ default: m.CreateInvoicePage })));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex w-full h-64 items-center justify-center">
    <div className="flex flex-col items-center gap-2.5">
      <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
      <span className="font-mono-code text-[11px] text-slate-400">Loading module...</span>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  const { loading } = useAuth();
  const { currentRole } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  // Public marketing & auth pages should load immediately with zero latency
  const isPublicRoute =
    location.pathname === '/' ||
    location.pathname === ROUTES.HOME ||
    location.pathname === ROUTES.AUTH;

  if (loading && !isPublicRoute) {
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
    <React.Suspense fallback={<RouteLoadingFallback />}>
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
          <Route path="policies" element={<EmployeePoliciesPage />} />
          <Route path="policy" element={<Navigate to={ROUTES.EMPLOYEE.POLICIES} replace />} />
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

          {/* Manage Tools (Invoices, vault, analytics) */}
          <Route path="manage/dashboard" element={<DashboardPage />} />
          <Route path="manage/purchases" element={<PurchasesPage />} />
          <Route path="manage/warranties" element={<Navigate to={ROUTES.AUDITOR.REVIEW_QUEUE} replace />} />
          <Route path="manage/returns" element={<Navigate to={ROUTES.AUDITOR.REVIEW_QUEUE} replace />} />
          <Route path="manage/vault" element={<VaultPage />} />
          <Route path="manage/analytics" element={<AnalyticsPage />} />
          <Route path="manage/timeline" element={<TimelinePage />} />
          <Route path="manage/invoices" element={<InvoicesPage />} />
          <Route path="manage/invoices/new" element={<CreateInvoicePage />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </React.Suspense>
  );
};
