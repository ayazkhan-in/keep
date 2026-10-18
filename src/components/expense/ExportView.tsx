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
  DollarSign,
  Building,
  Users,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { getAllExpenses, applyReviewerDecision } from '../../services/expenseService';
import { getActiveEmployee, getEmployeeDisplayName } from '../../services/employeeService';

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
          (exp.employeeName || '').toLowerCase().includes(q) ||
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

  // CSV Sanitization to prevent formula injection
  const escapeCsvCell = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
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
        escapeCsvCell(exp.id),
        escapeCsvCell(exp.expenseDate),
        escapeCsvCell(exp.submittedAt.split('T')[0]),
        escapeCsvCell(exp.employeeName || getEmployeeDisplayName(exp.employeeId)),
        escapeCsvCell(category),
        escapeCsvCell(merchant),
        (exp.normalizedCurrency.sourceAmount ?? (exp.normalizedCurrency.sourceAmountMinor / 100)).toFixed(2),
        escapeCsvCell(exp.normalizedCurrency.sourceCurrency),
        exp.normalizedCurrency.fxRate.toFixed(4),
        ((exp.verdict?.approvedAmountMinor || 0) / 100).toFixed(2),
        ((exp.verdict?.rejectedAmountMinor || 0) / 100).toFixed(2),
        escapeCsvCell(exp.status),
        exp.verdict?.riskScore ?? 0,
        escapeCsvCell(reviewer),
        escapeCsvCell(citations),
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
      const narration = `Reimbursement for claim ${exp.id} - ${merchant} (${exp.employeeName || getEmployeeDisplayName(exp.employeeId)})`;

      return [
        escapeCsvCell(exp.expenseDate),
        escapeCsvCell('Payment'),
        escapeCsvCell(category),
        escapeCsvCell('HDFC Corporate Bank A/c'),
        amt,
        escapeCsvCell(narration),
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
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Accounting & ERP Export
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export approved corporate expense batches with full rule citations for general ledger & ERP integration.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportStandardCSV}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={handleExportTallyCSV}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Tally ERP Format</span>
          </button>

          <button
            onClick={handleMarkSelectedPaid}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Mark Paid ({selectedIds.size > 0 ? selectedIds.size : 'All Eligible'})</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">
            Ready for Payout
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono-code">
              ₹{stats.approvedTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">
              ({stats.approvedCount} claims)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Auto-approved and audited claims
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">
            Disbursed (Paid)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono-code">
              ₹{stats.paidTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">
              ({stats.paidCount} claims)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Successfully settled disbursements
          </p>
        </div>

        <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block">
            Base Currency & Audit
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 font-mono-code">INR (₹)</span>
            <span className="text-xs text-emerald-700 font-medium">100% Audited</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Reconciled with transaction FX rates
          </p>
        </div>
      </div>

      {/* Table & Filter Controls */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({stats.approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'paid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paid ({stats.paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all'
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
              placeholder="Search claims..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200/80 rounded-md text-xs text-slate-900 focus:outline-none focus:bg-white"
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
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(exp.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono-code font-bold text-[#0F172A]">
                        {exp.id}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">
                        {exp.expenseDate}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#334155]">
                        {exp.employeeName || getEmployeeDisplayName(exp.employeeId)}
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
                            ? 'bg-emerald-50 text-emerald-700'
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
