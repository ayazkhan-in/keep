import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Scale,
  DollarSign,
  Calendar,
  Building2,
  Users,
} from 'lucide-react';
import { Expense, LineItem, Verdict } from '../../types/expense';
import { evaluateExpense, ExpenseLedger, normalizeCurrency, verifyReceiptIntegrity } from '../../engine';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';
import { submitExpense } from '../../services/expenseService';

interface SubmitExpenseViewProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const SubmitExpenseView: React.FC<SubmitExpenseViewProps> = ({
  onSuccess,
  onCancel,
}) => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();

  const [activeTab, setActiveTab] = useState<'upload' | 'sample'>('sample');
  const [vendor, setVendor] = useState('Smoke House Deli');
  const [date, setDate] = useState('2026-10-22');
  const [total, setTotal] = useState('2400');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('meals');
  const [city, setCity] = useState('Bengaluru');
  const [isTravel, setIsTravel] = useState(false);
  const [clientName, setClientName] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('1');
  const [purpose, setPurpose] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Grilled Salmon Platter', quantity: 1, unitPrice: 1600, amount: 1600, category: 'meals', confidence: 0.98, itemFlags: [] },
    { id: '2', description: 'Craft Beer Pitcher', quantity: 1, unitPrice: 800, amount: 800, category: 'meals', confidence: 0.95, itemFlags: ['alcohol'] },
  ]);

  const [dryRunVerdict, setDryRunVerdict] = useState<Verdict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute dry-run verdict dynamically on form edits
  useEffect(() => {
    try {
      const parsedTotal = parseFloat(total) || 0;
      const normalized = normalizeCurrency({
        sourceCurrency: currency,
        sourceAmount: parsedTotal,
        targetCurrency: policy.settings.baseCurrency,
        expenseDate: date,
        policyFxRates: policy.settings.fxRates,
      });

      const integrity = verifyReceiptIntegrity({
        printedTotal: parsedTotal,
        lineItems,
        expenseDate: date,
      });

      const draftExp: Expense = {
        id: `draft_${Date.now()}`,
        orgId: 'org_acme',
        employeeId: activeEmp.id,
        status: 'draft',
        channel: 'upload',
        expenseDate: date,
        submittedAt: new Date().toISOString(),
        extracted: {
          merchant: { value: vendor, confidence: 0.95, inferred: false, source: 'ocr' },
          date: { value: date, confidence: 0.95, inferred: false, source: 'ocr' },
          total: { value: parsedTotal, confidence: 0.95, inferred: false, source: 'ocr' },
          currency: { value: currency, confidence: 0.99, inferred: false, source: 'ocr' },
          lineItems,
        },
        normalizedCurrency: normalized,
        context: {
          city,
          cityTier: policy.cityTiers[city] || 'Tier-1',
          isTravel,
          clientName: clientName.trim() || undefined,
          attendeeCount: parseInt(attendeeCount, 10) || 1,
          purpose: purpose.trim() || undefined,
          source: 'user',
        },
        integritySignals: integrity.signals,
      };

      const ledger = new ExpenseLedger();
      const verdict = evaluateExpense({
        expense: draftExp,
        policy,
        employee: activeEmp,
        ledger,
      });

      setDryRunVerdict(verdict);
    } catch (err) {
      console.error('Dry-run evaluation error:', err);
    }
  }, [vendor, date, total, currency, category, city, isTravel, clientName, attendeeCount, purpose, lineItems]);

  const loadSample = (type: 'meal_alcohol' | 'hotel' | 'hardware') => {
    if (type === 'meal_alcohol') {
      setVendor('Toit Brewpub Indiranagar');
      setDate('2026-10-22');
      setTotal('2200');
      setCategory('meals');
      setCity('Bengaluru');
      setLineItems([
        { id: '1', description: 'Woodfired Pizza', quantity: 1, unitPrice: 1400, amount: 1400, category: 'meals', confidence: 0.98, itemFlags: [] },
        { id: '2', description: 'House Brew Pint', quantity: 2, unitPrice: 400, amount: 800, category: 'meals', confidence: 0.96, itemFlags: ['alcohol'] },
      ]);
    } else if (type === 'hotel') {
      setVendor('Lemon Tree Premier');
      setDate('2026-10-22');
      setTotal('5500');
      setCategory('travel');
      setCity('Pune');
      setIsTravel(true);
      setLineItems([
        { id: '1', description: 'Standard Room Lodging', quantity: 1, unitPrice: 5500, amount: 5500, category: 'travel', confidence: 0.99, itemFlags: [] },
      ]);
    } else {
      setVendor('Croma Electronics');
      setDate('2026-10-22');
      setTotal('12500');
      setCategory('hardware');
      setCity('Bengaluru');
      setLineItems([
        { id: '1', description: 'Ultra-wide Monitor', quantity: 1, unitPrice: 12500, amount: 12500, category: 'hardware', confidence: 0.98, itemFlags: [] },
      ]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const parsedTotal = parseFloat(total) || 0;
      const newExpense: Expense = {
        id: `exp_${Date.now()}`,
        orgId: 'org_acme',
        employeeId: activeEmp.id,
        status: 'submitted',
        channel: 'upload',
        expenseDate: date,
        submittedAt: new Date().toISOString(),
        extracted: {
          merchant: { value: vendor, confidence: 0.96, inferred: false, source: 'ocr' },
          date: { value: date, confidence: 0.97, inferred: false, source: 'ocr' },
          total: { value: parsedTotal, confidence: 0.95, inferred: false, source: 'ocr' },
          currency: { value: currency, confidence: 0.99, inferred: false, source: 'ocr' },
          lineItems,
        },
        normalizedCurrency: normalizeCurrency({
          sourceCurrency: currency,
          sourceAmount: parsedTotal,
          targetCurrency: policy.settings.baseCurrency,
          expenseDate: date,
          policyFxRates: policy.settings.fxRates,
        }),
        context: {
          city,
          cityTier: policy.cityTiers[city] || 'Tier-1',
          isTravel,
          clientName: clientName.trim() || undefined,
          attendeeCount: parseInt(attendeeCount, 10) || 1,
          purpose: purpose.trim() || undefined,
          source: 'user',
        },
        integritySignals: {
          mathMismatch: false,
          taxRateAnomalous: false,
          missingDate: false,
          inferredTotal: false,
          unitemizedBalance: 0,
        },
      };

      submitExpense(newExpense);
      alert('Claim submitted successfully! Evaluated by server ledger.');
      onSuccess();
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
            Submit Corporate Expense Claim
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Instant policy verification, line-item exclusion detection, and live allowance dry-run
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#0F172A]"
        >
          Cancel
        </button>
      </div>

      {/* Preset sample buttons */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#475569] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Test Receipt Scenarios:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadSample('meal_alcohol')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-lg text-xs font-medium cursor-pointer"
          >
            Meal with Beer (Exclusion Check)
          </button>
          <button
            onClick={() => loadSample('hotel')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-lg text-xs font-medium cursor-pointer"
          >
            Tier-2 Hotel (City Cap Check)
          </button>
          <button
            onClick={() => loadSample('hardware')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-[#CBD5E1] rounded-lg text-xs font-medium cursor-pointer"
          >
            Monitor (Finance Escalation)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Extracted & Corrected Fields */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#64748B]" />
            Receipt Data & Context
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-medium text-[#475569] block mb-1">
                Vendor / Merchant
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#475569] block mb-1">
                Transaction Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#475569] block mb-1">
                Total Amount Paid
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-semibold"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-2 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs font-mono-code"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#475569] block mb-1">
                Location City & Tier
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
              >
                <option value="Bengaluru">Bengaluru (Tier-1: ₹3,000/day)</option>
                <option value="Mumbai">Mumbai (Tier-1: ₹3,000/day)</option>
                <option value="Delhi">Delhi (Tier-1: ₹3,000/day)</option>
                <option value="Pune">Pune (Tier-2: ₹1,800/day)</option>
                <option value="Jaipur">Jaipur (Tier-3: ₹1,200/day)</option>
              </select>
            </div>
          </div>

          {/* Context Options */}
          <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isTravelCheck"
                checked={isTravel}
                onChange={(e) => setIsTravel(e.target.checked)}
                className="rounded text-blue-600"
              />
              <label htmlFor="isTravelCheck" className="text-xs text-[#334155] font-medium cursor-pointer">
                Business Travel Context (eligible for daily city-tier per diem allowance)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-[#475569] block mb-1">
                  Client Organization Name (if dining)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Partner Corp"
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#475569] block mb-1">
                  Attendee Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Line Items List */}
          <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F172A]">
                Itemized Line Items ({lineItems.length}):
              </span>
              <span className="text-[11px] text-[#64748B]">Alcohol & personal items auto-flagged</span>
            </div>
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
              >
                <div>
                  <span className="font-semibold text-[#0F172A]">{item.description}</span>
                  {item.itemFlags?.length > 0 && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 uppercase">
                      {item.itemFlags.join(', ')}
                    </span>
                  )}
                </div>
                <span className="font-mono-code font-bold text-[#0F172A]">
                  ₹{item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Live Dry-Run Verdict Preview */}
        <div className="space-y-4">
          <div className="bg-[#0F172A] text-white p-5 rounded-2xl shadow-sm space-y-3">
            <span className="text-xs font-mono-code uppercase tracking-wider text-white/70 block font-semibold">
              Live Engine Verdict Preview
            </span>

            {dryRunVerdict ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-white/15">
                  <span className="text-xs">Draft Decision:</span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    {dryRunVerdict.decision}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/70">Claimed:</span>
                    <span className="font-semibold">₹{(dryRunVerdict.totalAmountMinor / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Approved Allowance:</span>
                    <span>₹{(dryRunVerdict.approvedAmountMinor / 100).toFixed(2)}</span>
                  </div>
                  {dryRunVerdict.rejectedAmountMinor > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Excluded / Capped:</span>
                      <span>₹{(dryRunVerdict.rejectedAmountMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {dryRunVerdict.pendingAmountMinor > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>Held Pending Info:</span>
                      <span>₹{(dryRunVerdict.pendingAmountMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/15 text-[11px] text-white/80 space-y-1">
                  <span className="font-semibold text-white block">Cited Rules:</span>
                  {(dryRunVerdict.ruleImpacts || []).slice(0, 2).map((r, i) => (
                    <p key={i} className="truncate">
                      • {r.title} ({r.impactType})
                    </p>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-white/60">Calculating instant verdict...</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Authoritative Claim</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs text-xs text-[#64748B] space-y-1.5">
            <span className="font-semibold text-[#0F172A] block">Policy Reminder:</span>
            <p>• Alcohol line items and taxes are excluded automatically.</p>
            <p>• Standard approvals under ₹10,000 are processed touchlessly.</p>
            <p>• Daily city caps accumulate in chronological receipt order.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
