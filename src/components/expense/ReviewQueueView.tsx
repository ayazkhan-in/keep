import React, { useState, useMemo } from 'react';
import {
  Shield,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpDown,
  Search,
  FileText,
  Layers,
  Eye,
  HelpCircle,
  CheckCheck,
  CreditCard,
  ChevronRight,
  ChevronDown,
  DollarSign,
  AlertOctagon,
  Sparkles,
  Users,
  Building,
} from 'lucide-react';
import { Expense, ClaimStatus, UserRole } from '../../types/expense';
import { getAllExpenses, applyReviewerDecision, resolveDuplicateClaim } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';
import { VerdictCard } from './VerdictCard';
import { EvidenceTimeline } from './EvidenceTimeline';
import { DuplicateCompareModal } from './DuplicateCompareModal';
import { FixItModal } from './FixItModal';

type QueueTab = 'exceptions' | 'needs_info' | 'auto_approved' | 'all';

interface ReviewQueueViewProps {
  initialTab?: QueueTab;
  onSelectClaim?: (expenseId: string) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({ initialTab = 'exceptions', onSelectClaim }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [activeTab, setActiveTab] = useState<QueueTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  // Modals
  const [timelineExpense, setTimelineExpense] = useState<Expense | null>(null);
  const [duplicateExpense, setDuplicateExpense] = useState<Expense | null>(null);
  const [fixItExpense, setFixItExpense] = useState<Expense | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);

  const activeReviewer = getActiveEmployee();

  const refreshExpenses = () => {
    setExpenses(getAllExpenses());
  };

  // Metrics
  const metrics = useMemo(() => {
    let inReviewCount = 0;
    let inReviewAmountMinor = 0;
    let highRiskCount = 0;
    let needsInfoCount = 0;
    let autoApprovedCount = 0;
    let autoApprovedAmountMinor = 0;

    for (const exp of expenses) {
      const risk = exp.verdict?.riskScore ?? 0;
      const amt = exp.normalizedCurrency?.targetAmountMinor ?? 0;

      if (exp.status === 'in_review') {
        inReviewCount++;
        inReviewAmountMinor += amt;
      }
      if (risk >= 60) {
        highRiskCount++;
      }
      if (exp.status === 'needs_info') {
        needsInfoCount++;
      }
      if (exp.status === 'auto_approved') {
        autoApprovedCount++;
        autoApprovedAmountMinor += amt;
      }
    }

    return {
      inReviewCount,
      inReviewAmount: inReviewAmountMinor / 100,
      highRiskCount,
      needsInfoCount,
      autoApprovedCount,
      autoApprovedAmount: autoApprovedAmountMinor / 100,
    };
  }, [expenses]);

  // Tab filtering & sorting: default riskScore desc, amount desc
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Tab filtering
        if (activeTab === 'exceptions') {
          return (
            exp.status === 'in_review' ||
            (exp.verdict?.riskScore || 0) >= 25 ||
            Boolean(exp.duplicateInfo?.candidateClaimIds?.length) ||
            exp.status === 'rejected'
          );
        }
        if (activeTab === 'needs_info') {
          return exp.status === 'needs_info';
        }
        if (activeTab === 'auto_approved') {
          return exp.status === 'auto_approved';
        }
        return true; // 'all'
      })
      .filter((exp) => {
        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const empName = exp.employeeId.toLowerCase();
        const merchant = (exp.extracted?.merchant?.value || '').toLowerCase();
        const category = (exp.extracted?.lineItems?.[0]?.category || '').toLowerCase();
        const id = exp.id.toLowerCase();
        return (
          empName.includes(q) ||
          merchant.includes(q) ||
          category.includes(q) ||
          id.includes(q)
        );
      })
      .sort((a, b) => {
        // Deterministic sort: riskScore desc, amount desc, date desc
        const riskA = a.verdict?.riskScore ?? 0;
        const riskB = b.verdict?.riskScore ?? 0;
        if (riskB !== riskA) return riskB - riskA;

        const amtA = a.normalizedCurrency?.targetAmountMinor ?? 0;
        const amtB = b.normalizedCurrency?.targetAmountMinor ?? 0;
        if (amtB !== amtA) return amtB - amtA;

        return b.expenseDate.localeCompare(a.expenseDate);
      });
  }, [expenses, activeTab, searchQuery]);

  // Bulk Touchless Approval
  const handleBulkApproveTouchless = () => {
    const touchlessEligible = expenses.filter(
      (e) =>
        (e.status === 'auto_approved' ||
          (e.status === 'submitted' && (e.verdict?.riskScore || 0) < 25 && e.verdict?.decision === 'approve')) &&
        !e.duplicateInfo?.candidateClaimIds?.length
    );

    if (touchlessEligible.length === 0) {
      alert('No pending touchless claims qualify for bulk approval.');
      return;
    }

    let approvedCount = 0;
    for (const claim of touchlessEligible) {
      applyReviewerDecision({
        expenseId: claim.id,
        reviewer: {
          id: activeReviewer.id,
          name: activeReviewer.identity.name,
          role: 'finance',
        },
        action: 'approve',
        reason: 'Bulk touchless audit confirmation for clean, low-risk policy-compliant claims.',
      });
      approvedCount++;
    }

    refreshExpenses();
    setBulkSuccessMsg(`Successfully confirmed & approved ${approvedCount} touchless claims.`);
    setTimeout(() => setBulkSuccessMsg(null), 4000);
  };

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'auto_approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Auto-Approved
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'partially_approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Partially Approved
          </span>
        );
      case 'needs_info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <HelpCircle className="w-3 h-3 text-purple-600" />
            Needs Info
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            In Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3 h-3 text-indigo-600" />
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getRiskBadge = (score: number) => {
    if (score < 25) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-code font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Risk: {score} Low
        </span>
      );
    }
    if (score < 60) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-code font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Risk: {score} Med
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-code font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
        <AlertOctagon className="w-2.5 h-2.5" />
        Risk: {score} High
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-600" />
            Finance Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Priority exception triage sorted by <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">Risk Score DESC</code> and financial exposure.
          </p>
        </div>

        {/* Bulk Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkApproveTouchless}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Confirm Clean Claims ({metrics.autoApprovedCount})</span>
          </button>
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Exceptions Queue</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172A]">{metrics.inReviewCount}</span>
            <span className="text-xs text-[#64748B]">₹{metrics.inReviewAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">High Anomaly Risk</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-rose-700">{metrics.highRiskCount}</span>
            <span className="text-xs text-[#64748B]">Needs scrutiny</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Needs Information</span>
            <HelpCircle className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-purple-700">{metrics.needsInfoCount}</span>
            <span className="text-xs text-[#64748B]">Waiting on employee</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Touchless Ready</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700">{metrics.autoApprovedCount}</span>
            <span className="text-xs text-[#64748B]">₹{metrics.autoApprovedAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'exceptions'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              Exceptions & Review ({metrics.inReviewCount + metrics.highRiskCount})
            </button>
            <button
              onClick={() => setActiveTab('needs_info')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'needs_info'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              Needs Info ({metrics.needsInfoCount})
            </button>
            <button
              onClick={() => setActiveTab('auto_approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'auto_approved'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              Auto-Approved ({metrics.autoApprovedCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              All Claims ({expenses.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by employee, merchant, ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#F8FAFC] border border-[#E2E8F0] focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Claim Items List */}
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-[#0F172A]">Review queue is clear</p>
            <p className="text-xs text-[#64748B] mt-1">No claims match the selected tab and filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {filteredExpenses.map((exp) => {
              const isSelected = selectedExpenseId === exp.id;
              const lineItem = exp.extracted?.lineItems?.[0];
              const category = lineItem?.category || 'General';
              const merchant = exp.extracted?.merchant?.value || 'Unknown Merchant';
              const riskScore = exp.verdict?.riskScore ?? 0;
              const hasDup = Boolean(exp.duplicateInfo?.candidateClaimIds?.length);
              const isDismissedDup = exp.duplicateInfo?.resolutionStatus === 'dismissed';

              return (
                <div key={exp.id} className="py-3 transition-colors">
                  {/* Claim Summary Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => setSelectedExpenseId(isSelected ? null : exp.id)}
                        className="mt-1 p-1 hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer text-[#64748B]"
                        title={isSelected ? 'Collapse' : 'Expand details'}
                      >
                        {isSelected ? (
                          <ChevronDown className="w-4 h-4 text-[#0F172A]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#64748B]" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate">
                            {merchant}
                          </span>
                          <span className="font-mono-code text-[11px] text-[#64748B]">
                            {exp.id}
                          </span>
                          {getStatusBadge(exp.status)}
                          {getRiskBadge(riskScore)}

                          {hasDup && !isDismissedDup && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Duplicate Match ({(((exp.duplicateInfo?.highestScore ?? (exp.duplicateInfo as any)?.highestMatchScore ?? 0)) * 100).toFixed(0)}%)
                            </span>
                          )}

                          {hasDup && isDismissedDup && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Duplicate Dismissed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#64748B]">
                          <span>
                            Employee: <strong className="text-[#334155]">{exp.employeeId}</strong>
                          </span>
                          <span>•</span>
                          <span>Date: {exp.expenseDate}</span>
                          <span>•</span>
                          <span>Category: {category}</span>
                          {exp.context?.city && (
                            <>
                              <span>•</span>
                              <span>City: {exp.context.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Quick Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pl-7 md:pl-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-[#0F172A]">
                          ₹{((exp.normalizedCurrency?.targetAmountMinor ?? 0) / 100).toFixed(2)}
                        </div>
                        {exp.normalizedCurrency?.sourceCurrency && exp.normalizedCurrency.sourceCurrency !== 'INR' && (
                          <div className="font-mono-code text-[10px] text-[#64748B]">
                            {((exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100))).toFixed(2)} {exp.normalizedCurrency.sourceCurrency}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasDup && !isDismissedDup && (
                          <button
                            onClick={() => setDuplicateExpense(exp)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            Compare
                          </button>
                        )}

                        <button
                          onClick={() => setTimelineExpense(exp)}
                          className="px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="View evidence timeline"
                        >
                          <Clock className="w-3 h-3 text-[#64748B]" />
                          <span>Timeline</span>
                        </button>

                        <button
                          onClick={() => setSelectedExpenseId(isSelected ? null : exp.id)}
                          className="px-3 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          {isSelected ? 'Close' : 'Review'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Verdict & Action Panel */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-[#F1F5F9] bg-[#F8FAFC] p-4 rounded-xl border">
                      <VerdictCard
                        expense={exp}
                        userRole="finance"
                        onActionComplete={refreshExpenses}
                        onRequestInfo={() => setFixItExpense(exp)}
                        onViewDuplicateCompare={() => setDuplicateExpense(exp)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Evidence Timeline Modal */}
      {timelineExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-[#E2E8F0]">
            <EvidenceTimeline
              expense={timelineExpense}
              onClose={() => setTimelineExpense(null)}
            />
          </div>
        </div>
      )}

      {/* Duplicate Comparison Modal */}
      {duplicateExpense && (
        <DuplicateCompareModal
          expense={duplicateExpense}
          onClose={() => setDuplicateExpense(null)}
          onDismissDuplicate={() => {
            resolveDuplicateClaim({
              expenseId: duplicateExpense.id,
              reviewer: {
                id: activeReviewer.id,
                name: activeReviewer.identity.name,
                role: 'finance',
              },
              resolutionStatus: 'dismissed',
              reason: 'Verified distinct legitimate business purchase.',
            });
            refreshExpenses();
            setDuplicateExpense(null);
          }}
          onConfirmDuplicate={() => {
            resolveDuplicateClaim({
              expenseId: duplicateExpense.id,
              reviewer: {
                id: activeReviewer.id,
                name: activeReviewer.identity.name,
                role: 'finance',
              },
              resolutionStatus: 'confirmed',
              reason: 'Confirmed identical duplicate receipt submission.',
            });
            refreshExpenses();
            setDuplicateExpense(null);
          }}
        />
      )}

      {/* Fix-It Info Request Modal */}
      {fixItExpense && (
        <FixItModal
          expense={fixItExpense}
          onClose={() => setFixItExpense(null)}
          onSuccess={() => {
            refreshExpenses();
            setFixItExpense(null);
          }}
        />
      )}
    </div>
  );
};
