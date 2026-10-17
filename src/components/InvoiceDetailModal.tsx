import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Printer,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  User,
  CreditCard,
  Calendar,
  Loader2,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '../types';
import { generateInvoicePdfFromElement, generateProgrammaticPdf } from '../utils/pdfGenerator';
import { MinimalSelect } from './ui/MinimalSelect';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDuplicate?: (invoice: Invoice) => void;
  onDelete?: (id: string) => void;
  onUpdateStatus?: (id: string, status: InvoiceStatus) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onUpdateStatus,
}) => {
  const invoiceSheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!invoice) return null;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      if (invoiceSheetRef.current) {
        await generateInvoicePdfFromElement(invoiceSheetRef.current, invoice.invoiceNumber);
      } else {
        generateProgrammaticPdf(invoice);
      }
    } catch (err) {
      console.warn('DOM PDF generation error, using programmatic fallback:', err);
      generateProgrammaticPdf(invoice);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `Invoice #${invoice.invoiceNumber} - Total: ${invoice.currency} ${invoice.grandTotal.toFixed(2)}`
    );
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Cancelled
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Draft
          </span>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden z-10"
          >
            {/* Top Modal Header */}
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-semibold text-base sm:text-lg text-[#0F172A]">
                      Invoice {invoice.invoiceNumber}
                    </h2>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-[#76777D] mt-0.5">
                    Created on {new Date(invoice.createdAt).toLocaleDateString()} · Billed to{' '}
                    <span className="font-medium text-[#0F172A]">
                      {invoice.client.companyName || invoice.client.name}
                    </span>
                  </p>
                </div>
              </div>

              {/* Status Quick Changer & Close */}
              <div className="flex items-center gap-2">
                {onUpdateStatus && (
                  <MinimalSelect
                    value={invoice.status}
                    onChange={(val) => onUpdateStatus(invoice.id, val as InvoiceStatus)}
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'paid', label: 'Paid' },
                      { value: 'overdue', label: 'Overdue' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                    size="sm"
                  />
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-5 py-2.5 bg-[#F9F9FB] border-b border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-[#0F172A] text-white hover:bg-[#1E293B] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#76777D]" />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#76777D]" />
                  <span>{isCopied ? 'Summary Copied!' : 'Copy Summary'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate(invoice);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs text-[#45464D] hover:text-[#0F172A] hover:bg-white rounded-lg border border-transparent hover:border-[#E2E8F0] transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(invoice);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
                        onDelete(invoice.id);
                        onClose();
                      }
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Printable Invoice Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F8FAFC]">
              <div
                ref={invoiceSheetRef}
                className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 sm:p-10 max-w-3xl mx-auto text-[#0F172A]"
              >
                {/* Header: Company & Invoice Info */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">
                        {invoice.sender.companyName ? invoice.sender.companyName.charAt(0) : 'K'}
                      </div>
                      <h3 className="font-bold text-lg text-[#0F172A] tracking-tight">
                        {invoice.sender.companyName || invoice.sender.name}
                      </h3>
                    </div>

                    <div className="mt-3 text-xs text-[#64748B] space-y-0.5 font-sans">
                      {invoice.sender.name && invoice.sender.companyName && (
                        <p className="font-medium text-[#0F172A]">{invoice.sender.name}</p>
                      )}
                      {invoice.sender.email && <p>{invoice.sender.email}</p>}
                      {invoice.sender.phone && <p>{invoice.sender.phone}</p>}
                      {invoice.sender.address && (
                        <p>
                          {[invoice.sender.address, invoice.sender.city, invoice.sender.state, invoice.sender.zip]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {invoice.sender.country && <p>{invoice.sender.country}</p>}
                      {invoice.sender.taxId && (
                        <p className="font-mono-code text-[11px] text-[#76777D] mt-1">
                          Tax ID: {invoice.sender.taxId}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Invoice # & Dates */}
                  <div className="sm:text-right flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-semibold">
                        Invoice Document
                      </span>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight mt-0.5">
                        #{invoice.invoiceNumber}
                      </h1>
                      <div className="mt-2">{getStatusBadge(invoice.status)}</div>
                    </div>

                    <div className="mt-4 text-xs text-[#64748B] space-y-1 font-mono-code">
                      <div>
                        <span className="text-[#94A3B8]">Issue Date:</span>{' '}
                        <span className="text-[#0F172A] font-medium">{invoice.issueDate}</span>
                      </div>
                      <div>
                        <span className="text-[#94A3B8]">Due Date:</span>{' '}
                        <span className="text-[#0F172A] font-medium">{invoice.dueDate}</span>
                      </div>
                      {invoice.paymentTerms && (
                        <div>
                          <span className="text-[#94A3B8]">Terms:</span>{' '}
                          <span className="text-[#0F172A]">{invoice.paymentTerms}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billed To Section */}
                <div className="py-6 border-b border-[#E2E8F0]">
                  <span className="text-[11px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-bold">
                    Billed To
                  </span>
                  <div className="mt-2 text-xs text-[#64748B] space-y-0.5">
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {invoice.client.companyName || invoice.client.name}
                    </p>
                    {invoice.client.companyName && invoice.client.name && (
                      <p className="text-[#45464D]">Attn: {invoice.client.name}</p>
                    )}
                    {invoice.client.email && <p>{invoice.client.email}</p>}
                    {invoice.client.phone && <p>{invoice.client.phone}</p>}
                    {invoice.client.address && (
                      <p>
                        {[invoice.client.address, invoice.client.city, invoice.client.state, invoice.client.zip]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {invoice.client.country && <p>{invoice.client.country}</p>}
                    {invoice.client.taxId && (
                      <p className="font-mono-code text-[11px] text-[#76777D] mt-1">
                        Tax ID: {invoice.client.taxId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="py-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-mono-code uppercase text-[10px]">
                          <th className="py-2.5 px-3">Item Description</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {invoice.items.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-[#F9F9FB]/60">
                            <td className="py-3 px-3">
                              <p className="font-medium text-[#0F172A]">{item.description}</p>
                              {(item.taxRate || item.discount) && (
                                <p className="text-[11px] text-[#94A3B8] mt-0.5">
                                  {item.taxRate ? `Tax: ${item.taxRate}% ` : ''}
                                  {item.discount ? `Discount: ${item.discount}%` : ''}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono-code text-[#45464D]">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-code text-[#45464D]">
                              {invoice.currency} {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono-code font-semibold text-[#0F172A]">
                              {invoice.currency} {item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Totals Breakdown */}
                  <div className="mt-6 flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-[#E2E8F0]">
                    {/* Left: Notes & Payment Info */}
                    <div className="flex-1 max-w-sm space-y-4">
                      {invoice.notes && (
                        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                          <p className="text-[10px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-bold mb-1">
                            Notes & Instructions
                          </p>
                          <p className="text-xs text-[#45464D] leading-relaxed">{invoice.notes}</p>
                        </div>
                      )}

                      {invoice.paymentDetails && (
                        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                          <p className="text-[10px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5">
                            Bank / Remittance Details
                          </p>
                          <div className="text-xs text-[#45464D] space-y-1 font-mono-code">
                            {invoice.paymentDetails.bankName && (
                              <p>
                                <span className="text-[#94A3B8]">Bank:</span> {invoice.paymentDetails.bankName}
                              </p>
                            )}
                            {invoice.paymentDetails.accountName && (
                              <p>
                                <span className="text-[#94A3B8]">Name:</span>{' '}
                                {invoice.paymentDetails.accountName}
                              </p>
                            )}
                            {invoice.paymentDetails.accountNumber && (
                              <p>
                                <span className="text-[#94A3B8]">Account:</span>{' '}
                                {invoice.paymentDetails.accountNumber}
                              </p>
                            )}
                            {invoice.paymentDetails.routingNumber && (
                              <p>
                                <span className="text-[#94A3B8]">Routing/SWIFT:</span>{' '}
                                {invoice.paymentDetails.routingNumber}
                              </p>
                            )}
                            {invoice.paymentDetails.paypalEmail && (
                              <p>
                                <span className="text-[#94A3B8]">PayPal:</span>{' '}
                                {invoice.paymentDetails.paypalEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Calculations */}
                    <div className="w-full sm:w-64 space-y-2 text-xs font-mono-code">
                      <div className="flex justify-between text-[#64748B]">
                        <span>Subtotal:</span>
                        <span>
                          {invoice.currency} {invoice.subtotal.toFixed(2)}
                        </span>
                      </div>

                      {invoice.discountTotal > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount:</span>
                          <span>
                            -{invoice.currency} {invoice.discountTotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {invoice.taxTotal > 0 && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>Tax / VAT:</span>
                          <span>
                            +{invoice.currency} {invoice.taxTotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {invoice.shippingFee && invoice.shippingFee > 0 && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>Shipping:</span>
                          <span>
                            +{invoice.currency} {invoice.shippingFee.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t-2 border-[#0F172A] flex justify-between text-sm sm:text-base font-bold text-[#0F172A]">
                        <span>Grand Total:</span>
                        <span>
                          {invoice.currency} {invoice.grandTotal.toFixed(2)}
                        </span>
                      </div>

                      {invoice.amountPaid > 0 && (
                        <>
                          <div className="flex justify-between text-emerald-600 pt-1">
                            <span>Amount Paid:</span>
                            <span>
                              -{invoice.currency} {invoice.amountPaid.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                            <span>Balance Due:</span>
                            <span>
                              {invoice.currency} {invoice.balanceDue.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer branding */}
                <div className="pt-8 mt-6 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>Generated with Keepr Purchase & Invoice Intelligence</span>
                  <span className="font-mono-code">ID: {invoice.id}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
