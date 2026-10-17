import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Timer,
  Laptop,
  Sparkles,
  ArrowRight,
  MoreVertical,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  FileCheck,
  Mail,
  Check,
} from 'lucide-react';
import { PurchaseItem } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface WarrantiesViewProps {
  purchases: PurchaseItem[];
  onSelectPurchase: (item: PurchaseItem) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

export const WarrantiesView: React.FC<WarrantiesViewProps> = ({
  purchases,
  onSelectPurchase,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const { formatPrice } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [alertingItemId, setAlertingItemId] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const handleSendDirectAlert = async (item: PurchaseItem, daysLeft: number) => {
    setAlertingItemId(item.id);
    setToastNotice(null);
    try {
      const res = await fetch('/api/warranty/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase: item,
          daysLeft: daysLeft,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastNotice(`✅ Warranty Email Alert sent for ${item.name}!`);
      } else {
        setToastNotice(`⚠️ ${data.error || 'Failed to send alert'}`);
      }
    } catch (err) {
      setToastNotice('⚠️ Network error sending alert email');
    } finally {
      setAlertingItemId(null);
      setTimeout(() => setToastNotice(null), 4000);
    }
  };

  // Filter items with warranties
  const warrantyItems = purchases.filter((p) => p.warranty.hasWarranty);

  // Calculate days remaining helper
  const calculateDaysRemaining = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date('2023-11-01'); // Fixed baseline for consistent mock calculations
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="space-y-5">
      {/* Page Header with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <h1 className="text-2xl md:text-3xl font-semibold text-[#0F172A] tracking-tight">
          Warranties & Returns
        </h1>
        <p className="text-[13px] text-[#76777D] mt-1">
          Manage your active guarantees, coverage claims, and return windows.
        </p>
      </motion.div>

      {/* High Priority Action Required Alerts */}
      <motion.section
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
        className="space-y-3"
      >
        <h3 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
          Action Required
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Alert Card 1: Return Window Closing */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl flex flex-col justify-between hover:border-[#94A3B8] transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#991B1B]">
                  <Timer className="w-5 h-5 text-[#DC2626]" />
                </div>
                <div>
                  <h4 className="text-[14px] font-medium text-[#0F172A]">Sony WH-1000XM5</h4>
                  <p className="text-[12px] text-[#76777D]">Amazon Purchase · {formatPrice(398)}</p>
                </div>
              </div>
              <span className="bg-[#FEE2E2] text-[#991B1B] font-mono-code text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[#FECACA]">
                2 DAYS LEFT
              </span>
            </div>

            <div className="flex justify-between items-center mt-auto border-t border-[#E2E8F0] pt-3.5">
              <span className="text-[12px] text-[#0F172A] font-medium">Return Window Closing</span>
              <button
                onClick={() => {
                  const sony = purchases.find((p) => p.name.includes('Sony WH-1000XM5')) || purchases[0];
                  onTriggerReturn(sony);
                }}
                className="bg-[#0F172A] text-white text-[12px] font-medium px-4 py-2 rounded-xl hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                Start Return
              </button>
            </div>
          </div>

          {/* Alert Card 2: AI Claim */}
          <div className="bg-white ai-border-subtle p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)] group">
            <div className="absolute top-3.5 right-3.5 text-[#94A3B8]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] border border-[#E2E8F0]">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-medium text-[#0F172A]">Breville Barista Pro</h4>
                  <p className="text-[12px] text-[#76777D]">Williams Sonoma · {formatPrice(899.95)}</p>
                </div>
              </div>
              <span className="bg-[#F1F5F9] text-[#475569] font-mono-code text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
                WARRANTY ISSUE
              </span>
            </div>

            <p className="text-[12px] text-[#76777D] mb-3 leading-relaxed">
              Detected solenoid valve pressure issue notes. AI drafted claim ready for Williams Sonoma review.
            </p>

            <div className="flex justify-end items-center mt-auto border-t border-[#E2E8F0] pt-3.5">
              <button
                onClick={() => {
                  const breville = purchases.find((p) => p.id === 'pur-3') || purchases[0];
                  onTriggerClaim(breville);
                }}
                className="bg-[#0F172A] text-white text-[12px] font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-[#1E293B] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Review AI Claim</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Warranties Table */}
      <motion.section
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        className="space-y-3"
      >
        {toastNotice && (
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-xs font-mono-code text-[#1E40AF] flex items-center gap-2">
            <span>{toastNotice}</span>
          </div>
        )}

        <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
          <h3 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
            Active Warranties ({warrantyItems.length})
          </h3>
          <span className="text-[12px] text-[#76777D] font-mono-code">
            Real-time Expiry Sync
          </span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-[#FAFAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="font-mono-code text-[11px] text-[#76777D] uppercase py-3 px-4 font-semibold">
                  Item
                </th>
                <th className="font-mono-code text-[11px] text-[#76777D] uppercase py-3 px-4 font-semibold">
                  Retailer / Provider
                </th>
                <th className="font-mono-code text-[11px] text-[#76777D] uppercase py-3 px-4 font-semibold">
                  Status
                </th>
                <th className="font-mono-code text-[11px] text-[#76777D] uppercase py-3 px-4 font-semibold">
                  Expires In
                </th>
                <th className="font-mono-code text-[11px] text-[#76777D] uppercase py-3 px-4 font-semibold text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
              {warrantyItems.map((item) => {
                const days = calculateDaysRemaining(item.warranty.expiryDate);
                const isExpiring = days <= 30 && days > 0;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPurchase(item)}
                    className="hover:bg-[#F9F9FB] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.serialNumber && (
                          <span className="text-[10px] font-mono-code text-[#76777D] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                            {item.serialNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#76777D]">
                      {item.warranty.provider || item.vendor}
                    </td>
                    <td className="py-3.5 px-4">
                      {isExpiring ? (
                        <span className="bg-[#FEE2E2] text-[#991B1B] font-mono-code text-[10px] px-2.5 py-0.5 rounded-full border border-[#FECACA] font-semibold">
                          EXPIRING
                        </span>
                      ) : (
                        <span className="bg-[#ECFDF5] text-[#065F46] font-mono-code text-[10px] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 px-4 font-mono-code ${isExpiring ? 'text-[#DC2626] font-semibold' : 'text-[#0F172A]'}`}>
                      {days > 365 ? `${Math.round(days / 365)} Years` : `${days} Days`}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendDirectAlert(item, days)}
                          disabled={alertingItemId === item.id}
                          className="text-[12px] text-[#0F172A] font-medium hover:bg-[#F1F5F9] bg-[#F9F9FB] border border-[#E2E8F0] px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Send Email Alert for this Item"
                        >
                          {alertingItemId === item.id ? (
                            <div className="w-3 h-3 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                          )}
                          <span>Email Alert</span>
                        </button>
                        <button
                          onClick={() => onTriggerClaim(item)}
                          className="text-[12px] text-[#0F172A] font-medium hover:underline bg-[#F9F9FB] border border-[#E2E8F0] px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          Claim RMA
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>

      {/* Visual Interactive 12-Month Timeline */}
      <motion.section
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
        className="space-y-3 pb-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
            12-Month Expiry Timeline
          </h3>
          <span className="text-[11px] text-[#76777D]">Click a month to inspect scheduled renewals</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
          {/* Months Grid */}
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2 mb-6">
            {months.map((m, idx) => {
              const isSelected = selectedMonth === idx;
              const hasEvents = idx === 10 || idx === 5 || idx === 9; // Nov, Jun, Oct
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(isSelected ? null : idx)}
                  className={`p-2.5 rounded-xl text-center transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : hasEvents
                      ? 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] hover:border-[#76777D]'
                      : 'bg-[#F9F9FB] border-[#E2E8F0] text-[#94A3B8]'
                  }`}
                >
                  <span className="block font-mono-code text-[11px] font-semibold">{m}</span>
                  {hasEvents && (
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 ${
                        isSelected ? 'bg-white' : 'bg-[#DC2626]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Timeline Milestones */}
          <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#0F172A]">
              <Calendar className="w-3.5 h-3.5 text-[#76777D]" />
              <span>Upcoming Milestones</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-[12px]">
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                <span className="font-mono-code text-[10px] text-[#DC2626] font-semibold">NOV 2, 2023</span>
                <p className="font-medium text-[#0F172A] mt-0.5">Sony A7IV Limited 1-Year Expiry</p>
                <p className="text-[11px] text-[#76777D]">B&H Photo Video · Check Shutter Count</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                <span className="font-mono-code text-[10px] text-[#F59E0B] font-semibold">NOV 19, 2023</span>
                <p className="font-medium text-[#0F172A] mt-0.5">Breville 2-Year Limited RMA Window</p>
                <p className="text-[11px] text-[#76777D]">Williams Sonoma · Claim Drafted</p>
              </div>
              <div className="p-3 bg-white border border-[#E2E8F0] rounded-xl">
                <span className="font-mono-code text-[10px] text-[#10B981] font-semibold">OCT 24, 2024</span>
                <p className="font-medium text-[#0F172A] mt-0.5">MacBook Pro 16" AppleCare+ Renewal</p>
                <p className="text-[11px] text-[#76777D]">Apple Store · Annual Coverage</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
