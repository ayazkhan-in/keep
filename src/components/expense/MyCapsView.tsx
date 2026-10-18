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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Spend Allowances & Caps
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeEmp.identity.name} • {activeEmp.department} • {activeEmp.grade} • {cityTier}
          </p>
        </div>

        {isCustomAllowance && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/60 text-emerald-800 rounded-full text-xs font-medium self-start sm:self-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Custom Allowance Active</span>
          </div>
        )}
      </div>

      {/* Reimbursement Hold Banner */}
      {activeEmp.financeProfile?.reimbursementHold && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Reimbursement Payouts On Hold</p>
            <p className="text-amber-800/80 mt-0.5">
              A temporary hold has been placed on payouts for your account. Submitted claims will be reviewed once the audit status clears.
            </p>
          </div>
        </div>
      )}

      {/* Coverage Checker Assistant */}
      <EmployeePolicyAssistant />

      {/* Main Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Daily Meal Meter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Daily Meal Cap
            </span>
            <span className="font-mono-code text-[11px] text-slate-500">
              ₹{(dailyCapMinor / 100).toFixed(0)} / day
            </span>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900 font-mono-code">
              ₹{(dailyRemainingMinor / 100).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              remaining today
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                (todaySpentMinor / dailyCapMinor) > 0.85 ? 'bg-amber-500' : 'bg-slate-900'
              }`}
              style={{
                width: `${Math.min(100, (todaySpentMinor / (dailyCapMinor || 1)) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono-code pt-0.5">
            <span>Spent: ₹{(todaySpentMinor / 100).toFixed(0)}</span>
            <span>Limit: ₹{(dailyCapMinor / 100).toFixed(0)}</span>
          </div>
        </div>

        {/* Monthly Spend Cap Meter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-slate-400" />
              Monthly Budget
            </span>
            <span className="font-mono-code text-[11px] text-slate-500">
              ₹{(monthlyCapMinor / 100).toLocaleString()} / mo
            </span>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900 font-mono-code">
              ₹{(monthlyRemainingMinor / 100).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              remaining this month
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                (monthlySpentMinor / monthlyCapMinor) > 0.85 ? 'bg-amber-500' : 'bg-slate-900'
              }`}
              style={{
                width: `${Math.min(100, (monthlySpentMinor / (monthlyCapMinor || 1)) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono-code pt-0.5">
            <span>Spent: ₹{(monthlySpentMinor / 100).toFixed(0)}</span>
            <span>Budget: ₹{(monthlyCapMinor / 100).toLocaleString()}</span>
          </div>
        </div>

        {/* Per-Transaction Limit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                Per-Claim Meal Limit
              </span>
              <span className="font-mono-code text-[11px] text-slate-500">Single Transaction</span>
            </div>

            <div className="mt-3">
              <div className="text-xl font-bold text-slate-900 font-mono-code">
                ₹{(perClaimCapMinor / 100).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                standard single-meal ceiling
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Client meals allow ₹{(clientAttendeeCap / 100).toFixed(0)} per attendee.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
