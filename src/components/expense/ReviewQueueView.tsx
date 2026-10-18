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
  Bot,
  Users,
  Building,
} from 'lucide-react';
import { Expense, ClaimStatus, UserRole } from '../../types/expense';
import {
  getAllExpenses,
  applyReviewerDecision,
  resolveDuplicateClaim,
  subscribeExpenses,
} from '../../services/expenseService';
import { getActiveEmployee, getEmployeeDisplayName } from '../../services/employeeService';
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

  // Real-time Firestore sync
  React.useEffect(() => {
    const unsubscribe = subscribeExpenses((updated) => {
      setExpenses(updated);
    });
    return () => unsubscribe();
  }, []);

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
        const empName = (exp.employeeName || getEmployeeDisplayName(exp.employeeId)).toLowerCase();
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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Auto-Approved
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Approved
          </span>
        );
      case 'partially_approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Partial
          </span>
        );
      case 'needs_info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Needs Info
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            In Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <CreditCard className="w-3 h-3 text-emerald-600" />
            Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getRiskBadge = (score: number) => {
    if (score < 25) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono-code font-medium text-slate-500">
          Risk {score}
        </span>
      );
    }
    if (score < 60) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono-code font-medium text-amber-700 bg-amber-50 border border-amber-200/60">
          Risk {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono-code font-semibold text-rose-700 bg-rose-50 border border-rose-200/60">
        Risk {score}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Metrics Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Review Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exception triage ordered by risk score and financial exposure.
          </p>
        </div>

        {/* Bulk Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBulkApproveTouchless}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Approve Clean ({metrics.autoApprovedCount})</span>
          </button>
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Exceptions</span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono-code">{metrics.inReviewCount}</span>
            <span className="text-xs text-slate-500 font-mono-code">₹{metrics.inReviewAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">High Risk</span>
            <AlertOctagon className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-rose-700 font-mono-code">{metrics.highRiskCount}</span>
            <span className="text-xs text-slate-500">needs audit</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Needs Information</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono-code">{metrics.needsInfoCount}</span>
            <span className="text-xs text-slate-500">with employee</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Touchless Ready</span>
            <Bot className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-emerald-700 font-mono-code">{metrics.autoApprovedCount}</span>
            <span className="text-xs text-slate-500 font-mono-code">₹{metrics.autoApprovedAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('exceptions')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'exceptions'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Exceptions ({metrics.inReviewCount + metrics.highRiskCount})
            </button>
            <button
              onClick={() => setActiveTab('needs_info')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'needs_info'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Needs Info ({metrics.needsInfoCount})
            </button>
            <button
              onClick={() => setActiveTab('auto_approved')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'auto_approved'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Auto-Approved ({metrics.autoApprovedCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({expenses.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewer queue..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200/80 rounded-md focus:outline-none focus:bg-white text-slate-900"
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
                        className="mt-1 p-1 hover:bg-slate-100 rounded-md transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
                        title={isSelected ? 'Collapse' : 'Expand details'}
                      >
                        {isSelected ? (
                          <ChevronDown className="w-4 h-4 text-slate-900" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                            {merchant}
                          </span>
                          <span className="font-mono-code text-[10px] text-slate-400">
                            {exp.id}
                          </span>
                          {getStatusBadge(exp.status)}
                          {getRiskBadge(riskScore)}

                          {hasDup && !isDismissedDup && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                              Duplicate Match ({(((exp.duplicateInfo?.highestScore ?? (exp.duplicateInfo as any)?.highestMatchScore ?? 0)) * 100).toFixed(0)}%)
                            </span>
                          )}

                          {hasDup && isDismissedDup && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                              Duplicate Dismissed
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-slate-500">
                          <span>
                            Employee: <strong className="text-slate-700 font-medium">{exp.employeeName || getEmployeeDisplayName(exp.employeeId)}</strong>
                          </span>
                          <span>•</span>
                          <span>{exp.expenseDate}</span>
                          <span>•</span>
                          <span>{category}</span>
                          {exp.context?.city && (
                            <>
                              <span>•</span>
                              <span>{exp.context.city}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Quick Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pl-7 md:pl-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono-code">
                          ₹{((exp.normalizedCurrency?.targetAmountMinor ?? 0) / 100).toFixed(2)}
                        </div>
                        {exp.normalizedCurrency?.sourceCurrency && exp.normalizedCurrency.sourceCurrency !== 'INR' && (
                          <div className="font-mono-code text-[10px] text-slate-400">
                            {((exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100))).toFixed(2)} {exp.normalizedCurrency.sourceCurrency}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasDup && !isDismissedDup && (
                          <button
                            onClick={() => setDuplicateExpense(exp)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 rounded-md text-xs font-medium transition-colors cursor-pointer"
                          >
                            Compare
                          </button>
                        )}

                        <button
                          onClick={() => setTimelineExpense(exp)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="View evidence timeline"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Timeline</span>
                        </button>

                        <button
                          onClick={() => setSelectedExpenseId(isSelected ? null : exp.id)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
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
