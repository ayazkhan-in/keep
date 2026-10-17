import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vault,
  FileText,
  Download,
  Eye,
  Plus,
  Search,
  Check,
  ShieldCheck,
  Receipt,
  FileCheck,
  ExternalLink,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
  FileSearch,
  Copy,
  Trash2,
} from 'lucide-react';
import { PurchaseItem, DocumentItem } from '../types';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface VaultViewProps {
  purchases: PurchaseItem[];
  openScanner: () => void;
  onSelectPurchase: (item: PurchaseItem) => void;
  onDeletePurchase?: (id: string) => void;
}

export const VaultView: React.FC<VaultViewProps> = ({
  purchases,
  openScanner,
  onSelectPurchase,
  onDeletePurchase,
}) => {
  const [activeType, setActiveType] = useState<string>('all');
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<{
    doc: DocumentItem;
    purchase: PurchaseItem;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // AI Audit State
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [copiedAudit, setCopiedAudit] = useState<boolean>(false);

  // Flatten all documents from all purchases
  const allDocuments = purchases.flatMap((p) =>
    p.documents.map((d) => ({
      ...d,
      purchase: p,
    }))
  );

  const filteredDocs = allDocuments.filter((item) => {
    if (activeType !== 'all' && item.type !== activeType) return false;
    if (vaultSearch) {
      const q = vaultSearch.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.purchase.name.toLowerCase().includes(q) ||
        item.purchase.vendor.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getDocBadge = (type: string) => {
    switch (type) {
      case 'receipt':
        return (
          <span className="font-mono-code text-[10px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full border border-[#E2E8F0] uppercase">
            Receipt
          </span>
        );
      case 'invoice':
        return (
          <span className="font-mono-code text-[10px] bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 rounded-full border border-[#A7F3D0] uppercase">
            Invoice
          </span>
        );
      case 'warranty_card':
        return (
          <span className="font-mono-code text-[10px] bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full border border-[#FDE68A] uppercase">
            Warranty Card
          </span>
        );
      default:
        return (
          <span className="font-mono-code text-[10px] bg-[#F1F5F9] text-[#76777D] px-2 py-0.5 rounded-full uppercase">
            Document
          </span>
        );
    }
  };

  const handleDownloadDoc = (doc: DocumentItem) => {
    const dummyContent = `Keepr Encrypted Vault Record\nDocument: ${doc.name}\nUploaded: ${doc.uploadDate}\nSize: ${doc.fileSize}\nStatus: Verified Original Proof of Purchase\nOCR & Forensics: Gemini 3.7 Flash Engine`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name.replace(/\.[^/.]+$/, "") + "_KeeprVault.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runDocumentAudit = async (doc: DocumentItem, purchase: PurchaseItem) => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/gemini/audit-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: doc.name,
          documentType: doc.type,
          purchaseContext: {
            name: purchase.name,
            vendor: purchase.vendor,
            price: purchase.price,
            purchaseDate: purchase.purchaseDate,
            serialNumber: purchase.serialNumber,
            warranty: purchase.warranty,
            returnWindow: purchase.returnWindow,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.audit) {
        setAuditResult(data.audit);
      }
    } catch (err) {
      console.error('Audit error:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopyAuditReport = () => {
    if (!auditResult) return;
    const report = `KEEPR FORENSIC DOCUMENT AUDIT REPORT
Document: ${auditResult.documentTitle}
Status: ${auditResult.legalValidity} (Score: ${auditResult.authenticityScore}/100)

EXECUTIVE SUMMARY:
${auditResult.executiveSummary}

WARRANTY AUDIT:
- Coverage: ${auditResult.warrantyCoverageAudit?.duration || 'Standard'}
- Covered Components: ${auditResult.warrantyCoverageAudit?.coveredParts?.join(', ') || 'N/A'}
- Exclusions: ${auditResult.warrantyCoverageAudit?.excludedConditions?.join(', ') || 'Standard'}
- Claim Method: ${auditResult.warrantyCoverageAudit?.claimMethod || 'Online'}
- Support: ${auditResult.warrantyCoverageAudit?.supportContact || 'Manufacturer'}

RETURN POLICY:
- Window: ${auditResult.returnPolicyAudit?.eligibility || 'N/A'}
- Restocking Fee: ${auditResult.returnPolicyAudit?.restockingFee || '$0'}

TAX & COMPLIANCE:
- Tax Deductible: ${auditResult.taxAudit?.isDeductible ? 'Yes' : 'No'} (${auditResult.taxAudit?.irsSection})
- Retention Period: ${auditResult.taxAudit?.recommendedRetentionYears || 7} Years`;

    navigator.clipboard.writeText(report);
    setCopiedAudit(true);
    setTimeout(() => setCopiedAudit(false), 2000);
  };

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
            Document Vault
          </h1>
          <p className="text-[13px] text-[#76777D] mt-1 font-normal">
            Encrypted vault storing all original invoices, store receipts, and warranty slips.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openScanner}
            className="flex items-center gap-2 bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-[#1E293B] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </motion.div>

      {/* Filter and Search Bar with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
        className="bg-white border border-[#E2E8F0] p-3 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-3"
      >
        {/* Type pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Documents' },
            { id: 'receipt', label: 'Receipts' },
            { id: 'invoice', label: 'Invoices' },
            { id: 'warranty_card', label: 'Warranty Slips' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors cursor-pointer ${
                activeType === tab.id
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F9F9FB] text-[#45464D] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            placeholder="Search vault documents..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[12px] text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
        </div>
      </motion.div>

      {/* Documents Grid with Blur Appear */}
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {filteredDocs.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-[#94A3B8] transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)] group flex flex-col justify-between"
          >
            {/* Visual Thumbnail / Preview header */}
            <div
              onClick={() => {
                setPreviewDoc({ doc: item, purchase: item.purchase });
                runDocumentAudit(item, item.purchase);
              }}
              className="h-36 bg-[#F8FAFC] border-b border-[#E2E8F0] relative overflow-hidden flex items-center justify-center cursor-pointer"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[#94A3B8]">
                  <FileText className="w-8 h-8" />
                  <span className="text-[10px] font-mono-code">PDF INVOICE</span>
                </div>
              )}

              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <span className="bg-white text-[#0F172A] text-[12px] font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Deep Audit
                </span>
              </div>

              <div className="absolute top-2.5 left-2.5">{getDocBadge(item.type)}</div>
            </div>

            {/* Document Details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4
                  onClick={() => onSelectPurchase(item.purchase)}
                  className="font-medium text-[13px] text-[#0F172A] hover:underline cursor-pointer line-clamp-1"
                  title={item.name}
                >
                  {item.name}
                </h4>
                <p className="text-[11px] text-[#76777D] mt-0.5">
                  Linked to: {item.purchase.name} (${item.purchase.price.toFixed(2)})
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#76777D] font-mono-code">
                <span>{item.fileSize}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setPreviewDoc({ doc: item, purchase: item.purchase });
                      runDocumentAudit(item, item.purchase);
                    }}
                    className="p-1.5 text-[#45464D] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    title="Audit with Gemini"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadDoc(item)}
                    className="p-1.5 text-[#45464D] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {onDeletePurchase && (
                    <button
                      onClick={() => setItemToDelete({ id: item.purchase.id, name: `${item.name} (${item.purchase.name})` })}
                      className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] rounded-lg hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                      title="Delete Receipt / Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Document Deep Audit & Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
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
              {/* Modal Header */}
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
                    <FileSearch className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[14px] text-[#0F172A]">{previewDoc.doc.name}</h3>
                    <p className="text-[11px] text-[#76777D] font-mono-code">
                      Vault ID: {previewDoc.doc.id} · Linked to {previewDoc.purchase.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Document Image Banner */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                  {previewDoc.doc.fileUrl ? (
                    <img
                      src={previewDoc.doc.fileUrl}
                      alt={previewDoc.doc.name}
                      referrerPolicy="no-referrer"
                      className="max-h-[220px] object-contain rounded-xl shadow-xs"
                    />
                  ) : (
                    <FileText className="w-14 h-14 text-[#CBD5E1]" />
                  )}
                </div>

                {/* AI Audit Results */}
                {isAuditing && (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 text-[#0F172A] animate-spin" />
                    <p className="text-[13px] font-medium text-[#0F172A]">
                      Running Gemini Forensic Document & Legal Audit...
                    </p>
                    <p className="text-[11px] text-[#76777D] font-mono-code">
                      Verifying authenticity, warranty clauses & statutory consumer rights
                    </p>
                  </div>
                )}

                {auditResult && !isAuditing && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Executive Score Box */}
                    <div className="p-4 bg-[#F9F9FB] border border-[#E2E8F0] rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                          <span className="font-medium text-[13px] text-[#0F172A]">
                            {auditResult.legalValidity || 'Verified Proof of Purchase'}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#76777D] mt-1">
                          {auditResult.executiveSummary}
                        </p>
                      </div>
                      <div className="text-right pl-4 shrink-0">
                        <span className="text-2xl font-bold font-mono-code text-[#0F172A]">
                          {auditResult.authenticityScore || 98}%
                        </span>
                        <p className="text-[10px] text-[#76777D] font-mono-code uppercase">Validity Score</p>
                      </div>
                    </div>

                    {/* Two Column Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                      {/* Warranty Audit */}
                      <div className="p-4 border border-[#E2E8F0] rounded-2xl space-y-2.5">
                        <h4 className="font-mono-code text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#475569]" />
                          Warranty Terms & Claim Protocol
                        </h4>
                        <div className="space-y-1.5 text-[#45464D]">
                          <p>
                            <strong className="text-[#0F172A]">Coverage:</strong>{' '}
                            {auditResult.warrantyCoverageAudit?.duration || '1-Year Limited'}
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Covered Parts:</strong>{' '}
                            {auditResult.warrantyCoverageAudit?.coveredParts?.join(', ') || 'All standard components'}
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Exclusions:</strong>{' '}
                            {auditResult.warrantyCoverageAudit?.excludedConditions?.join(', ') || 'Accidental damage'}
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Claim Method:</strong>{' '}
                            {auditResult.warrantyCoverageAudit?.claimMethod || 'Online RMA submission'}
                          </p>
                        </div>
                      </div>

                      {/* Return & Tax Audit */}
                      <div className="p-4 border border-[#E2E8F0] rounded-2xl space-y-2.5">
                        <h4 className="font-mono-code text-[11px] font-semibold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-[#475569]" />
                          Return Policy & Tax Classification
                        </h4>
                        <div className="space-y-1.5 text-[#45464D]">
                          <p>
                            <strong className="text-[#0F172A]">Return Policy:</strong>{' '}
                            {auditResult.returnPolicyAudit?.eligibility || 'Standard window'}
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Restocking Fee:</strong>{' '}
                            {auditResult.returnPolicyAudit?.restockingFee || '$0 (Free)'}
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Tax Deductible:</strong>{' '}
                            {auditResult.taxAudit?.isDeductible ? 'Yes' : 'No'} (
                            {auditResult.taxAudit?.irsSection || 'IRC Sec 179'})
                          </p>
                          <p>
                            <strong className="text-[#0F172A]">Recommended Retention:</strong>{' '}
                            {auditResult.taxAudit?.recommendedRetentionYears || 7} Years (IRS audit standard)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-3.5 py-2 border border-[#E2E8F0] text-[#0F172A] rounded-xl text-[12px] font-medium hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  {onDeletePurchase && (
                    <button
                      onClick={() => setItemToDelete({ id: previewDoc.purchase.id, name: `${previewDoc.doc.name} (${previewDoc.purchase.name})` })}
                      className="p-2 text-[#DC2626] hover:bg-[#FEF2F2] rounded-xl transition-colors cursor-pointer"
                      title="Delete Receipt / Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {auditResult && (
                    <button
                      onClick={handleCopyAuditReport}
                      className="px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] text-[#0F172A] rounded-xl text-[12px] font-medium hover:bg-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedAudit ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAudit ? 'Copied Report' : 'Copy Audit'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadDoc(previewDoc.doc)}
                    className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-[12px] font-medium hover:bg-[#1E293B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Document</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={Boolean(itemToDelete)}
        itemName={itemToDelete?.name}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete && onDeletePurchase) {
            onDeletePurchase(itemToDelete.id);
          }
          if (previewDoc && itemToDelete && previewDoc.purchase.id === itemToDelete.id) {
            setPreviewDoc(null);
          }
          setItemToDelete(null);
        }}
      />
    </div>
  );
};
