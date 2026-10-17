import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  CreditCard,
  Layers,
  Calendar,
  Filter,
  Search,
  Sparkles,
  DollarSign,
  Building,
  Users,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { getAllExpenses, applyReviewerDecision } from '../../services/expenseService';
import { getActiveEmployee } from '../../services/employeeService';

export const ExportView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const [statusFilter, setStatusFilter] = useState<'approved' | 'paid' | 'all'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const activeReviewer = getActiveEmployee();

  const refreshExpenses = () => {
    setExpenses(getAllExpenses());
  };

  // Filtered claims
  const exportableExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (statusFilter === 'approved') {
          return exp.status === 'approved' || exp.status === 'auto_approved';
        }
        if (statusFilter === 'paid') {
          return exp.status === 'paid';
        }
        return true; // 'all'
      })
      .filter((exp) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          exp.id.toLowerCase().includes(q) ||
          exp.employeeId.toLowerCase().includes(q) ||
          (exp.extracted?.merchant?.value || '').toLowerCase().includes(q) ||
          (exp.extracted?.lineItems?.[0]?.category || '').toLowerCase().includes(q)
        );
      });
  }, [expenses, statusFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let approvedCount = 0;
    let approvedTotalMinor = 0;
    let paidCount = 0;
    let paidTotalMinor = 0;

    for (const exp of expenses) {
      const amt = exp.verdict?.approvedAmountMinor ?? exp.normalizedCurrency.targetAmountMinor ?? 0;
      if (exp.status === 'approved' || exp.status === 'auto_approved') {
        approvedCount++;
        approvedTotalMinor += amt;
      } else if (exp.status === 'paid') {
        paidCount++;
        paidTotalMinor += amt;
      }
    }

    return {
      approvedCount,
      approvedTotal: approvedTotalMinor / 100,
      paidCount,
      paidTotal: paidTotalMinor / 100,
    };
  }, [expenses]);

  // Multi-select toggle
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === exportableExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(exportableExpenses.map((e) => e.id)));
    }
  };

  // CSV Generation Helper
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Standard Accounting CSV
  const handleExportStandardCSV = () => {
    const targetClaims = exportableExpenses.filter(
      (e) => selectedIds.size === 0 || selectedIds.has(e.id)
    );

    if (targetClaims.length === 0) {
      alert('No claims selected for export.');
      return;
    }

    const headers = [
      'Claim ID',
      'Expense Date',
      'Submission Date',
      'Employee ID',
      'Category',
      'Merchant',
      'Source Amount',
      'Source Currency',
      'FX Rate',
      'Approved Amount (INR)',
      'Rejected Amount (INR)',
      'Status',
      'Risk Score',
      'Reviewer',
      'Rule Citations',
    ];

    const rows = targetClaims.map((exp) => {
      const merchant = exp.extracted?.merchant?.value || exp.corrected?.merchant || 'Unknown';
      const category = exp.extracted?.lineItems?.[0]?.category || 'General';
      const citations = exp.verdict?.ruleImpacts.map((r) => r.ruleId).join(';') || 'sys-auto-standard';
      const reviewer = exp.reviewerAction?.reviewerName || (exp.status === 'auto_approved' ? 'System Touchless' : 'Pending');

      return [
        `"${exp.id}"`,
        `"${exp.expenseDate}"`,
        `"${exp.submittedAt.split('T')[0]}"`,
        `"${exp.employeeId}"`,
        `"${category}"`,
        `"${merchant.replace(/"/g, '""')}"`,
        (exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100)).toFixed(2),
        `"${exp.normalizedCurrency.sourceCurrency}"`,
        exp.normalizedCurrency.fxRate.toFixed(4),
        ((exp.verdict?.approvedAmountMinor || 0) / 100).toFixed(2),
        ((exp.verdict?.rejectedAmountMinor || 0) / 100).toFixed(2),
        `"${exp.status}"`,
        exp.verdict?.riskScore ?? 0,
        `"${reviewer}"`,
        `"${citations}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `keepr_reimbursements_${new Date().toISOString().split('T')[0]}.csv`);

    setActionNotice(`Exported ${targetClaims.length} claims to standard CSV.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Export Tally / ERP Format CSV
  const handleExportTallyCSV = () => {
    const targetClaims = exportableExpenses.filter(
      (e) => selectedIds.size === 0 || selectedIds.has(e.id)
    );

    if (targetClaims.length === 0) {
      alert('No claims selected for export.');
      return;
    }

    const headers = [
      'Voucher Date',
      'Voucher Type',
      'Debit Ledger (Expense)',
      'Credit Ledger (Bank/Payable)',
      'Amount (INR)',
      'Narration',
    ];

    const rows = targetClaims.map((exp) => {
      const category = exp.extracted?.lineItems?.[0]?.category || 'Travel & Meals Expense';
      const merchant = exp.extracted?.merchant?.value || 'Merchant';
      const amt = ((exp.verdict?.approvedAmountMinor || exp.normalizedCurrency.targetAmountMinor) / 100).toFixed(2);
      const narration = `Reimbursement for claim ${exp.id} - ${merchant} (${exp.employeeId})`;

      return [
        `"${exp.expenseDate}"`,
        `"Payment"`,
        `"${category}"`,
        `"HDFC Corporate Bank A/c"`,
        amt,
        `"${narration.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `keepr_tally_erp_batch_${new Date().toISOString().split('T')[0]}.csv`);

    setActionNotice(`Exported ${targetClaims.length} vouchers to Tally ERP format.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Mark Selected Claims as Paid (Simulate Disbursement)
  const handleMarkSelectedPaid = () => {
    const targetClaims = exportableExpenses.filter(
      (e) => (selectedIds.size === 0 || selectedIds.has(e.id)) && (e.status === 'approved' || e.status === 'auto_approved')
    );

    if (targetClaims.length === 0) {
      alert('No approved claims selected to mark as paid.');
      return;
    }

    for (const claim of targetClaims) {
      applyReviewerDecision({
        expenseId: claim.id,
        reviewer: {
          id: activeReviewer.id,
          name: activeReviewer.identity.name,
          role: 'finance',
        },
        action: 'mark_paid',
        reason: 'Corporate reimbursement disbursed via simulated ERP batch payment run.',
      });
    }

    refreshExpenses();
    setSelectedIds(new Set());
    setActionNotice(`Marked ${targetClaims.length} claims as Paid!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Batch Reimbursement & Accounting Export
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Export approved corporate expense batches with full rule citations for general ledger & ERP integration.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportStandardCSV}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Standard CSV</span>
          </button>

          <button
            onClick={handleExportTallyCSV}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Tally ERP Format</span>
          </button>

          <button
            onClick={handleMarkSelectedPaid}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Mark Paid ({selectedIds.size > 0 ? selectedIds.size : 'All Eligible'})</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
            Ready for Payout (Approved)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700">
              ₹{stats.approvedTotal.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">
              ({stats.approvedCount} claims)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Includes touchless auto-approved & reviewer approvals
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
            Historical Disbursed (Paid)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-indigo-700">
              ₹{stats.paidTotal.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">
              ({stats.paidCount} claims)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Reimbursements successfully marked as settled
          </p>
        </div>

        <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl shadow-2xs">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#64748B] font-semibold">
            Base Currency & Provenance
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F172A]">INR (₹)</span>
            <span className="text-xs text-emerald-700 font-semibold">100% Audited</span>
          </div>
          <p className="mt-1 text-[11px] text-[#64748B]">
            All transactions normalized at transaction-date FX
          </p>
        </div>
      </div>

      {/* Table & Filter Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              Approved for Payout ({stats.approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'paid'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              Paid / Disbursed ({stats.paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              All Batch Claims ({expenses.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by claim ID, merchant, employee..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Claims Table Preview */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                <th className="py-2 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      exportableExpenses.length > 0 &&
                      selectedIds.size === exportableExpenses.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-2.5 px-3 font-semibold">Claim ID</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Employee</th>
                <th className="py-2.5 px-3 font-semibold">Merchant & Category</th>
                <th className="py-2.5 px-3 font-semibold">Reimbursed Amount</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Citations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {exportableExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#64748B]">
                    No claims match the selected filter.
                  </td>
                </tr>
              ) : (
                exportableExpenses.map((exp) => {
                  const isChecked = selectedIds.has(exp.id);
                  const merchant = exp.extracted?.merchant?.value || 'Merchant';
                  const category = exp.extracted?.lineItems?.[0]?.category || 'General';
                  const amt = (exp.verdict?.approvedAmountMinor || exp.normalizedCurrency.targetAmountMinor) / 100;
                  const citationsCount = exp.verdict?.ruleImpacts?.length || 1;

                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(exp.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono-code font-bold text-[#0F172A]">
                        {exp.id}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">
                        {exp.expenseDate}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#334155]">
                        {exp.employeeId}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#0F172A] truncate max-w-[180px]">
                          {merchant}
                        </div>
                        <div className="text-[11px] text-[#64748B]">{category}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-code font-bold text-[#0F172A]">
                        ₹{amt.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          exp.status === 'auto_approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : exp.status === 'paid'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {citationsCount} rule{citationsCount > 1 ? 's' : ''} cited
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
