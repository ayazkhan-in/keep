import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  DollarSign,
  Calendar,
  Building2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { Invoice, InvoiceStatus, ActiveView } from '../types';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { generateProgrammaticPdf } from '../utils/pdfGenerator';
import { useCurrency } from '../context/CurrencyContext';
import { MinimalSelect } from './ui/MinimalSelect';

interface InvoicesViewProps {
  invoices: Invoice[];
  setActiveView: (view: ActiveView) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => Promise<void> | void;
  onUpdateStatus: (id: string, status: InvoiceStatus) => Promise<void> | void;
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
];

const STATUS_SELECT_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  setActiveView,
  onEditInvoice,
  onDuplicateInvoice,
  onDeleteInvoice,
  onUpdateStatus,
}) => {
  const { formatPrice, currencySymbol } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalAmount = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    const paidAmount = paidInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

    const pendingInvoices = invoices.filter((i) => i.status === 'pending');
    const pendingAmount = pendingInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

    const overdueInvoices = invoices.filter((i) => i.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.balanceDue, 0);

    return {
      totalCount,
      totalAmount,
      paidCount: paidInvoices.length,
      paidAmount,
      pendingCount: pendingInvoices.length,
      pendingAmount,
      overdueCount: overdueInvoices.length,
      overdueAmount,
    };
  }, [invoices]);

  // Filtered and Sorted Invoices
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        // Status filter
        if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.client.name.toLowerCase().includes(q) ||
          (inv.client.companyName && inv.client.companyName.toLowerCase().includes(q)) ||
          (inv.notes && inv.notes.toLowerCase().includes(q)) ||
          inv.items.some((it) => it.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.issueDate || a.createdAt).getTime() - new Date(b.issueDate || b.createdAt).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.grandTotal - a.grandTotal;
        }
        if (sortBy === 'amount_asc') {
          return a.grandTotal - b.grandTotal;
        }
        return 0;
      });
  }, [invoices, statusFilter, searchQuery, sortBy]);

  const handleDownloadQuick = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    generateProgrammaticPdf(invoice);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              Financial Operations
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
              {invoices.length} Invoices
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Invoice History & Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('create-invoice')}
            className="px-4 py-2 bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-xl text-xs sm:text-[13px] font-medium transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards formatted dynamically with active currency */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Invoiced */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-mono-code uppercase tracking-wider text-[#76777D] font-semibold">
            Total Invoiced
          </span>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-1 font-mono-code">
            {formatPrice(metrics.totalAmount)}
          </p>
          <span className="text-xs text-[#76777D] mt-0.5 block">
            {metrics.totalCount} total generated
          </span>
        </div>

        {/* Card 2: Paid Revenue */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-mono-code uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Paid Revenue
          </span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1 font-mono-code">
            {formatPrice(metrics.paidAmount)}
          </p>
          <span className="text-xs text-[#76777D] mt-0.5 block">
            {metrics.paidCount} settled
          </span>
        </div>

        {/* Card 3: Pending Balance */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-mono-code uppercase tracking-wider text-blue-700 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Pending Balance
          </span>
          <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1 font-mono-code">
            {formatPrice(metrics.pendingAmount)}
          </p>
          <span className="text-xs text-[#76777D] mt-0.5 block">
            {metrics.pendingCount} awaiting payment
          </span>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-mono-code uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Overdue Balance
          </span>
          <p className="text-xl sm:text-2xl font-bold text-rose-700 mt-1 font-mono-code">
            {formatPrice(metrics.overdueAmount)}
          </p>
          <span className="text-xs text-[#76777D] mt-0.5 block">
            {metrics.overdueCount} requiring action
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['all', 'paid', 'pending', 'overdue', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'text-[#45464D] hover:bg-[#F9F9FB] hover:text-[#0F172A]'
              }`}
            >
              {tab === 'all' ? 'All Invoices' : tab}
            </button>
          ))}
        </div>

        {/* Search Input & Minimal Sort Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client or invoice #..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:bg-white shadow-2xs"
            />
          </div>

          <MinimalSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={SORT_OPTIONS}
            size="md"
          />
        </div>
      </div>

      {/* Invoices List / Table */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] text-[#76777D] flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base text-[#0F172A]">No Invoices Found</h3>
          <p className="text-xs text-[#76777D] max-w-sm mx-auto mt-1 mb-5">
            {searchQuery
              ? `No invoices matched "${searchQuery}". Try clearing the search query.`
              : 'You have not created any invoices in this category yet.'}
          </p>
          <button
            onClick={() => setActiveView('create-invoice')}
            className="px-4 py-2 bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Invoice</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-mono-code uppercase text-[10px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className="hover:bg-[#F9F9FB] transition-colors cursor-pointer group"
                  >
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-mono-code font-bold text-[#0F172A]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#0F172A]" />
                        <span>#{invoice.invoiceNumber}</span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0F172A]">
                        {invoice.client.companyName || invoice.client.name}
                      </p>
                      {invoice.client.companyName && invoice.client.name && (
                        <p className="text-[11px] text-[#76777D]">{invoice.client.name}</p>
                      )}
                    </td>

                    {/* Issue Date */}
                    <td className="py-3.5 px-4 font-mono-code text-[#45464D]">
                      {invoice.issueDate}
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 font-mono-code text-[#45464D]">
                      <span>{invoice.dueDate}</span>
                    </td>

                    {/* Grand Total */}
                    <td className="py-3.5 px-4 text-right font-mono-code font-bold text-[#0F172A]">
                      {formatPrice(invoice.grandTotal, invoice.currency)}
                    </td>

                    {/* Minimal Status Dropdown */}
                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MinimalSelect
                        value={invoice.status}
                        onChange={(val) => onUpdateStatus(invoice.id, val as InvoiceStatus)}
                        options={STATUS_SELECT_OPTIONS}
                        size="sm"
                      />
                    </td>

                    {/* Row Actions */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleDownloadQuick(invoice, e)}
                          className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            onEditInvoice(invoice);
                            setActiveView('create-invoice');
                          }}
                          className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Edit Invoice"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDuplicateInvoice(invoice)}
                          className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Delete invoice #${invoice.invoiceNumber}?`)) {
                              onDeleteInvoice(invoice.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail Inspector Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onEdit={(inv) => {
          onEditInvoice(inv);
          setActiveView('create-invoice');
        }}
        onDuplicate={(inv) => onDuplicateInvoice(inv)}
        onDelete={(id) => onDeleteInvoice(id)}
        onUpdateStatus={(id, st) => {
          onUpdateStatus(id, st);
          if (selectedInvoice && selectedInvoice.id === id) {
            setSelectedInvoice({ ...selectedInvoice, status: st });
          }
        }}
      />
    </div>
  );
};
