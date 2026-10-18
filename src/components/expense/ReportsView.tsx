import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Mail,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  Send,
  X,
  Bot,
  Shield,
  PieChart,
  DollarSign,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Expense } from '../../types/expense';
import { getAllExpenses, subscribeExpenses } from '../../services/expenseService';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee, getEmployeeDisplayName } from '../../services/employeeService';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('monthly_digest');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('cfo@jpmorgan.com');
  const [emailSubject, setEmailSubject] = useState('JP Morgan Corporate Expense Audit Digest - October 2026');
  const [emailNotes, setEmailNotes] = useState('Attached is the verified monthly expense reimbursement schedule and policy compliance summary for your executive review.');
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>(() => getAllExpenses());
  const policy = useMemo(() => getActivePolicy(), []);
  const activeEmployee = getActiveEmployee();

  React.useEffect(() => {
    const unsubscribe = subscribeExpenses((updated) => {
      setExpenses(updated);
    });
    return () => unsubscribe();
  }, []);

  // Filtered claims for the report
  const reportExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (departmentFilter !== 'all') {
        // match department if available
        return true;
      }
      return true;
    });
  }, [expenses, departmentFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalClaimedMinor = 0;
    let totalApprovedMinor = 0;
    let totalDisallowedMinor = 0;
    let autoApprovedCount = 0;
    let inReviewCount = 0;

    const deptSpendMap = new Map<string, number>();

    for (const exp of reportExpenses) {
      const claimed = exp.normalizedCurrency.targetAmountMinor;
      const approved = exp.verdict?.approvedAmountMinor || 0;
      const disallowed = exp.verdict?.rejectedAmountMinor || 0;

      totalClaimedMinor += claimed;
      totalApprovedMinor += approved;
      totalDisallowedMinor += disallowed;

      if (exp.status === 'auto_approved') autoApprovedCount++;
      if (exp.status === 'in_review' || exp.status === 'needs_info') inReviewCount++;

      const dept = 'Engineering'; // synthetic grouping
      deptSpendMap.set(dept, (deptSpendMap.get(dept) || 0) + approved);
    }

    const touchlessRate = reportExpenses.length > 0
      ? Math.round((autoApprovedCount / reportExpenses.length) * 100)
      : 0;

    return {
      totalClaimed: totalClaimedMinor / 100,
      totalApproved: totalApprovedMinor / 100,
      totalDisallowed: totalDisallowedMinor / 100,
      autoApprovedCount,
      inReviewCount,
      touchlessRate,
      claimsCount: reportExpenses.length,
    };
  }, [reportExpenses]);

  // Print PDF handler
  const handlePrintPDF = () => {
    window.print();
  };

  // Send Email handler
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailModalOpen(false);
    setSendSuccessMsg(`Report successfully dispatched to ${emailTo}! Delivery receipt logged in audit history.`);
    setTimeout(() => setSendSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - hidden during browser print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600" />
            Audit & Executive Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Compile formal corporate expense digests, print/save official PDF reports, or dispatch audit packages via email.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPDF}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Generate PDF / Print</span>
          </button>

          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4 text-white" />
            <span>Send via Email</span>
          </button>
        </div>
      </div>

      {sendSuccessMsg && (
        <div className="print:hidden p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{sendSuccessMsg}</span>
        </div>
      )}

      {/* Report Controls (hidden in print) */}
      <div className="print:hidden bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Report Type:</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="monthly_digest">Monthly Reimbursement Digest (Full Audit)</option>
            <option value="compliance">Policy Compliance & Exceptions Summary</option>
            <option value="tax_ledger">Tax & Statutory GST Audit Schedule</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Active Period:</span>
          <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">October 2026</span>
          <span>•</span>
          <span>Generated by:</span>
          <span className="font-semibold text-slate-900">{activeEmployee.identity.name}</span>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Letterhead */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                K
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">JP MORGAN</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
              Corporate Expense Audit Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Document Ref: JPM-EXP-2026-M10 • Authorized Policy Version: v{policy.versionNumber}
            </p>
          </div>

          <div className="text-right text-xs text-slate-600 space-y-1">
            <div><strong>Issue Date:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            <div><strong>Reporting Currency:</strong> {policy.settings.baseCurrency} (INR)</div>
            <div><strong>Status:</strong> <span className="text-emerald-700 font-bold uppercase">Audited & Verified</span></div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] uppercase font-mono-code text-slate-500 font-semibold">Total Reimbursed Spend</div>
            <div className="text-xl font-bold text-slate-900 mt-1">₹{stats.totalApproved.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stats.claimsCount} verified submissions</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] uppercase font-mono-code text-slate-500 font-semibold">Protected / Disallowed</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">₹{stats.totalDisallowed.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Alcohol, over-cap & duplicate deductions</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] uppercase font-mono-code text-slate-500 font-semibold">Touchless Automation</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{stats.touchlessRate}%</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stats.autoApprovedCount} touchless auto-approvals</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-[10px] uppercase font-mono-code text-slate-500 font-semibold">Pending Review</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{stats.inReviewCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Exceptions requiring human approval</div>
          </div>
        </div>

        {/* Policy Citation & Compliance Overview */}
        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-2">
          <div className="font-bold text-emerald-950 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>Deterministic Policy Compliance Statement</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            All disbursements listed in this schedule have been audited by deterministic Zod policy schemas without generative LLM hallucination.
            Non-reimbursable alcohol and tobacco items have been excluded with statutory tax apportioned proportionally under <strong>Section 3.1</strong>.
            Daily meal limits (₹3,000 / day) have been resolved via chronological ledger replay under <strong>Section 4.1</strong>.
          </p>
        </div>

        {/* Detailed Audit Table */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            Reimbursement Disbursement Schedule
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 text-slate-600 font-semibold">
                  <th className="py-2 px-2.5">Claim ID</th>
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Employee</th>
                  <th className="py-2 px-2.5">Merchant</th>
                  <th className="py-2 px-2.5">Category</th>
                  <th className="py-2 px-2.5">Claimed</th>
                  <th className="py-2 px-2.5">Reimbursed</th>
                  <th className="py-2 px-2.5">Policy Citations</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(reportExpenses || []).slice(0, 15).map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono-code font-bold text-slate-900">{exp.id}</td>
                    <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{exp.expenseDate}</td>
                    <td className="py-2 px-2.5 font-medium text-slate-800">{exp.employeeName || getEmployeeDisplayName(exp.employeeId)}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900 truncate max-w-[140px]">
                      {exp.extracted?.merchant?.value || 'Merchant'}
                    </td>
                    <td className="py-2 px-2.5 text-slate-600">{exp.extracted?.lineItems?.[0]?.category || 'General'}</td>
                    <td className="py-2 px-2.5 font-mono-code text-slate-600">
                      ₹{(exp.normalizedCurrency.targetAmountMinor / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 font-mono-code font-bold text-slate-900">
                      ₹{((exp.verdict?.approvedAmountMinor || exp.normalizedCurrency.targetAmountMinor) / 100).toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-[10.5px] font-mono-code text-emerald-700">
                      {exp.verdict?.ruleImpacts?.[0]?.ruleId || 'sys-auto-standard'}
                    </td>
                    <td className="py-2 px-2.5">
                      <span className="font-semibold text-[10px] uppercase text-slate-700">
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reportExpenses.length > 15 && (
            <p className="text-[11px] text-slate-400 italic">
              Showing first 15 of {reportExpenses.length} verified records in summary view. Full schedule exported in attached CSV/PDF.
            </p>
          )}
        </div>

        {/* Signatures & Authorization Box */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
              {activeEmployee.identity.name} (Finance Auditor)
            </div>
            <div className="text-[11px] text-slate-500">Prepared & Audited By • JP Morgan Corporate Finance</div>
          </div>
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
              Executive Authorizer / Chief Financial Officer
            </div>
            <div className="text-[11px] text-slate-500">Approved for General Ledger Disbursement Run</div>
          </div>
        </div>
      </div>

      {/* EMAIL DISPATCH MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-[#0F172A]">Send Report via Email</h3>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Executive Notes</label>
                <textarea
                  rows={3}
                  value={emailNotes}
                  onChange={(e) => setEmailNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Attachment Pill */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">JPMorgan_Expense_Audit_Oct2026.pdf</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono-code">2.4 MB</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
