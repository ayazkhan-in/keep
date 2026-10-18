import React from 'react';
import {
  Scale,
  Shield,
  Calendar,
  DollarSign,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';
import { getEmployeeExpenses, subscribeExpenses } from '../../services/expenseService';
import { EmployeePolicyAssistant } from './EmployeePolicyAssistant';

export const MyCapsView: React.FC = () => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();
  const [expenses, setExpenses] = React.useState(() => getEmployeeExpenses(activeEmp.id));

  React.useEffect(() => {
    const unsubscribe = subscribeExpenses(() => {
      setExpenses(getEmployeeExpenses(activeEmp.id));
    });
    return () => unsubscribe();
  }, [activeEmp.id]);

  // Calculate today's spent amount in Bengaluru (Tier-1 default)
  const todayStr = '2026-10-19'; // demo focal date
  const todayExpenses = expenses.filter((e) => e.expenseDate === todayStr);
  const todaySpentMinor = todayExpenses.reduce(
    (acc, e) => acc + (e.verdict?.approvedAmountMinor || 0),
    0
  );
  const tier1DailyCapMinor = 300000; // ₹3,000
  const dailyRemainingMinor = Math.max(0, tier1DailyCapMinor - todaySpentMinor);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
          My Allowances & Spend Caps
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
          Live meters tracking daily and per-claim corporate reimbursement allowances
        </p>
      </div>

      {/* Coverage Checker Assistant */}
      <EmployeePolicyAssistant />

      {/* Main Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Meal Meter */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Today's Daily Meal Cap
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-700">
              ₹{(dailyRemainingMinor / 100).toFixed(0)} Remaining
            </span>
          </div>

          <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (todaySpentMinor / tier1DailyCapMinor) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-[#64748B] font-mono-code">
            <span>Spent: ₹{(todaySpentMinor / 100).toFixed(2)}</span>
            <span>Limit: ₹{(tier1DailyCapMinor / 100).toFixed(2)} / day</span>
          </div>
        </div>

        {/* Per-Transaction Limit */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              Per-Transaction Meal Cap
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-700">
              ₹2,000 / claim
            </span>
          </div>

          <p className="text-xs text-[#64748B] leading-relaxed">
            Single meal expenses are capped at ₹2,000 without prior manager pre-authorization. Any amount exceeding this threshold is excluded from reimbursement.
          </p>

          <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2 text-[11px] text-[#475569]">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Client dinners scale by ₹2,500 per confirmed attendee.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
