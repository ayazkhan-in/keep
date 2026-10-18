import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Users,
  FileText,
  DollarSign,
  ArrowRight,
  Lock,
  Layers,
  ChevronRight,
  ChevronDown,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { SimulationResult, PolicyVersion } from '../../types/expense';
import { simulatePolicyChange } from '../../engine/simulator';
import { getAllExpenses } from '../../services/expenseService';
import { DEMO_EMPLOYEES, getAllEmployeesList } from '../../services/employeeService';
import { getActivePolicy, getDraftPolicy } from '../../services/policyService';

export const SimulatorView: React.FC = () => {
  const activePolicy = getActivePolicy();
  const [selectedScenario, setSelectedScenario] = useState<string>('stricter_daily_meal');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);

  // Generate draft policy based on selected scenario
  const draftPolicy = useMemo<PolicyVersion>(() => {
    const base = getDraftPolicy();
    if (selectedScenario === 'stricter_daily_meal') {
      return {
        ...base,
        name: 'Draft: Stricter Daily Meal Caps (₹2,500/day)',
        rules: base.rules.map((r) =>
          r.id === 'rule_cap_tier1_daily_meal'
            ? {
                ...r,
                parameters: { ...r.parameters, capAmountMinor: 250000 },
                sourceQuote: 'Daily Meals: Capped at ₹2,500 per day (tightened from ₹3,000).',
              }
            : r
        ),
      };
    }
    if (selectedScenario === 'higher_threshold') {
      return {
        ...base,
        name: 'Draft: Higher Auto-Approve Threshold (₹15,000)',
        rules: base.rules.map((r) =>
          r.id === 'rule_threshold_finance'
            ? {
                ...r,
                parameters: { ...r.parameters, thresholdAmountMinor: 1500000 },
                sourceQuote: 'Standard claims below ₹15,000 eligible for auto-approval.',
              }
            : r
        ),
      };
    }
    if (selectedScenario === 'relaxed_daily_meal') {
      return {
        ...base,
        name: 'Draft: Expanded Daily Meal Caps (₹3,500/day)',
        rules: base.rules.map((r) =>
          r.id === 'rule_cap_tier1_daily_meal'
            ? {
                ...r,
                parameters: { ...r.parameters, capAmountMinor: 350000 },
                sourceQuote: 'Daily Meals: Capped at ₹3,500 per day (increased from ₹3,000).',
              }
            : r
        ),
      };
    }
    return base;
  }, [selectedScenario]);

  const handleRunSimulation = () => {
    const expenses = getAllExpenses();
    const result = simulatePolicyChange({
      activePolicy,
      draftPolicy,
      expenses,
      employees: getAllEmployeesList(),
    });
    setSimulationResult(result);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Policy Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Replay historical claims against proposed policy adjustments.
          </p>
        </div>

        {/* Safe Sandbox Indicator */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/60 text-xs font-medium text-slate-600">
          <Lock className="w-3 h-3 text-slate-500" />
          <span>Zero Mutation Sandbox</span>
        </div>
      </div>

      {/* Simulation Setup Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-3.5">
        <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Policy Replay Configuration</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Active Policy Card */}
          <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/60">
            <span className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400 font-medium">
              Baseline Policy
            </span>
            <div className="mt-1 font-semibold text-xs sm:text-sm text-slate-900">
              {activePolicy.name} (v{activePolicy.versionNumber})
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activePolicy.rules.length} active rules
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="p-3 rounded-lg border border-slate-200/70 bg-slate-50/40 md:col-span-2">
            <span className="text-[10px] font-mono-code uppercase tracking-wider text-slate-500 font-medium">
              Proposed Policy Scenario
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedScenario('stricter_daily_meal')}
                className={`p-2.5 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                  selectedScenario === 'stricter_daily_meal'
                    ? 'bg-white border-slate-900 shadow-2xs font-medium text-slate-900 ring-1 ring-slate-900'
                    : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-slate-900">Tighten Daily Meal Caps</div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹3,000 → ₹2,500/day</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenario('higher_threshold')}
                className={`p-2.5 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                  selectedScenario === 'higher_threshold'
                    ? 'bg-white border-slate-900 shadow-2xs font-medium text-slate-900 ring-1 ring-slate-900'
                    : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-slate-900">Raise Auto Threshold</div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹10,000 → ₹15,000</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenario('relaxed_daily_meal')}
                className={`p-2.5 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                  selectedScenario === 'relaxed_daily_meal'
                    ? 'bg-white border-slate-900 shadow-2xs font-medium text-slate-900 ring-1 ring-slate-900'
                    : 'bg-white/80 border-slate-200/80 text-slate-600 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-slate-900">Expand Daily Meal Caps</div>
                <div className="text-[10px] text-slate-500 mt-0.5">₹3,000 → ₹3,500/day</div>
              </button>
            </div>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleRunSimulation}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Simulate Historical Claims Replay</span>
          </button>
        </div>
      </div>

      {/* Simulation Results Section */}
      {simulationResult && (
        <div className="space-y-6">
          {/* High-Level Delta Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Total Reimbursed Delta */}
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
                Reimbursed Spend Delta
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-xl font-bold ${
                  simulationResult.deltaReimbursedMinor < 0 ? 'text-emerald-700' : simulationResult.deltaReimbursedMinor > 0 ? 'text-amber-700' : 'text-[#0F172A]'
                }`}>
                  {simulationResult.deltaReimbursedMinor < 0 ? '-' : '+'}₹
                  {Math.abs(simulationResult.deltaReimbursedMinor / 100).toLocaleString()}
                </span>
                <span className="text-xs text-[#64748B]">
                  ({simulationResult.deltaReimbursedMinor < 0 ? 'Savings' : 'Increase'})
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#64748B]">
                Active: ₹{(simulationResult.activeTotalReimbursedMinor / 100).toLocaleString()} → Draft: ₹{(simulationResult.draftTotalReimbursedMinor / 100).toLocaleString()}
              </div>
            </div>

            {/* Touchless Rate Delta */}
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
                Touchless Rate Delta
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-xl font-bold ${
                  simulationResult.deltaTouchlessRate > 0 ? 'text-emerald-700' : simulationResult.deltaTouchlessRate < 0 ? 'text-rose-700' : 'text-[#0F172A]'
                }`}>
                  {simulationResult.deltaTouchlessRate > 0 ? '+' : ''}{simulationResult.deltaTouchlessRate}%
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#64748B]">
                Active: {simulationResult.touchlessRateActive}% → Draft: {simulationResult.touchlessRateDraft}%
              </div>
            </div>

            {/* Changed Verdicts */}
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
                Impacted Claims
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-700">
                  {simulationResult.changedVerdictsCount}
                </span>
                <span className="text-xs text-[#64748B]">
                  of {simulationResult.totalExpensesEvaluated} total
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#64748B]">
                Verdict or amount shifted
              </div>
            </div>

            {/* Claims Evaluated */}
            <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
                Dataset Coverage
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-[#0F172A]">
                  {simulationResult.totalExpensesEvaluated}
                </span>
                <span className="text-xs text-[#64748B]">Claims</span>
              </div>
              <div className="mt-1 text-[11px] text-[#64748B]">
                100% chronological replay
              </div>
            </div>
          </div>

          {/* Per-Employee Impact Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                Per-Employee Reimbursement Impact
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="py-2 px-3 font-semibold">Employee</th>
                    <th className="py-2 px-3 font-semibold">Active Policy Reimbursement</th>
                    <th className="py-2 px-3 font-semibold">Draft Policy Reimbursement</th>
                    <th className="py-2 px-3 font-semibold text-right">Net Impact (Delta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {simulationResult.employeeImpacts.map((emp) => {
                    const delta = emp.deltaMinor / 100;
                    return (
                      <tr key={emp.employeeId} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                          {emp.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-[#334155]">
                          ₹{(emp.activeApprovedMinor / 100).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-[#334155]">
                          ₹{(emp.draftApprovedMinor / 100).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-code font-bold">
                          <span className={delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-amber-700' : 'text-[#64748B]'}>
                            {delta < 0 ? '-' : delta > 0 ? '+' : ''}₹{Math.abs(delta).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Changed Claims Diff Breakdown */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Detailed Claim-by-Claim Shifts ({simulationResult.changedClaims.length})
                </h3>
              </div>
            </div>

            {simulationResult.changedClaims.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No claims experienced verdict or amount changes under this scenario.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {simulationResult.changedClaims.map((claim) => {
                  const isExp = expandedClaimId === claim.expenseId;
                  const amtDelta = (claim.draftApprovedMinor - claim.activeApprovedMinor) / 100;

                  return (
                    <div key={claim.expenseId} className="py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-xs font-bold text-[#0F172A]">
                            {claim.expenseId}
                          </span>
                          <span className="text-xs font-medium text-[#334155]">
                            {claim.merchant}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            ({claim.expenseDate})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs flex items-center gap-1.5 font-mono-code">
                            <span className="text-[#64748B]">
                              ₹{(claim.activeApprovedMinor / 100).toFixed(2)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                            <span className="font-bold text-[#0F172A]">
                              ₹{(claim.draftApprovedMinor / 100).toFixed(2)}
                            </span>
                          </div>

                          <span className={`text-[11px] font-mono-code font-bold px-2 py-0.5 rounded ${
                            amtDelta < 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {amtDelta < 0 ? '' : '+'}{amtDelta.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-[#475569] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] mt-1.5">
                        <span className="font-semibold text-emerald-700">Replay Explanation: </span>
                        {claim.deltaReason}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
