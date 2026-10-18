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
  LayoutGrid,
  List,
  Utensils,
  Plane,
  Building2,
  Car,
  Fuel,
  Laptop,
  Briefcase,
  Coffee,
} from 'lucide-react';
import { Expense, ClaimStatus } from '../../types/expense';
import {
  getAllExpenses,
  applyReviewerDecision,
  subscribeExpenses,
} from '../../services/expenseService';
import { getActiveEmployee, getEmployeeDisplayName } from '../../services/employeeService';
import { VerdictCard } from './VerdictCard';

// Subtle grey standalone category icon (no background color wrapper)
const getCategoryIcon = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (
    cat.includes('meal') ||
    cat.includes('food') ||
    cat.includes('dining') ||
    cat.includes('lunch') ||
    cat.includes('dinner') ||
    cat.includes('breakfast')
  ) {
    return <Utensils className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (cat.includes('flight') || cat.includes('air') || cat.includes('travel')) {
    return <Plane className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (
    cat.includes('hotel') ||
    cat.includes('lodg') ||
    cat.includes('stay') ||
    cat.includes('room') ||
    cat.includes('accommodat')
  ) {
    return <Building2 className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (
    cat.includes('transport') ||
    cat.includes('cab') ||
    cat.includes('taxi') ||
    cat.includes('uber') ||
    cat.includes('ola') ||
    cat.includes('ride') ||
    cat.includes('auto')
  ) {
    return <Car className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (cat.includes('fuel') || cat.includes('gas') || cat.includes('petrol')) {
    return <Fuel className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (
    cat.includes('software') ||
    cat.includes('saas') ||
    cat.includes('tech') ||
    cat.includes('cloud') ||
    cat.includes('subscri') ||
    cat.includes('infra') ||
    cat.includes('it')
  ) {
    return <Laptop className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (
    cat.includes('supply') ||
    cat.includes('supplies') ||
    cat.includes('office') ||
    cat.includes('stationery') ||
    cat.includes('hardware')
  ) {
    return <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (cat.includes('entertain') || cat.includes('client') || cat.includes('coffee') || cat.includes('tea')) {
    return <Coffee className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  return <Receipt className="w-4 h-4 text-slate-400 shrink-0" />;
};

export const AllClaimsView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const activeReviewer = getActiveEmployee();

  // Real-time Firestore sync
  React.useEffect(() => {
    const unsubscribe = subscribeExpenses((updated) => {
      setExpenses(updated);
      if (selectedClaim) {
        const found = updated.find((e) => e.id === selectedClaim.id);
        if (found) setSelectedClaim(found);
      }
    });
    return () => unsubscribe();
  }, [selectedClaim?.id]);

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
          (exp.employeeName || '').toLowerCase().includes(q) ||
          exp.employeeId.toLowerCase().includes(q) ||
          (exp.extracted?.merchant?.value || '').toLowerCase().includes(q) ||
          (exp.extracted?.lineItems?.[0]?.category || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dateA = a.expenseDate || '';
        const dateB = b.expenseDate || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const subA = a.submittedAt || '';
        const subB = b.submittedAt || '';
        if (subA !== subB) return subB.localeCompare(subA);
        return (b.id || '').localeCompare(a.id || '');
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
      group.totalAmountMinor += exp.normalizedCurrency?.targetAmountMinor ?? 0;
    }

    return Array.from(map.values());
  }, [filteredExpenses]);

  // Minimal status dot + label
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'auto_approved':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{status === 'auto_approved' ? 'Auto-Approved' : 'Approved'}</span>
          </span>
        );
      case 'partially_approved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Partial</span>
          </span>
        );
      case 'needs_info':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Needs Info</span>
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>In Review</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Rejected</span>
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Paid</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="capitalize">{status.replace('_', ' ')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            All Organization Claims
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit stream separated chronologically by transaction date.
          </p>
        </div>

        {/* Total stats pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
          <span className="text-slate-500">Volume:</span>
          <span className="font-semibold text-slate-900">{expenses.length} Claims</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono-code font-bold text-emerald-600">
            ₹{(expenses.reduce((acc, e) => acc + (e.normalizedCurrency?.targetAmountMinor ?? 0), 0) / 100).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter, Search & View Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'in_review', 'auto_approved', 'approved', 'needs_info', 'rejected', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-all cursor-pointer ${
                selectedStatus === status
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search & Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Compact List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Date-Separated Claims Stream */}
      {dateGroups.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">No claims found</p>
          <p className="text-xs text-slate-500 mt-0.5">Try adjusting the filter or search query.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.date} className="space-y-2.5">
              {/* Horizontal Line with Date Header Label */}
              <div className="relative flex items-center pt-1 pb-1">
                <div className="flex-grow border-t border-slate-200"></div>
                <div className="flex-shrink mx-3 px-3 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>{group.formattedDate}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono-code text-slate-500">
                    {group.claims.length} claim{group.claims.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] font-mono-code font-bold text-slate-900">
                    ₹{(group.totalAmountMinor / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* VIEW MODE: COMPACT MINIMAL CARDS */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.claims.map((exp) => {
                    const merchant = exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant';
                    const category = exp.extracted?.lineItems?.[0]?.category || 'General';
                    const riskScore = exp.verdict?.riskScore ?? 0;
                    const employeeName = exp.employeeName || getEmployeeDisplayName(exp.employeeId);

                    return (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedClaim(exp)}
                        className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3.5 transition-all shadow-2xs hover:shadow-sm cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top: Merchant with Grey Icon (No background color) & Amount */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {getCategoryIcon(category)}
                              <h3 className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                {merchant}
                              </h3>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono-code">
                                ₹{((exp.normalizedCurrency?.targetAmountMinor ?? 0) / 100).toFixed(2)}
                              </span>
                              {exp.normalizedCurrency?.sourceCurrency && exp.normalizedCurrency.sourceCurrency !== 'INR' && (
                                <div className="font-mono-code text-[10px] text-slate-500">
                                  {((exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100))).toFixed(2)} {exp.normalizedCurrency.sourceCurrency}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Subtitle: Category & City */}
                          <div className="text-[11px] text-slate-500 mb-2 truncate">
                            <span>{category}</span>
                            {exp.context?.city && <span> • {exp.context.city}</span>}
                            <span className="font-mono-code text-[10px] text-slate-400"> • {exp.id}</span>
                          </div>
                        </div>

                        {/* Footer: Actual Employee Name & Minimal Status */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="truncate max-w-[140px] font-medium text-slate-600" title={employeeName}>
                            {employeeName}
                          </span>
                          <div className="flex items-center gap-2">
                            {riskScore >= 60 && (
                              <span className="text-[10px] font-mono-code font-bold text-rose-600">
                                Risk {riskScore}
                              </span>
                            )}
                            {getStatusBadge(exp.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW MODE: COMPACT MINIMAL LIST */}
              {viewMode === 'list' && (
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {group.claims.map((exp) => {
                    const merchant = exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant';
                    const category = exp.extracted?.lineItems?.[0]?.category || 'General';
                    const riskScore = exp.verdict?.riskScore ?? 0;
                    const employeeName = exp.employeeName || getEmployeeDisplayName(exp.employeeId);

                    return (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedClaim(exp)}
                        className="px-4 py-2.5 hover:bg-slate-50/80 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                      >
                        {/* Left: Grey Icon (No background color), Merchant & Meta */}
                        <div className="min-w-0 flex-1 flex items-center gap-2.5">
                          {getCategoryIcon(category)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                {merchant}
                              </span>
                              <span className="text-[10px] font-mono-code text-slate-400">
                                {exp.id}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              <span>{category}</span>
                              {exp.context?.city && <span> • {exp.context.city}</span>}
                              <span> • by <strong className="text-slate-600 font-medium">{employeeName}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status & Amount */}
                        <div className="flex items-center gap-5 shrink-0">
                          {riskScore >= 60 && (
                            <span className="text-[10px] font-mono-code font-bold text-rose-600 hidden md:inline">
                              Risk {riskScore}
                            </span>
                          )}

                          <div className="hidden sm:block">
                            {getStatusBadge(exp.status)}
                          </div>

                          <div className="text-right min-w-[90px]">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 font-mono-code">
                              ₹{((exp.normalizedCurrency?.targetAmountMinor ?? 0) / 100).toFixed(2)}
                            </div>
                            {exp.normalizedCurrency?.sourceCurrency && exp.normalizedCurrency.sourceCurrency !== 'INR' && (
                              <div className="font-mono-code text-[10px] text-slate-500">
                                {((exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100))).toFixed(2)} {exp.normalizedCurrency.sourceCurrency}
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY MODAL: Receipt, Essential Details, and Progress */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm sm:text-base text-slate-900">
                      {selectedClaim.extracted?.merchant?.value || selectedClaim.id}
                    </h2>
                    <span className="font-mono-code text-xs text-slate-400">
                      ({selectedClaim.id})
                    </span>
                    {getStatusBadge(selectedClaim.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted on {selectedClaim.submittedAt ? new Date(selectedClaim.submittedAt).toLocaleString() : 'Recent'} by <strong className="text-slate-700">{selectedClaim.employeeName || getEmployeeDisplayName(selectedClaim.employeeId)}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Column Layout */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
              {/* Left Column: Receipt Preview & Hashes (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      Original Receipt Evidence
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase">
                      {selectedClaim.receiptRef?.mimeType || (selectedClaim as any).receiptReference?.mimeType || 'image/jpeg'}
                    </span>
                  </div>

                  {/* Simulated High-Fidelity Paper Receipt Ticket */}
                  <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm font-mono-code text-xs text-slate-800 space-y-3 relative overflow-hidden">
                    {/* Jagged paper top */}
                    <div className="border-b-2 border-dashed border-slate-300 pb-3 text-center">
                      <div className="font-bold text-sm tracking-wider uppercase text-slate-900">
                        {selectedClaim.extracted?.merchant?.value || 'JP Morgan Vendor Receipt'}
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
                      {(selectedClaim.extracted?.lineItems || []).map((item, idx) => {
                        const itemAmt = typeof item.amount === 'number'
                          ? item.amount
                          : typeof (item as any).amountMinor === 'number'
                          ? (item as any).amountMinor / 100
                          : 0;
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="truncate pr-2">
                              {item.quantity ? `${item.quantity}x ` : ''}
                              {item.description}
                            </span>
                            <span className="font-bold">
                              ₹{itemAmt.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tax & Total */}
                    <div className="border-t border-slate-300 pt-2 space-y-1 text-[11px]">
                      {selectedClaim.extracted?.tax?.value !== undefined && (
                        <div className="flex justify-between text-slate-600">
                          <span>Statutory GST/Tax:</span>
                          <span>₹{(Number(selectedClaim.extracted.tax.value) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedClaim.extracted?.tip?.value !== undefined && (
                        <div className="flex justify-between text-slate-600">
                          <span>Gratuity/Tip:</span>
                          <span>₹{(Number(selectedClaim.extracted.tip.value) || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-400">
                        <span>TOTAL AMOUNT:</span>
                        <span>₹{(((selectedClaim.normalizedCurrency?.targetAmountMinor ?? 0)) / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Barcode simulation */}
                    <div className="pt-3 text-center border-t border-dashed border-slate-300">
                      <div className="h-6 bg-slate-800 mx-auto rounded opacity-80 flex items-center justify-center text-white text-[8px] tracking-[6px]">
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
                      <span className="truncate max-w-[200px]" title={selectedClaim.receiptRef?.originalSha256 || (selectedClaim as any).receiptReference?.sha256}>
                        {selectedClaim.receiptRef?.originalSha256 || (selectedClaim as any).receiptReference?.sha256 || 'e3b0c44298fc1c149afbf4c8996fb924...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">dHash (Perceptual):</span>
                      <span>{selectedClaim.receiptRef?.dHash || (selectedClaim as any).receiptReference?.dHash || 'a4f89c02e1b6d789'}</span>
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
