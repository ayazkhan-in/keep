import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Eye,
  Code,
  DollarSign,
  Calendar,
  Layers,
  Check,
  FileCode,
  Zap,
} from 'lucide-react';
import { PurchaseItem, CategoryType } from '../types';
import { MinimalSelect } from './ui/MinimalSelect';
import { useCurrency } from '../context/CurrencyContext';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePurchase: (newPurchase: PurchaseItem) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onSavePurchase,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showRawInspector, setShowRawInspector] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset all state when closing or scanning a new item
  const resetState = () => {
    setExtractedData(null);
    setPreviewBase64(null);
    setSelectedFile(null);
    setPastedText('');
    setIsScanning(false);
    setScanStep('');
    setShowRawInspector(false);
    setQuotaWarning(null);
    stopCamera();
  };

  const handleCloseModal = () => {
    resetState();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  // Stop camera when unmounting or switching tab or closing
  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable. You can upload an image or select a sample receipt.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      setPreviewBase64(base64);
      stopCamera();
      triggerAIScan(base64, 'image/jpeg');
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreviewBase64(base64);
      triggerAIScan(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    setPreviewBase64(null);
    triggerAIScan(undefined, 'text/plain', pastedText);
  };

  const loadSampleReceipt = (type: 'apple' | 'amazon' | 'herman' | 'breville') => {
    let mockContext = '';
    let mockPhoto = '';

    if (type === 'apple') {
      mockPhoto = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80';
      mockContext = `APPLE STORE RETAIL INVOICE
Store: Apple Fifth Avenue, NY
Order Number: W998124901
Item: Apple Studio Display 27-inch 5K Retina (Standard Glass, Tilt-adjustable)
Unit Price: $1,599.00 USD
Serial Number: APL-SD5K-881920
Payment Method: Apple Pay (Visa •••• 4012)
Date: 2023-10-28
Warranty: 1-Year Limited Manufacturer Warranty (Covers screen panel, internal power supply, logic board)
Return Window: 14 calendar days from delivery (Deadline: Nov 11, 2023)`;
    } else if (type === 'amazon') {
      mockPhoto = 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80';
      mockContext = `AMAZON.COM INVOICE
Order # 113-9918231-5501923
Seller: Keychron Direct Fulfillment
Item: Keychron Q1 Pro Custom Mechanical Keyboard (Carbon Black, Wireless QMK/VIA)
Price: $198.00 USD
Serial Number: KC-Q1P-7721
Date: 2023-10-27
Warranty: 12-Month Limited Manufacturer Warranty
Return Window: 30 days hassle-free returns`;
    } else if (type === 'herman') {
      mockPhoto = 'https://images.unsplash.com/photo-1580481077195-c3f25c7e148e?auto=format&fit=crop&w=800&q=80';
      mockContext = `HERMAN MILLER OFFICIAL INVOICE
Order: HM-9921448
Item: Aeron Chair - Size B (Graphite Frame, PostureFit SL, Fully Adjustable Arms)
Total: $1,495.00 USD
Serial: HM-AER-2023-9914
Date: 2023-09-15
Warranty: Herman Miller 12-Year 24/7 Comprehensive Warranty (Pneumatic cylinder, frame, tilt mechanism, pellicle mesh)
Return Window: 30-Day In-Home Trial`;
    } else {
      mockPhoto = 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=800&q=80';
      mockContext = `BREVILLE RETAIL RECEIPT
Williams Sonoma Flagship
Item: Breville Barista Pro Espresso Machine (Brushed Stainless Steel)
Price: $849.95 USD
Serial Number: BES878BSS-2023-441
Date: 2023-10-18
Warranty: 2-Year Limited Product Warranty (ThermoJet heating unit, conical burr grinder)
Return Window: 30 Days return policy`;
    }

    setPreviewBase64(mockPhoto);
    triggerAIScan(undefined, 'text/plain', mockContext);
  };

  const triggerAIScan = async (base64?: string, mimeType?: string, textContext?: string) => {
    setIsScanning(true);
    setScanStep('Analyzing document structure with Gemini 3.6 Flash...');
    setQuotaWarning(null);

    try {
      setTimeout(() => setScanStep('Extracting itemized pricing, serial IDs & vendors...'), 500);
      setTimeout(() => setScanStep('Calculating warranty coverage & return deadlines...'), 1100);

      const res = await fetch('/api/gemini/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          textContext,
        }),
      });

      const data = await res.json();
      if (data.success && data.extracted) {
        setExtractedData(data.extracted);
        if (data.quotaExhausted || data.warning) {
          setQuotaWarning(data.warning || 'Gemini 3.6 Flash daily API quota was reached. Smart heuristic extraction was used so you can keep saving purchases without interruption.');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handleSave = () => {
    if (!extractedData) return;

    const purchaseDate = extractedData.purchaseDate || new Date().toISOString().split('T')[0];
    const warrantyMonths = Number(extractedData.warrantyMonths) >= 0 ? Number(extractedData.warrantyMonths) : 12;
    const returnDays = Number(extractedData.returnDays) >= 0 ? Number(extractedData.returnDays) : 14;

    // Calculate dates
    const pDate = new Date(purchaseDate);
    const warExpDate = new Date(pDate);
    warExpDate.setMonth(warExpDate.getMonth() + warrantyMonths);

    const retDeadlineDate = new Date(pDate);
    retDeadlineDate.setDate(retDeadlineDate.getDate() + returnDays);

    const now = new Date();
    const isReturnOpen = retDeadlineDate >= now && returnDays > 0;

    const newPurchase: PurchaseItem = {
      id: `pur-${Date.now()}`,
      name: extractedData.name || 'New Scanned Item',
      vendor: extractedData.vendor || 'Retailer',
      category: (extractedData.category as CategoryType) || 'Electronics',
      purchaseDate,
      price: Number(extractedData.price) || 0,
      currency: extractedData.currency || 'USD',
      orderNumber: extractedData.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      ...(extractedData.serialNumber ? { serialNumber: extractedData.serialNumber } : {}),
      paymentMethod: extractedData.paymentMethod || 'Credit Card (•••• 1004)',
      warranty: {
        hasWarranty: warrantyMonths > 0,
        durationMonths: warrantyMonths,
        startDate: purchaseDate,
        expiryDate: warExpDate.toISOString().split('T')[0],
        provider: extractedData.warrantyProvider || `${extractedData.vendor || 'Manufacturer'} Warranty`,
        terms: extractedData.warrantyTerms || 'Standard limited warranty coverage.',
        claimStatus: 'none',
      },
      returnWindow: {
        hasReturn: returnDays > 0,
        returnDays,
        deadlineDate: retDeadlineDate.toISOString().split('T')[0],
        status: isReturnOpen ? 'open' : 'closed',
        policy: extractedData.returnPolicy || `${returnDays}-day standard return policy.`,
      },
      documents: [
        {
          id: `doc-${Date.now()}`,
          name: `${(extractedData.name || 'Receipt').replace(/[^a-zA-Z0-9]/g, '_')}_Proof.pdf`,
          type: 'receipt',
          fileUrl: (previewBase64 && previewBase64.length < 300000) ? previewBase64 : 'https://images.unsplash.com/photo-1554415707-9e4c07dca042?auto=format&fit=crop&w=600&q=80',
          previewUrl: (previewBase64 && previewBase64.length < 300000) ? previewBase64 : 'https://images.unsplash.com/photo-1554415707-9e4c07dca042?auto=format&fit=crop&w=300&q=80',
          uploadDate: new Date().toISOString().split('T')[0],
          fileSize: '412 KB',
        },
      ],
      tags: ['AI Scanned', extractedData.category || 'Asset'],
      ...(extractedData.notes ? { notes: extractedData.notes } : {}),
      aiConfidence: extractedData.aiConfidence || 0.98,
      aiExtractedNotes: `Automatically parsed with Gemini on ${new Date().toLocaleDateString()}`,
      taxDeductible: Boolean(extractedData.taxDeductible),
    };

    onSavePurchase(newPurchase);
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-2xl max-w-3xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-[15px] text-[#0F172A] leading-tight">
                AI Receipt & Invoice Ingestion
              </h3>
              <p className="text-[11px] text-[#76777D]">
                Powered by Gemini 3.6 Flash OCR & Purchase Metadata Extractor
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-[#76777D] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {quotaWarning && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Gemini 3.6 Flash API Notice</p>
                <p className="text-amber-800 text-[11px] mt-0.5">{quotaWarning}</p>
              </div>
            </div>
          )}

          {!extractedData && !isScanning && (
            <div>
              {/* Input Mode Selector */}
              <div className="flex items-center gap-2 mb-4 p-1 bg-[#F1F5F9] rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'camera'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Invoice Text</span>
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0F172A] bg-[#F9F9FB] rounded-2xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0F172A] mb-3 group-hover:scale-105 transition-transform shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-[14px] text-[#0F172A]">
                    Click or drag and drop receipt / invoice
                  </p>
                  <p className="text-[12px] text-[#76777D] mt-1">
                    Supports PNG, JPG, WEBP, and PDF receipts
                  </p>
                </div>
              )}

              {/* Camera Tab */}
              {activeTab === 'camera' && (
                <div className="bg-[#0F172A] rounded-2xl p-4 text-white flex flex-col items-center relative overflow-hidden">
                  {cameraError ? (
                    <div className="py-8 text-center px-4">
                      <AlertCircle className="w-8 h-8 text-[#F87171] mx-auto mb-2" />
                      <p className="text-[13px] font-medium">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Viewfinder Target Frame */}
                      <div className="absolute inset-4 border-2 border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between text-[10px] font-mono-code text-white/80">
                          <span>RECEIPT SCANNER</span>
                          <span>AI READY</span>
                        </div>
                        <div className="text-center text-[11px] text-white/80 bg-black/40 py-1 rounded">
                          Position receipt within frame
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  )}

                  {!cameraError && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={capturePhoto}
                        className="px-6 py-2.5 bg-white text-[#0F172A] rounded-full font-medium text-[13px] hover:bg-[#F1F5F9] transition-all flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                      >
                        <Zap className="w-4 h-4 fill-[#0F172A]" />
                        <span>Capture & Scan</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Tab */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste raw email confirmation, store order text, or OCR invoice content here..."
                    rows={6}
                    className="w-full p-3.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[12px] font-mono-code text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
                  />
                  <button
                    onClick={handlePasteSubmit}
                    disabled={!pastedText.trim()}
                    className="px-4 py-2 bg-[#0F172A] disabled:opacity-40 text-white rounded-xl text-[12px] font-medium hover:bg-[#1E293B] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Process Text with Gemini</span>
                  </button>
                </div>
              )}

              {/* Sample Receipts Quick Load */}
              <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
                <p className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold mb-2.5">
                  Or test with sample preloaded receipts:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => loadSampleReceipt('apple')}
                    className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Apple Display</p>
                    <p className="text-[11px] text-[#76777D]">$1,599 · 1-Yr War.</p>
                  </button>
                  <button
                    onClick={() => loadSampleReceipt('amazon')}
                    className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Keychron Q1</p>
                    <p className="text-[11px] text-[#76777D]">$198 · 30d Return</p>
                  </button>
                  <button
                    onClick={() => loadSampleReceipt('herman')}
                    className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Aeron Chair</p>
                    <p className="text-[11px] text-[#76777D]">$1,495 · 12-Yr War.</p>
                  </button>
                  <button
                    onClick={() => loadSampleReceipt('breville')}
                    className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Barista Pro</p>
                    <p className="text-[11px] text-[#76777D]">$849.95 · 2-Yr War.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-[#0F172A] animate-spin" />
                <Sparkles className="w-4 h-4 text-[#76777D] absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h4 className="font-medium text-[15px] text-[#0F172A]">
                  Scanning & Parsing Document...
                </h4>
                <p className="text-[12px] text-[#76777D] mt-1 font-mono-code">{scanStep}</p>
              </div>
            </div>
          )}

          {/* Verification & Edit Form once extracted */}
          {extractedData && !isScanning && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-center justify-between text-[12px] text-[#065F46]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span className="font-medium">
                    Successfully extracted metadata ({(extractedData.aiConfidence * 100).toFixed(0)}% confidence score)
                  </span>
                </div>
                <button
                  onClick={() => setShowRawInspector(!showRawInspector)}
                  className="font-mono-code text-[11px] underline flex items-center gap-1 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showRawInspector ? 'Hide Raw JSON' : 'Inspect AI Output'}</span>
                </button>
              </div>

              {showRawInspector && (
                <div className="p-3 bg-[#0F172A] text-[#E2E8F0] rounded-xl font-mono-code text-[11px] overflow-x-auto max-h-48">
                  <pre>{JSON.stringify(extractedData, null, 2)}</pre>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Product / Asset Name
                  </label>
                  <input
                    type="text"
                    value={extractedData.name || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[#0F172A] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Vendor / Retailer
                  </label>
                  <input
                    type="text"
                    value={extractedData.vendor || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, vendor: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Total Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.price || 0}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={extractedData.purchaseDate || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, purchaseDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Category
                  </label>
                  <MinimalSelect
                    value={extractedData.category || 'Electronics'}
                    onChange={(val) =>
                      setExtractedData({ ...extractedData, category: val as CategoryType })
                    }
                    options={[
                      { value: 'Electronics', label: 'Electronics' },
                      { value: 'Office Furniture', label: 'Office Furniture' },
                      { value: 'Software', label: 'Software' },
                      { value: 'Appliances', label: 'Appliances' },
                      { value: 'Home & Living', label: 'Home & Living' },
                      { value: 'Travel', label: 'Travel' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Warranty Duration (Months)
                  </label>
                  <input
                    type="number"
                    value={extractedData.warrantyMonths ?? 12}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        warrantyMonths: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Return Window (Days)
                  </label>
                  <input
                    type="number"
                    value={extractedData.returnDays ?? 14}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        returnDays: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Serial Number / IMEI
                  </label>
                  <input
                    type="text"
                    value={extractedData.serialNumber || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, serialNumber: e.target.value })
                    }
                    placeholder="e.g. SN-8829-X01"
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Warranty Provider & Terms
                  </label>
                  <input
                    type="text"
                    value={extractedData.warrantyTerms || extractedData.warrantyProvider || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, warrantyTerms: e.target.value })
                    }
                    placeholder="Manufacturer warranty coverage summary"
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl">
                  <input
                    type="checkbox"
                    id="taxDeductibleCheck"
                    checked={Boolean(extractedData.taxDeductible)}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, taxDeductible: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#0F172A] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="taxDeductibleCheck" className="text-[12px] text-[#0F172A] cursor-pointer">
                    <span className="font-medium">Tax Deductible Expense</span>
                    {extractedData.taxCategory && (
                      <span className="ml-2 text-[#76777D] font-mono-code text-[11px]">
                        ({extractedData.taxCategory})
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center bg-white">
          {extractedData ? (
            <button
              onClick={resetState}
              className="text-[12px] text-[#76777D] hover:text-[#0F172A] font-medium cursor-pointer"
            >
              ← Scan Another Document
            </button>
          ) : (
            <span className="text-[11px] text-[#76777D] font-mono-code">
              Gemini 3.7 OCR Engine Ready
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-[12px] font-medium text-[#45464D] hover:bg-[#F9F9FB] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            {extractedData && (
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#0F172A] text-white text-[12px] font-medium hover:bg-[#1E293B] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Save to Purchases & Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
