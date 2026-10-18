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
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes/routeConfig';
import { Expense } from '../../types/expense';
import { getEmployeeExpenses, subscribeExpenses } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';
import { VerdictCard } from './VerdictCard';
import { EvidenceTimeline } from './EvidenceTimeline';
import { DuplicateCompareModal } from './DuplicateCompareModal';
import { FixItModal } from './FixItModal';
import { EmployeePolicyAssistant } from './EmployeePolicyAssistant';

interface MyExpensesViewProps {
  onNavigateToSubmit?: () => void;
  onNavigateToCaps?: () => void;
}

export const MyExpensesView: React.FC<MyExpensesViewProps> = ({
  onNavigateToSubmit,
  onNavigateToCaps,
}) => {
  const navigate = useNavigate();
  const handleGoToSubmit = onNavigateToSubmit || (() => navigate(ROUTES.EMPLOYEE.SUBMIT));
  const handleGoToCaps = onNavigateToCaps || (() => navigate(ROUTES.EMPLOYEE.ALLOWANCES));
  const activeEmp = getActiveEmployee();
  const [expenses, setExpenses] = useState<Expense[]>(() => getEmployeeExpenses(activeEmp.id));
  const [search, setSearch] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState<Expense | null>(null);
  const [showDupModal, setShowDupModal] = useState<Expense | null>(null);
  const [showFixItModal, setShowFixItModal] = useState<Expense | null>(null);

  // Real-time Firestore sync
  React.useEffect(() => {
    const unsubscribe = subscribeExpenses(() => {
      const list = getEmployeeExpenses(activeEmp.id);
      setExpenses(list);
      if (selectedExpense) {
        const updated = list.find((e) => e.id === selectedExpense.id);
        if (updated) setSelectedExpense(updated);
      }
    });
    return () => unsubscribe();
  }, [activeEmp.id, selectedExpense?.id]);

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Expense Claims
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeEmp.identity.name} • {activeEmp.department} • {activeEmp.grade}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleGoToCaps}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs text-center"
          >
            <span>View Limits</span>
          </button>
          <button
            onClick={handleGoToSubmit}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs text-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Claim</span>
          </button>
        </div>
      </div>

      {/* Employee Policy Coverage Assistant */}
      <EmployeePolicyAssistant />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">Total Claims</span>
          <span className="text-lg font-bold text-slate-900 block mt-1 font-mono-code">{expenses.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">Total Claimed</span>
          <span className="text-lg font-bold text-slate-900 block mt-1 font-mono-code">₹{totalClaimed.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block truncate">Approved Reimbursed</span>
          <span className="text-lg font-bold text-emerald-700 block mt-1 font-mono-code">₹{totalApproved.toLocaleString()}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">Pending Action</span>
          <span className="text-lg font-bold text-slate-900 block mt-1 font-mono-code">{pendingCount}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claims by vendor, category, or ID..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Claims List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200/80 p-6">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-900">No claims found</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Upload a receipt or invoice to submit your first corporate reimbursement.
            </p>
            <button
              onClick={handleGoToSubmit}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit First Receipt</span>
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
                className={`bg-white rounded-xl border transition-all shadow-2xs overflow-hidden ${
                  isSelected ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setSelectedExpense(isSelected ? null : exp)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">
                          {exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown Merchant'}
                        </span>
                        <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                          {exp.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
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
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono-code block">
                        ₹{claimed.toLocaleString()}
                      </span>
                      {exp.status === 'partially_approved' && (
                        <span className="text-[10px] font-medium text-emerald-700 block font-mono-code">
                          ₹{approved.toLocaleString()} approved
                        </span>
                      )}
                    </div>

                    {/* Status Dot & Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border capitalize ${
                        exp.status === 'auto_approved' || exp.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : exp.status === 'partially_approved'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                          : exp.status === 'needs_info'
                          ? 'bg-amber-50 text-amber-800 border-amber-200/60'
                          : exp.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                          : 'bg-slate-50 text-slate-700 border-slate-200/60'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          exp.status === 'auto_approved' || exp.status === 'approved'
                            ? 'bg-emerald-500'
                            : exp.status === 'partially_approved'
                            ? 'bg-amber-500'
                            : exp.status === 'needs_info'
                            ? 'bg-amber-500'
                            : exp.status === 'rejected'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span>{exp.status.replace('_', ' ')}</span>
                    </span>

                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
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
