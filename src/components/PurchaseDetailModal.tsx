import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  FileText,
  Bot,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { PurchaseItem } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useCurrency } from '../context/CurrencyContext';

interface PurchaseDetailModalProps {
  purchase: PurchaseItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onDelete,
}) => {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'documents'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  return (
    <AnimatePresence>
      {isOpen && purchase && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
            { id: 'compliance', label: 'Policy & Compliance' },
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
                    <Bot className="w-4 h-4 text-[#0F172A]" />
                    <span className="text-[#45464D]">{purchase.aiExtractedNotes || 'Verified by Keepr OCR Engine'}</span>
                  </div>
                  <span className="font-mono-code text-[11px] text-[#10B981] font-semibold">
                    {Math.round(purchase.aiConfidence * 100)}% Match
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <div className="p-5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono-code text-[11px] text-[#76777D] uppercase font-semibold">
                      Automated Policy Audit
                    </span>
                    <h4 className="font-medium text-[15px] text-[#0F172A] mt-1">
                      {purchase.category} Compliance Check
                    </h4>
                    <p className="text-[12px] text-[#76777D] mt-0.5">
                      Merchant: {purchase.vendor} · Expensed on {purchase.purchaseDate}
                    </p>
                  </div>
                  {purchase.notes?.includes('FLAGGED') || purchase.notes?.includes('EXCEEDED') ? (
                    <span className="bg-rose-50 text-rose-700 font-mono-code text-[11px] px-2.5 py-1 rounded-full font-semibold border border-rose-200">
                      EXCEPTION FLAGGED
                    </span>
                  ) : (
                    <span className="bg-[#ECFDF5] text-[#065F46] font-mono-code text-[11px] px-2.5 py-1 rounded-full font-semibold border border-[#A7F3D0]">
                      COMPLIANT
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2">
                  <p className="text-[12px] text-[#45464D] leading-relaxed">
                    <strong>Tax Deductibility:</strong> {purchase.taxDeductible ? 'Tax Deductible Business Expense (FY2026 Write-off)' : 'Non-deductible / Standard Expense'}
                  </p>
                  {purchase.notes && (
                    <p className="text-[12px] text-[#45464D] leading-relaxed">
                      <strong>Audit Findings:</strong> {purchase.notes}
                    </p>
                  )}
                  {purchase.aiExtractedNotes && (
                    <p className="text-[12px] text-[#76777D] font-mono-code">
                      <strong>OCR Verification:</strong> {purchase.aiExtractedNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[#45464D]">
                    {purchase.notes?.includes('FLAGGED')
                      ? 'Action needed: Submit missing justification or request manager sign-off.'
                      : 'All line items and expenditure thresholds verified against organizational policy.'}
                  </span>
                </div>
              </div>
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
