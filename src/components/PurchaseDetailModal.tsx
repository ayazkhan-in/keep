import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  RotateCcw,
  Download,
  Trash2,
  FileText,
  Sparkles,
  ExternalLink,
  Calendar,
  CreditCard,
  Hash,
  Tag,
  Building,
  CheckCircle2,
  TrendingDown,
  Loader2,
  DollarSign,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { PurchaseItem } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useCurrency } from '../context/CurrencyContext';

interface PurchaseDetailModalProps {
  purchase: PurchaseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onTriggerClaim: (item: PurchaseItem) => void;
  onTriggerReturn: (item: PurchaseItem) => void;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onDelete,
  onTriggerClaim,
  onTriggerReturn,
}) => {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'valuation' | 'warranty' | 'return' | 'documents'>('overview');
  const [valuationData, setValuationData] = useState<any>(null);
  const [isValuating, setIsValuating] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'valuation' && purchase && !valuationData) {
      fetchValuation();
    }
  }, [activeTab, purchase]);

  const fetchValuation = async () => {
    if (!purchase) return;
    setIsValuating(true);
    try {
      const res = await fetch('/api/gemini/valuate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase }),
      });
      const data = await res.json();
      if (data.success && data.valuation) {
        setValuationData(data.valuation);
      }
    } catch (err) {
      console.error('Valuation error:', err);
    } finally {
      setIsValuating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && purchase && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 16, filter: 'blur(8px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white rounded-2xl max-w-3xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-start justify-between bg-[#FAFAFC]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono-code bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 rounded-full border border-[#E2E8F0] uppercase">
                {purchase.category}
              </span>
              {purchase.taxDeductible && (
                <span className="text-[11px] font-mono-code bg-[#ECFDF5] text-[#065F46] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] uppercase">
                  Tax Deductible
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A] tracking-tight">
              {purchase.name}
            </h2>
            <p className="text-[12px] text-[#76777D] mt-0.5 font-normal">
              {purchase.vendor} · Purchased on {purchase.purchaseDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-[#94A3B8] hover:text-[#DC2626] rounded-xl hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              title="Delete Purchase"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={showDeleteConfirm}
          itemName={purchase.name}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            onDelete(purchase.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
        />

        {/* Tab Switcher */}
        <div className="border-b border-[#E2E8F0] px-5 flex gap-4 bg-white text-[13px] font-medium overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'valuation', label: 'AI Resale Valuation' },
            { id: 'warranty', label: 'Warranty & Protection' },
            { id: 'return', label: 'Return Policy' },
            { id: 'documents', label: `Documents (${purchase.documents.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#0F172A] text-[#0F172A]'
                  : 'border-transparent text-[#76777D] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Price and Specs summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[10px] font-mono-code text-[#76777D] uppercase">Amount</span>
                  <p className="text-lg font-semibold font-mono-code text-[#0F172A] mt-0.5">
                    {formatPrice(purchase.price)}
                  </p>
                </div>
                <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[10px] font-mono-code text-[#76777D] uppercase">Order Ref</span>
                  <p className="text-[13px] font-medium font-mono-code text-[#0F172A] mt-0.5 truncate">
                    {purchase.orderNumber || 'N/A'}
                  </p>
                </div>
                <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[10px] font-mono-code text-[#76777D] uppercase">Serial</span>
                  <p className="text-[13px] font-medium font-mono-code text-[#0F172A] mt-0.5 truncate">
                    {purchase.serialNumber || 'N/A'}
                  </p>
                </div>
                <div className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <span className="text-[10px] font-mono-code text-[#76777D] uppercase">Payment</span>
                  <p className="text-[13px] font-medium text-[#0F172A] mt-0.5 truncate">
                    {purchase.paymentMethod || 'Credit Card'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {purchase.notes && (
                <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[13px]">
                  <h4 className="font-semibold text-[#0F172A] text-[12px] mb-1 font-mono-code uppercase text-[#76777D]">
                    Item Specifications & Notes
                  </h4>
                  <p className="text-[#45464D] leading-relaxed">{purchase.notes}</p>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono-code text-[#76777D] uppercase">Metadata Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {purchase.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] text-[11px] rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Verification */}
              {purchase.aiConfidence && (
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0F172A]" />
                    <span className="text-[#45464D]">{purchase.aiExtractedNotes || 'Verified by Keepr OCR Engine'}</span>
                  </div>
                  <span className="font-mono-code text-[11px] text-[#10B981] font-semibold">
                    {Math.round(purchase.aiConfidence * 100)}% Match
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'valuation' && (
            <div className="space-y-5">
              {isValuating && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#0F172A] animate-spin" />
                  <p className="text-[13px] font-medium text-[#0F172A]">
                    Estimating secondary market value & depreciation curves...
                  </p>
                  <p className="text-[11px] text-[#76777D] font-mono-code">
                    Gemini 3.6 Flash Asset Valuation Engine
                  </p>
                </div>
              )}

              {valuationData && !isValuating && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                      <span className="text-[10px] font-mono-code text-[#76777D] uppercase">
                        Current Estimated Value
                      </span>
                      <p className="text-2xl font-bold font-mono-code text-[#0F172A] mt-1">
                        {formatPrice(valuationData.estimatedCurrentValue || 0)}
                      </p>
                      <p className="text-[11px] text-[#76777D] mt-0.5">
                        Original: {formatPrice(purchase.price)}
                      </p>
                    </div>

                    <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                      <span className="text-[10px] font-mono-code text-[#76777D] uppercase">
                        Total Depreciation
                      </span>
                      <p className="text-2xl font-bold font-mono-code text-[#DC2626] mt-1">
                        -{valuationData.depreciationPercentage}%
                      </p>
                      <p className="text-[11px] text-[#76777D] mt-0.5">
                        Rate: {valuationData.annualDepreciationRate || '18%/yr'}
                      </p>
                    </div>

                    <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                      <span className="text-[10px] font-mono-code text-[#76777D] uppercase">
                        Condition Grade
                      </span>
                      <p className="text-2xl font-bold font-mono-code text-[#0F172A] mt-1">
                        {valuationData.conditionGrade || 'A-'}
                      </p>
                      <p className="text-[11px] text-[#76777D] mt-0.5">
                        Demand: {valuationData.marketTrend || 'High'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl space-y-2 text-[13px]">
                    <h4 className="font-semibold text-[#0F172A] text-[12px] font-mono-code uppercase text-[#76777D] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0F172A]" />
                      AI Resale Recommendation
                    </h4>
                    <p className="text-[#0F172A] font-medium">
                      {valuationData.recommendedResaleWindow || 'Optimal listing window: Next 3 months'}
                    </p>
                    <p className="text-[#45464D] leading-relaxed text-[12px]">
                      {valuationData.resaleAdvice}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <div className="p-5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono-code text-[11px] text-[#76777D] uppercase font-semibold">
                      Provider & Term
                    </span>
                    <h4 className="font-medium text-[15px] text-[#0F172A] mt-1">
                      {purchase.warranty.provider}
                    </h4>
                    <p className="text-[12px] text-[#76777D] mt-0.5">
                      Coverage Duration: {purchase.warranty.durationMonths} Months ({purchase.warranty.startDate} → {purchase.warranty.expiryDate})
                    </p>
                  </div>
                  {purchase.warranty.hasWarranty ? (
                    <span className="bg-[#ECFDF5] text-[#065F46] font-mono-code text-[11px] px-2.5 py-1 rounded-full font-semibold border border-[#A7F3D0]">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="bg-[#F1F5F9] text-[#76777D] font-mono-code text-[11px] px-2.5 py-1 rounded-full">
                      NO WARRANTY
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                  <p className="text-[12px] text-[#45464D] leading-relaxed">
                    <strong>Coverage Terms:</strong> {purchase.warranty.terms}
                  </p>
                  {purchase.warranty.claimInstructions && (
                    <p className="text-[12px] text-[#76777D] mt-2">
                      <strong>Claim Process:</strong> {purchase.warranty.claimInstructions}
                    </p>
                  )}
                </div>
              </div>

              {purchase.warranty.hasWarranty && (
                <div className="p-5 border border-dashed border-[#CBD5E1] rounded-2xl bg-white flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-[13px] text-[#0F172A]">Need to submit a repair or replacement claim?</h5>
                    <p className="text-[12px] text-[#76777D]">
                      Gemini will craft an official RMA notice referencing serial #{purchase.serialNumber || 'N/A'}.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerClaim(purchase);
                    }}
                    className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-xl hover:bg-[#1E293B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI Claim</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'return' && (
            <div className="space-y-4">
              <div className="p-5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono-code text-[11px] text-[#76777D] uppercase font-semibold">
                      Merchant Return Policy
                    </span>
                    <h4 className="font-medium text-[15px] text-[#0F172A] mt-1">
                      {purchase.vendor} Return Window
                    </h4>
                    <p className="text-[12px] text-[#76777D] mt-0.5">
                      Deadline Date: {purchase.returnWindow.deadlineDate} ({purchase.returnWindow.returnDays} days policy)
                    </p>
                  </div>
                  <span
                    className={`font-mono-code text-[11px] px-3 py-1 rounded-full font-semibold ${
                      purchase.returnWindow.status === 'expiring_soon'
                        ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                        : 'bg-[#F1F5F9] text-[#475569]'
                    }`}
                  >
                    {purchase.returnWindow.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-[12px] text-[#45464D] mt-3 leading-relaxed">
                  {purchase.returnWindow.policy}
                </p>
              </div>

              {purchase.returnWindow.hasReturn && (
                <div className="p-5 border border-dashed border-[#CBD5E1] rounded-2xl bg-white flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-[13px] text-[#0F172A]">Initiate Return & Refund</h5>
                    <p className="text-[12px] text-[#76777D]">
                      Generate a formatted merchant return request email with order #{purchase.orderNumber}.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerReturn(purchase);
                    }}
                    className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-xl hover:bg-[#1E293B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Draft Return Email</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-3">
              {purchase.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#0F172A]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-[13px] text-[#0F172A]">{doc.name}</p>
                      <p className="text-[11px] text-[#76777D] font-mono-code">
                        {doc.uploadDate} · {doc.fileSize}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-[#45464D] hover:text-[#0F172A] hover:bg-white rounded-lg transition-colors"
                    title="Open Document"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex justify-end items-center bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-xl hover:bg-[#1E293B] cursor-pointer"
          >
            Done
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
