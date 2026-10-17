import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Printer,
  Save,
  CheckCircle2,
  Sparkles,
  Building2,
  User,
  CreditCard,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  Eye,
  Edit3,
  RefreshCw,
  Copy,
  Info,
  Check,
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceParty, InvoicePaymentDetails, InvoiceStatus, ActiveView } from '../types';
import { generateInvoicePdfFromElement, generateProgrammaticPdf } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { MinimalSelect } from './ui/MinimalSelect';

interface CreateInvoiceViewProps {
  onSaveInvoice: (invoice: Invoice) => Promise<void> | void;
  setActiveView: (view: ActiveView) => void;
  initialInvoice?: Invoice | null;
}

const PRESET_TEMPLATES = [
  {
    name: 'Software Consulting',
    items: [
      { id: '1', description: 'Full-Stack Architecture & API Design', quantity: 40, unitPrice: 150, taxRate: 0, discount: 0, amount: 6000 },
      { id: '2', description: 'Cloud Deployment & CI/CD Pipeline Setup', quantity: 1, unitPrice: 1800, taxRate: 0, discount: 0, amount: 1800 },
    ],
    notes: 'Payment is due within 15 days of invoice date. Remit via direct wire or ACH.',
    terms: 'Net 15',
  },
  {
    name: 'Design & Branding',
    items: [
      { id: '1', description: 'Brand Identity Design, Design System & Guidelines', quantity: 1, unitPrice: 4500, taxRate: 8.5, discount: 0, amount: 4500 },
      { id: '2', description: 'High-Fidelity Interactive UI/UX Prototypes', quantity: 20, unitPrice: 125, taxRate: 8.5, discount: 5, amount: 2375 },
    ],
    notes: 'Thank you for your business! Vector assets will be transferred upon settlement.',
    terms: 'Due on Receipt',
  },
  {
    name: 'Hardware & Maintenance',
    items: [
      { id: '1', description: 'Workstation Hardware Assembly & Calibration', quantity: 4, unitPrice: 650, taxRate: 7, discount: 0, amount: 2600 },
      { id: '2', description: 'On-Site Network Infrastructure Configuration', quantity: 8, unitPrice: 110, taxRate: 7, discount: 0, amount: 880 },
    ],
    notes: 'Hardware covered under 1-year manufacturer warranty. Service SLA active.',
    terms: 'Net 30',
  },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'CAD', symbol: '$', label: 'CAD ($)' },
  { code: 'AUD', symbol: '$', label: 'AUD ($)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];

export const CreateInvoiceView: React.FC<CreateInvoiceViewProps> = ({
  onSaveInvoice,
  setActiveView,
  initialInvoice,
}) => {
  const { user } = useAuth();
  const { currency: defaultCurrency } = useCurrency();
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  // Active sub-tab on mobile: 'editor' vs 'preview'
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    if (initialInvoice) return initialInvoice.invoiceNumber;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `INV-${new Date().getFullYear()}-${randomSuffix}`;
  });

  const [issueDate, setIssueDate] = useState(() => {
    return initialInvoice?.issueDate || new Date().toISOString().split('T')[0];
  });

  const [dueDate, setDueDate] = useState(() => {
    if (initialInvoice?.dueDate) return initialInvoice.dueDate;
    const due = new Date();
    due.setDate(due.getDate() + 15);
    return due.toISOString().split('T')[0];
  });

  const [status, setStatus] = useState<InvoiceStatus>(initialInvoice?.status || 'draft');
  const [currency, setCurrency] = useState(initialInvoice?.currency || defaultCurrency || 'INR');
  const [paymentTerms, setPaymentTerms] = useState(initialInvoice?.paymentTerms || 'Net 15');

  // Sender Info
  const [sender, setSender] = useState<InvoiceParty>(() => {
    if (initialInvoice?.sender) return initialInvoice.sender;
    return {
      name: user?.displayName || 'My Business',
      companyName: user?.displayName ? `${user.displayName} Studios` : 'Keepr Commerce Studio',
      email: user?.email || 'contact@mybusiness.com',
      phone: '+1 (555) 019-2834',
      address: '100 Innovation Way',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
      taxId: 'US-EIN-94-1234567',
    };
  });

  // Client Info
  const [client, setClient] = useState<InvoiceParty>(() => {
    if (initialInvoice?.client) return initialInvoice.client;
    return {
      name: 'Alex Mercer',
      companyName: 'Nova Enterprise Inc.',
      email: 'ap@novaenterprise.io',
      phone: '+1 (415) 555-8821',
      address: '450 Mission Street, Floor 12',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'United States',
      taxId: 'US-EIN-13-9876543',
    };
  });

  // Line Items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (initialInvoice?.items && initialInvoice.items.length > 0) {
      return initialInvoice.items;
    }
    return [
      {
        id: 'item-1',
        description: 'Web Application Development & UI/UX Systems',
        quantity: 1,
        unitPrice: 3500,
        taxRate: 0,
        discount: 0,
        amount: 3500,
      },
    ];
  });

  // Adjustments & Payment
  const [globalTaxRate, setGlobalTaxRate] = useState<number>(() => {
    if (initialInvoice?.taxTotal && initialInvoice.subtotal) {
      return Number(((initialInvoice.taxTotal / initialInvoice.subtotal) * 100).toFixed(1));
    }
    return 0;
  });
  const [globalDiscount, setGlobalDiscount] = useState<number>(() => {
    return initialInvoice?.discountTotal || 0;
  });
  const [shippingFee, setShippingFee] = useState<number>(initialInvoice?.shippingFee || 0);
  const [amountPaid, setAmountPaid] = useState<number>(initialInvoice?.amountPaid || 0);
  const [notes, setNotes] = useState(
    initialInvoice?.notes || 'Thank you for your business! Please remit payment within the specified terms.'
  );

  const [paymentDetails, setPaymentDetails] = useState<InvoicePaymentDetails>(() => {
    if (initialInvoice?.paymentDetails) return initialInvoice.paymentDetails;
    return {
      bankName: 'First Citizens / Silicon Valley Bank',
      accountName: user?.displayName || 'Keepr Commerce LLC',
      accountNumber: '•••••••• 9842',
      routingNumber: '121000358',
      paypalEmail: user?.email || 'payments@mybusiness.com',
    };
  });

  // Re-calculate financial figures
  const calculateItemAmount = (item: InvoiceItem) => {
    const raw = item.quantity * item.unitPrice;
    const disc = item.discount ? raw * (item.discount / 100) : 0;
    return Math.max(0, raw - disc);
  };

  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const itemDiscounts = items.reduce((acc, item) => {
    const raw = item.quantity * item.unitPrice;
    return acc + (item.discount ? raw * (item.discount / 100) : 0);
  }, 0);
  const discountTotal = itemDiscounts + (globalDiscount || 0);
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxTotal = globalTaxRate > 0 ? (taxableBase * globalTaxRate) / 100 : 0;
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal + (shippingFee || 0));
  const balanceDue = Math.max(0, grandTotal - (amountPaid || 0));

  // Item helpers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      updated.amount = calculateItemAmount(updated);
      next[index] = updated;
      return next;
    });
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 100,
      taxRate: 0,
      discount: 0,
      amount: 100,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setItems(
      preset.items.map((it, idx) => ({
        ...it,
        id: `preset-${Date.now()}-${idx}`,
      }))
    );
    setNotes(preset.notes);
    setPaymentTerms(preset.terms);
  };

  const buildInvoiceObject = (): Invoice => {
    return {
      id: initialInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || `INV-${Date.now()}`,
      issueDate,
      dueDate,
      status,
      currency,
      sender,
      client,
      items,
      subtotal,
      taxTotal,
      discountTotal,
      shippingFee,
      grandTotal,
      amountPaid,
      balanceDue,
      notes,
      paymentTerms,
      paymentDetails,
      createdAt: initialInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.uid,
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const invoiceObj = buildInvoiceObject();
      await onSaveInvoice(invoiceObj);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save invoice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const invoiceObj = buildInvoiceObject();
      if (invoicePreviewRef.current) {
        await generateInvoicePdfFromElement(invoicePreviewRef.current, invoiceObj.invoiceNumber);
      } else {
        generateProgrammaticPdf(invoiceObj);
      }
    } catch (err) {
      console.warn('DOM PDF capture failed, using programmatic PDF engine:', err);
      generateProgrammaticPdf(buildInvoiceObject());
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
              Invoice Studio
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
              PDF Engine Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            {initialInvoice ? `Edit Invoice #${invoiceNumber}` : 'Create New Invoice'}
          </h1>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mobile view toggle */}
          <div className="md:hidden flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setMobileTab('editor')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mobileTab === 'editor' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#76777D]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Editor
              </span>
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                mobileTab === 'preview' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#76777D]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Preview
              </span>
            </button>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-3.5 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F9F9FB] text-[#0F172A] rounded-xl text-xs sm:text-[13px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Download PDF Document"
          >
            <Download className="w-4 h-4 text-[#76777D]" />
            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="hidden sm:flex px-3 py-2 bg-white border border-[#E2E8F0] hover:bg-[#F9F9FB] text-[#0F172A] rounded-xl text-xs sm:text-[13px] font-medium transition-colors items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-[#76777D]" />
            <span>Print</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl text-xs sm:text-[13px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved to Database!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Invoice'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveView('invoices')}
            className="px-3 py-2 text-xs sm:text-[13px] font-medium text-[#45464D] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors cursor-pointer"
          >
            View All Invoices &rarr;
          </button>
        </div>
      </div>

      {/* Preset Quick Fill Bar */}
      <div className="bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#45464D]">
          <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
          <span className="font-medium">Quick Template Presets:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_TEMPLATES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-lg font-medium transition-colors cursor-pointer text-[11px]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dual Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Form Editor (Visible on desktop or when mobileTab === 'editor') */}
        <div
          className={`lg:col-span-6 space-y-4 ${
            mobileTab === 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Card 1: Meta Settings */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0F172A]" />
              Invoice Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Currency
                </label>
                <MinimalSelect
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Status
                </label>
                <MinimalSelect
                  value={status}
                  onChange={(val) => setStatus(val as InvoiceStatus)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  fullWidth
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 15, Due on Receipt"
                  className="w-full px-3 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Issuer & Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sender (From) */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0F172A]" />
                From (Your Business)
              </h3>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Company Name</label>
                <input
                  type="text"
                  value={sender.companyName || ''}
                  onChange={(e) => setSender({ ...sender, companyName: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Contact Name</label>
                <input
                  type="text"
                  value={sender.name}
                  onChange={(e) => setSender({ ...sender, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Email</label>
                <input
                  type="email"
                  value={sender.email}
                  onChange={(e) => setSender({ ...sender, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Address, City & State</label>
                <input
                  type="text"
                  value={sender.address || ''}
                  onChange={(e) => setSender({ ...sender, address: e.target.value })}
                  placeholder="Street address, City, State ZIP"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Tax / VAT / EIN ID</label>
                <input
                  type="text"
                  value={sender.taxId || ''}
                  onChange={(e) => setSender({ ...sender, taxId: e.target.value })}
                  placeholder="e.g. US-EIN-94-3829104"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            {/* Client (Bill To) */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0F172A]" />
                Bill To (Client)
              </h3>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Client Company</label>
                <input
                  type="text"
                  value={client.companyName || ''}
                  onChange={(e) => setClient({ ...client, companyName: e.target.value })}
                  placeholder="Client Organization Name"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Client Contact Name</label>
                <input
                  type="text"
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  placeholder="Primary contact name"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Client Email</label>
                <input
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                  placeholder="invoices@clientcompany.com"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Client Address</label>
                <input
                  type="text"
                  value={client.address || ''}
                  onChange={(e) => setClient({ ...client, address: e.target.value })}
                  placeholder="Street, City, State ZIP"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#76777D] mb-0.5">Client Tax ID</label>
                <input
                  type="text"
                  value={client.taxId || ''}
                  onChange={(e) => setClient({ ...client, taxId: e.target.value })}
                  placeholder="e.g. VAT / GST / EIN"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Line Items Editor */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0F172A]" />
                Line Items ({items.length})
              </h3>

              <button
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl space-y-2 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-code text-[#94A3B8] font-bold">
                      Item #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-[#94A3B8] hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item description or service rendered..."
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#76777D] mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#76777D] mb-0.5">Unit Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitPrice', Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#76777D] mb-0.5">Total</label>
                      <div className="px-2.5 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-mono-code font-semibold text-[#0F172A] text-right">
                        {currency} {item.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Adjustments & Payment Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-mono-code uppercase tracking-wider text-[#76777D] font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#0F172A]" />
              Adjustments & Bank Remittance
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalTaxRate}
                  onChange={(e) => setGlobalTaxRate(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Discount ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Amount Paid ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={paymentDetails.bankName || ''}
                  onChange={(e) =>
                    setPaymentDetails({ ...paymentDetails, bankName: e.target.value })
                  }
                  placeholder="Bank or Financial Institution"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Account / IBAN Number
                </label>
                <input
                  type="text"
                  value={paymentDetails.accountNumber || ''}
                  onChange={(e) =>
                    setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })
                  }
                  placeholder="Account Number or IBAN"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  Routing / SWIFT / IFSC
                </label>
                <input
                  type="text"
                  value={paymentDetails.routingNumber || ''}
                  onChange={(e) =>
                    setPaymentDetails({ ...paymentDetails, routingNumber: e.target.value })
                  }
                  placeholder="Routing or SWIFT Code"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                  PayPal / UPI ID
                </label>
                <input
                  type="text"
                  value={paymentDetails.paypalEmail || ''}
                  onChange={(e) =>
                    setPaymentDetails({ ...paymentDetails, paypalEmail: e.target.value })
                  }
                  placeholder="paypal@domain.com or UPI"
                  className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#45464D] mb-1">
                Client Notes & Payment Instructions
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Document Sheet Preview (Visible on desktop or when mobileTab === 'preview') */}
        <div
          className={`lg:col-span-6 sticky top-2 ${
            mobileTab === 'editor' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="bg-[#F1F5F9] p-3 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-inner">
            <div className="flex items-center justify-between pb-3 text-xs text-[#64748B]">
              <span className="font-mono-code uppercase font-semibold text-[10px] text-[#45464D]">
                Live Document Preview
              </span>
              <span className="font-mono-code text-[11px]">A4 Format · High-Res</span>
            </div>

            {/* Document Render Target for Canvas & PDF */}
            <div
              ref={invoicePreviewRef}
              className="bg-white rounded-xl border border-[#CBD5E1] p-5 sm:p-8 text-[#0F172A] shadow-md transition-all font-sans"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4 pb-5 border-b border-[#E2E8F0]">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {sender.companyName ? sender.companyName.charAt(0) : 'K'}
                    </div>
                    <h2 className="font-bold text-base text-[#0F172A] tracking-tight leading-tight">
                      {sender.companyName || sender.name || 'Your Company'}
                    </h2>
                  </div>
                  <div className="mt-2 text-[11px] text-[#64748B] space-y-0.5">
                    {sender.name && sender.companyName && (
                      <p className="font-medium text-[#0F172A]">{sender.name}</p>
                    )}
                    {sender.email && <p>{sender.email}</p>}
                    {sender.address && <p>{sender.address}</p>}
                    {sender.taxId && (
                      <p className="font-mono-code text-[10px] text-[#94A3B8]">
                        Tax ID: {sender.taxId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-bold">
                    Invoice
                  </span>
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight mt-0.5">
                    #{invoiceNumber || 'INV-0000'}
                  </h3>
                  <div className="mt-2 text-[11px] text-[#64748B] space-y-0.5 font-mono-code">
                    <p>
                      <span className="text-[#94A3B8]">Date:</span> {issueDate}
                    </p>
                    <p>
                      <span className="text-[#94A3B8]">Due:</span> {dueDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="py-4 border-b border-[#E2E8F0]">
                <span className="text-[10px] font-mono-code uppercase tracking-wider text-[#94A3B8] font-bold">
                  Billed To
                </span>
                <p className="text-xs font-bold text-[#0F172A] mt-1">
                  {client.companyName || client.name || 'Client Name'}
                </p>
                {client.name && client.companyName && (
                  <p className="text-[11px] text-[#64748B]">Attn: {client.name}</p>
                )}
                {client.email && <p className="text-[11px] text-[#64748B]">{client.email}</p>}
                {client.address && <p className="text-[11px] text-[#64748B]">{client.address}</p>}
                {client.taxId && (
                  <p className="text-[10px] font-mono-code text-[#94A3B8]">
                    Tax ID: {client.taxId}
                  </p>
                )}
              </div>

              {/* Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#94A3B8] font-mono-code uppercase text-[10px]">
                      <th className="py-1.5">Description</th>
                      <th className="py-1.5 text-center">Qty</th>
                      <th className="py-1.5 text-right">Price</th>
                      <th className="py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 pr-2">
                          <p className="font-medium text-[#0F172A] text-xs">
                            {item.description || 'Service description'}
                          </p>
                        </td>
                        <td className="py-2 text-center font-mono-code text-[#45464D] text-xs">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right font-mono-code text-[#45464D] text-xs">
                          {currency} {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-mono-code font-semibold text-[#0F172A] text-xs">
                          {currency} {item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculation Summary */}
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex justify-end">
                  <div className="w-48 space-y-1.5 text-xs font-mono-code">
                    <div className="flex justify-between text-[#64748B]">
                      <span>Subtotal:</span>
                      <span>
                        {currency} {subtotal.toFixed(2)}
                      </span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>
                          -{currency} {discountTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {taxTotal > 0 && (
                      <div className="flex justify-between text-[#64748B]">
                        <span>Tax ({globalTaxRate}%):</span>
                        <span>
                          +{currency} {taxTotal.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-[#0F172A] flex justify-between font-bold text-sm text-[#0F172A]">
                      <span>Total:</span>
                      <span>
                        {currency} {grandTotal.toFixed(2)}
                      </span>
                    </div>

                    {amountPaid > 0 && (
                      <>
                        <div className="flex justify-between text-emerald-600">
                          <span>Paid:</span>
                          <span>
                            -{currency} {amountPaid.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-xs text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                          <span>Balance:</span>
                          <span>
                            {currency} {balanceDue.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Payment instructions */}
                {(paymentDetails.bankName || notes) && (
                  <div className="mt-4 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
                    {paymentDetails.bankName && (
                      <p className="font-mono-code">
                        <span className="text-[#94A3B8]">Bank:</span> {paymentDetails.bankName} |{' '}
                        <span className="text-[#94A3B8]">Acct:</span>{' '}
                        {paymentDetails.accountNumber || 'N/A'}
                      </p>
                    )}
                    {notes && <p className="text-[10px] text-[#45464D]">{notes}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
