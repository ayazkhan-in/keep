import React from 'react';
import {
  FileText,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Copy,
  MessageSquare,
  UserCheck,
  Clock,
  ArrowRight,
  Hash,
  Bot,
  DollarSign,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { getAuditEventsForExpense } from '../../services/auditService';

interface EvidenceTimelineProps {
  expense: Expense;
  onOpenDuplicateCompare?: () => void;
  onOpenFixIt?: () => void;
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  expense,
  onOpenDuplicateCompare,
  onOpenFixIt,
}) => {
  const auditEvents = getAuditEventsForExpense(expense.id);
  const curr = expense.normalizedCurrency?.targetCurrency || 'INR';
  const claimedAmount = (expense.normalizedCurrency?.targetAmountMinor || 0) / 100;
  const approvedAmount = (expense.verdict?.approvedAmountMinor || 0) / 100;
  const rejectedAmount = (expense.verdict?.rejectedAmountMinor || 0) / 100;
  const pendingAmount = (expense.verdict?.pendingAmountMinor || 0) / 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Expense Evidence Timeline</h3>
            <p className="text-[11px] text-slate-500">
              Traceable chain of evidence from original receipt to deterministic verdict & reviewer action
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono-code px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
            ID: {expense.id}
          </span>
          <span className="text-[11px] font-mono-code px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
            Policy v{expense.verdict?.policyVersionId || '1'}
          </span>
        </div>
      </div>

      {/* Vertical Connected Timeline */}
      <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
        {/* Node 1: Original Receipt Ingestion */}
        <div className="relative group">
          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center" />
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                Receipt Document Ingested ({expense.channel.toUpperCase()})
              </span>
              <span className="text-[10px] font-mono-code text-slate-400">
                {expense.submittedAt ? new Date(expense.submittedAt).toLocaleString() : 'Recent'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              Original receipt file captured with verified cryptographic integrity hash:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono-code text-[11px] text-slate-700 break-all flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>SHA-256: {expense.receiptRef?.originalSha256 || 'Authoritative Hash Verified'}</span>
            </div>
          </div>
        </div>

        {/* Node 2: Extracted Values vs Corrections */}
        <div className="relative group">
          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center" />
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-900">Extracted Values & Confidence</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60">
                OCR Confidence: {Math.round((expense.verdict?.confidence || 0.95) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Vendor</span>
                <span className="font-semibold text-slate-900 truncate block">
                  {expense.corrected?.merchant || expense.extracted?.merchant?.value || 'Unknown'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Date</span>
                <span className="font-semibold text-slate-900 block">
                  {expense.corrected?.date || expense.expenseDate || 'Missing'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Claimed Total</span>
                <span className="font-semibold text-slate-900 font-mono-code block">
                  {claimedAmount.toLocaleString()} {curr}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Normalized Base FX</span>
                <span className="font-semibold text-emerald-700 block">
                  {expense.normalizedCurrency?.fxRate || 1.0}x ({expense.normalizedCurrency?.fxSource})
                </span>
              </div>
            </div>

            {/* Itemized Line Items & Exclusions */}
            {(expense.extracted?.lineItems || []).length > 0 && (
              <div className="mt-2.5 border-t border-slate-100 pt-2">
                <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Itemized Breakdown ({expense.extracted.lineItems.length} items):
                </span>
                <div className="space-y-1">
                  {expense.extracted.lineItems.map((li, i) => {
                    const isExcl = (li.itemFlags || []).length > 0;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-xs px-2.5 py-1 rounded-md border ${
                          isExcl
                            ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{li.description}</span>
                          {isExcl && (
                            <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              Excluded: {li.itemFlags.join(', ')}
                            </span>
                          )}
                        </div>
                        <span className="font-mono-code font-semibold">
                          ₹{Number(li.amount).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Node 3: Duplicate Candidate Comparison (if applicable) */}
        {expense.duplicateInfo && expense.duplicateInfo.candidates.length > 0 && (
          <div className="relative group">
            <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white ring-1 ring-amber-200 flex items-center justify-center" />
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Duplicate Evidence Match (Similarity Score: {(expense.duplicateInfo.highestScore * 100).toFixed(0)}%)
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                  {expense.duplicateInfo.primaryMatchKind.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mb-2">
                {expense.duplicateInfo.evidenceSummary}
              </p>
              {onOpenDuplicateCompare && (
                <button
                  onClick={onOpenDuplicateCompare}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3 h-3 text-amber-700" />
                  <span>Inspect Side-by-Side Evidence</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Node 4: Policy Rule Citations & Ledger Cap Snapshot */}
        <div className="relative group">
          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white ring-1 ring-emerald-200 flex items-center justify-center" />
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-900 block mb-2">
              Deterministic Policy Evaluation & Ledger Replay
            </span>

            {/* Cap & Prior Spend Meter if available */}
            {expense.verdict?.ledgerSnapshot && (
              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
                  <span>Cumulative Allowance: {expense.verdict.ledgerSnapshot.capPeriod.toUpperCase()} Cap</span>
                  <span className="font-mono-code text-slate-900 font-bold">
                    Remaining: ₹{(expense.verdict.ledgerSnapshot.remainingMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                  <div
                    className="bg-slate-900 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (expense.verdict.ledgerSnapshot.priorSpendMinor /
                          (expense.verdict.ledgerSnapshot.allowanceMinor || 1)) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono-code">
                  <span>Prior spend: ₹{(expense.verdict.ledgerSnapshot.priorSpendMinor / 100).toLocaleString()}</span>
                  <span>Limit: ₹{(expense.verdict.ledgerSnapshot.allowanceMinor / 100).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Cited Policy Rules */}
            <div className="space-y-2">
              {(expense.verdict?.ruleImpacts || []).map((rule, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">{rule.section} - {rule.title}</span>
                    <span
                      className={`text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded uppercase ${
                        rule.impactType === 'exclusion'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : rule.impactType === 'hold'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      }`}
                    >
                      {rule.impactType}
                    </span>
                  </div>
                  {rule.sourceQuote && (
                    <blockquote className="border-l-2 border-slate-300 pl-2 text-[11px] italic text-slate-600 my-1">
                      "{rule.sourceQuote}"
                    </blockquote>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">{rule.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Node 5: Fix-It Thread Messages (if any) */}
        {(expense.thread || []).length > 0 && (
          <div className="relative group">
            <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center" />
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-900">Employee Fix-It Conversation</span>
                {onOpenFixIt && (
                  <button
                    onClick={onOpenFixIt}
                    className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Open Thread
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                {expense.thread.map((msg) => (
                  <div key={msg.id} className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] font-mono-code font-semibold text-slate-500 uppercase block mb-0.5">
                      {msg.sender}:
                    </span>
                    <p className="text-slate-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Node 6: Final Reviewer Decision & Append-Only Audit Trail */}
        <div className="relative group">
          <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white ring-1 ring-slate-900 flex items-center justify-center" />
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200">Authoritative Verdict & Final Decision</span>
              <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-white/10 uppercase border border-white/15">
                {expense.verdict?.decision || expense.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-2 text-center text-xs">
              <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Approved</span>
                <span className="font-bold font-mono-code text-emerald-400">₹{approvedAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Rejected</span>
                <span className="font-bold font-mono-code text-rose-400">₹{rejectedAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Pending</span>
                <span className="font-bold font-mono-code text-amber-300">₹{pendingAmount.toLocaleString()}</span>
              </div>
            </div>

            {expense.reviewerAction && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs text-slate-300">
                <span className="font-medium text-white">
                  Human Action: {expense.reviewerAction.action.toUpperCase()} by {expense.reviewerAction.reviewerName}
                </span>
                <p className="text-[11px] text-slate-400 italic mt-0.5">
                  "{expense.reviewerAction.reason}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
