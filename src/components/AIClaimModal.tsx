import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  Mail,
  Loader2,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { PurchaseItem } from '../types';

interface AIClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: PurchaseItem | null;
  mode: 'warranty_claim' | 'return_request';
}

export const AIClaimModal: React.FC<AIClaimModalProps> = ({
  isOpen,
  onClose,
  purchase,
  mode,
}) => {
  const [defectText, setDefectText] = useState('');
  const [generatedResult, setGeneratedResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (purchase && isOpen) {
      if (mode === 'warranty_claim') {
        setDefectText(
          purchase.name.includes('Breville')
            ? 'Solenoid pressure valve intermittent failure causing water leakage during extraction.'
            : 'Device encounters intermittent hardware power failure during standard operation.'
        );
      } else {
        setDefectText('Product does not fit physical workstation requirements / seeking alternative specification.');
      }
      setGeneratedResult('');
    }
  }, [purchase, isOpen, mode]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        mode === 'warranty_claim'
          ? '/api/gemini/claim-generator'
          : '/api/gemini/return-generator';

      const body =
        mode === 'warranty_claim'
          ? {
              purchase,
              defectDescription: defectText,
              claimantName: 'Alex Morgan',
            }
          : {
              purchase,
              returnReason: defectText,
              customerName: 'Alex Morgan',
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (mode === 'warranty_claim' && data.claimLetter) {
        setGeneratedResult(data.claimLetter);
      } else if (mode === 'return_request' && data.returnEmail) {
        setGeneratedResult(data.returnEmail);
      }
    } catch (err) {
      console.error('Error generating document:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${purchase.name.replace(/[^a-zA-Z0-9]/g, '_')}_${
      mode === 'warranty_claim' ? 'Warranty_Claim' : 'Return_Request'
    }.txt`;
    const blob = new Blob([generatedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            className="bg-white rounded-2xl max-w-2xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              {mode === 'warranty_claim' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-[15px] text-[#0F172A]">
                {mode === 'warranty_claim'
                  ? 'AI Warranty Claim Notice Generator'
                  : 'AI Merchant Return & Refund Draft'}
              </h3>
              <p className="text-[11px] text-[#76777D]">
                For {purchase.name} ({purchase.vendor})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!generatedResult ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[#0F172A] text-[13px] font-medium mb-1.5">
                  {mode === 'warranty_claim'
                    ? 'Describe the defect or hardware symptom'
                    : 'Reason for return & refund'}
                </label>
                <textarea
                  rows={4}
                  value={defectText}
                  onChange={(e) => setDefectText(e.target.value)}
                  placeholder="Enter specific defect notes, error codes, or reason..."
                  className="w-full p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[13px] text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:bg-white leading-relaxed"
                />
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[12px] text-[#76777D] space-y-1">
                <p>
                  <strong>Linked Order:</strong> {purchase.orderNumber || 'Standard Invoice'}
                </p>
                <p>
                  <strong>Serial Number:</strong> {purchase.serialNumber || 'Included from Receipt'}
                </p>
                <p>
                  <strong>Terms:</strong> {purchase.warranty.terms || purchase.returnWindow.policy}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || !defectText.trim()}
                className="w-full py-3 bg-[#0F172A] text-white font-medium text-[13px] rounded-xl hover:bg-[#1E293B] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {isLoading
                    ? 'Gemini Drafting Official Letter...'
                    : `Generate Formal ${
                        mode === 'warranty_claim' ? 'Claim Letter' : 'Return Request'
                      }`}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-mono-code text-[11px] uppercase text-[#10B981] font-semibold bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                  Generated Notice Ready
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-[#45464D] hover:text-[#0F172A] border border-[#E2E8F0] rounded-xl bg-white text-[12px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-[#45464D] hover:text-[#0F172A] border border-[#E2E8F0] rounded-xl bg-white text-[12px] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[12px] text-[#0F172A] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                {generatedResult}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center bg-white">
          {generatedResult ? (
            <button
              onClick={() => setGeneratedResult('')}
              className="text-[12px] text-[#76777D] hover:text-[#0F172A] cursor-pointer"
            >
              ← Edit Input
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium rounded-xl hover:bg-[#1E293B] cursor-pointer"
          >
            Close
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
