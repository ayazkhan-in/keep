import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  CreditCard,
  Sparkles,
  FileText,
  DollarSign,
  ArrowRight,
  Shield,
  X,
  ExternalLink,
  Layers,
  ChevronRight,
  Receipt,
  User,
  Quote,
  AlertOctagon,
} from 'lucide-react';
import { Expense, ClaimStatus } from '../../types/expense';
import { getAllExpenses, applyReviewerDecision } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';
import { VerdictCard } from './VerdictCard';

export const AllClaimsView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Expense | null>(null);

  const activeReviewer = getActiveEmployee();

  const refreshExpenses = () => {
    setExpenses(getAllExpenses());
    if (selectedClaim) {
      const updated = getAllExpenses().find((e) => e.id === selectedClaim.id);
      setSelectedClaim(updated || null);
    }
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (selectedStatus !== 'all' && exp.status !== selectedStatus) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          exp.id.toLowerCase().includes(q) ||
          exp.employeeId.toLowerCase().includes(q) ||
          (exp.extracted?.merchant?.value || '').toLowerCase().includes(q) ||
          (exp.extracted?.lineItems?.[0]?.category || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Sort chronologically descending
        if (a.expenseDate !== b.expenseDate) return b.expenseDate.localeCompare(a.expenseDate);
        if (a.submittedAt !== b.submittedAt) return b.submittedAt.localeCompare(a.submittedAt);
        return b.id.localeCompare(a.id);
      });
  }, [expenses, selectedStatus, searchQuery]);

  // Group by date
  const dateGroups = useMemo(() => {
    const map = new Map<string, { date: string; formattedDate: string; claims: Expense[]; totalAmountMinor: number }>();

    for (const exp of filteredExpenses) {
      const dateKey = exp.expenseDate || 'Unknown Date';
      if (!map.has(dateKey)) {
        let formatted = dateKey;
        try {
          const parsed = new Date(dateKey);
          if (!isNaN(parsed.getTime())) {
            formatted = parsed.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });
          }
        } catch {
          // fallback
        }
        map.set(dateKey, {
          date: dateKey,
          formattedDate: formatted,
          claims: [],
          totalAmountMinor: 0,
        });
      }

      const group = map.get(dateKey)!;
      group.claims.push(exp);
      group.totalAmountMinor += exp.normalizedCurrency.targetAmountMinor;
    }

    return Array.from(map.values());
  }, [filteredExpenses]);

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
            Partial
          </span>
        );
      case 'needs_info':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-600" />
            All Organization Claims
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Chronological audit stream separated by transaction date. Click any claim card to inspect the receipt & timeline overlay.
          </p>
        </div>

        {/* Total stats pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs shadow-2xs">
          <span className="text-[#64748B]">Total Volume:</span>
          <span className="font-bold text-[#0F172A]">{expenses.length} Claims</span>
          <span className="text-[#94A3B8]">•</span>
          <span className="font-mono-code font-bold text-indigo-700">
            ₹{(expenses.reduce((acc, e) => acc + e.normalizedCurrency.targetAmountMinor, 0) / 100).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'in_review', 'auto_approved', 'approved', 'needs_info', 'rejected', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all cursor-pointer ${
                selectedStatus === status
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by merchant, employee, claim ID..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-[#F8FAFC] border border-[#E2E8F0] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Date-Separated Claims Stream */}
      {dateGroups.length === 0 ? (
        <div className="py-16 text-center bg-white border border-[#E2E8F0] rounded-2xl">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#0F172A]">No claims match criteria</p>
          <p className="text-xs text-[#64748B] mt-1">Try resetting the status filter or search query.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Horizontal Line with Date Header Label */}
              <div className="relative flex items-center pt-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <div className="flex-shrink mx-4 px-3.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{group.formattedDate}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono-code text-indigo-600">
                    {group.claims.length} claim{group.claims.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono-code font-bold text-slate-900">
                    ₹{(group.totalAmountMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Cards Grid for this Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {group.claims.map((exp) => {
                  const merchant = exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant';
                  const category = exp.extracted?.lineItems?.[0]?.category || 'General';
                  const riskScore = exp.verdict?.riskScore ?? 0;
                  const hasDup = Boolean(exp.duplicateInfo?.candidateClaimIds?.length);

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedClaim(exp)}
                      className="bg-white border border-[#E2E8F0] hover:border-indigo-300 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Meta: Badges & ID */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="font-mono-code text-[11px] font-bold text-slate-500">
                            {exp.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(exp.status)}
                            {riskScore >= 60 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Risk: {riskScore}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Merchant & Category */}
                        <h3 className="font-bold text-sm text-[#0F172A] group-hover:text-indigo-600 transition-colors truncate">
                          {merchant}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-700">
                            {category}
                          </span>
                          {exp.context?.city && (
                            <span>• {exp.context.city}</span>
                          )}
                        </div>

                        {/* Employee identity */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                            {exp.employeeId.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium truncate">{exp.employeeId}</span>
                        </div>
                      </div>

                      {/* Financial Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase font-mono-code">Claimed</div>
                          <div className="font-bold text-sm text-[#0F172A]">
                            ₹{(exp.normalizedCurrency.targetAmountMinor / 100).toFixed(2)}
                          </div>
                          {exp.normalizedCurrency.sourceCurrency !== 'INR' && (
                            <div className="font-mono-code text-[10px] text-slate-500">
                              {exp.normalizedCurrency.sourceAmount.toFixed(2)} {exp.normalizedCurrency.sourceCurrency}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY MODAL: Receipt, Essential Details, and Progress */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#E2E8F0] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#0F172A]">
                      {selectedClaim.extracted?.merchant?.value || selectedClaim.id}
                    </h2>
                    <span className="font-mono-code text-xs text-slate-500">
                      ({selectedClaim.id})
                    </span>
                    {getStatusBadge(selectedClaim.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted on {new Date(selectedClaim.submittedAt).toLocaleString()} by <strong className="text-slate-700">{selectedClaim.employeeId}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Column Layout */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              {/* Left Column: Receipt Preview & Hashes (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-indigo-600" />
                      Original Receipt Evidence
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase">
                      {selectedClaim.receiptReference?.mimeType || 'image/jpeg'}
                    </span>
                  </div>

                  {/* Simulated High-Fidelity Paper Receipt Ticket */}
                  <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm font-mono-code text-xs text-slate-800 space-y-3 relative overflow-hidden">
                    {/* Jagged paper top */}
                    <div className="border-b-2 border-dashed border-slate-300 pb-3 text-center">
                      <div className="font-bold text-sm tracking-wider uppercase text-slate-900">
                        {selectedClaim.extracted?.merchant?.value || 'Acme Vendor Receipt'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {selectedClaim.context?.city || 'Bengaluru'}, India
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Date: {selectedClaim.expenseDate}
                      </div>
                    </div>

                    {/* Itemized Lines */}
                    <div className="space-y-1.5 py-1 text-[11px]">
                      {(selectedClaim.extracted?.lineItems || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="truncate pr-2">
                            {item.quantity ? `${item.quantity}x ` : ''}
                            {item.description}
                          </span>
                          <span className="font-bold">
                            ₹{(item.amountMinor / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tax & Total */}
                    <div className="border-t border-slate-300 pt-2 space-y-1 text-[11px]">
                      {selectedClaim.extracted?.tax?.value !== undefined && (
                        <div className="flex justify-between text-slate-600">
                          <span>Statutory GST/Tax:</span>
                          <span>₹{(selectedClaim.extracted.tax.value).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedClaim.extracted?.tip?.value !== undefined && (
                        <div className="flex justify-between text-slate-600">
                          <span>Gratuity/Tip:</span>
                          <span>₹{(selectedClaim.extracted.tip.value).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-400">
                        <span>TOTAL AMOUNT:</span>
                        <span>₹{(selectedClaim.normalizedCurrency.targetAmountMinor / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Barcode simulation */}
                    <div className="pt-3 text-center border-t border-dashed border-slate-300">
                      <div className="h-7 bg-slate-900 mx-auto rounded opacity-80 flex items-center justify-center text-white text-[8px] tracking-[6px]">
                        ||||| | |||| ||| |||||
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">
                        TXN REF: {selectedClaim.id.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic Verification Hashes */}
                  <div className="mt-3 p-2.5 bg-white rounded-xl border border-slate-200 text-[10px] font-mono-code space-y-1 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">SHA-256:</span>
                      <span className="truncate max-w-[200px]" title={selectedClaim.receiptReference?.sha256}>
                        {selectedClaim.receiptReference?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb924...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">dHash (Perceptual):</span>
                      <span>{selectedClaim.receiptReference?.dHash || 'a4f89c02e1b6d789'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Essential Details, Progress & Verdict (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <VerdictCard
                  expense={selectedClaim}
                  userRole="finance"
                  onActionComplete={refreshExpenses}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
