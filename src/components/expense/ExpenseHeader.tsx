import React from 'react';
import { Building2, User, ShieldCheck } from 'lucide-react';
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
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
      {/* Org and Policy breadcrumb */}
      <div className="flex items-center gap-2.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-slate-900">
          <Building2 className="w-3.5 h-3.5 text-slate-700" />
          <span>JP Morgan</span>
        </div>
        <span className="text-slate-300">/</span>
        <span className="font-mono-code text-[11px] text-slate-600">
          Policy v{policy.versionNumber}
        </span>
        <span className="text-slate-300">•</span>
        <span className="font-mono-code text-[11px] text-slate-500">
          {policy.settings.baseCurrency}
        </span>
      </div>

      {/* Right Controls: Authenticated Identity */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2.5 bg-slate-50/80 border border-slate-200/70 rounded-full pl-1.5 pr-3 py-1">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
              isAuditor ? 'bg-slate-900' : 'bg-slate-700'
            }`}
          >
            {isAuditor ? (
              <ShieldCheck className="w-3 h-3 text-white" />
            ) : (
              <User className="w-3 h-3 text-white" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-900">
              {activeEmp.identity.name}
            </span>
            <span className="text-slate-400 font-mono-code text-[11px]">
              {activeEmp.department}
            </span>
          </div>
          <span
            className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded font-medium ${
              isAuditor
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
            }`}
          >
            {isAuditor ? 'Auditor' : 'Employee'}
          </span>
        </div>
      </div>
    </header>
  );
};
