import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { UserRole } from '../types/expense';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ROUTES } from './routeConfig';
import { getActiveEmployee, getActiveRole } from '../services/employeeService';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentRole, handleRoleChange } = useWorkspace();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const activeEmp = getActiveEmployee();
  const storedRole = getActiveRole();

  // Check current context role, or tab session stored role
  const effectiveRole = allowedRoles.includes(currentRole)
    ? currentRole
    : allowedRoles.includes(storedRole)
    ? storedRole
    : currentRole;

  const isAuthorized = allowedRoles.includes(effectiveRole);

  useEffect(() => {
    if (isAuthorized && currentRole !== effectiveRole) {
      handleRoleChange(effectiveRole);
    }
  }, [isAuthorized, currentRole, effectiveRole, handleRoleChange]);

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleReturnToAllowedPortal = () => {
    if (currentRole === 'employee') {
      navigate(ROUTES.EMPLOYEE.EXPENSES);
    } else {
      navigate(ROUTES.AUDITOR.REVIEW_QUEUE);
    }
  };

  const handleSignOutAndSwitch = async () => {
    await logout();
    navigate(ROUTES.AUTH);
  };

  return (
    <div
      className="flex h-[100dvh] w-full text-[#1A1C1D] overflow-hidden font-sans p-3 sm:p-5 md:p-6 bg-cover bg-center bg-no-repeat bg-[#F8F9FA] items-center justify-center transition-colors"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden transition-colors">
        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-600" />

        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-1 rounded-md inline-block mb-3">
          Access Restricted • Role Clearance
        </span>

        <h2 className="text-xl font-bold text-[#0F172A] mb-2 tracking-tight">
          Unauthorized Workspace Access
        </h2>

        <p className="text-[13px] text-[#64748B] mb-6 leading-relaxed">
          You are currently signed in as <strong className="text-[#0F172A]">{activeEmp.identity.name}</strong> (
          <span className="font-mono-code text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-xs font-semibold uppercase">
            {currentRole}
          </span>
          ). This portal requires verified <strong className="text-[#0F172A]">{allowedRoles.join(' / ')}</strong> credentials.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={handleReturnToAllowedPortal}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Return to {currentRole === 'employee' ? 'My Expenses Workspace' : 'Auditor Console'}</span>
          </button>

          <button
            onClick={handleSignOutAndSwitch}
            className="py-2 px-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            <LogOut className="w-4 h-4 text-[#64748B]" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

