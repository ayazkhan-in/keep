import React from 'react';
import {
  Scale,
  Shield,
  MapPin,
  Calendar,
  DollarSign,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';
import { getEmployeeExpenses } from '../../services/expenseService';
import { EmployeePolicyAssistant } from './EmployeePolicyAssistant';

export const MyCapsView: React.FC = () => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();
  const expenses = getEmployeeExpenses(activeEmp.id);

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
          Live meters tracking daily, per-claim, and city-tier corporate reimbursement allowances
        </p>
      </div>

      {/* Coverage Checker Assistant */}
      <EmployeePolicyAssistant />

      {/* Main Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Tier-1 Meal Meter */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Today's Daily Meal Cap (Tier-1 City)
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

      {/* City Tiers Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#64748B]" />
          City Tier Daily Meal Limits Reference
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                <th className="pb-2">City Tier</th>
                <th className="pb-2">Applicable Cities</th>
                <th className="pb-2">Daily Meal Allowance</th>
                <th className="pb-2">Policy Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
              <tr>
                <td className="py-2.5 font-bold text-blue-900">Tier-1 Cities</td>
                <td className="py-2.5">Mumbai, Bengaluru, Delhi, Hyderabad</td>
                <td className="py-2.5 font-mono-code font-bold text-emerald-700">₹3,000 / day</td>
                <td className="py-2.5 text-[#64748B]">Section 4.1</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-800">Tier-2 Cities</td>
                <td className="py-2.5">Pune, Chennai, Kolkata, Ahmedabad</td>
                <td className="py-2.5 font-mono-code font-bold text-emerald-700">₹1,800 / day</td>
                <td className="py-2.5 text-[#64748B]">Section 4.1</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-slate-800">Tier-3 Cities</td>
                <td className="py-2.5">Jaipur, Goa, All other domestic</td>
                <td className="py-2.5 font-mono-code font-bold text-emerald-700">₹1,200 / day</td>
                <td className="py-2.5 text-[#64748B]">Section 4.1</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-emerald-900 dark:text-emerald-300">International Travel</td>
                <td className="py-2.5">All international business destinations</td>
                <td className="py-2.5 font-mono-code font-bold text-emerald-700 dark:text-emerald-400">₹6,500 equiv. / day</td>
                <td className="py-2.5 text-[#64748B] dark:text-slate-400">Section 4.1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
