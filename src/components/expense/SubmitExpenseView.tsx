import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Scale,
  Building2,
  Users,
  X,
  Plus,
  Trash2,
  Clock,
  ShieldAlert,
  HelpCircle,
  Eye,
  Check,
  Mic,
  Send,
  Plane,
  MapPin,
  RotateCcw,
  Bot,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Expense, LineItem, Verdict, DuplicateInfo } from '../../types/expense';
import {
  evaluateExpense,
  ExpenseLedger,
  normalizeCurrency,
  verifyReceiptIntegrity,
  detectDuplicates,
  bundleExpensesIntoTrips,
} from '../../engine';
import { getActivePolicy } from '../../services/policyService';
import { getActiveEmployee } from '../../services/employeeService';
import {
  getAllExpenses,
  submitExpense,
  appendThreadMessage,
  applyThreadPatch,
} from '../../services/expenseService';
import { preprocessReceiptImage } from '../../utils/receiptProcessor';
import { ReceiptIssueOverlay } from '../ui/ReceiptIssueOverlay';
import { ReceiptIssue } from '../../types';
import {
  computeRawImageSha256,
  createAnchorJson,
  computeAnchorJsonHash,
  checkRawImageDuplicate,
  checkAnchorJsonDuplicate,
  createDuplicateRejectionIssue,
  registerReceipt,
} from '../../utils/receiptDuplicateDetector';

interface SubmitExpenseViewProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5; // 1: Capture, 2: Details, 3: Context, 4: Verdict & Submit, 5: Evaluated Outcome
type CaptureMode = 'upload' | 'camera' | 'paste';

interface FieldConfidence {
  vendor: number;
  date: number;
  total: number;
  currency: number;
  category: number;
}

interface InferredFields {
  vendor: boolean;
  date: boolean;
  total: boolean;
  currency: boolean;
  category: boolean;
  trip: boolean;
}

const STORAGE_KEY_DRAFT = 'keepr_expense_draft_v3';

export const SubmitExpenseView: React.FC<SubmitExpenseViewProps> = ({
  onSuccess,
  onCancel,
}) => {
  const activeEmp = getActiveEmployee();
  const policy = getActivePolicy();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('upload');

  // Camera stream & refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');

  // AI Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingStep, setExtractingStep] = useState('');
  const [receiptIssue, setReceiptIssue] = useState<ReceiptIssue | null>(null);

  // Form Fields
  const [vendor, setVendor] = useState('Toit Brewpub Indiranagar');
  const [date, setDate] = useState('2026-10-22');
  const [total, setTotal] = useState('2400');
  const [tax, setTax] = useState('200');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('meals');
  const [city, setCity] = useState('Bengaluru');

  // Context: Trip & Travel
  const [isTravel, setIsTravel] = useState(true);
  const [tripId, setTripId] = useState<string | undefined>('trip_blr_01');
  const [suggestedTripName, setSuggestedTripName] = useState<string>('Bengaluru Tech Sync');

  // Context: Client Entertainment
  const [clientName, setClientName] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('1');
  const [purpose, setPurpose] = useState('Team dinner celebration');

  // Itemized line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Woodfired Margherita Pizza',
      quantity: 1,
      unitPrice: 1400,
      amount: 1400,
      category: 'meals',
      confidence: 0.98,
      itemFlags: [],
    },
    {
      id: '2',
      description: 'House Brew Pint (Craft Beer)',
      quantity: 2,
      unitPrice: 400,
      amount: 800,
      category: 'meals',
      confidence: 0.96,
      itemFlags: ['alcohol'],
    },
  ]);

  // Confidence & Inference metadata
  const [confidence, setConfidence] = useState<FieldConfidence>({
    vendor: 0.98,
    date: 0.97,
    total: 0.98,
    currency: 0.99,
    category: 0.96,
  });

  const [inferred, setInferred] = useState<InferredFields>({
    vendor: false,
    date: false,
    total: false,
    currency: false,
    category: false,
    trip: true,
  });

  // Receipt image preview & hashes
  const [receiptImage, setReceiptImage] = useState<string | null>('/abstract.png');
  const [receiptSha256, setReceiptSha256] = useState<string>('a841fd4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868310');
  const [receiptDHash, setReceiptDHash] = useState<string>('4b8f1c0d2e5a7b9c');
  const [receiptFileName, setReceiptFileName] = useState<string>('receipt_toit_oct22.jpg');

  // Live Dry Run Verdict
  const [dryRunVerdict, setDryRunVerdict] = useState<Verdict | null>(null);
  const [integritySignals, setIntegritySignals] = useState<any>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  // Outcome submission state
  const [submittedClaim, setSubmittedClaim] = useState<Expense | null>(null);
  const [finalVerdict, setFinalVerdict] = useState<Verdict | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fix-it interactive reply thread in outcome screen
  const [fixItInput, setFixItInput] = useState('');
  const [isFixItSubmitting, setIsFixItSubmitting] = useState(false);

  // Duplicate Inspection Modal
  const [viewOriginalClaim, setViewOriginalClaim] = useState<Expense | null>(null);

  // Draft persistence check on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (saved) {
        const d = JSON.parse(saved);
        if (d && d.vendor) {
          setVendor(d.vendor);
          if (d.date) setDate(d.date);
          if (d.total) setTotal(d.total);
          if (d.tax) setTax(d.tax || '0');
          if (d.currency) setCurrency(d.currency);
          if (d.category) setCategory(d.category);
          if (d.city) setCity(d.city);
          if (d.clientName) setClientName(d.clientName);
          if (d.attendeeCount) setAttendeeCount(d.attendeeCount);
          if (d.purpose) setPurpose(d.purpose);
          if (d.lineItems) setLineItems(d.lineItems);
          if (d.isTravel !== undefined) setIsTravel(d.isTravel);
          if (d.tripId) setTripId(d.tripId);
          if (d.receiptImage) setReceiptImage(d.receiptImage);
          if (d.receiptSha256) setReceiptSha256(d.receiptSha256);
          if (d.receiptDHash) setReceiptDHash(d.receiptDHash);
        }
      }
    } catch (e) {
      // Ignore storage error
    }
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    if (currentStep === 5) return;
    try {
      const draftPayload = {
        vendor,
        date,
        total,
        tax,
        currency,
        category,
        city,
        clientName,
        attendeeCount,
        purpose,
        lineItems,
        isTravel,
        tripId,
        receiptImage,
        receiptSha256,
        receiptDHash,
      };
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draftPayload));
    } catch (err) {
      // Ignore
    }
  }, [
    vendor,
    date,
    total,
    tax,
    currency,
    category,
    city,
    clientName,
    attendeeCount,
    purpose,
    lineItems,
    isTravel,
    tripId,
    receiptImage,
    receiptSha256,
    receiptDHash,
    currentStep,
  ]);

  // Handle Camera Start / Stop
  useEffect(() => {
    if (captureMode === 'camera' && currentStep === 1) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [captureMode, currentStep]);

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
      console.warn('Camera access unavailable:', err);
      setCameraError('Camera access unavailable. Please use file upload or select a demo receipt.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      handleIngestFile(base64, 'camera_capture.jpg', 'image/jpeg');
    }
  };

  // Auto-suggest trip based on city and date
  useEffect(() => {
    const existingExpenses = getAllExpenses();
    const trips = bundleExpensesIntoTrips({
      expenses: existingExpenses,
      cityTiers: policy.cityTiers,
    });

    const matchingTrip = trips.find(
      (t) =>
        t.destinationCity.toLowerCase() === city.toLowerCase() ||
        (date >= t.startDate && date <= t.endDate)
    );

    if (matchingTrip) {
      setSuggestedTripName(matchingTrip.name);
      setTripId(matchingTrip.id);
      setIsTravel(true);
      setInferred((prev) => ({ ...prev, trip: true }));
    } else {
      setSuggestedTripName(`${city} Business Travel (${date || '2026-10-22'})`);
    }
  }, [city, date]);

  // Does active category require client entertainment context?
  const requiresClientContext =
    category === 'client entertainment' ||
    category === 'client dining' ||
    lineItems.some((li) => li.category === 'client entertainment');

  // Client-Side Dry Run Policy Engine Evaluation
  useEffect(() => {
    try {
      const parsedTotal = parseFloat(total) || 0;
      const parsedTax = parseFloat(tax) || 0;

      const normalized = normalizeCurrency({
        sourceCurrency: currency,
        sourceAmount: parsedTotal,
        targetCurrency: policy.settings.baseCurrency,
        expenseDate: date,
        policyFxRates: policy.settings.fxRates,
      });

      const integrity = verifyReceiptIntegrity({
        printedTotal: parsedTotal,
        tax: parsedTax,
        lineItems,
        expenseDate: date,
      });
      setIntegritySignals(integrity.signals);

      const existingExpenses = getAllExpenses();

      const draftExp: Expense = {
        id: `draft_${Date.now()}`,
        orgId: 'org_acme',
        employeeId: activeEmp.id,
        status: 'draft',
        channel: 'upload',
        expenseDate: date,
        submittedAt: new Date().toISOString(),
        extracted: {
          merchant: { value: vendor, confidence: confidence.vendor, inferred: inferred.vendor, source: 'ocr' },
          date: { value: date, confidence: confidence.date, inferred: inferred.date, source: 'ocr' },
          total: { value: parsedTotal, confidence: confidence.total, inferred: inferred.total, source: 'ocr' },
          tax: { value: parsedTax, confidence: 0.9, inferred: false, source: 'ocr' },
          currency: { value: currency, confidence: confidence.currency, inferred: inferred.currency, source: 'ocr' },
          lineItems,
        },
        receiptRef: {
          originalSha256: receiptSha256,
          dHash: receiptDHash,
          previewUrl: receiptImage || undefined,
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
        normalizedCurrency: normalized,
        context: {
          city,
          cityTier: policy.cityTiers[city] || 'Tier-1',
          isTravel,
          tripId: isTravel ? tripId : undefined,
          clientName: clientName.trim() || undefined,
          attendeeCount: parseInt(attendeeCount, 10) || 1,
          purpose: purpose.trim() || undefined,
          source: 'user',
        },
        integritySignals: integrity.signals,
      };

      // Check duplicates
      const dup = detectDuplicates({
        currentExpense: draftExp,
        existingExpenses,
      });
      setDuplicateInfo(dup);
      draftExp.duplicateInfo = dup;

      // Populate ledger with historical approved claims
      const ledger = new ExpenseLedger();
      for (const exp of existingExpenses) {
        if (exp.id !== draftExp.id && (exp.verdict?.approvedAmountMinor || 0) > 0) {
          ledger.record({
            expenseId: exp.id,
            employeeId: exp.employeeId,
            expenseDate: exp.expenseDate,
            submittedAt: exp.submittedAt,
            category: exp.extracted?.lineItems?.[0]?.category || 'General',
            city: exp.context?.city,
            tripId: exp.context?.tripId,
            approvedAmountMinor: exp.verdict.approvedAmountMinor,
            status: exp.status,
            verdictDecision: exp.verdict.decision,
            isOverride: false,
          });
        }
      }

      const verdict = evaluateExpense({
        expense: draftExp,
        policy,
        employee: activeEmp,
        ledger,
      });

      setDryRunVerdict(verdict);
    } catch (err) {
      console.warn('Dry run policy error:', err);
    }
  }, [
    vendor,
    date,
    total,
    tax,
    currency,
    category,
    city,
    isTravel,
    tripId,
    clientName,
    attendeeCount,
    purpose,
    lineItems,
    receiptSha256,
    receiptDHash,
    confidence,
    inferred,
  ]);

  // Demo Scenarios Loader
  const loadDemoScenario = (
    type:
      | 'meal_alcohol'
      | 'client_dining'
      | 'hotel'
      | 'hardware'
      | 'travel_transit'
      | 'office_operational'
      | 'blurry_issue'
      | 'duplicate_raw'
      | 'duplicate_anchor'
  ) => {
    setReceiptIssue(null);
    if (type === 'meal_alcohol') {
      setVendor('Toit Brewpub Indiranagar');
      setDate('2026-10-22');
      setTotal('2400');
      setTax('200');
      setCurrency('INR');
      setCategory('meals');
      setCity('Bengaluru');
      setIsTravel(true);
      setClientName('');
      setPurpose('Team dinner celebration');
      setLineItems([
        {
          id: '1',
          description: 'Woodfired Margherita Pizza',
          quantity: 1,
          unitPrice: 1400,
          amount: 1400,
          category: 'meals',
          confidence: 0.98,
          itemFlags: [],
        },
        {
          id: '2',
          description: 'House Brew Pint (Craft Beer)',
          quantity: 2,
          unitPrice: 400,
          amount: 800,
          category: 'meals',
          confidence: 0.96,
          itemFlags: ['alcohol'],
        },
      ]);
      setConfidence({ vendor: 0.98, date: 0.97, total: 0.98, currency: 0.99, category: 0.96 });
      setInferred({ vendor: false, date: false, total: false, currency: false, category: false, trip: true });
      setReceiptImage('/abstract.png');
      setReceiptFileName('toit_brewpub_dinner.jpg');
      setReceiptSha256('a841fd4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868310');
      setReceiptDHash('4b8f1c0d2e5a7b9c');
    } else if (type === 'client_dining') {
      setVendor('The Oberoi Grand Dining');
      setDate('2026-10-22');
      setTotal('4200');
      setTax('350');
      setCurrency('INR');
      setCategory('client entertainment');
      setCity('Bengaluru');
      setIsTravel(false);
      setClientName(''); // Deliberately blank to demonstrate Needs Info
      setAttendeeCount('2');
      setPurpose('');
      setLineItems([
        {
          id: '1',
          description: 'Executive Tasting Menu',
          quantity: 2,
          unitPrice: 1925,
          amount: 3850,
          category: 'client entertainment',
          confidence: 0.97,
          itemFlags: [],
        },
      ]);
      setConfidence({ vendor: 0.95, date: 0.96, total: 0.97, currency: 0.99, category: 0.95 });
      setInferred({ vendor: false, date: false, total: false, currency: false, category: false, trip: false });
      setReceiptImage('/abstract.png');
      setReceiptFileName('oberoi_dining.jpg');
      setReceiptSha256('b931ce4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868322');
      setReceiptDHash('7c2e1f4a9b0d8e3f');
    } else if (type === 'hotel') {
      setVendor('Lemon Tree Premier');
      setDate('2026-10-22');
      setTotal('5500');
      setTax('500');
      setCurrency('INR');
      setCategory('travel');
      setCity('Pune');
      setIsTravel(true);
      setClientName('');
      setPurpose('Pune Regional Client Workshops');
      setLineItems([
        {
          id: '1',
          description: 'Standard Room Lodging (Night 1)',
          quantity: 1,
          unitPrice: 5000,
          amount: 5000,
          category: 'travel',
          confidence: 0.99,
          itemFlags: [],
        },
      ]);
      setConfidence({ vendor: 0.99, date: 0.98, total: 0.99, currency: 0.99, category: 0.98 });
      setReceiptImage('/abstract.png');
      setReceiptFileName('lemon_tree_pune.jpg');
      setReceiptSha256('c710fe4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868333');
      setReceiptDHash('2d4e8a1c9f0b7e5a');
    } else if (type === 'travel_transit') {
      setVendor('Delta Air Lines');
      setDate('2026-10-22');
      setTotal('48500');
      setTax('3800');
      setCurrency('INR');
      setCategory('travel');
      setCity('Bengaluru');
      setIsTravel(true);
      setClientName('');
      setPurpose('Client Summit: BLR to SFO flight (Booking REF: DL-8849)');
      setLineItems([
        {
          id: '1',
          description: 'Airfare BLR -> SFO (Economy Comfort)',
          quantity: 1,
          unitPrice: 48500,
          amount: 48500,
          category: 'travel',
          confidence: 0.99,
          itemFlags: [],
        },
      ]);
      setConfidence({ vendor: 0.99, date: 0.98, total: 0.99, currency: 0.99, category: 0.99 });
      setInferred({ vendor: false, date: false, total: false, currency: false, category: false, trip: true });
      setReceiptImage('/abstract.png');
      setReceiptFileName('delta_boarding_pass.pdf');
      setReceiptSha256('e912ab4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868355');
      setReceiptDHash('3a9f2c1d8e0b4a7c');
    } else if (type === 'office_operational') {
      setVendor('WeWork Managed Offices');
      setDate('2026-10-22');
      setTotal('18500');
      setTax('2200');
      setCurrency('INR');
      setCategory('supplies');
      setCity('Bengaluru');
      setIsTravel(false);
      setClientName('');
      setPurpose('Monthly Team Flex Pass (PO-9941)');
      setLineItems([
        {
          id: '1',
          description: 'Dedicated Desk Pass (Monthly)',
          quantity: 1,
          unitPrice: 18500,
          amount: 18500,
          category: 'supplies',
          confidence: 0.98,
          itemFlags: [],
        },
      ]);
      setConfidence({ vendor: 0.98, date: 0.98, total: 0.98, currency: 0.99, category: 0.98 });
      setInferred({ vendor: false, date: false, total: false, currency: false, category: false, trip: false });
      setReceiptImage('/abstract.png');
      setReceiptFileName('wework_oct_invoice.pdf');
      setReceiptSha256('f023cd4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868366');
      setReceiptDHash('8b1d4e2f9a0c3e5b');
    } else if (type === 'duplicate_raw') {
      setReceiptImage('/abstract.png');
      setReceiptFileName('toit_brewpub_dinner.jpg');
      setReceiptIssue(
        createDuplicateRejectionIssue({
          isDuplicate: true,
          stage: 'raw_image_hash',
          matchedRecordTitle: 'Wanderlust Travel Agency (2026-09-14)',
        })
      );
      setCurrentStep(1);
      return;
    } else if (type === 'duplicate_anchor') {
      setReceiptImage('/abstract.png');
      setReceiptFileName('toit_different_angle.jpg');
      setReceiptIssue(
        createDuplicateRejectionIssue({
          isDuplicate: true,
          stage: 'anchor_json_hash',
          matchedRecordTitle: 'Toit Brewpub (₹2,400 on Oct 22)',
        })
      );
      setCurrentStep(1);
      return;
    } else if (type === 'blurry_issue') {
      setVendor('Unknown Merchant');
      setDate('2026-10-22');
      setTotal('0');
      setTax('0');
      setCurrency('INR');
      setCategory('meals');
      setCity('Bengaluru');
      setIsTravel(false);
      setClientName('');
      setPurpose('');
      setLineItems([]);
      setReceiptImage('/abstract.png');
      setReceiptFileName('blurry_receipt_sample.jpg');
      setReceiptIssue({
        code: 'unreadable',
        message: 'Receipt is severely blurry with low contrast. Merchant name and total amount could not be verified with confidence.',
        severity: 'error',
        recommendation: 'Place the receipt on a flat, well-lit surface and capture a steady photo directly from above.',
      });
    } else {
      setVendor('Fine Dine Bistro');
      setDate('2026-10-22');
      setTotal('3800');
      setTax('300');
      setCurrency('INR');
      setCategory('meals');
      setCity('Bengaluru');
      setIsTravel(false);
      setClientName('');
      setPurpose('Working late meal');
      setLineItems([
        {
          id: '1',
          description: 'Steak & Gourmet Sides',
          quantity: 1,
          unitPrice: 3500,
          amount: 3500,
          category: 'meals',
          confidence: 0.98,
          itemFlags: [],
        },
      ]);
      setConfidence({ vendor: 0.98, date: 0.98, total: 0.99, currency: 0.99, category: 0.98 });
      setReceiptImage('/abstract.png');
      setReceiptFileName('bistro_overrun.jpg');
      setReceiptSha256('d820af4c81045e0d4d8ef8704efc586b4a2a4724b17a02242171018921868344');
      setReceiptDHash('9e1a4c8b2f0d3e7a');
    }
    setCurrentStep(2);
  };

  // Receipt Ingestion Pipeline (reusing AI Receipt & Invoice Ingestion)
  const handleIngestFile = async (base64OrFile: string | File, fileName?: string, mimeType = 'image/jpeg') => {
    setIsExtracting(true);
    setExtractingStep('Preprocessing receipt image & hashing...');

    try {
      let imageBase64 = '';
      let sha256 = '';
      let dHash = '';

      if (typeof base64OrFile === 'string') {
        imageBase64 = base64OrFile;
        setReceiptImage(base64OrFile);
        setReceiptFileName(fileName || 'receipt_capture.jpg');
      } else {
        const processed = await preprocessReceiptImage(base64OrFile);
        imageBase64 = processed.imageBase64;
        sha256 = processed.sha256;
        dHash = processed.dHash;
        setReceiptImage(processed.previewUrl);
        setReceiptSha256(processed.sha256);
        setReceiptDHash(processed.dHash);
        setReceiptFileName(base64OrFile.name);
      }

      // STAGE 1: Raw Image Hashing check BEFORE calling Gemini API
      if (sha256) {
        const rawDupCheck = checkRawImageDuplicate(sha256);
        if (rawDupCheck.isDuplicate) {
          setReceiptIssue(createDuplicateRejectionIssue(rawDupCheck));
          setIsExtracting(false);
          setExtractingStep('');
          return;
        }
      }

      setExtractingStep('Analyzing document structure with Gemini AI...');

      // Call AI endpoint
      const res = await fetch('/api/gemini/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data && data.extracted) {
        const ext = data.extracted;

        // Check if server rejected as duplicate
        if (data.duplicate || ext.isDuplicate) {
          setReceiptIssue(
            ext.primaryIssue ||
              createDuplicateRejectionIssue({
                isDuplicate: true,
                stage: data.duplicateStage || 'raw_image_hash',
                matchedRecordTitle: ext.vendor,
              })
          );
          setIsExtracting(false);
          setExtractingStep('');
          setCurrentStep(1);
          return;
        }

        // STAGE 2: Client-side Anchor JSON check after Gemini gives JSON output
        const anchor = createAnchorJson({
          purchaseDate: ext.purchaseDate,
          price: ext.price,
          vendor: ext.vendor,
          currency: ext.currency,
        });
        const anchorHash = ext.anchorJsonHash || (await computeAnchorJsonHash(anchor));
        const anchorDupCheck = checkAnchorJsonDuplicate(anchorHash, anchor);
        if (anchorDupCheck.isDuplicate) {
          setReceiptIssue(createDuplicateRejectionIssue(anchorDupCheck));
          setIsExtracting(false);
          setExtractingStep('');
          setCurrentStep(1);
          return;
        }

        // Check for receipt legibility / validation issues
        if (ext.primaryIssue) {
          setReceiptIssue(ext.primaryIssue);
        } else if (ext.issues && ext.issues.length > 0) {
          setReceiptIssue(ext.issues[0]);
        } else if (ext.hasIssue || ext.isReadable === false) {
          setReceiptIssue({
            code: 'unreadable',
            message: ext.readableReason || 'The receipt image has quality issues or is difficult to read.',
            severity: ext.isReadable === false ? 'error' : 'warning',
            recommendation: 'Please review and verify the extracted amounts, or upload a clearer photo.',
          });
        }

        if (ext.vendor) setVendor(ext.vendor);
        if (ext.purchaseDate) setDate(ext.purchaseDate);
        if (ext.price) {
          setTotal(String(ext.price));
          setTax(ext.tax ? String(ext.tax) : String(Math.round(ext.price * 0.08)));
        }
        if (ext.currency) setCurrency(ext.currency);

        // Versatile category handling
        if (ext.category) {
          const catLower = ext.category.toLowerCase();
          if (
            catLower.includes('meal') ||
            catLower.includes('entertainment') ||
            catLower.includes('food') ||
            catLower.includes('dining') ||
            catLower.includes('restaurant') ||
            catLower.includes('cafe')
          ) {
            setCategory('meals');
            if (ext.attendeeCount && ext.attendeeCount > 1) {
              setAttendeeCount(String(ext.attendeeCount));
            }
          } else if (
            catLower.includes('travel') ||
            catLower.includes('transit') ||
            catLower.includes('flight') ||
            catLower.includes('airline') ||
            catLower.includes('rideshare') ||
            catLower.includes('uber') ||
            catLower.includes('hotel')
          ) {
            setCategory('travel');
            setIsTravel(true);
            if (ext.destination) {
              setCity(ext.destination);
            }
          } else if (
            catLower.includes('office') ||
            catLower.includes('operational') ||
            catLower.includes('supplies') ||
            catLower.includes('software') ||
            catLower.includes('subscription')
          ) {
            setCategory('supplies');
            setIsTravel(false);
            if (ext.poNumber) {
              setPurpose(`PO ${ext.poNumber} operational expense`);
            }
          } else {
            setCategory('supplies');
          }
        }

        if (Array.isArray(ext.lineItems) && ext.lineItems.length > 0) {
          setLineItems(
            ext.lineItems.map((item: any, idx: number) => ({
              id: String(idx + 1),
              description: item.description || item.name || `Item ${idx + 1}`,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice || item.price || (ext.price ? ext.price / ext.lineItems.length : 0)),
              amount: Number(item.amount || item.price || 0),
              category: item.category || ext.category || 'meals',
              confidence: item.confidence ?? 0.95,
              itemFlags: Array.isArray(item.itemFlags) ? item.itemFlags : [],
            }))
          );
        } else if (ext.name) {
          setLineItems([
            {
              id: '1',
              description: ext.name,
              quantity: 1,
              unitPrice: ext.price || 1200,
              amount: ext.price || 1200,
              category: ext.category || 'meals',
              confidence: 0.95,
              itemFlags: [],
            },
          ]);
        }
      }
      setCurrentStep(2);
    } catch (err) {
      console.warn('AI Ingestion notice, continuing with fallback:', err);
      setReceiptIssue({
        code: 'unreadable',
        message: 'Could not process receipt image due to network or format error.',
        severity: 'warning',
        recommendation: 'You can fill out the details manually or try scanning again.',
      });
      setCurrentStep(2);
    } finally {
      setIsExtracting(false);
      setExtractingStep('');
    }
  };

  // Handle Paste Ingestion
  const handleIngestPaste = async () => {
    if (!pastedText.trim()) return;
    setIsExtracting(true);
    setExtractingStep('Extracting structured expense items from text...');
    setReceiptIssue(null);

    try {
      const res = await fetch('/api/gemini/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContext: pastedText,
        }),
      });

      const data = await res.json();
      if (data && data.extracted) {
        const ext = data.extracted;
        if (ext.primaryIssue) {
          setReceiptIssue(ext.primaryIssue);
        } else if (ext.issues && ext.issues.length > 0) {
          setReceiptIssue(ext.issues[0]);
        }
        if (ext.vendor) setVendor(ext.vendor);
        if (ext.purchaseDate) setDate(ext.purchaseDate);
        if (ext.price) setTotal(String(ext.price));
        if (ext.currency) setCurrency(ext.currency);
        if (ext.category) {
          const catLower = ext.category.toLowerCase();
          if (catLower.includes('meal') || catLower.includes('entertainment') || catLower.includes('food')) {
            setCategory('meals');
          } else if (catLower.includes('travel') || catLower.includes('transit')) {
            setCategory('travel');
          } else {
            setCategory('supplies');
          }
        }
        if (Array.isArray(ext.lineItems) && ext.lineItems.length > 0) {
          setLineItems(
            ext.lineItems.map((item: any, idx: number) => ({
              id: String(idx + 1),
              description: item.description || item.name || `Item ${idx + 1}`,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice || item.price || 0),
              amount: Number(item.amount || item.price || 0),
              category: item.category || ext.category || 'meals',
              confidence: item.confidence ?? 0.95,
              itemFlags: Array.isArray(item.itemFlags) ? item.itemFlags : [],
            }))
          );
        }
      }
      setCurrentStep(2);
    } catch (err) {
      console.warn('Paste extraction fallback:', err);
      setCurrentStep(2);
    } finally {
      setIsExtracting(false);
      setExtractingStep('');
    }
  };

  // Submit Claim (authoritative re-run)
  const handleSubmitClaim = async () => {
    if (duplicateInfo && duplicateInfo.highestScore >= 0.95 && duplicateInfo.candidates?.some((c) => c.score >= 0.95)) {
      alert('Submission blocked: This receipt has already been submitted identically.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTotal = parseFloat(total) || 0;
      const parsedTax = parseFloat(tax) || 0;

      const normalized = normalizeCurrency({
        sourceCurrency: currency,
        sourceAmount: parsedTotal,
        targetCurrency: policy.settings.baseCurrency,
        expenseDate: date,
        policyFxRates: policy.settings.fxRates,
      });

      const integrity = verifyReceiptIntegrity({
        printedTotal: parsedTotal,
        tax: parsedTax,
        lineItems,
        expenseDate: date,
      });

      const submittedExpense: Expense = {
        id: `exp_${Date.now()}`,
        orgId: 'org_acme',
        employeeId: activeEmp.id,
        status: 'draft',
        channel: 'upload',
        expenseDate: date,
        submittedAt: new Date().toISOString(),
        extracted: {
          merchant: { value: vendor, confidence: confidence.vendor, inferred: inferred.vendor, source: 'ocr' },
          date: { value: date, confidence: confidence.date, inferred: inferred.date, source: 'ocr' },
          total: { value: parsedTotal, confidence: confidence.total, inferred: inferred.total, source: 'ocr' },
          tax: { value: parsedTax, confidence: 0.9, inferred: false, source: 'ocr' },
          currency: { value: currency, confidence: confidence.currency, inferred: inferred.currency, source: 'ocr' },
          lineItems,
        },
        receiptRef: {
          originalSha256: receiptSha256,
          dHash: receiptDHash,
          previewUrl: receiptImage || undefined,
          mimeType: 'image/jpeg',
          fileSize: 1024,
        },
        normalizedCurrency: normalized,
        context: {
          city,
          cityTier: policy.cityTiers[city] || 'Tier-1',
          isTravel,
          tripId: isTravel ? tripId : undefined,
          clientName: clientName.trim() || undefined,
          attendeeCount: parseInt(attendeeCount, 10) || 1,
          purpose: purpose.trim() || undefined,
          source: 'user',
        },
        integritySignals: integrity.signals,
      };

      const result = submitExpense(submittedExpense);
      setSubmittedClaim(result.expense);
      setFinalVerdict(result.verdict);
      localStorage.removeItem(STORAGE_KEY_DRAFT);
      setCurrentStep(5);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Line item helpers
  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: String(Date.now()),
      description: 'New Item',
      quantity: 1,
      unitPrice: 100,
      amount: 100,
      category,
      confidence: 0.95,
      itemFlags: [],
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, field: keyof LineItem, val: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'quantity' || field === 'unitPrice') {
            updated.amount = (Number(updated.quantity) || 1) * (Number(updated.unitPrice) || 0);
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Fix-it Reply Submit
  const handleFixItSubmit = async () => {
    if (!submittedClaim || !fixItInput.trim()) return;
    setIsFixItSubmitting(true);
    try {
      const updatedExp = appendThreadMessage({
        expenseId: submittedClaim.id,
        sender: 'employee',
        message: fixItInput.trim(),
        proposedPatch: { clientName: fixItInput.trim() },
      });

      const patch: Record<string, any> = {};
      if (finalVerdict?.missingFields?.includes('clientName') || requiresClientContext) {
        patch.clientName = fixItInput.trim();
      }

      const res = applyThreadPatch({
        expenseId: submittedClaim.id,
        messageId: updatedExp.thread?.[updatedExp.thread.length - 1]?.id || `msg_${Date.now()}`,
        patch,
        actor: {
          id: activeEmp.id,
          name: activeEmp.identity?.name || 'Employee',
          role: activeEmp.role,
        },
      });
      setSubmittedClaim(res);
      if (res.verdict) setFinalVerdict(res.verdict);
      setFixItInput('');
    } catch (err) {
      console.error('Fix-it error:', err);
    } finally {
      setIsFixItSubmitting(false);
    }
  };

  // Calculations for Step 4 Verdict Preview
  const lineItemsSum = lineItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalNum = parseFloat(total) || 0;
  const isMathMismatched = Math.abs(lineItemsSum - totalNum) > 1;

  const excludedItems = (dryRunVerdict?.ruleImpacts || []).filter((r) => r.impactType === 'exclusion');
  const excludedAmountTotal = excludedItems.reduce((acc, curr) => acc + curr.impactAmountMinor, 0) / 100;
  const approvedReimbursement = dryRunVerdict ? dryRunVerdict.approvedAmountMinor / 100 : 0;
  const isAutoApproved = dryRunVerdict?.decision === 'auto_approve';
  const isPartial = dryRunVerdict?.decision === 'partial';
  const isNeedsInfo = dryRunVerdict?.decision === 'needs_info';
  const isInReview = dryRunVerdict?.decision === 'review';

  // Step 1 Capture Options Slider
  const captureOptions = [
    { id: 'upload', label: 'Upload Receipt', icon: UploadCloud },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'paste', label: 'Paste Text', icon: FileText },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Onboarding Stepper Header */}
      {currentStep < 5 && (
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              Step {currentStep} of 4 •{' '}
              {currentStep === 1 && 'Capture Receipt'}
              {currentStep === 2 && 'Review Details'}
              {currentStep === 3 && 'Business Context'}
              {currentStep === 4 && 'Policy Verdict'}
            </span>
            <span className="text-slate-400 font-mono-code">{currentStep * 25}% complete</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-600 rounded-full"
              initial={{ width: '25%' }}
              animate={{ width: `${currentStep * 25}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Receipt Issue Overlay at Top */}
      <ReceiptIssueOverlay
        issue={receiptIssue}
        onDismiss={() => setReceiptIssue(null)}
        onRetake={() => {
          setReceiptIssue(null);
          setCurrentStep(1);
          setCaptureMode('upload');
          fileInputRef.current?.click();
        }}
        onProceedAnyway={() => {
          setReceiptIssue(null);
        }}
      />

      <AnimatePresence mode="wait">
        {/* STEP 1: CAPTURE RECEIPT */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="text-center space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                How would you like to add your receipt?
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Our AI automatically ingests the receipt, extracts line items, and runs your company policy checks.
              </p>
            </div>

            {/* Animated Slider Segmented Switcher */}
            <div className="flex justify-center">
              <div className="relative inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner max-w-full">
                {captureOptions.map((opt) => {
                  const isSelected = captureMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCaptureMode(opt.id)}
                      className={`relative px-3 sm:px-5 py-2 sm:py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer z-10 ${
                        isSelected ? 'text-slate-900 bg-white shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <opt.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Capture Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs min-h-[300px] flex flex-col justify-center">
            {isExtracting ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-sm font-medium text-slate-800">{extractingStep}</p>
                <p className="text-xs text-slate-400">Verifying merchant, date, and line items...</p>
              </div>
            ) : captureMode === 'upload' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleIngestFile(f);
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 text-slate-500 flex items-center justify-center mb-3 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Click or drag receipt file here</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, or PDF up to 25MB</p>
              </div>
            ) : captureMode === 'camera' ? (
              <div className="space-y-4">
                {cameraError ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                    <p className="text-xs text-amber-800">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setCaptureMode('upload')}
                      className="text-xs font-semibold text-emerald-600 hover:underline"
                    >
                      Switch to File Upload
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <button
                      type="button"
                      onClick={captureCameraPhoto}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white text-slate-900 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-emerald-600" />
                      Capture Photo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste receipt text, invoice contents, or order confirmation..."
                  rows={6}
                  className="w-full text-xs p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono-code resize-none"
                />
                <button
                  type="button"
                  onClick={handleIngestPaste}
                  disabled={!pastedText.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Extract with AI
                </button>
              </div>
            )}

            {/* Subtle Demo Scenarios Links */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-400 block mb-2.5">Or try a preloaded demo scenario:</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDemoScenario('meal_alcohol')}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Meals & Entertainment
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('travel_transit')}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Travel & Transit (Flight)
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('office_operational')}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Office & Operational (WeWork)
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('blurry_issue')}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Blurry Receipt (Issue Demo)
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('client_dining')}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Client Dining
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('hotel')}
                  className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Pune Lodging
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('duplicate_raw' as any)}
                  className="px-3 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>🛡️ Duplicate Raw Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoScenario('duplicate_anchor' as any)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>🛡️ Duplicate Anchor JSON</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: REVIEW DETAILS */}
      {currentStep === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Are these details correct?
            </h1>
            <p className="text-sm text-slate-500">
              Review extracted merchant, total, and itemized line items.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            {/* Primary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Merchant / Vendor</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Expense Date {!date && <span className="text-rose-500 font-normal">• Required</span>}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none font-medium ${
                    !date ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Total Amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-mono-code font-semibold"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono-code font-semibold"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium bg-white"
                >
                  <option value="meals">Meals & Dining</option>
                  <option value="travel">Travel & Transit</option>
                  <option value="client entertainment">Client Entertainment</option>
                  <option value="supplies">Office Supplies</option>
                  <option value="software">Software & Subscriptions</option>
                </select>
              </div>
            </div>

            {/* Arithmetic Integrity Banner */}
            {isMathMismatched && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>
                  Line items sum (₹{lineItemsSum}) differs from printed total (₹{totalNum}).
                </span>
                <button
                  type="button"
                  onClick={() => setTotal(String(lineItemsSum))}
                  className="font-semibold underline cursor-pointer ml-2 shrink-0"
                >
                  Sync Total
                </button>
              </div>
            )}

            {/* Itemized Line Items List */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">Line Items</span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                        className="w-full bg-transparent font-medium text-slate-800 focus:outline-none"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400 capitalize">{item.category}</span>
                        {item.itemFlags?.includes('alcohol') && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">
                            Alcohol (Excluded)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-code font-semibold text-slate-900">
                        ₹{Number(item.amount).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              disabled={!date}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              Continue to Context <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: BUSINESS CONTEXT */}
      {currentStep === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Tell us about this expense
            </h1>
            <p className="text-sm text-slate-500">
              Attach travel and client context to ensure touchless policy approval.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            {/* Question 1: Travel Context */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Is this expense part of a business trip?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTravel(false)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    !isTravel ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Local Expense (No Trip)
                </button>
                <button
                  type="button"
                  onClick={() => setIsTravel(true)}
                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                    isTravel ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Business Travel
                </button>
              </div>

              {isTravel && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-semibold text-slate-800 block">{suggestedTripName}</span>
                      <span className="text-[11px] text-slate-500">{city}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newCity = prompt('Enter trip destination city:', city);
                      if (newCity) setCity(newCity);
                    }}
                    className="text-xs text-emerald-600 hover:underline font-semibold cursor-pointer"
                  >
                    Change City
                  </button>
                </div>
              )}
            </div>

            {/* Question 2: Client Entertainment Context (Conditional) */}
            {requiresClientContext && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Client Entertainment Details</span>
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    Needed for Full Approval
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Client Organization / Company Name
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Acme Health Partners"
                      className={`w-full text-xs p-2.5 border rounded-xl focus:outline-none font-medium ${
                        !clientName ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 focus:border-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Attendee Count</label>
                      <input
                        type="number"
                        min="1"
                        value={attendeeCount}
                        onChange={(e) => setAttendeeCount(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Business Purpose</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. Q3 Roadmap review"
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              Review Policy Verdict <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: POLICY VERDICT & SUBMIT */}
      {currentStep === 4 && (
        <motion.div
          key="step4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Review policy verdict before submitting
            </h1>
            <p className="text-sm text-slate-500">
              Evaluated against corporate policy with touchless auto-clearance.
            </p>
          </div>

          {/* Duplicate Claim Blocker / Warning */}
          {duplicateInfo && duplicateInfo.highestScore >= 0.70 && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${duplicateInfo.highestScore >= 0.95
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
            >
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block">
                  {duplicateInfo.highestScore >= 0.95
                    ? 'Exact Duplicate Detected • Submission Blocked'
                    : 'Suspected Duplicate Claim Detected'}
                </span>
                <p>
                  {duplicateInfo.evidenceSummary ||
                    `Matches existing record with ${Math.round(duplicateInfo.highestScore * 100)}% similarity.`}
                </p>
                {duplicateInfo.candidates && duplicateInfo.candidates[0] && (
                  <button
                    type="button"
                    onClick={() => {
                      const candidate = duplicateInfo.candidates[0];
                      const targetId = candidate.claimId || (candidate as any).expenseId;
                      const orig = getAllExpenses().find((e) => e.id === targetId);
                      if (orig) setViewOriginalClaim(orig);
                    }}
                    className="text-[11px] underline font-semibold cursor-pointer text-emerald-700 hover:text-emerald-900 block pt-1"
                  >
                    View Original Claim (#{((duplicateInfo.candidates[0].claimId || (duplicateInfo.candidates[0] as any).expenseId || '').slice(-6))})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Verdict Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">Policy Decision</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  {isAutoApproved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isPartial && <Scale className="w-4 h-4 text-amber-600" />}
                  {isNeedsInfo && <HelpCircle className="w-4 h-4 text-amber-600" />}
                  {isInReview && <Clock className="w-4 h-4 text-slate-600" />}

                  {isAutoApproved && 'Touchless Auto-Approved'}
                  {isPartial && 'Partially Approved'}
                  {isNeedsInfo && 'Action Required: Needs Info'}
                  {isInReview && 'Finance Review Required'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block mb-0.5">Approved Amount</span>
                <span className="text-lg font-bold font-mono-code text-emerald-600">
                  ₹{approvedReimbursement.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Claimed Total:</span>
                <span className="font-mono-code font-semibold text-slate-800">₹{totalNum.toFixed(2)} {currency}</span>
              </div>

              {excludedAmountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Excluded Non-Reimbursable:</span>
                  <span className="font-mono-code">- ₹{excludedAmountTotal.toFixed(2)}</span>
                </div>
              )}

              {excludedItems.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">Exclusion Details:</span>
                  {excludedItems.map((rule, idx) => (
                    <p key={idx} className="text-[11px] text-slate-600">
                      • {rule.title}: ₹{(rule.impactAmountMinor / 100).toFixed(2)} ({rule.explanation})
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Cap Meter */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Daily Allowance Meter (Meals):</span>
                <span className="font-semibold text-slate-800">₹{totalNum} of ₹3,000 allowance</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (totalNum / 3000) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={handleSubmitClaim}
              disabled={
                isSubmitting ||
                Boolean(duplicateInfo && duplicateInfo.highestScore >= 0.95 && duplicateInfo.candidates?.some((c) => c.score >= 0.95))
              }
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 5: EVALUATED OUTCOME */}
      {currentStep === 5 && submittedClaim && finalVerdict && (
        <motion.div
          key="step5"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-6"
        >
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-mono-code font-bold uppercase tracking-wider text-emerald-600">
              Claim Ref #{submittedClaim?.id ? submittedClaim.id.slice(-6).toUpperCase() : 'CLAIM'}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {finalVerdict.decision === 'auto_approve' && 'Claim Auto-Approved!'}
              {finalVerdict.decision === 'partial' && 'Claim Partially Approved'}
              {finalVerdict.decision === 'needs_info' && 'Action Required: Needs Info'}
              {finalVerdict.decision === 'review' && 'Submitted for Review'}
            </h1>
            <p className="text-sm text-slate-500">
              {vendor} • {date} • {city}
            </p>
          </div>

          {/* Amount Box */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600">Reimbursement Approved:</span>
            <span className="font-mono-code font-bold text-sm text-emerald-600">
              ₹{(finalVerdict.approvedAmountMinor / 100).toFixed(2)} INR
            </span>
          </div>

          {/* Interactive Fix-it reply thread if Needs Info */}
          {finalVerdict.decision === 'needs_info' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-3">
              <span className="text-xs font-bold text-amber-900 block">
                Resolve Missing Information:
              </span>
              <p className="text-xs text-amber-800">
                Policy rule requires client organization name to clear reimbursement.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fixItInput}
                  onChange={(e) => setFixItInput(e.target.value)}
                  placeholder="e.g. Acme Health Partners"
                  className="flex-1 text-xs p-2 bg-white border border-amber-300 rounded-lg focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleFixItSubmit}
                  disabled={isFixItSubmitting || !fixItInput.trim()}
                  className="px-3 py-2 bg-amber-800 text-white rounded-lg text-xs font-semibold hover:bg-amber-900 disabled:opacity-50 cursor-pointer"
                >
                  Reply & Clear
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => {
                // Keep trip context, reset claim fields for new receipt
                setReceiptImage(null);
                setVendor('');
                setDate(new Date().toISOString().split('T')[0]);
                setTotal('0');
                setTax('0');
                setLineItems([]);
                setCurrentStep(1);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Add Another Receipt (Keep Trip)
            </button>
            <button
              type="button"
              onClick={onSuccess}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Done & View Expenses
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Duplicate Original Claim Modal */}
      {viewOriginalClaim && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-900">
                Original Claim #{viewOriginalClaim?.id ? viewOriginalClaim.id.slice(-6) : ''}
              </span>
              <button
                type="button"
                onClick={() => setViewOriginalClaim(null)}
                className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs space-y-2 text-slate-600">
              <p><strong>Merchant:</strong> {viewOriginalClaim?.extracted?.merchant?.value || 'Merchant'}</p>
              <p><strong>Date:</strong> {viewOriginalClaim?.expenseDate || 'N/A'}</p>
              <p>
                <strong>Amount:</strong> ₹
                {viewOriginalClaim?.extracted?.total?.value
                  ? Number(viewOriginalClaim.extracted.total.value).toFixed(2)
                  : viewOriginalClaim?.normalizedCurrency?.targetAmountMinor
                    ? (viewOriginalClaim.normalizedCurrency.targetAmountMinor / 100).toFixed(2)
                    : '0.00'}
              </p>
              <p><strong>Submitted At:</strong> {viewOriginalClaim?.submittedAt || 'N/A'}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewOriginalClaim(null)}
              className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
