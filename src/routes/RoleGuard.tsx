import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { UserRole } from '../types/expense';
import { useWorkspace } from '../context/WorkspaceContext';
import { ROUTES } from './routeConfig';
import { DEMO_EMPLOYEES, setActiveEmployee } from '../services/employeeService';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentRole, handleRoleChange } = useWorkspace();
  const navigate = useNavigate();

  const isAuthorized = allowedRoles.includes(currentRole);

  if (isAuthorized) {
    return <>{children}</>;
  }

  const handleSwitchToFinance = () => {
    const fin = DEMO_EMPLOYEES.find((e) => e.role === 'finance');
    if (fin) setActiveEmployee(fin.id);
    handleRoleChange('finance');
  };

  const handleReturnToEmployee = () => {
    navigate(ROUTES.EMPLOYEE.EXPENSES);
  };

  return (
    <div
      className="flex h-[100dvh] w-full text-[#1A1C1D] overflow-hidden font-sans p-3 sm:p-5 md:p-6 bg-cover bg-center bg-no-repeat items-center justify-center"
      style={{ backgroundImage: "url('/bg.jpg')" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />

        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="font-mono-code text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-md inline-block mb-3">
          Access Restricted • Role Guard
        </span>

        <h2 className="text-xl font-bold text-[#0F172A] mb-2 tracking-tight">
          Auditor Portal Clearance Required
        </h2>

        <p className="text-[13px] text-[#64748B] mb-6 leading-relaxed">
          The corporate review queue, policy editor, and audit logs are restricted to{' '}
          <strong className="text-[#0F172A] font-semibold">Finance & Audit</strong> officers.
          Your active profile is currently set to{' '}
          <span className="font-mono-code text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-xs font-semibold">
            {currentRole}
          </span>
          .
        </p>

        <div className="space-y-2.5">
          <button
            onClick={handleSwitchToFinance}
            className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-[13px] font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Switch to Finance Officer (Demo Mode)</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70" />
          </button>

          <button
            onClick={handleReturnToEmployee}
            className="w-full py-2.5 px-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] rounded-xl text-[13px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#64748B]" />
            <span>Return to Employee Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
