import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  UploadCloud,
  FileText,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  RefreshCw,
  Eye,
  Code,
  DollarSign,
  Calendar,
  Layers,
  Check,
  FileCode,
  Zap,
  Utensils,
  Plane,
  Briefcase,
  AlertOctagon,
  Info,
  Coffee,
  Car,
} from 'lucide-react';
import { PurchaseItem, CategoryType, ReceiptIssue } from '../types';
import { MinimalSelect } from './ui/MinimalSelect';
import { ReceiptIssueOverlay } from './ui/ReceiptIssueOverlay';
import { useCurrency } from '../context/CurrencyContext';
import {
  computeRawImageSha256,
  createAnchorJson,
  computeAnchorJsonHash,
  checkRawImageDuplicate,
  checkAnchorJsonDuplicate,
  registerReceipt,
  createDuplicateRejectionIssue,
} from '../utils/receiptDuplicateDetector';
import {
  convertReceiptToInr,
  ConversionMetrics,
  CURRENT_FX_METRICS,
} from '../utils/currencyConverter';

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
  const [activeIssue, setActiveIssue] = useState<ReceiptIssue | null>(null);
  const [hasEncounteredError, setHasEncounteredError] = useState<boolean>(false);
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
    setActiveIssue(null);
    setHasEncounteredError(false);
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

  const capturePhoto = async () => {
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

      // STAGE 1: Raw Image Hashing Check BEFORE Gemini API Call
      try {
        const rawImageHash = await computeRawImageSha256(base64);
        const dupCheck = checkRawImageDuplicate(rawImageHash);

        if (dupCheck.isDuplicate) {
          const issue = createDuplicateRejectionIssue(dupCheck);
          setActiveIssue(issue);
          setHasEncounteredError(true);
          setIsScanning(false);
          return;
        }

        triggerAIScan(base64, 'image/jpeg', undefined, rawImageHash);
      } catch (err) {
        triggerAIScan(base64, 'image/jpeg');
      }
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setActiveIssue(null);
    setHasEncounteredError(false);
    setExtractedData(null);

    // STAGE 1: Raw Image Hashing Check BEFORE Gemini API Call
    try {
      const rawImageHash = await computeRawImageSha256(file);
      const dupCheck = checkRawImageDuplicate(rawImageHash);

      if (dupCheck.isDuplicate) {
        // Discard / reject before calling Gemini API
        const issue = createDuplicateRejectionIssue(dupCheck);
        setActiveIssue(issue);
        setHasEncounteredError(true);
        setIsScanning(false);
        const reader = new FileReader();
        reader.onload = (e) => setPreviewBase64(e.target?.result as string);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPreviewBase64(base64);
        triggerAIScan(base64, file.type || 'image/jpeg', undefined, rawImageHash);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Raw hash compute error:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPreviewBase64(base64);
        triggerAIScan(base64, file.type || 'image/jpeg');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    setPreviewBase64(null);
    triggerAIScan(undefined, 'text/plain', pastedText);
  };

  const loadSampleReceipt = (
    type:
      | 'toit'
      | 'bluebottle'
      | 'delta'
      | 'uber'
      | 'wework'
      | 'staples'
      | 'apple'
      | 'herman'
      | 'blurry'
      | 'cutoff'
      | 'non_receipt'
      | 'duplicate_raw'
      | 'duplicate_anchor'
  ) => {
    let mockContext = '';
    let mockPhoto = '';

    if (type === 'toit' || type === 'bluebottle' || type === 'delta' || type === 'uber' || type === 'wework' || type === 'staples' || type === 'apple' || type === 'herman') {
      setHasEncounteredError(false);
    } else {
      setHasEncounteredError(true);
    }

    if (type === 'toit') {
      mockPhoto = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
      mockContext = `TOIT BREWPUB & KITCHEN - INDIRANAGAR
Table: 14 | Check: CHK-49102 | Guests: 3
Date: 2026-10-22 20:30
1x Woodfired Margherita Pizza - ₹1,200.00
2x Toit Tint-in-Wit Craft Beer (Pint) - ₹800.00
Subtotal: ₹2,000.00
CGST 2.5% + SGST 2.5%: ₹200.00
Service Charge / Gratuity: ₹200.00
Total Paid: ₹2,400.00 INR
Payment: Corporate Visa (•••• 4012)
Notes: Team celebration dinner & Q4 sprint retro.`;
    } else if (type === 'bluebottle') {
      mockPhoto = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';
      mockContext = `BLUE BOTTLE COFFEE & ROASTERY
Store: SF Mint Plaza | Order #BB-8910
Date: 2026-10-24 09:15
2x Bella Donovan Single Origin Drip - $13.00
1x Almond Twice-Baked Croissant - $4.50
1x Poached Egg Avocado Toast - $7.00
Subtotal: $24.50
Sales Tax: $1.80
Tip: $2.70
Total Amount: $29.00 USD
Payment: Apple Pay (Alex Morgan •••• 1004)
Category: Meals & Entertainment (Client Breakfast Meeting)`;
    } else if (type === 'delta') {
      mockPhoto = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80';
      mockContext = `DELTA AIR LINES E-TICKET & PASSENGER RECEIPT
Ticket Reference: 006-2918204910 | Confirmation: DL891Q
Passenger: Alex Morgan | SkyMiles: 99182301
Flight: DL-1842 | SFO (San Francisco) -> JFK (New York)
Departure: 2026-10-28 08:30 AM
Base Fare (Main Cabin Class V): $440.00 USD
US Transportation Tax: $33.00
September 11th Security Fee: $5.60
Passenger Facility Charge: $4.50
Checked Baggage Fee (1x 50 lbs): $35.00
Total Charged: $518.10 USD
Payment: Corporate Amex (•••• 3009)
Status: Confirmed E-Ticket Issued`;
    } else if (type === 'uber') {
      mockPhoto = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
      mockContext = `UBER TECHNOLOGIES RIDESHARE RECEIPT
Trip ID: ubr-881920-sf-terminal
Date: 2026-10-24 07:15 AM
Driver: Marcus R. (Toyota Camry Hybrid)
Pickup: 500 Howard St, San Francisco, CA
Dropoff: SFO Terminal 2 Departures
Trip Distance: 14.8 miles | Duration: 24 mins
Uber Comfort Fare: $32.40
Bay Area Airport Access Surcharge: $3.50
Caltrans Highway Toll: $6.00
Tip to Driver: $5.00
Total Fare: $46.90 USD
Payment: Visa ending in 4012`;
    } else if (type === 'wework') {
      mockPhoto = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';
      mockContext = `WEWORK MANAGEMENT LLC - INVOICE
Invoice Number: WW-2026-99120
Location: WeWork Transbay, San Francisco, CA
Billing Period: Oct 01, 2026 - Oct 31, 2026
Item: Monthly All-Access Coworking Flex Pass (1 Member) - $250.00
Item: 4-Hour Meeting Room Credit Pack - $49.00
Subtotal: $299.00
Tax / Facilities Fee: $24.00
Total: $323.00 USD
PO Reference: PO-2026-OP44
Payment Terms: Paid in full via Corporate ACH`;
    } else if (type === 'staples') {
      mockPhoto = 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=800&q=80';
      mockContext = `STAPLES BUSINESS ADVANTAGE INVOICE
Order: ORD-ST-88192 | Account: JPM-ENG-99
Date: 2026-10-20
2x Premium Multipurpose Copy Paper (Case of 10 Reams) - $70.00
3x Ergonomic Memory Foam Keyboard Wrist Rests - $60.00
1x High-Yield Black Toner Cartridge - $85.00
Subtotal: $215.00
Sales Tax: $18.50
Shipping: $0.00 (Free Commercial Delivery)
Total Paid: $233.50 USD
Payment: Corporate Visa (•••• 4012)`;
    } else if (type === 'apple') {
      mockPhoto = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80';
      mockContext = `APPLE STORE RETAIL INVOICE
Store: Apple Fifth Avenue, NY
Order Number: W998124901
Item: Apple Studio Display 27-inch 5K Retina (Standard Glass, Tilt-adjustable)
Unit Price: $1,599.00 USD
Serial Number: APL-SD5K-881920
Payment Method: Apple Pay (Visa •••• 4012)
Date: 2026-10-18
Corporate Procurement Policy: Enterprise Commercial Hardware Policy Section 4.1
Tax Status: Qualified 100% Business Write-off (FY2026)`;
    } else if (type === 'herman') {
      mockPhoto = 'https://images.unsplash.com/photo-1580481077195-c3f25c7e148e?auto=format&fit=crop&w=800&q=80';
      mockContext = `HERMAN MILLER OFFICIAL INVOICE
Order: HM-9921448
Item: Aeron Chair - Size B (Graphite Frame, PostureFit SL, Fully Adjustable Arms)
Total: $1,495.00 USD
Serial: HM-AER-2026-9914
Date: 2026-09-15
Policy Compliance: Ergonomic Allocation Policy Section 2.1
Tax Status: Capital Equipment Write-off Eligible`;
    } else if (type === 'blurry') {
      mockPhoto = 'https://images.unsplash.com/photo-1554415707-9e4c07dca042?auto=format&fit=crop&w=800&q=80';
      mockContext = `BLURRY UNREADABLE RECEIPT SAMPLE
[IMAGE IS EXTREMELY BLURRY, SHAKEN AND OUT OF FOCUS]
Store: **** **fe Deli
Date: **/**/2026
Total: **.** [ILLEGIBLE SMEAR]
Unreadable thermal ink, numbers smeared, camera motion blur.`;
    } else if (type === 'cutoff') {
      mockPhoto = 'https://images.unsplash.com/photo-1554415707-9e4c07dca042?auto=format&fit=crop&w=800&q=80';
      mockContext = `CUT OFF RECEIPT SAMPLE
Cafe Metro & Roastery
Order: #2291
Item: Smoked Turkey Sandwich - $12.50
Item: Espresso Tonic - $6.50
[RECEIPT IS CROPPED / CUT OFF AT THE BOTTOM - TOTAL AMOUNT, TAX AND PAYMENT RECEIPT ARE COMPLETELY MISSING]`;
    } else if (type === 'duplicate_raw') {
      mockPhoto = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
      setPreviewBase64(mockPhoto);
      // Simulate raw image duplicate detection before Gemini API call
      setActiveIssue(
        createDuplicateRejectionIssue({
          isDuplicate: true,
          stage: 'raw_image_hash',
          matchedRecordTitle: 'Wanderlust Travel Agency (2026-09-14)',
        })
      );
      setExtractedData(null);
      setIsScanning(false);
      return;
    } else if (type === 'duplicate_anchor') {
      mockPhoto = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
      mockContext = `TOIT BREWPUB & KITCHEN - INDIRANAGAR
Table: 14 | Check: CHK-49102 | Guests: 3
Date: 2026-10-22 20:30
1x Woodfired Margherita Pizza - ₹1,200.00
2x Toit Tint-in-Wit Craft Beer (Pint) - ₹800.00
Total Paid: ₹2,400.00 INR`;
      setPreviewBase64(mockPhoto);
      // Pre-seed the anchor duplicate so when AI finishes, it rejects!
      const anchor = createAnchorJson({
        date: '2026-10-22',
        total: 2400,
        merchant: 'Toit Brewpub Indiranagar',
        currency: 'INR',
      });
      computeAnchorJsonHash(anchor).then((anchorHash) => {
        registerReceipt({
          id: 'prev-toit-claim',
          title: 'Toit Brewpub Indiranagar (Initial Approval)',
          vendor: 'Toit Brewpub Indiranagar',
          date: '2026-10-22',
          amount: 2400,
          anchorJsonHash: anchorHash,
        });
        triggerAIScan(undefined, 'text/plain', mockContext);
      });
      return;
    } else {
      mockPhoto = 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80';
      mockContext = `NOT A RECEIPT SAMPLE
Image of an indoor green potted snake plant on a wooden desk.
This file contains no financial transactions, prices, dates, or vendor information.`;
    }

    setPreviewBase64(mockPhoto);
    triggerAIScan(undefined, 'text/plain', mockContext);
  };

  const triggerAIScan = async (
    base64?: string,
    mimeType?: string,
    textContext?: string,
    rawImageHash?: string
  ) => {
    setIsScanning(true);
    setScanStep('Analyzing document structure with Gemini 3.6 Flash...');
    setQuotaWarning(null);
    setActiveIssue(null);

    try {
      setTimeout(() => setScanStep('Classifying category (Meals, Travel, Operational, Tech)...'), 400);
      setTimeout(() => setScanStep('Auditing image legibility & detecting quality issues...'), 800);
      setTimeout(() => setScanStep('Extracting itemized lines, subtotal, tax & tip...'), 1200);

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
      if (data.extracted) {
        // Guarantee conversion to INR for all calculations
        const converted = convertReceiptToInr(data.extracted);
        data.extracted = converted;

        // Check if server rejected as duplicate before advancing to review form
        if (data.duplicate || data.extracted.isDuplicate) {
          setExtractedData(null);
          setHasEncounteredError(true);
          setActiveIssue(
            data.extracted.primaryIssue ||
              createDuplicateRejectionIssue({
                isDuplicate: true,
                stage: data.duplicateStage || 'raw_image_hash',
                matchedRecordTitle: data.extracted.vendor,
              })
          );
          setIsScanning(false);
          return;
        }

        // STAGE 2: Client-side Anchor JSON Hashing after Gemini Output
        const anchor = createAnchorJson({
          purchaseDate: data.extracted.purchaseDate,
          price: data.extracted.price,
          vendor: data.extracted.vendor,
          currency: data.extracted.currency,
          orderNumber: data.extracted.orderNumber,
        });
        const anchorHash = data.extracted.anchorJsonHash || (await computeAnchorJsonHash(anchor));
        data.extracted.anchorJsonHash = anchorHash;
        data.extracted.rawImageHash = rawImageHash || data.extracted.rawImageHash;

        const anchorDupCheck = checkAnchorJsonDuplicate(anchorHash, anchor);
        if (anchorDupCheck.isDuplicate) {
          // Reject as duplicate anchor - process ends here with duplicate card
          setExtractedData(null);
          setHasEncounteredError(true);
          const issue = createDuplicateRejectionIssue(anchorDupCheck);
          setActiveIssue(issue);
          setIsScanning(false);
          return;
        }

        setExtractedData(data.extracted);

        // Check if there are readability or quality issues to show in the top overlay card
        if (data.extracted.primaryIssue) {
          setActiveIssue(data.extracted.primaryIssue);
          setHasEncounteredError(true);
        } else if (data.extracted.hasIssue && data.extracted.issues?.[0]) {
          setActiveIssue(data.extracted.issues[0]);
          setHasEncounteredError(true);
        } else if (!data.extracted.isReadable || data.extracted.hasIssue) {
          setHasEncounteredError(true);
          setActiveIssue({
            code: 'UNREADABLE_IMAGE',
            severity: 'error',
            title: 'Receipt Is Severely Blurry & Unreadable',
            message: 'Your receipt image has significant distortion and motion blur. Itemized charges and the total amount could not be reliably verified.',
            suggestion: 'Please place the receipt on a flat dark surface with steady lighting and retake a sharp, focused photo.',
          });
        } else {
          setActiveIssue(null);
        }

        if (data.quotaExhausted || data.warning) {
          setQuotaWarning(
            data.warning ||
              'Gemini daily API quota was reached. Smart versatile heuristic extraction was used so you can keep working without interruption.'
          );
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      setHasEncounteredError(true);
      setActiveIssue({
        code: 'NETWORK_ERROR',
        severity: 'warning',
        title: 'Network Communication Issue',
        message: 'Could not connect to the Gemini OCR service. You can enter details manually.',
        suggestion: 'Check your internet connection or use manual input.',
      });
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const handleSave = () => {
    if (!extractedData) return;

    if (extractedData.isDuplicate || activeIssue?.code?.startsWith('DUPLICATE')) {
      alert('This duplicate receipt has been rejected and cannot be saved.');
      return;
    }

    const purchaseDate = extractedData.purchaseDate || new Date().toISOString().split('T')[0];

    const newPurchase: PurchaseItem = {
      id: `pur-${Date.now()}`,
      name: extractedData.name || 'New Scanned Item',
      vendor: extractedData.vendor || 'Retailer',
      category: (extractedData.category as CategoryType) || 'Electronics',
      purchaseDate,
      price: Number(extractedData.price) || 0,
      currency: extractedData.currency || 'INR',
      originalCurrency: extractedData.originalCurrency || extractedData.currency || 'INR',
      originalPrice: extractedData.originalPrice ?? Number(extractedData.price) ?? 0,
      conversionMetrics: extractedData.conversionMetrics,
      orderNumber: extractedData.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      ...(extractedData.serialNumber ? { serialNumber: extractedData.serialNumber } : {}),
      paymentMethod: extractedData.paymentMethod || 'Credit Card (•••• 1004)',
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
      rawImageHash: extractedData.rawImageHash,
      anchorJsonHash: extractedData.anchorJsonHash,
    };

    // Register confirmed purchase into duplicate registry ONLY if it has no errors (no blur, trimmed, etc.)
    const hasAnyError = Boolean(
      hasEncounteredError ||
      extractedData.hasIssue ||
      activeIssue ||
      extractedData.isReadable === false ||
      extractedData.primaryIssue ||
      (extractedData.issues && extractedData.issues.length > 0)
    );

    if (!hasAnyError) {
      registerReceipt({
        id: newPurchase.id,
        title: newPurchase.name,
        vendor: newPurchase.vendor,
        date: newPurchase.purchaseDate,
        amount: newPurchase.price,
        rawImageHash: newPurchase.rawImageHash,
        anchorJsonHash: newPurchase.anchorJsonHash,
        hasIssue: false,
        hasError: false,
        hasEncounteredError: false,
        isReadable: true,
      });

      fetch('/api/receipts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPurchase.id,
          title: newPurchase.name,
          vendor: newPurchase.vendor,
          date: newPurchase.purchaseDate,
          amount: newPurchase.price,
          currency: newPurchase.currency,
          rawImageHash: newPurchase.rawImageHash,
          anchorJsonHash: newPurchase.anchorJsonHash,
          hasIssue: false,
          hasError: false,
          hasEncounteredError: false,
          isReadable: true,
        }),
      }).catch(() => {});
    }

    onSavePurchase(newPurchase);
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white rounded-2xl max-w-3xl w-full border border-[#E2E8F0] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6 relative">
          {/* Top Readability & Quality Issue Overlay Card */}
          <ReceiptIssueOverlay
            issue={activeIssue}
            onDismiss={() => setActiveIssue(null)}
            onRetry={resetState}
            onContinueAnyway={extractedData ? () => setActiveIssue(null) : undefined}
          />

          {quotaWarning && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">Gemini API Intelligence Notice</p>
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
                    <div className="relative w-full max-w-md aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
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
                        <div className="text-center text-[11px] text-white/80 bg-slate-900/60 py-1 rounded">
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
                    <Bot className="w-3.5 h-3.5" />
                    <span>Process Text with Gemini</span>
                  </button>
                </div>
              )}

              {/* Sample Receipts Quick Load with Categories & Issue Tests */}
              <div className="mt-6 pt-5 border-t border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono-code text-[11px] uppercase tracking-wider text-[#76777D] font-semibold">
                    Test with Versatile Sample Receipts:
                  </p>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Includes Issue Overlay Demos
                  </span>
                </div>

                {/* Meals & Entertainment Section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#0F172A]">
                    <Utensils className="w-3.5 h-3.5 text-orange-600" />
                    <span>Meals & Entertainment</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('toit')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Toit Brewpub Indiranagar</p>
                        <span className="text-[10px] font-mono-code bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Dinner & Drinks</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">₹2,400 · Pizza, Beer, 18% Tax & Tip</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('bluebottle')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Blue Bottle Coffee</p>
                        <span className="text-[10px] font-mono-code bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Client Sync</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">$29.00 · Single Origin & Pastries</p>
                    </button>
                  </div>
                </div>

                {/* Travel & Transit Section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#0F172A]">
                    <Plane className="w-3.5 h-3.5 text-blue-600" />
                    <span>Travel & Transit</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('delta')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Delta Air Lines SFO→JFK</p>
                        <span className="text-[10px] font-mono-code bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Flight</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">$518.10 · E-Ticket, Luggage & Tax</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('uber')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Uber Airport Terminal Ride</p>
                        <span className="text-[10px] font-mono-code bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">Rideshare</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">$46.90 · 14.8 Miles, Toll & Tip</p>
                    </button>
                  </div>
                </div>

                {/* Office & Operational Section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-[#0F172A]">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Office & Operational</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('wework')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">WeWork Coworking Flex Pass</p>
                        <span className="text-[10px] font-mono-code bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Workspace</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">$323.00 · Monthly Desk & Room Credits</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('staples')}
                      className="p-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl hover:border-[#0F172A] hover:bg-white text-left transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-[12px] text-[#0F172A] group-hover:text-black">Staples Commercial Supplies</p>
                        <span className="text-[10px] font-mono-code bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">Supplies</span>
                      </div>
                      <p className="text-[11px] text-[#76777D] mt-0.5">$233.50 · Paper, Ergonomics, Toner</p>
                    </button>
                  </div>
                </div>

                {/* ⚠️ Issue Testing Section (Demonstrating Top Overlay Card) */}
                <div className="pt-2 border-t border-dashed border-[#E2E8F0]">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-rose-700">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    <span>Test Unreadable / Issue Detection (Shows Top Overlay Card):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('blurry')}
                      className="p-2.5 bg-rose-50/70 border border-rose-200 hover:border-rose-400 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <p className="font-medium text-[12px] text-rose-950 group-hover:text-rose-900 flex items-center gap-1">
                        <span>⚠️ Blurry / Smudged</span>
                      </p>
                      <p className="text-[10px] text-rose-800 mt-0.5">Motion blur & illegible ink</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('cutoff')}
                      className="p-2.5 bg-amber-50/70 border border-amber-200 hover:border-amber-400 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <p className="font-medium text-[12px] text-amber-950 group-hover:text-amber-900 flex items-center gap-1">
                        <span>⚠️ Cut Off at Bottom</span>
                      </p>
                      <p className="text-[10px] text-amber-800 mt-0.5">Total amount cropped out</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('non_receipt')}
                      className="p-2.5 bg-slate-100 border border-slate-300 hover:border-slate-500 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <p className="font-medium text-[12px] text-slate-900 group-hover:text-black flex items-center gap-1">
                        <span>⚠️ Non-Receipt Image</span>
                      </p>
                      <p className="text-[10px] text-slate-700 mt-0.5">Plant photo instead of receipt</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('duplicate_raw' as any)}
                      className="p-2.5 bg-purple-50/80 border border-purple-200 hover:border-purple-400 rounded-xl text-left transition-all cursor-pointer group"
                    >
                      <p className="font-medium text-[12px] text-purple-950 group-hover:text-purple-900 flex items-center gap-1">
                        <span>🛡️ Duplicate Raw Image</span>
                      </p>
                      <p className="text-[10px] text-purple-800 mt-0.5">Discarded before Gemini API call</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleReceipt('duplicate_anchor' as any)}
                      className="p-2.5 bg-indigo-50/80 border border-indigo-200 hover:border-indigo-400 rounded-xl text-left transition-all cursor-pointer group sm:col-span-2"
                    >
                      <p className="font-medium text-[12px] text-indigo-950 group-hover:text-indigo-900 flex items-center gap-1">
                        <span>🛡️ Duplicate Anchor JSON</span>
                      </p>
                      <p className="text-[10px] text-indigo-800 mt-0.5">Matching date + vendor + amount hash rejected</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-[#0F172A] animate-spin" />
                <Bot className="w-4 h-4 text-[#76777D] absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h4 className="font-medium text-[15px] text-[#0F172A]">
                  Scanning & Parsing Document with Gemini...
                </h4>
                <p className="text-[12px] text-[#76777D] mt-1 font-mono-code">{scanStep}</p>
              </div>
            </div>
          )}

          {/* Verification & Edit Form once extracted */}
          {extractedData && !isScanning && !activeIssue?.code?.startsWith('DUPLICATE') && (
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

              {/* Context Badges for Versatile Categories */}
              {extractedData.mealsContext && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-900 text-xs flex items-center gap-3 flex-wrap">
                  <span className="font-semibold flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-orange-600" />
                    Meals & Dining Context:
                  </span>
                  <span>Type: <strong>{extractedData.mealsContext.diningType || 'Dine-In'}</strong></span>
                  <span>Guests: <strong>{extractedData.mealsContext.attendeeCount || 2}</strong></span>
                  {extractedData.mealsContext.hasAlcohol && (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono-code text-[10px]">
                      Alcohol Detected: ₹{extractedData.mealsContext.alcoholTotal || 0}
                    </span>
                  )}
                </div>
              )}

              {extractedData.travelContext && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-3 flex-wrap">
                  <span className="font-semibold flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-blue-600" />
                    Travel & Transit Context:
                  </span>
                  <span>Carrier: <strong>{extractedData.travelContext.carrier || 'Carrier'}</strong></span>
                  {extractedData.travelContext.origin && (
                    <span>Route: <strong>{extractedData.travelContext.origin} → {extractedData.travelContext.destination}</strong></span>
                  )}
                  {extractedData.travelContext.bookingReference && (
                    <span>Ref / PNR: <strong>{extractedData.travelContext.bookingReference}</strong></span>
                  )}
                </div>
              )}

              {extractedData.operationalContext && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-3 flex-wrap">
                  <span className="font-semibold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    Operational Context:
                  </span>
                  {extractedData.operationalContext.poNumber && (
                    <span>PO #: <strong>{extractedData.operationalContext.poNumber}</strong></span>
                  )}
                  {extractedData.operationalContext.department && (
                    <span>Dept: <strong>{extractedData.operationalContext.department}</strong></span>
                  )}
                  {extractedData.operationalContext.servicePeriod && (
                    <span>Period: <strong>{extractedData.operationalContext.servicePeriod}</strong></span>
                  )}
                </div>
              )}

              {extractedData.conversionMetrics?.isConverted && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 font-mono-code font-bold text-[10px] text-emerald-800 border border-emerald-200">
                      {extractedData.conversionMetrics.rateFormatted}
                    </span>
                    <span className="font-medium">
                      Converted from {extractedData.conversionMetrics.originalCurrency} {extractedData.conversionMetrics.originalCurrency === 'USD' ? '$' : extractedData.conversionMetrics.originalCurrency === 'EUR' ? '€' : ''}{extractedData.conversionMetrics.originalPrice.toFixed(2)} to INR for all calculations
                    </span>
                  </div>
                  <span className="font-mono-code font-bold text-emerald-900 text-sm">
                    ₹{Number(extractedData.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Product / Expense Name
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
                    Vendor / Merchant
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
                    Category
                  </label>
                  <MinimalSelect
                    value={extractedData.category || 'Meals & Entertainment'}
                    onChange={(val) =>
                      setExtractedData({ ...extractedData, category: val as CategoryType })
                    }
                    options={[
                      { value: 'Meals & Entertainment', label: 'Meals & Entertainment' },
                      { value: 'Travel & Transit', label: 'Travel & Transit' },
                      { value: 'Office & Operational', label: 'Office & Operational' },
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
                    Transaction Date
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
                    Final Total Price ({extractedData.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.price || 0}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A] font-semibold text-base"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Tax / VAT Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.tax ?? 0}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, tax: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Tip / Gratuity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedData.tip ?? 0}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, tip: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                    Order / Reference ID
                  </label>
                  <input
                    type="text"
                    value={extractedData.orderNumber || ''}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, orderNumber: e.target.value })
                    }
                    placeholder="e.g. ORD-88192 or Ticket #"
                    className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A]"
                  />
                </div>

                {/* Line Items Preview */}
                {extractedData.lineItems && extractedData.lineItems.length > 0 && (
                  <div className="sm:col-span-2 pt-2 border-t border-[#E2E8F0]">
                    <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-2">
                      Itemized Line Items ({extractedData.lineItems.length} Extracted)
                    </label>
                    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden text-[12px]">
                      <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-mono-code text-[10px] uppercase">
                          <tr>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {extractedData.lineItems.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3">
                                <span className="font-medium text-[#0F172A]">{item.name}</span>
                                {item.itemFlags?.includes('alcohol') && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800">
                                    Alcohol
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center text-[#64748B]">{item.quantity || 1}</td>
                              <td className="py-2 px-3 text-right font-mono-code font-medium">
                                {extractedData.currency || '$'}{Number(item.amount || item.unitPrice || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Corporate Policy & Tax Details */}
                {(extractedData.category === 'Electronics' ||
                  extractedData.category === 'Appliances' ||
                  extractedData.category === 'Office Furniture') && (
                  <>
                    <div>
                      <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                        Tax Status
                      </label>
                      <div className="w-full px-3.5 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl font-mono-code text-[#0F172A] text-xs">
                        {extractedData.taxDeductible ? 'Tax Deductible Write-off' : 'Standard Expense'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#76777D] font-mono-code text-[11px] uppercase mb-1">
                        Compliance Check
                      </label>
                      <div className="w-full px-3.5 py-2 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl font-mono-code text-[#065F46] text-xs font-semibold">
                        OCR Verified
                      </div>
                    </div>
                  </>
                )}

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
                    <span className="font-medium">Tax Deductible Business Expense</span>
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
          {extractedData && !activeIssue?.code?.startsWith('DUPLICATE') ? (
            <button
              onClick={resetState}
              className="text-[12px] text-[#76777D] hover:text-[#0F172A] font-medium cursor-pointer"
            >
              ← Scan Another Document
            </button>
          ) : activeIssue?.code?.startsWith('DUPLICATE') ? (
            <button
              onClick={resetState}
              className="text-[12px] text-rose-700 hover:text-rose-900 font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Another Receipt</span>
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
              {activeIssue?.code?.startsWith('DUPLICATE') ? 'Close' : 'Cancel'}
            </button>
            {extractedData && !activeIssue?.code?.startsWith('DUPLICATE') && (
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
