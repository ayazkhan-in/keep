import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Info,
  Laptop,
  Armchair,
  Coffee,
  ShoppingBag,
  Plus,
  Clock,
  ShieldCheck,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { PurchaseItem, AIActionItem, ActiveView } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { MinimalSelect } from './ui/MinimalSelect';

interface DashboardViewProps {
  purchases: PurchaseItem[];
  actions: AIActionItem[];
  setActiveView: (view: ActiveView) => void;
  openScanner: () => void;
  onSelectPurchase: (item: PurchaseItem) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  purchases,
  actions,
  setActiveView,
  openScanner,
  onSelectPurchase,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const { formatPrice, formatCompact, currencySymbol } = useCurrency();
  const [spendingRange, setSpendingRange] = useState<'30days' | 'year'>('30days');
  const [hoveredBar, setHoveredBar] = useState<number | null>(3); // Default Thu active

  // Calculate Money at Risk (purchases eligible for return in next 14 days)
  const itemsEligibleForReturn = purchases.filter(
    (p) => p.returnWindow.hasReturn && p.returnWindow.status !== 'closed'
  );
  const capitalAtRisk = itemsEligibleForReturn.reduce((sum, item) => sum + item.price, 0);

  // Bar data dynamically using currency
  const barData = [
    { day: 'Mon', height: '32%', rawAmount: 1200, active: false },
    { day: 'Tue', height: '48%', rawAmount: 1850, active: false },
    { day: 'Wed', height: '22%', rawAmount: 820, active: false },
    { day: 'Thu', height: '82%', rawAmount: 3499, active: true },
    { day: 'Fri', height: '60%', rawAmount: 2350, active: false },
    { day: 'Sat', height: '52%', rawAmount: 1940, active: false },
    { day: 'Sun', height: '36%', rawAmount: 1450, active: false },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Electronics':
        return <Laptop className="w-4 h-4 text-[#45464D]" />;
      case 'Office Furniture':
        return <Armchair className="w-4 h-4 text-[#45464D]" />;
      case 'Appliances':
        return <Coffee className="w-4 h-4 text-[#45464D]" />;
      default:
        return <ShoppingBag className="w-4 h-4 text-[#45464D]" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Editorial Header with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 border-b border-[#E2E8F0] gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#0F172A] tracking-tight">
            Intelligence Overview
          </h1>
          <p className="text-[13px] text-[#76777D] mt-1 font-normal">
            Here is the current state of your managed assets and expenditure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openScanner}
            className="px-3.5 py-2 bg-[#0F172A] text-white rounded-xl text-[13px] font-medium hover:bg-[#1E293B] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Receipt</span>
          </button>
        </div>
      </motion.div>

      {/* Main Grid: 12 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Action Center + Spending Bar Chart + Recent Ingestion */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* AI Action Center */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-5 relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center gap-2 mb-3.5">
              <Sparkles className="w-4 h-4 text-[#76777D]" />
              <h3 className="font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                AI Action Center
              </h3>
            </div>

            <div className="space-y-2.5">
              {/* Action Item 1: Return Closing */}
              <div
                onClick={() => {
                  const item = purchases.find((p) => p.id === 'pur-1') || purchases[0];
                  onTriggerReturn(item);
                }}
                className="flex items-center justify-between p-3.5 border border-[#E2E8F0] rounded-xl hover:border-[#94A3B8] transition-all group cursor-pointer bg-[#F9F9FB] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#0F172A]">
                      Return window closing for MacBook Pro
                    </p>
                    <p className="text-[12px] text-[#76777D]">
                      Deadline in 3 days. Initiate return now to secure {formatPrice(3499)}.
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-medium text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Review <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              {/* Action Item 2: Scan new receipts */}
              <div
                onClick={openScanner}
                className="flex items-center justify-between p-3.5 border border-[#E2E8F0] rounded-xl hover:border-[#94A3B8] transition-all group cursor-pointer bg-[#F9F9FB] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#64748B] shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#0F172A]">
                      Scan new receipts or invoices
                    </p>
                    <p className="text-[12px] text-[#76777D]">
                      Drop image or PDF to extract warranties, serial numbers & policies.
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-medium text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Process <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              {/* Action Item 3: Warranty claim ready */}
              <div
                onClick={() => {
                  const breville = purchases.find((p) => p.id === 'pur-3') || purchases[0];
                  onTriggerClaim(breville);
                }}
                className="flex items-center justify-between p-3.5 border border-[#E2E8F0] rounded-xl hover:border-[#94A3B8] transition-all group cursor-pointer bg-[#F9F9FB] hover:bg-white"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-[#0F172A]">
                      Breville Barista Pro Warranty Expiry (14 Days)
                    </p>
                    <p className="text-[12px] text-[#76777D]">
                      AI drafted warranty claim available for review.
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-medium text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Review Claim <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Spending Trajectory Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                Spending Trajectory
              </h3>
              <MinimalSelect
                value={spendingRange}
                onChange={(val) => setSpendingRange(val as any)}
                options={[
                  { value: '30days', label: 'Last 30 Days' },
                  { value: 'year', label: 'This Year' },
                ]}
                size="sm"
              />
            </div>

            {/* Minimalist Grayscale Bar Chart */}
            <div className="h-44 flex items-end justify-between gap-2 pt-4 border-b border-[#E2E8F0] pb-2 relative">
              {/* Y-Axis Labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-[#94A3B8] font-mono-code pointer-events-none pb-2">
                <span>{formatCompact(5000)}</span>
                <span>{formatCompact(2500)}</span>
                <span>0</span>
              </div>

              {/* Bars */}
              <div className="flex-1 flex items-end justify-between gap-2 h-full pl-8">
                {barData.map((bar, idx) => {
                  const isHovered = hoveredBar === idx;
                  const isPeak = bar.day === 'Thu';
                  return (
                    <div
                      key={bar.day}
                      onMouseEnter={() => setHoveredBar(idx)}
                      className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[11px] font-mono-code py-0.5 px-2.5 rounded-full pointer-events-none whitespace-nowrap z-20 shadow-xs">
                          {formatPrice(bar.rawAmount)}
                        </div>
                      )}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: bar.height }}
                        transition={{ duration: 0.5, delay: 0.15 + idx * 0.05, ease: 'easeOut' }}
                        className={`w-full rounded-t-lg transition-colors duration-200 ${
                          isPeak
                            ? 'bg-[#0F172A] hover:bg-[#1E293B]'
                            : isHovered
                            ? 'bg-[#CBD5E1]'
                            : 'bg-[#E2E8F0] hover:bg-[#CBD5E1]'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between pl-8 mt-2 text-[11px] text-[#76777D] font-mono-code">
              {barData.map((b) => (
                <span key={b.day} className="flex-1 text-center">
                  {b.day}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Recent Ingestion List */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
            className="bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden"
          >
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#FAFAFC]">
              <h3 className="font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                Recent Ingestion
              </h3>
              <button
                onClick={() => setActiveView('purchases')}
                className="text-[12px] text-[#0F172A] font-medium hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {purchases.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectPurchase(p)}
                  className="flex items-center justify-between p-4 hover:bg-[#F9F9FB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl flex items-center justify-center shrink-0">
                      {getCategoryIcon(p.category)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#0F172A]">{p.name}</p>
                      <p className="text-[12px] text-[#76777D]">
                        {p.vendor} · {p.purchaseDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono-code text-[13px] font-semibold text-[#0F172A]">
                      {formatPrice(p.price)}
                    </p>
                    {p.warranty.hasWarranty ? (
                      <span className="inline-block px-2 py-0.5 mt-1 bg-[#F1F5F9] text-[#475569] text-[10px] uppercase font-mono-code rounded-full border border-[#E2E8F0]">
                        Warranty Active
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 mt-1 bg-[#F1F5F9] text-[#76777D] text-[10px] uppercase font-mono-code rounded-full">
                        Receipt Saved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column (4 cols): Capital at Risk + Upcoming Deadlines Timeline */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Capital at Risk Widget */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                Capital at Risk
              </h3>
              <Info className="w-4 h-4 text-[#94A3B8]" />
            </div>
            <div className="mt-3">
              <p className="text-3xl md:text-4xl text-[#0F172A] font-semibold tracking-tighter leading-none font-mono-code">
                {formatPrice(capitalAtRisk)}
              </p>
              <p className="text-[12px] text-[#76777D] mt-2 leading-relaxed">
                Value of items eligible for return or exchange within the next 14 days.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                onClick={() => setActiveView('returns')}
                className="w-full py-2.5 bg-[#F9F9FB] text-[#0F172A] border border-[#E2E8F0] rounded-xl text-[12px] font-medium hover:bg-[#F1F5F9] transition-colors cursor-pointer"
              >
                View Eligible Items ({itemsEligibleForReturn.length})
              </button>
            </div>
          </motion.div>

          {/* Upcoming Deadlines Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex-1 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-mono-code text-[11px] text-[#76777D] uppercase tracking-wider font-semibold">
                Upcoming Deadlines
              </h3>
              <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
            </div>

            <div className="relative border-l-2 border-[#E2E8F0] ml-3 space-y-6 flex-1">
              {/* Timeline Item 1 */}
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#DC2626] rounded-full -left-[7px] top-1.5 border-2 border-white ring-1 ring-[#DC2626]" />
                <p className="font-mono-code text-[10px] text-[#DC2626] font-semibold uppercase">
                  Today
                </p>
                <p className="text-[13px] font-medium text-[#0F172A] mt-0.5">
                  MacBook Pro Return Window
                </p>
                <p className="text-[11px] text-[#76777D]">Apple Store · Order #W99281044</p>
              </div>

              {/* Timeline Item 2 */}
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#0F172A] rounded-full -left-[7px] top-1.5 border-2 border-white ring-1 ring-[#0F172A]" />
                <p className="font-mono-code text-[10px] text-[#76777D] font-semibold uppercase">
                  Nov 2
                </p>
                <p className="text-[13px] font-medium text-[#0F172A] mt-0.5">
                  Sony A7IV Warranty Expiry
                </p>
                <p className="text-[11px] text-[#76777D]">Manufacturer 1-Year Limited</p>
              </div>

              {/* Timeline Item 3 */}
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#94A3B8] rounded-full -left-[7px] top-1.5 border-2 border-white" />
                <p className="font-mono-code text-[10px] text-[#76777D] font-semibold uppercase">
                  Nov 15
                </p>
                <p className="text-[13px] font-medium text-[#0F172A] mt-0.5">
                  Quarterly Tax Docs Prep
                </p>
                <p className="text-[11px] text-[#76777D]">Export categorized receipts</p>
              </div>

              {/* Timeline Item 4 */}
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-[#CBD5E1] rounded-full -left-[7px] top-1.5 border-2 border-white" />
                <p className="font-mono-code text-[10px] text-[#76777D] font-semibold uppercase">
                  Nov 19
                </p>
                <p className="text-[13px] font-medium text-[#0F172A] mt-0.5">
                  Breville Barista Pro RMA
                </p>
                <p className="text-[11px] text-[#76777D]">Williams Sonoma Warranty Claim</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setActiveView('timeline')}
                className="text-[12px] text-[#0F172A] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Schedule</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
