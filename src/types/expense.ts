/**
 * Keepr Corporate Expense Reimbursement Auditor Types
 * Conforms to Keepr_Receipt_Final.md specifications
 */

export type UserRole = 'employee' | 'manager' | 'finance' | 'admin';

export interface Organization {
  id: string;
  name: string;
  baseCurrency: string; // e.g. "INR", "USD", "EUR"
  timezone: string; // e.g. "Asia/Kolkata", "America/New_York"
  reportingMonthStartDay: number; // e.g. 1
  activePolicyVersionId: string;
  autoApproveRiskThreshold: number; // default: 25 (0..100)
  autoApproveMinConfidence: number; // default: 0.80 (0..1)
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  orgId: string;
  identity: {
    email: string;
    name: string;
  };
  role: UserRole;
  department: string;
  grade: string; // e.g. "L4", "L5", "Executive", "Staff"
  homeCity: string;
  managerId?: string;
  avatarUrl?: string;
}

export type ValueSource = 'ocr' | 'computed' | 'user' | 'metadata';

export interface FieldValue<T> {
  value: T;
  confidence: number; // 0..1
  inferred: boolean;
  source: ValueSource;
}

export type ItemFlag =
  | 'alcohol'
  | 'tobacco'
  | 'personal'
  | 'gift'
  | 'fine_penalty'
  | 'tip'
  | 'minibar'
  | 'laundry'
  | 'unitemized';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
  confidence: number;
  itemFlags: ItemFlag[];
  rawText?: string;
}

export type CityTier = 'Tier-1' | 'Tier-2' | 'Tier-3' | 'International';

export interface ExpenseContext {
  tripId?: string;
  city?: string;
  cityTier?: CityTier;
  isTravel?: boolean;
  purpose?: string;
  clientName?: string;
  attendeeCount?: number;
  attendees?: string[];
  source: 'user' | 'extraction' | 'inference';
}

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'auto_approved'
  | 'needs_info'
  | 'in_review'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'paid';

export type ClaimDecision =
  | 'approve'
  | 'auto_approve'
  | 'partial'
  | 'needs_info'
  | 'escalate'
  | 'reject';

export interface RuleCitation {
  ruleId: string;
  section: string;
  title: string;
  sourceQuote?: string;
  impactAmountMinor: number; // integer minor units
  impactType: 'cap' | 'exclusion' | 'hold' | 'threshold' | 'time_window' | 'document';
  explanation: string;
}

export interface RiskFlag {
  code: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  weight: number;
}

export interface Verdict {
  decision: ClaimDecision;
  status: ClaimStatus;
  totalAmountMinor: number;
  eligibleAmountMinor: number;
  approvedAmountMinor: number;
  rejectedAmountMinor: number;
  pendingAmountMinor: number;
  ruleImpacts: RuleCitation[];
  missingFields: string[];
  flags: RiskFlag[];
  riskScore: number; // 0..100
  riskBand: 'low' | 'medium' | 'high';
  confidence: number; // 0..1
  autoApprovable: boolean;
  policyVersionId: string;
  evaluatedAt: string;
  ledgerSnapshot?: {
    capKey: string;
    priorSpendMinor: number;
    allowanceMinor: number;
    remainingMinor: number;
    capPeriod: string;
    capScope: string;
  };
}

export type DuplicateMatchKind =
  | 'sha256'
  | 'order_id'
  | 'dhash'
  | 'metadata'
  | 'shared_meal';

export interface DuplicateCandidate {
  claimId: string;
  employeeId: string;
  employeeName?: string;
  expenseDate: string;
  submittedAt?: string;
  amountMinor: number;
  merchant: string;
  matchKind: DuplicateMatchKind;
  score: number; // 0..1
  evidenceText: string;
}

export interface DuplicateInfo {
  candidateClaimIds: string[];
  candidates: DuplicateCandidate[];
  highestScore: number;
  primaryMatchKind: DuplicateMatchKind;
  evidenceSummary: string;
  resolutionStatus: 'pending' | 'confirmed' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
  dismissalReason?: string;
}

export interface AuditActor {
  id: string;
  name: string;
  role: UserRole;
}

export interface AuditEvent {
  id: string;
  correlationId: string;
  orgId: string;
  expenseId: string;
  timestamp: string;
  actor: AuditActor;
  action: string; // e.g. "CLAIM_SUBMITTED", "POLICY_EVALUATED", "HUMAN_OVERRIDE", "LEDGER_REFLOW"
  entity: 'expense' | 'verdict' | 'override' | 'policy' | 'duplicate' | 'thread' | 'ledger';
  details: Record<string, any>;
  changeSummary?: string;
}

export type RuleType =
  | 'cap'
  | 'exclusion'
  | 'requirement'
  | 'threshold'
  | 'time_window'
  | 'document';

export type CapPeriod = 'per_claim' | 'day' | 'week' | 'month' | 'trip';
export type CapScope = 'employee' | 'category' | 'city' | 'global';

export interface PolicyRule {
  id: string;
  type: RuleType;
  section: string; // e.g. "Section 4.2 - Daily Meal Limits"
  title: string;
  priority: number; // lower number = higher priority
  enabled: boolean;
  sourceQuote?: string; // Exact quote from policy document
  sourceParagraphIndex?: number;
  isAmbiguous?: boolean;
  ambiguityNote?: string;
  conditions: {
    category?: string[];
    isTravel?: boolean;
    cityTier?: CityTier[];
    grade?: string[];
    department?: string[];
    minAmountMinor?: number;
    maxAmountMinor?: number;
    dayOfWeek?: number[]; // 0 = Sunday, 6 = Saturday
    merchantPattern?: string;
  };
  parameters: {
    capAmountMinor?: number;
    capPeriod?: CapPeriod;
    capScope?: CapScope;
    perAttendeeMultiplier?: boolean;
    allocateTaxTipProportionally?: boolean;
    excludedItems?: string[];
    excludedKeywords?: string[];
    requiredFields?: string[];
    thresholdLevel?: 'manager' | 'finance' | 'cfo';
    thresholdAmountMinor?: number;
    timeWindowDays?: number;
    documentTypes?: string[];
    onViolationBehavior?: 'reject' | 'cap' | 'escalate' | 'require_info';
  };
}

export interface PolicyVersion {
  id: string;
  orgId: string;
  versionNumber: number;
  status: 'draft' | 'active' | 'archived';
  name: string;
  sourceText?: string;
  rules: PolicyRule[];
  cityTiers: Record<string, CityTier>;
  settings: {
    baseCurrency: string;
    reportingMonthStartDay: number;
    lateSubmissionWindowDays: number;
    autoApproveRiskThreshold: number;
    autoApproveMinConfidence: number;
    fxRates: Record<string, number>; // currency -> multiplier to base
  };
  conflictWarnings: string[];
  dismissedWarnings?: Array<{ warningId: string; warningText: string; note: string; dismissedAt: string; dismissedBy?: string }>;
  changeNote?: string;
  createdAt: string;
  activatedAt?: string;
}

export interface PolicyAuditEntry {
  id: string;
  policyId: string;
  versionNumber: number;
  policyName: string;
  changeNote: string;
  activatedBy: string;
  activatedAt: string;
  reevaluatedPendingCount: number;
  rulesCount: number;
}

export interface PolicyGapSuggestion {
  id: string;
  issue: string;
  affectedClaimsCount: number;
  category: string;
  suggestedRule: Partial<PolicyRule>;
  explanation: string;
}

export interface StructuredConflictWarning {
  id: string;
  type: 'same_priority_caps' | 'threshold_lower_than_cap' | 'exclusion_contradiction' | 'missing_tier' | 'wording_ambiguity' | 'other';
  severity: 'warning' | 'error';
  title: string;
  description: string;
  ruleIds: string[];
  sourceQuotes: string[];
  isDismissed?: boolean;
  dismissalNote?: string;
}

export interface ThreadMessage {
  id: string;
  sender: 'system' | 'reviewer' | 'employee';
  message: string;
  timestamp: string;
  proposedPatch?: Partial<ExpenseContext> & {
    correctedFields?: Record<string, any>;
  };
  status?: 'pending' | 'accepted' | 'declined';
}

export interface ReceiptRef {
  storagePath?: string;
  previewUrl?: string;
  mimeType: string;
  originalSha256: string;
  dHash?: string;
  fileSize: number;
  rawText?: string;
}

export interface NormalizedCurrency {
  sourceCurrency: string;
  sourceAmount?: number;
  sourceAmountMinor: number;
  targetCurrency: string;
  targetAmountMinor: number;
  fxRate: number;
  fxDate: string;
  fxSource: 'printed' | 'policy' | 'static_fallback' | 'ecb_api';
  isInferred: boolean;
}

export interface IntegritySignals {
  mathMismatch: boolean;
  taxRateAnomalous: boolean;
  missingDate: boolean;
  inferredTotal: boolean;
  unitemizedBalance: number;
  handwritingDetected?: boolean;
  lowResolution?: boolean;
  tamperingSuspected?: boolean;
}

export interface Expense {
  id: string;
  orgId: string;
  employeeId: string;
  tripId?: string;
  status: ClaimStatus;
  channel: 'upload' | 'camera' | 'paste' | 'batch' | 'email';
  expenseDate: string; // YYYY-MM-DD
  submittedAt: string; // ISO
  receiptRef?: ReceiptRef;
  extracted: {
    merchant: FieldValue<string>;
    date: FieldValue<string>;
    time?: FieldValue<string>;
    total: FieldValue<number>;
    subtotal?: FieldValue<number>;
    tax?: FieldValue<number>;
    tip?: FieldValue<number>;
    currency: FieldValue<string>;
    orderId?: FieldValue<string>;
    lineItems: LineItem[];
    rawSummary?: string;
    imageQualityHints?: {
      isBlurry?: boolean;
      isHandwritten?: boolean;
      rotationDegrees?: number;
      tamperingSuspected?: boolean;
    };
  };
  corrected?: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    tip?: number;
    currency?: string;
    orderId?: string;
    lineItems?: LineItem[];
  };
  normalizedCurrency: NormalizedCurrency;
  context: ExpenseContext;
  integritySignals: IntegritySignals;
  duplicateInfo?: DuplicateInfo;
  verdict?: Verdict;
  reviewerAction?: {
    reviewerId: string;
    reviewerName: string;
    action: 'approve' | 'reject' | 'override' | 'request_info' | 'mark_paid';
    timestamp: string;
    overrideAmountMinor?: number;
    reason: string;
  };
  thread?: ThreadMessage[];
  auditTrail?: AuditEvent[];
}

export interface Trip {
  id: string;
  orgId: string;
  employeeId: string;
  name: string;
  destinationCity: string;
  cityTier: CityTier;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'planning' | 'active' | 'completed' | 'closed';
  expenseIds: string[];
  totalSpendMinor: number;
  isInferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationResult {
  simulationId: string;
  activePolicyVersionId: string;
  draftPolicyVersionId: string;
  totalExpensesEvaluated: number;
  activeTotalReimbursedMinor: number;
  draftTotalReimbursedMinor: number;
  deltaReimbursedMinor: number;
  touchlessRateActive: number;
  touchlessRateDraft: number;
  deltaTouchlessRate: number;
  changedVerdictsCount: number;
  employeeImpacts: Array<{
    employeeId: string;
    employeeName: string;
    activeApprovedMinor: number;
    draftApprovedMinor: number;
    deltaMinor: number;
  }>;
  changedClaims: Array<{
    expenseId: string;
    merchant: string;
    expenseDate: string;
    activeDecision: ClaimDecision;
    draftDecision: ClaimDecision;
    activeApprovedMinor: number;
    draftApprovedMinor: number;
    deltaReason: string;
  }>;
}
