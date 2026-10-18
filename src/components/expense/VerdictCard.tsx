import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Scale,
  Shield,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { Expense, UserRole } from '../../types/expense';
import { applyReviewerDecision } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';

interface VerdictCardProps {
  expense: Expense;
  userRole: UserRole;
  onRefresh: () => void;
  onOpenTimeline?: () => void;
  onOpenDuplicateCompare?: () => void;
  onOpenFixIt?: () => void;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  expense,
  userRole,
  onRefresh,
  onOpenTimeline,
  onOpenDuplicateCompare,
  onOpenFixIt,
}) => {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [actionReason, setActionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeEmployee = getActiveEmployee();
  const verdict = expense.verdict;
  const isFinanceOrAdmin = userRole === 'finance' || userRole === 'admin';

  const claimedAmount = (expense.normalizedCurrency?.targetAmountMinor || 0) / 100;
  const approvedAmount = (verdict?.approvedAmountMinor || 0) / 100;
  const rejectedAmount = (verdict?.rejectedAmountMinor || 0) / 100;
  const pendingAmount = (verdict?.pendingAmountMinor || 0) / 100;

  const handleAction = async (action: 'approve' | 'reject' | 'override' | 'request_info' | 'mark_paid') => {
    if ((action === 'reject' || action === 'override') && !actionReason.trim()) {
      alert('A reason is mandatory for human rejection or amount override.');
      return;
    }

    setIsSubmitting(true);
    try {
      let overrideMinor: number | undefined = undefined;
      if (action === 'override') {
        const parsed = parseFloat(overrideAmount);
        if (isNaN(parsed) || parsed < 0) {
          alert('Please enter a valid override amount.');
          setIsSubmitting(false);
          return;
        }
        overrideMinor = Math.round(parsed * 100);
      }

      applyReviewerDecision({
        expenseId: expense.id,
        reviewer: {
          id: activeEmployee.id,
          name: activeEmployee.identity.name,
          role: userRole,
        },
        action,
        overrideAmountMinor: overrideMinor,
        reason: actionReason || `Action recorded by ${activeEmployee.identity.name}`,
      });

      setShowOverrideInput(false);
      setIsRejecting(false);
      setActionReason('');
      setOverrideAmount('');
      onRefresh();
    } catch (err: any) {
      alert(`Error applying decision: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#11161B] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top Banner: Decision Status & Risk Band */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          {expense.status === 'auto_approved' || expense.status === 'approved' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {expense.status === 'auto_approved' ? 'TOUCHLESS AUTO-APPROVED' : 'APPROVED'}
            </span>
          ) : expense.status === 'partially_approved' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
              <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              PARTIALLY APPROVED
            </span>
          ) : expense.status === 'needs_info' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              NEEDS INFORMATION
            </span>
          ) : expense.status === 'rejected' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
              <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              REJECTED
            </span>
          ) : expense.status === 'paid' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              PAID RECORDED
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              IN REVIEW
            </span>
          )}

          {verdict && (
            <span
              className={`text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                verdict.riskBand === 'high'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : verdict.riskBand === 'medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              Risk: {verdict.riskScore}/100 ({verdict.riskBand.toUpperCase()})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenTimeline && (
            <button
              onClick={onOpenTimeline}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Evidence Timeline</span>
            </button>
          )}

          {expense.duplicateInfo && expense.duplicateInfo.candidates.length > 0 && onOpenDuplicateCompare && (
            <button
              onClick={onOpenDuplicateCompare}
              className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Duplicate Match ({(expense.duplicateInfo.highestScore * 100).toFixed(0)}%)</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Amounts Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#F8FAFC] dark:bg-[#151B22] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl p-3">
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 block font-medium">Claimed Amount</span>
          <span className="text-base font-bold text-[#0F172A] dark:text-slate-100 block mt-0.5">
            ₹{claimedAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono-code block mt-0.5">
            {expense.normalizedCurrency?.sourceCurrency} {expense.extracted?.total?.value || claimedAmount}
          </span>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
          <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">Approved Amount</span>
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 block mt-0.5">
            ₹{approvedAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono-code block mt-0.5">
            Reimbursable
          </span>
        </div>

        <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <span className="text-[11px] text-red-800 dark:text-red-300 block font-medium">Excluded / Capped</span>
          <span className="text-base font-bold text-red-700 dark:text-red-400 block mt-0.5">
            ₹{rejectedAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-red-600 dark:text-red-400 font-mono-code block mt-0.5">
            Deducted
          </span>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <span className="text-[11px] text-amber-900 dark:text-amber-300 block font-medium">Pending Info</span>
          <span className="text-base font-bold text-amber-800 dark:text-amber-400 block mt-0.5">
            ₹{pendingAmount.toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono-code block mt-0.5">
            Held for Details
          </span>
        </div>
      </div>

      {/* Cap & Prior Spend Meter if available */}
      {verdict?.ledgerSnapshot && (
        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-950 mb-1">
            <span>Cumulative Allowance ({verdict.ledgerSnapshot.capPeriod.toUpperCase()} CAP)</span>
            <span>Remaining: ₹{(verdict.ledgerSnapshot.remainingMinor / 100).toLocaleString()}</span>
          </div>
          <div className="w-full bg-emerald-200 rounded-full h-2 mb-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (verdict.ledgerSnapshot.priorSpendMinor /
                    (verdict.ledgerSnapshot.allowanceMinor || 1)) *
                    100
                )}%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-emerald-800 font-mono-code">
            <span>Prior Spend: ₹{(verdict.ledgerSnapshot.priorSpendMinor / 100).toLocaleString()}</span>
            <span>Policy Allowance: ₹{(verdict.ledgerSnapshot.allowanceMinor / 100).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Risk Signals & Explanations */}
      {verdict && verdict.flags && verdict.flags.length > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-1.5">
          <span className="text-xs font-semibold text-[#0F172A] block">
            Verification & Anomaly Signals:
          </span>
          {verdict.flags.map((flag, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-xs p-2 rounded-lg bg-white border border-[#E2E8F0]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#0F172A] block">{flag.label}</span>
                <span className="text-[#64748B] text-[11px] block">{flag.explanation}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cited Policy Rules */}
      {verdict && verdict.ruleImpacts && verdict.ruleImpacts.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#0F172A] block">
            Governing Policy Rules & Source Quotes:
          </span>
          {verdict.ruleImpacts.map((rule, idx) => (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-[#0F172A]">{rule.section} - {rule.title}</span>
                <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  {rule.impactType}
                </span>
              </div>
              {rule.sourceQuote && (
                <p className="text-[11px] italic text-[#475569] border-l-2 border-emerald-500 pl-2 my-1">
                  "{rule.sourceQuote}"
                </p>
              )}
              <p className="text-[11px] text-[#64748B]">{rule.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Human Action Records */}
      {expense.reviewerAction && (
        <div className="bg-[#0F172A] text-white rounded-xl p-3 text-xs">
          <span className="font-semibold block mb-0.5">
            Reviewer Decision: {expense.reviewerAction.action.toUpperCase()} by {expense.reviewerAction.reviewerName}
          </span>
          <p className="text-white/80 italic text-[11px]">"{expense.reviewerAction.reason}"</p>
          <span className="text-[10px] font-mono-code text-white/60 block mt-1">
            {new Date(expense.reviewerAction.timestamp).toLocaleString()}
          </span>
        </div>
      )}

      {/* Reviewer Action Controls (Finance / Admin Only) */}
      {isFinanceOrAdmin && (
        <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
          <span className="text-xs font-semibold text-[#0F172A] block">Finance Decision Controls:</span>

          {showOverrideInput ? (
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#475569] block mb-1">
                    Override Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#475569] block mb-1">
                    Mandatory Override Reason
                  </label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g. Approved via VP written exception"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowOverrideInput(false)}
                  className="px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('override')}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-[#0F172A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Confirm Override & Reflow
                </button>
              </div>
            </div>
          ) : isRejecting ? (
            <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 space-y-2">
              <label className="text-[11px] font-medium text-red-950 block">
                Mandatory Rejection Reason:
              </label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Personal entertainment items not covered by corporate policy"
                className="w-full px-2.5 py-1.5 bg-white border border-red-300 rounded-lg text-xs"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 cursor-pointer shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAction('approve')}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Claim</span>
              </button>

              <button
                onClick={() => setIsRejecting(true)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                onClick={() => setShowOverrideInput(true)}
                disabled={isSubmitting}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#334155] border border-[#CBD5E1] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Override Amount</span>
              </button>

              {onOpenFixIt && (
                <button
                  onClick={onOpenFixIt}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                  <span>Request Info</span>
                </button>
              )}

              {expense.status === 'approved' && (
                <button
                  onClick={() => handleAction('mark_paid')}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Mark Paid</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
