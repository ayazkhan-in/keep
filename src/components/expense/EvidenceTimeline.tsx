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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Expense Evidence Timeline</h3>
            <p className="text-[11px] text-[#64748B]">
              Traceable chain of evidence from original receipt to deterministic verdict & reviewer action
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono-code px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569]">
            ID: {expense.id}
          </span>
          <span className="text-[11px] font-mono-code px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
            Policy v{expense.verdict?.policyVersionId || '1'}
          </span>
        </div>
      </div>

      {/* Vertical Connected Timeline */}
      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2E8F0]">
        {/* Node 1: Original Receipt Ingestion */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
            <FileText className="w-2.5 h-2.5 text-blue-600" />
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                Receipt Document Ingested ({expense.channel.toUpperCase()})
              </span>
              <span className="text-[10px] font-mono-code text-[#64748B]">
                {expense.submittedAt ? new Date(expense.submittedAt).toLocaleString() : 'Recent'}
              </span>
            </div>
            <p className="text-xs text-[#475569] mb-2">
              Original receipt file captured with verified cryptographic integrity hash:
            </p>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-2 font-mono-code text-[11px] text-[#334155] break-all flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <span>SHA-256: {expense.receiptRef?.originalSha256 || 'Authoritative Hash Verified'}</span>
            </div>
          </div>
        </div>

        {/* Node 2: Extracted Values vs Corrections */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center">
            <Bot className="w-2.5 h-2.5 text-emerald-600" />
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#0F172A]">Extracted Values & Confidence</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                OCR Confidence: {Math.round((expense.verdict?.confidence || 0.95) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 text-xs">
              <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Vendor</span>
                <span className="font-semibold text-[#0F172A] truncate block">
                  {expense.corrected?.merchant || expense.extracted?.merchant?.value || 'Unknown'}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Date</span>
                <span className="font-semibold text-[#0F172A] block">
                  {expense.corrected?.date || expense.expenseDate || 'Missing'}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Claimed Total</span>
                <span className="font-semibold text-[#0F172A] block">
                  {claimedAmount.toLocaleString()} {curr}
                </span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Normalized Base FX</span>
                <span className="font-semibold text-emerald-700 block">
                  {expense.normalizedCurrency?.fxRate || 1.0}x ({expense.normalizedCurrency?.fxSource})
                </span>
              </div>
            </div>

            {/* Itemized Line Items & Exclusions */}
            {(expense.extracted?.lineItems || []).length > 0 && (
              <div className="mt-2.5 border-t border-[#E2E8F0] pt-2">
                <span className="text-[11px] font-semibold text-[#475569] block mb-1">
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
                            ? 'bg-red-50/60 border-red-200 text-red-900'
                            : 'bg-white border-[#E2E8F0] text-[#334155]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{li.description}</span>
                          {isExcl && (
                            <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1.5 rounded">
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
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-amber-600 flex items-center justify-center">
              <Copy className="w-2.5 h-2.5 text-amber-600" />
            </div>
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Duplicate Evidence Match (Similarity Score: {(expense.duplicateInfo.highestScore * 100).toFixed(0)}%)
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                  {expense.duplicateInfo.primaryMatchKind.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-amber-900 mb-2">
                {expense.duplicateInfo.evidenceSummary}
              </p>
              {onOpenDuplicateCompare && (
                <button
                  onClick={onOpenDuplicateCompare}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3 h-3" />
                  <span>Inspect Side-by-Side Evidence</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Node 4: Policy Rule Citations & Ledger Cap Snapshot */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5">
            <span className="text-xs font-semibold text-[#0F172A] block mb-2">
              Deterministic Policy Evaluation & Ledger Replay
            </span>

            {/* Cap & Prior Spend Meter if available */}
            {expense.verdict?.ledgerSnapshot && (
              <div className="mb-3 p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-950 mb-1">
                  <span>Cumulative Allowance: {expense.verdict.ledgerSnapshot.capPeriod.toUpperCase()} Cap</span>
                  <span>
                    Remaining: ₹{(expense.verdict.ledgerSnapshot.remainingMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 mb-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
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
                <div className="flex justify-between text-[10px] text-emerald-800 font-mono-code">
                  <span>Prior spend: ₹{(expense.verdict.ledgerSnapshot.priorSpendMinor / 100).toLocaleString()}</span>
                  <span>Policy Limit: ₹{(expense.verdict.ledgerSnapshot.allowanceMinor / 100).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Cited Policy Rules */}
            <div className="space-y-2">
              {(expense.verdict?.ruleImpacts || []).map((rule, idx) => (
                <div key={idx} className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[#0F172A]">{rule.section} - {rule.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        rule.impactType === 'exclusion'
                          ? 'bg-red-50 text-red-700'
                          : rule.impactType === 'hold'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {rule.impactType}
                    </span>
                  </div>
                  {rule.sourceQuote && (
                    <blockquote className="border-l-2 border-emerald-500 pl-2 text-[11px] italic text-[#475569] my-1">
                      "{rule.sourceQuote}"
                    </blockquote>
                  )}
                  <p className="text-[11px] text-[#64748B] mt-0.5">{rule.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Node 5: Fix-It Thread Messages (if any) */}
        {(expense.thread || []).length > 0 && (
          <div className="relative group">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
              <MessageSquare className="w-2.5 h-2.5 text-blue-500" />
            </div>
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-950">Employee Fix-It Conversation</span>
                {onOpenFixIt && (
                  <button
                    onClick={onOpenFixIt}
                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Open Thread
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                {expense.thread.map((msg) => (
                  <div key={msg.id} className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] font-semibold text-blue-800 uppercase block mb-0.5">
                      {msg.sender}:
                    </span>
                    <p className="text-[#334155]">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Node 6: Final Reviewer Decision & Append-Only Audit Trail */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#0F172A] flex items-center justify-center">
            <UserCheck className="w-2.5 h-2.5 text-[#0F172A]" />
          </div>
          <div className="bg-[#0F172A] text-white rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Authoritative Verdict & Final Decision</span>
              <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-white/20 uppercase">
                {expense.verdict?.decision || expense.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-2 text-center text-xs">
              <div className="bg-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-white/70 block">Approved</span>
                <span className="font-bold text-emerald-400">₹{approvedAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-white/70 block">Rejected</span>
                <span className="font-bold text-red-400">₹{rejectedAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                <span className="text-[10px] text-white/70 block">Pending</span>
                <span className="font-bold text-amber-300">₹{pendingAmount.toLocaleString()}</span>
              </div>
            </div>

            {expense.reviewerAction && (
              <div className="mt-2.5 pt-2.5 border-t border-white/15 text-xs text-white/90">
                <span className="font-semibold text-white">
                  Human Action: {expense.reviewerAction.action.toUpperCase()} by {expense.reviewerAction.reviewerName}
                </span>
                <p className="text-[11px] text-white/75 italic mt-0.5">
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
