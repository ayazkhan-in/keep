import React from 'react';
import {
  Shield,
  Users,
  Building2,
} from 'lucide-react';
import { DEMO_EMPLOYEES, getActiveEmployee, setActiveEmployee } from '../../services/employeeService';
import { getActivePolicy } from '../../services/policyService';
import { UserRole } from '../../types/expense';

interface ExpenseHeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const ExpenseHeader: React.FC<ExpenseHeaderProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();

  const handleEmployeeSelect = (empId: string) => {
    setActiveEmployee(empId);
    const emp = DEMO_EMPLOYEES.find((e) => e.id === empId);
    if (emp) {
      onRoleChange(emp.role);
    }
  };

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
          <span className="font-medium text-[#334155]">Corporate Expense Auditor</span>
        </div>
      </div>

      {/* Right Controls: Role Switcher */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#475569] px-2 flex items-center gap-1">
            <Users className="w-3 h-3 text-[#64748B]" />
            Role:
          </span>
          <button
            onClick={() => {
              const emp = DEMO_EMPLOYEES.find((e) => e.role === 'employee');
              if (emp) handleEmployeeSelect(emp.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentRole === 'employee'
                ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Employee ({activeEmp.identity.name.split(' ')[0]})
          </button>
          <button
            onClick={() => {
              const fin = DEMO_EMPLOYEES.find((e) => e.role === 'finance');
              if (fin) handleEmployeeSelect(fin.id);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentRole === 'finance'
                ? 'bg-[#0F172A] text-white shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            Finance & Audit
          </button>
        </div>
      </div>
    </header>
  );
};
