import React, { useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Scale,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { getEmployeeExpenses } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';
import { VerdictCard } from './VerdictCard';
import { EvidenceTimeline } from './EvidenceTimeline';
import { DuplicateCompareModal } from './DuplicateCompareModal';
import { FixItModal } from './FixItModal';

interface MyExpensesViewProps {
  onNavigateToSubmit: () => void;
  onNavigateToCaps: () => void;
}

export const MyExpensesView: React.FC<MyExpensesViewProps> = ({
  onNavigateToSubmit,
  onNavigateToCaps,
}) => {
  const activeEmp = getActiveEmployee();
  const [expenses, setExpenses] = useState<Expense[]>(() => getEmployeeExpenses(activeEmp.id));
  const [search, setSearch] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState<Expense | null>(null);
  const [showDupModal, setShowDupModal] = useState<Expense | null>(null);
  const [showFixItModal, setShowFixItModal] = useState<Expense | null>(null);

  const refreshExpenses = () => {
    const list = getEmployeeExpenses(activeEmp.id);
    setExpenses(list);
    if (selectedExpense) {
      const updated = list.find((e) => e.id === selectedExpense.id);
      if (updated) setSelectedExpense(updated);
    }
  };

  const filtered = expenses.filter((e) => {
    const query = search.toLowerCase();
    const merchant = (e.extracted?.merchant?.value || e.corrected?.merchant || '').toLowerCase();
    const cat = (e.extracted?.lineItems?.[0]?.category || '').toLowerCase();
    return merchant.includes(query) || cat.includes(query) || e.id.toLowerCase().includes(query);
  });

  // Calculate summary metrics
  const totalClaimed = expenses.reduce(
    (acc, e) => acc + (e.normalizedCurrency?.targetAmountMinor || 0),
    0
  ) / 100;
  const totalApproved = expenses.reduce(
    (acc, e) => acc + (e.verdict?.approvedAmountMinor || 0),
    0
  ) / 100;
  const pendingCount = expenses.filter(
    (e) => e.status === 'needs_info' || e.status === 'in_review' || e.status === 'submitted'
  ).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            My Expense Claims
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Logged in as <strong>{activeEmp.identity.name}</strong> ({activeEmp.department} • {activeEmp.grade} • {activeEmp.homeCity})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToCaps}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#334155] border border-[#CBD5E1] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <span>View My Caps</span>
          </button>
          <button
            onClick={onNavigateToSubmit}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Receipt</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] font-medium block">Total Claims</span>
          <span className="text-xl font-bold text-[#0F172A] block mt-1">{expenses.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] font-medium block">Total Claimed</span>
          <span className="text-xl font-bold text-[#0F172A] block mt-1">₹{totalClaimed.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <span className="text-xs text-emerald-800 font-medium block">Approved Reimbursement</span>
          <span className="text-xl font-bold text-emerald-700 block mt-1">₹{totalApproved.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-xs text-amber-900 font-medium block">Pending Action</span>
          <span className="text-xl font-bold text-amber-800 block mt-1">{pendingCount}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claims by vendor, category, or ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <FileText className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-[#0F172A]">No claims found</h4>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              Upload a receipt or invoice to submit your first corporate reimbursement.
            </p>
            <button
              onClick={onNavigateToSubmit}
              className="px-3 py-1.5 bg-[#0F172A] text-white rounded-xl text-xs font-semibold cursor-pointer shadow-2xs"
            >
              Submit First Receipt
            </button>
          </div>
        ) : (
          filtered.map((exp) => {
            const claimed = (exp.normalizedCurrency?.targetAmountMinor || 0) / 100;
            const approved = (exp.verdict?.approvedAmountMinor || 0) / 100;
            const isSelected = selectedExpense?.id === exp.id;

            return (
              <div
                key={exp.id}
                className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                  isSelected ? 'border-[#0F172A] ring-1 ring-[#0F172A]' : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setSelectedExpense(isSelected ? null : exp)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#475569]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant'}
                        </span>
                        <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                          {exp.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#64748B] mt-0.5">
                        <span>{exp.expenseDate}</span>
                        <span>•</span>
                        <span>{exp.extracted?.lineItems?.[0]?.category || 'General'}</span>
                        <span>•</span>
                        <span>{exp.context?.city || activeEmp.homeCity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side amounts and status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#0F172A] block">
                        ₹{claimed.toLocaleString()}
                      </span>
                      {exp.status === 'partially_approved' && (
                        <span className="text-[11px] font-semibold text-emerald-700 block">
                          ₹{approved.toLocaleString()} approved
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        exp.status === 'auto_approved' || exp.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exp.status === 'partially_approved'
                          ? 'bg-blue-100 text-blue-800'
                          : exp.status === 'needs_info'
                          ? 'bg-amber-100 text-amber-900'
                          : exp.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {exp.status.replace('_', ' ')}
                    </span>

                    <ChevronRight
                      className={`w-4 h-4 text-[#94A3B8] transition-transform ${
                        isSelected ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Card Details */}
                {isSelected && (
                  <div className="border-t border-[#E2E8F0] p-4 bg-[#F8FAFC] space-y-4">
                    <VerdictCard
                      expense={exp}
                      userRole="employee"
                      onRefresh={refreshExpenses}
                      onOpenTimeline={() => setShowTimelineModal(exp)}
                      onOpenDuplicateCompare={
                        exp.duplicateInfo?.candidates?.length
                          ? () => setShowDupModal(exp)
                          : undefined
                      }
                      onOpenFixIt={exp.status === 'needs_info' ? () => setShowFixItModal(exp) : undefined}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 border border-[#E2E8F0] shadow-xl relative">
            <button
              onClick={() => setShowTimelineModal(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[#64748B] hover:text-[#0F172A]"
            >
              ✕
            </button>
            <EvidenceTimeline
              expense={showTimelineModal}
              onOpenDuplicateCompare={() => {
                setShowDupModal(showTimelineModal);
                setShowTimelineModal(null);
              }}
              onOpenFixIt={() => {
                setShowFixItModal(showTimelineModal);
                setShowTimelineModal(null);
              }}
            />
          </div>
        </div>
      )}

      {showDupModal && (
        <DuplicateCompareModal
          isOpen={Boolean(showDupModal)}
          onClose={() => setShowDupModal(null)}
          currentExpense={showDupModal}
          onRefresh={refreshExpenses}
        />
      )}

      {showFixItModal && (
        <FixItModal
          isOpen={Boolean(showFixItModal)}
          onClose={() => setShowFixItModal(null)}
          expense={showFixItModal}
          onRefresh={refreshExpenses}
        />
      )}
    </div>
  );
};
