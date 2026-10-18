import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  X,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { ReceiptIssue } from '../../types';

interface ReceiptIssueOverlayProps {
  issue: ReceiptIssue | null;
  onDismiss: () => void;
  onRetry?: () => void;
  onRetake?: () => void;
  onContinueAnyway?: () => void;
  onProceedAnyway?: () => void;
  mode?: 'modal' | 'banner' | 'floating';
}

export const ReceiptIssueOverlay: React.FC<ReceiptIssueOverlayProps> = ({
  issue,
  onDismiss,
  onRetry,
  onRetake,
  onContinueAnyway,
  onProceedAnyway,
  mode = 'floating',
}) => {
  if (!issue) return null;

  const handleRetry = onRetry || onRetake;
  const handleProceed = onContinueAnyway || onProceedAnyway;
  const isDuplicate = Boolean(issue.code?.startsWith('DUPLICATE') || issue.isDuplicate);
  const isError = issue.severity === 'error';

  // 1. MINIMAL, STREAMLINED CARD FOR DUPLICATE RECEIPTS
  // Stripped of redundant pills, developer codes, and heavy nested boxes.
  if (isDuplicate) {
    return (
      <AnimatePresence>
        <motion.div
          key="duplicate-overlay-card"
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`w-full z-50 ${mode === 'floating' ? 'sticky top-2 mb-3 mx-auto' : 'mb-3'}`}
        >
          <div className="rounded-xl p-3 sm:p-3.5 bg-rose-50/95 border border-rose-200/90 text-rose-950 shadow-xs flex items-start gap-3">
            {/* Subtle Minimal Icon */}
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>

            {/* Concise Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-semibold text-[13px] sm:text-[14px] text-rose-950 leading-tight">
                {issue.title || 'Duplicate Receipt Detected'}
              </h4>
              <p className="text-[12px] text-rose-800/90 mt-0.5 leading-normal">
                {issue.message}
              </p>

              {/* Minimal Action Link */}
              {handleRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-700 hover:text-rose-900 cursor-pointer active:scale-95 transition-transform"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Upload a different receipt</span>
                </button>
              )}
            </div>

            {/* Dismiss X */}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-100/60 transition-colors shrink-0 cursor-pointer"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // 2. CLEAN & REFINED CARD FOR READABILITY / QUALITY ISSUES (Blurry, Cropped, etc.)
  return (
    <AnimatePresence>
      <motion.div
        key={issue.code + issue.title}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`w-full z-50 ${mode === 'floating' ? 'sticky top-2 mb-3 mx-auto' : 'mb-3'}`}
      >
        <div
          className={`rounded-xl p-3.5 sm:p-4 border shadow-xs transition-all ${
            isError
              ? 'bg-rose-50/95 border-rose-200/90 text-rose-950'
              : 'bg-amber-50/95 border-amber-200/90 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isError ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-semibold text-[13px] sm:text-[14px] leading-tight text-slate-900">
                {issue.title}
              </h4>

              <p
                className={`text-[12px] sm:text-[13px] mt-1 leading-normal ${
                  isError ? 'text-rose-900/90' : 'text-amber-900/90'
                }`}
              >
                {issue.message}
              </p>

              {issue.suggestion && (
                <p
                  className={`text-[11.5px] mt-1.5 leading-snug ${
                    isError ? 'text-rose-800' : 'text-amber-800'
                  }`}
                >
                  <span className="font-semibold">Tip: </span>
                  {issue.suggestion}
                </p>
              )}

              {/* Action Buttons */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                {handleRetry && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className={`px-3 py-1 rounded-lg text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isError
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retake / Upload New</span>
                  </button>
                )}

                {handleProceed && (
                  <button
                    type="button"
                    onClick={handleProceed}
                    className="px-2.5 py-1 text-[11.5px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit manually</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className={`p-1 rounded-md transition-colors shrink-0 cursor-pointer ${
                isError
                  ? 'text-rose-400 hover:text-rose-700 hover:bg-rose-100/60'
                  : 'text-amber-400 hover:text-amber-700 hover:bg-amber-100/60'
              }`}
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
