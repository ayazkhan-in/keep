import React from 'react';
import {
  Shield,
  Building2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { getActiveEmployee } from '../../services/employeeService';
import { getActivePolicy } from '../../services/policyService';
import { UserRole } from '../../types/expense';

interface ExpenseHeaderProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({
  currentRole = 'employee',
}) => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();

  const isAuditor = currentRole === 'finance' || currentRole === 'admin';

  return (
    <header className="bg-white border-b border-[#E2E8F0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
      {/* Org and Policy Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1">
          <Building2 className="w-3.5 h-3.5 text-[#0F172A]" />
          <span className="text-[12px] font-semibold text-[#0F172A]">Acme Enterprise</span>
          <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
            {policy.settings.baseCurrency} Base
          </span>
          <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
            Policy v{policy.versionNumber}
          </span>
        </div>

        {/* Workspace Mode Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#64748B]">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-[#334155]">
            {isAuditor
              ? 'Corporate Audit & Finance Console'
              : 'Employee Self-Service Portal'}
          </span>
        </div>
      </div>

      {/* Right Controls: Authenticated Identity & Real Clearance Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 shadow-2xs">
          <div className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-[10px] font-bold ${
            isAuditor ? 'bg-indigo-600' : 'bg-slate-800'
          }`}>
            {isAuditor ? (
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            ) : (
              <User className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[12px] font-semibold text-[#0F172A] leading-tight">
              {activeEmp.identity.name}
            </span>
            <span className="text-[10px] text-[#64748B] font-mono-code leading-tight">
              {activeEmp.department} • {activeEmp.grade}
            </span>
          </div>
          <span
            className={`ml-1 text-[10px] font-mono-code px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${
              isAuditor
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isAuditor ? 'Auditor' : 'Employee'}
          </span>
        </div>
      </div>
    </header>
  );
};
