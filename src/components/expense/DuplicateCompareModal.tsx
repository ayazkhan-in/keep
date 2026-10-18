import React, { useState } from 'react';
import {
  X,
  Copy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  Calendar,
  Building2,
  DollarSign,
  Hash,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { resolveDuplicateClaim } from '../../services/expenseService';
import { getActiveEmployee, getEmployeeDisplayName } from '../../services/employeeService';

interface DuplicateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentExpense: Expense;
  matchedExpense?: Expense;
  onRefresh: () => void;
}

export const DuplicateCompareModal: React.FC<DuplicateCompareModalProps> = ({
  isOpen,
  onClose,
  currentExpense,
  matchedExpense,
  onRefresh,
}) => {
  const [dismissReason, setDismissReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeEmp = getActiveEmployee();

  if (!isOpen) return null;

  const dupInfo = currentExpense.duplicateInfo;
  const topCandidate = dupInfo?.candidates[0];

  const handleResolve = async (status: 'confirmed' | 'dismissed') => {
    setIsSubmitting(true);
    try {
      resolveDuplicateClaim({
        expenseId: currentExpense.id,
        reviewer: {
          id: activeEmp.id,
          name: activeEmp.identity.name,
          role: activeEmp.role,
        },
        resolutionStatus: status,
        reason: dismissReason || (status === 'confirmed' ? 'Confirmed by Finance reviewer' : 'Dismissed as legitimate distinct purchase'),
      });
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(`Error updating duplicate status: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Duplicate Evidence Comparison
              </h3>
              <p className="text-[11px] text-slate-500">
                Side-by-side inspection of visual hashes, timestamps, and order references
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Evidence Banner */}
        <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">
              Match Kind: {dupInfo?.primaryMatchKind?.toUpperCase()} (Score: {((dupInfo?.highestScore || 0) * 100).toFixed(0)}%)
            </span>
            <span className="text-[11px] text-amber-900/90">{dupInfo?.evidenceSummary}</span>
          </div>
        </div>

        {/* Side-by-side cards */}
        <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/40">
          {/* Current Claim */}
          <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900">Current Submission</span>
              <span className="text-[10px] font-mono-code bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium border border-slate-200">
                ID: {currentExpense.id}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-medium text-slate-900">{currentExpense.employeeName || getEmployeeDisplayName(currentExpense.employeeId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-900">{currentExpense.expenseDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor:</span>
                <span className="font-medium text-slate-900">
                  {currentExpense.extracted?.merchant?.value || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900 font-mono-code">
                  ₹{((currentExpense.normalizedCurrency?.targetAmountMinor || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-mono-code text-[11px]">
                <span className="text-slate-500">Order Ref:</span>
                <span className="text-slate-700">{currentExpense.extracted?.orderId?.value || 'None'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] font-mono-code break-all text-slate-400">
                <span>SHA-256: {currentExpense.receiptRef?.originalSha256 || 'Verified'}</span>
              </div>
            </div>
          </div>

          {/* Matched / Candidate Claim */}
          <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900">Matched Earlier Claim</span>
              <span className="text-[10px] font-mono-code bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200/60">
                ID: {topCandidate?.claimId || matchedExpense?.id || 'Earlier Claim'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee:</span>
                <span className="font-medium text-slate-900">
                  {topCandidate?.employeeName || matchedExpense?.employeeName || getEmployeeDisplayName(topCandidate?.employeeId || matchedExpense?.employeeId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-medium text-slate-900">
                  {topCandidate?.expenseDate || matchedExpense?.expenseDate}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor:</span>
                <span className="font-medium text-slate-900">
                  {topCandidate?.merchant || matchedExpense?.extracted?.merchant?.value}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900 font-mono-code">
                  ₹{(((topCandidate?.amountMinor || matchedExpense?.normalizedCurrency?.targetAmountMinor || 0)) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-mono-code text-[11px]">
                <span className="text-slate-500">Order Ref:</span>
                <span className="text-slate-700">{matchedExpense?.extracted?.orderId?.value || 'Matching'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[10px] font-mono-code break-all text-slate-400">
                <span>Candidate Match Evidence Recorded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dismissal / Resolution input */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="Reviewer note (e.g. Confirmed separate purchase on subsequent day)"
            className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-colors"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleResolve('dismissed')}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dismiss Flag (Valid)</span>
            </button>
            <button
              onClick={() => handleResolve('confirmed')}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Confirm Duplicate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
