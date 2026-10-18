export type CategoryType =
  | 'Meals & Entertainment'
  | 'Travel & Transit'
  | 'Office & Operational'
  | 'Electronics'
  | 'Office Furniture'
  | 'Software'
  | 'Appliances'
  | 'Home & Living'
  | 'Travel'
  | 'Other';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ReceiptIssue {
  code: string;
  severity: IssueSeverity;
  title: string;
  message: string;
  suggestion?: string;
  field?: string;
  duplicateStage?: 'raw_image_hash' | 'anchor_json_hash';
  rawImageHash?: string;
  anchorJsonHash?: string;
  matchedRecordId?: string;
  isDuplicate?: boolean;
}

export interface ReceiptAnchor {
  transaction_date: string;
  total_amount: number;
  vendor: string;
  currency: string;
  order_number?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  stage?: 'raw_image_hash' | 'anchor_json_hash';
  hash?: string;
  matchedRecordId?: string;
  matchedRecordTitle?: string;
  reason?: string;
  anchor?: ReceiptAnchor;
}

export interface ExtractedReceiptData {
  name: string;
  vendor: string;
  category: CategoryType | string;
  subcategory?: string;
  purchaseDate: string;
  purchaseTime?: string;
  price: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  currency: string;
  orderNumber?: string;
  serialNumber?: string;
  paymentMethod?: string;
  warrantyMonths?: number;
  warrantyProvider?: string;
  warrantyTerms?: string;
  returnDays?: number;
  returnPolicy?: string;
  notes?: string;
  taxDeductible?: boolean;
  taxCategory?: string;
  aiConfidence: number;
  rawOcrSummary?: string;
  lineItems?: Array<{
    id?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    category?: string;
    itemFlags?: string[];
  }>;
  mealsContext?: {
    diningType?: string;
    attendeeCount?: number;
    hasAlcohol?: boolean;
    alcoholTotal?: number;
  };
  travelContext?: {
    travelType?: 'Flight' | 'Hotel' | 'Rideshare' | 'Train' | 'Car Rental' | 'Fuel' | 'Other';
    origin?: string;
    destination?: string;
    carrier?: string;
    passengerName?: string;
    bookingReference?: string;
    travelDates?: string;
  };
  operationalContext?: {
    poNumber?: string;
    department?: string;
    servicePeriod?: string;
    isRecurring?: boolean;
  };
  isReceipt?: boolean;
  isReadable?: boolean;
  qualityScore?: number;
  hasIssue?: boolean;
  issues?: ReceiptIssue[];
  primaryIssue?: ReceiptIssue | null;
  rawImageHash?: string;
  anchorJsonHash?: string;
  isDuplicate?: boolean;
  duplicateStage?: 'raw_image_hash' | 'anchor_json_hash';
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'receipt' | 'invoice' | 'warranty_card' | 'manual';
  fileUrl: string;
  previewUrl?: string;
  uploadDate: string;
  fileSize: string;
}

export interface WarrantyInfo {
  hasWarranty: boolean;
  durationMonths: number;
  startDate: string;
  expiryDate: string;
  provider: string;
  terms: string;
  claimInstructions?: string;
  claimStatus?: 'none' | 'drafted' | 'submitted' | 'approved';
}

export interface ReturnWindowInfo {
  hasReturn: boolean;
  returnDays: number;
  deadlineDate: string;
  status: 'open' | 'expiring_soon' | 'closed';
  policy: string;
  restockingFee?: string;
}

export interface PurchaseItem {
  id: string;
  name: string;
  vendor: string;
  category: CategoryType;
  purchaseDate: string;
  price: number;
  currency: string;
  orderNumber?: string;
  serialNumber?: string;
  paymentMethod?: string;
  warranty: WarrantyInfo;
  returnWindow: ReturnWindowInfo;
  documents: DocumentItem[];
  tags: string[];
  notes?: string;
  aiConfidence?: number;
  aiExtractedNotes?: string;
  taxDeductible?: boolean;
  rawImageHash?: string;
  anchorJsonHash?: string;
}

export interface AIActionItem {
  id: string;
  type: 'return_closing' | 'warranty_expiring' | 'receipt_sync' | 'warranty_claim';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  purchaseId?: string;
  actionLabel: string;
}

export interface SpendingInsight {
  id: string;
  title: string;
  description: string;
  type: 'spending' | 'warranty' | 'subscription' | 'tax';
  actionLabel: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  referencedPurchaseIds?: string[];
}

export type ActiveView =
  | 'dashboard'
  | 'purchases'
  | 'warranties'
  | 'returns'
  | 'vault'
  | 'analytics'
  | 'timeline'
  | 'create-invoice'
  | 'invoices'
  | 'settings'
  // Corporate Expense Reimbursement views
  | 'my-expenses'
  | 'submit-expense'
  | 'my-caps'
  | 'employee-policies'
  | 'trips'
  | 'messages'
  | 'review-queue'
  | 'all-expenses'
  | 'policy-studio'
  | 'simulator'
  | 'analytics-scorecard'
  | 'duplicates-view'
  | 'export-view'
  | 'employees'
  | 'reports';

export * from './types/expense';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // e.g. 10 for 10%
  discount?: number; // e.g. 5 for 5%
  amount: number; // total after tax/discount calculation
}

export interface InvoiceParty {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  taxId?: string; // VAT / GST / EIN
  logoUrl?: string;
}

export interface InvoicePaymentDetails {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string; // Swift / IFSC / Routing
  paypalEmail?: string;
  upiId?: string;
  paymentLink?: string;
  qrCodeData?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-001
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  currency: string; // USD, EUR, GBP, INR, etc.
  sender: InvoiceParty;
  client: InvoiceParty;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  shippingFee?: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  paymentTerms?: string; // e.g. "Net 30", "Due on Receipt"
  paymentDetails?: InvoicePaymentDetails;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

