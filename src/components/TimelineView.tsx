import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PurchaseItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface TimelineViewProps {
  purchases: PurchaseItem[];
  onSelectPurchase: (item: PurchaseItem) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  purchases,
  onSelectPurchase,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const { formatPrice } = useCurrency();
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'returns' | 'warranties' | 'purchases'>('all');

  // Build unified chronological timeline events
  const timelineEvents: Array<{
    id: string;
    date: string;
    title: string;
    type: 'purchase' | 'return_deadline' | 'warranty_expiry';
    item: PurchaseItem;
    description: string;
    badge: string;
    severity: 'normal' | 'urgent' | 'highlight';
  }> = [];

  purchases.forEach((p) => {
    // Purchase event
    timelineEvents.push({
      id: `${p.id}-pur`,
      date: p.purchaseDate,
      title: `Purchased ${p.name}`,
      type: 'purchase',
      item: p,
      description: `${p.vendor} · ${formatPrice(p.price)}`,
      badge: 'Acquisition',
      severity: 'normal',
    });

    // Return deadline
    if (p.returnWindow.hasReturn && p.returnWindow.deadlineDate) {
      timelineEvents.push({
        id: `${p.id}-ret`,
        date: p.returnWindow.deadlineDate,
        title: `Return Window Closes: ${p.name}`,
        type: 'return_deadline',
        item: p,
        description: `Last day for full refund to ${p.paymentMethod || 'original payment'}`,
        badge: 'Return Deadline',
        severity: p.returnWindow.status === 'expiring_soon' ? 'urgent' : 'normal',
      });
    }

    // Warranty expiry
    if (p.warranty.hasWarranty && p.warranty.expiryDate) {
      timelineEvents.push({
        id: `${p.id}-war`,
        date: p.warranty.expiryDate,
        title: `Warranty Expiry: ${p.name}`,
        type: 'warranty_expiry',
        item: p,
        description: `${p.warranty.provider} expires`,
        badge: 'Warranty End',
        severity: 'highlight',
      });
    }
  });

  // Sort descending by date
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredEvents = timelineEvents.filter((ev) => {
    if (selectedEventType === 'returns' && ev.type !== 'return_deadline') return false;
    if (selectedEventType === 'warranties' && ev.type !== 'warranty_expiry') return false;
    if (selectedEventType === 'purchases' && ev.type !== 'purchase') return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#0F172A] tracking-tight">
            Purchase & Asset Timeline
          </h1>
          <p className="text-[13px] text-[#76777D] mt-1">
            Chronological log of acquisitions, warranty renewals, and return window closures.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] p-1.5 rounded-2xl shadow-2xs">
          {[
            { id: 'all', label: 'All Milestones' },
            { id: 'returns', label: 'Returns' },
            { id: 'warranties', label: 'Warranties' },
            { id: 'purchases', label: 'Purchases' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedEventType(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors cursor-pointer ${
                selectedEventType === tab.id
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#45464D] hover:bg-[#F9F9FB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Timeline Card with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
        className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
      >
        <div className="relative border-l-2 border-[#E2E8F0] ml-4 md:ml-32 space-y-8 pb-4">
          {filteredEvents.map((ev) => {
            const isUrgent = ev.severity === 'urgent';
            return (
              <div key={ev.id} className="relative pl-6 group">
                {/* Desktop Left-aligned Date */}
                <div className="hidden md:block absolute -left-36 top-0.5 w-28 text-right font-mono-code text-[12px] text-[#76777D] font-medium">
                  {ev.date}
                </div>

                {/* Bullet Node */}
                <div
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ring-2 transition-transform group-hover:scale-110 ${
                    isUrgent
                      ? 'bg-[#DC2626] ring-[#DC2626]'
                      : ev.type === 'warranty_expiry'
                      ? 'bg-[#0F172A] ring-[#0F172A]'
                      : 'bg-[#94A3B8] ring-[#E2E8F0]'
                  }`}
                />

                {/* Event Card */}
                <div
                  onClick={() => onSelectPurchase(ev.item)}
                  className="bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl p-5 hover:bg-white hover:border-[#94A3B8] transition-all cursor-pointer shadow-2xs"
                >
                  {/* Mobile Date */}
                  <div className="md:hidden font-mono-code text-[10px] text-[#76777D] mb-1">
                    {ev.date}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[14px] text-[#0F172A]">{ev.title}</h4>
                      <span
                        className={`font-mono-code text-[10px] px-2.5 py-0.5 rounded-full uppercase font-semibold ${
                          isUrgent
                            ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                            : 'bg-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        {ev.badge}
                      </span>
                    </div>

                    <span className="font-mono-code text-[13px] font-semibold text-[#0F172A]">
                      {formatPrice(ev.item.price)}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#76777D] mt-1">{ev.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                    <span className="text-[#94A3B8]">{ev.item.vendor}</span>
                    <div className="flex items-center gap-3">
                      {ev.type === 'return_deadline' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerReturn(ev.item);
                          }}
                          className="text-[#0F172A] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Start Return
                        </button>
                      )}
                      {ev.type === 'warranty_expiry' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerClaim(ev.item);
                          }}
                          className="text-[#0F172A] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3 h-3" /> Claim Warranty
                        </button>
                      )}
                      <span className="text-[#0F172A] font-medium group-hover:underline">
                        View Asset →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
