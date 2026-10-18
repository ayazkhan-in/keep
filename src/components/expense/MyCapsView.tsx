import React, { useMemo } from 'react';
import {
  Scale,
  Shield,
  Calendar,
  DollarSign,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { getActivePolicy, subscribePolicy } from '../../services/policyService';
import { getActiveEmployee, subscribeEmployees } from '../../services/employeeService';
import { getEmployeeExpenses, subscribeExpenses } from '../../services/expenseService';
import { EmployeePolicyAssistant } from './EmployeePolicyAssistant';

export const MyCapsView: React.FC = () => {
  const [activeEmp, setActiveEmp] = React.useState(() => getActiveEmployee());
  const [policy, setPolicy] = React.useState(() => getActivePolicy());
  const [expenses, setExpenses] = React.useState(() => getEmployeeExpenses(activeEmp.id));

  React.useEffect(() => {
    const unsubExp = subscribeExpenses(() => {
      const emp = getActiveEmployee();
      setExpenses(getEmployeeExpenses(emp.id));
    });
    const unsubEmp = subscribeEmployees(() => {
      const emp = getActiveEmployee();
      setActiveEmp(emp);
      setExpenses(getEmployeeExpenses(emp.id));
    });
    const unsubPol = subscribePolicy((updatedPol) => {
      setPolicy(updatedPol);
    });
    return () => {
      unsubExp();
      unsubEmp();
      unsubPol();
    };
  }, []);

  // Determine allowances
  const isCustomAllowance = Boolean(activeEmp.financeProfile?.customAllowanceEnabled);
  const cityTier = activeEmp.financeProfile?.cityTierOverride || policy.cityTiers[activeEmp.homeCity] || 'Tier-1';

  // Rule lookup from policy
  const tier1DailyCap = policy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal')?.parameters.capAmountMinor ?? 300000;
  const tier2DailyCap = policy.rules.find((r) => r.id === 'rule_cap_tier2_daily_meal')?.parameters.capAmountMinor ?? 180000;
  const tier3DailyCap = policy.rules.find((r) => r.id === 'rule_cap_tier3_daily_meal')?.parameters.capAmountMinor ?? 120000;
  const singleMealCap = policy.rules.find((r) => r.id === 'rule_cap_tx_meal')?.parameters.capAmountMinor ?? 200000;
  const clientAttendeeCap = policy.rules.find((r) => r.id === 'rule_cap_client_attendee')?.parameters.capAmountMinor ?? 250000;

  const standardDailyCapMinor = cityTier === 'Tier-1' ? tier1DailyCap : cityTier === 'Tier-2' ? tier2DailyCap : tier3DailyCap;
  const dailyCapMinor = isCustomAllowance && activeEmp.financeProfile?.dailyMealAllowanceMinor
    ? activeEmp.financeProfile.dailyMealAllowanceMinor
    : standardDailyCapMinor;

  const perClaimCapMinor = isCustomAllowance && activeEmp.financeProfile?.perClaimMealLimitMinor
    ? activeEmp.financeProfile.perClaimMealLimitMinor
    : singleMealCap;

  const monthlyCapMinor = isCustomAllowance && activeEmp.financeProfile?.monthlySpendCapMinor
    ? activeEmp.financeProfile.monthlySpendCapMinor
    : dailyCapMinor * 20;

  // Calculate today's spent amount in focal date
  const todayStr = '2026-10-19'; // demo focal date
  const todayExpenses = expenses.filter((e) => e.expenseDate === todayStr);
  const todaySpentMinor = todayExpenses.reduce(
    (acc, e) => acc + (e.verdict?.approvedAmountMinor || 0),
    0
  );
  const dailyRemainingMinor = Math.max(0, dailyCapMinor - todaySpentMinor);

  // Calculate monthly spent amount (total approved)
  const monthlySpentMinor = expenses.reduce(
    (acc, e) => acc + (e.verdict?.approvedAmountMinor || 0),
    0
  );
  const monthlyRemainingMinor = Math.max(0, monthlyCapMinor - monthlySpentMinor);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            My Allowances & Spend Caps
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Live meters tracking daily and per-claim corporate reimbursement allowances for {activeEmp.identity.name} ({activeEmp.department} • {activeEmp.grade})
          </p>
        </div>

        {isCustomAllowance && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold self-start sm:self-center shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Custom Auditor Allowance Active</span>
          </div>
        )}
      </div>

      {/* Reimbursement Hold Banner */}
      {activeEmp.financeProfile?.reimbursementHold && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Reimbursement Payouts On Hold</p>
            <p className="text-amber-700 mt-0.5">
              The Finance Auditor has placed a temporary hold on payouts for your account. Claims can still be submitted and will be reviewed once the audit status clears.
            </p>
          </div>
        </div>
      )}

      {/* Coverage Checker Assistant */}
      <EmployeePolicyAssistant />

      {/* Main Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Meal Meter */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Daily Meal Cap
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-700">
              ₹{(dailyRemainingMinor / 100).toFixed(0)} Remaining
            </span>
          </div>

          <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                (todaySpentMinor / dailyCapMinor) > 0.85 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(100, (todaySpentMinor / (dailyCapMinor || 1)) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-[#64748B] font-mono-code">
            <span>Spent: ₹{(todaySpentMinor / 100).toFixed(2)}</span>
            <span>Limit: ₹{(dailyCapMinor / 100).toFixed(2)} / day</span>
          </div>
        </div>

        {/* Monthly Spend Cap Meter */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-purple-600" />
              Monthly Spend Budget
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-700">
              ₹{(monthlyRemainingMinor / 100).toFixed(0)} Remaining
            </span>
          </div>

          <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                (monthlySpentMinor / monthlyCapMinor) > 0.85 ? 'bg-amber-500' : 'bg-purple-600'
              }`}
              style={{
                width: `${Math.min(100, (monthlySpentMinor / (monthlyCapMinor || 1)) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-xs text-[#64748B] font-mono-code">
            <span>Spent: ₹{(monthlySpentMinor / 100).toFixed(2)}</span>
            <span>Limit: ₹{(monthlyCapMinor / 100).toFixed(2)} / mo</span>
          </div>
        </div>

        {/* Per-Transaction Limit */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              Per-Claim Meal Cap
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-700">
              ₹{(perClaimCapMinor / 100).toFixed(0)} / claim
            </span>
          </div>

          <p className="text-xs text-[#64748B] leading-relaxed">
            Single meal expenses are capped at ₹{(perClaimCapMinor / 100).toFixed(0)} without prior manager authorization.
          </p>

          <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2 text-[11px] text-[#475569]">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Client dinners scale by ₹{(clientAttendeeCap / 100).toFixed(0)} per confirmed attendee.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
