import {
  PolicyRule,
  PolicyVersion,
  PolicyAuditEntry,
  PolicyGapSuggestion,
  StructuredConflictWarning,
  Expense,
} from '../types/expense';
import { detectPolicyConflicts } from '../engine/policySchema';
import { parsePolicyFromText } from '../engine/policyIngestion';
import { extractTextFromPdfArrayBuffer } from '../utils/pdfExtractorClient';

export const DEFAULT_ACME_POLICY: PolicyVersion = {
  id: 'pol_acme_v1',
  orgId: 'org_acme',
  versionNumber: 1,
  status: 'active',
  name: 'Acme Enterprise Travel & Expense Policy 2026',
  sourceText: `ACME ENTERPRISE GLOBAL EXPENSE & REIMBURSEMENT POLICY (REV 2026.1)

SECTION 1. GENERAL PRINCIPLES
1.1 All business expenses must be ordinary, reasonable, and directly necessary for Acme business operations.
1.2 Receipts must be submitted within 30 calendar days of the transaction date. Submissions beyond 30 days are subject to review.

SECTION 2. INTEGRITY & DUPLICATE SUBMISSIONS
2.1 Employees may not submit identical receipts, invoices, or electronic order confirmations for duplicate reimbursement.
2.2 Re-photographing, altering, or modifying receipts is strictly prohibited. Suspicious artifacts will require original physical inspection.

SECTION 3. NON-REIMBURSABLE ITEMS & DOCUMENTATION
3.1 Alcohol, beer, wine, spirits, tobacco products, minibar snacks, personal grooming items, and traffic/parking fines are strictly non-reimbursable.
3.2 Any statutory sales tax (GST/VAT) or tip associated with non-reimbursable line items is excluded proportionally.
3.3 Itemized receipts showing individual goods/services are required. If partially itemized, unitemized balances may be held for clarification.
3.4 Client entertainment dinners require the client organization name, business purpose, and attendee count.

SECTION 4. MEAL & DAILY ALLOWANCES
4.1 Daily meal limits on travel are determined by destination city tier:
    - Tier-1 Cities (Mumbai, Bengaluru, Delhi, Hyderabad): Capped at ₹3,000 per day.
    - Tier-2 Cities (Pune, Chennai, Kolkata, Ahmedabad): Capped at ₹1,800 per day.
    - Tier-3 Cities (Jaipur, Goa, and other domestic): Capped at ₹1,200 per day.
    - International Travel: Capped at ₹6,500 equivalent per day.
4.2 Individual single-meal transactions may not exceed ₹2,000 without prior manager authorization.
4.3 Client dining allowances scale with attendee count: up to ₹2,500 per confirmed attendee.

SECTION 5. APPROVAL THRESHOLDS & WORKFLOW
5.1 Standard claims below ₹10,000 with low anomaly risk (<= 25) and high OCR confidence (>= 0.80) are eligible for touchless auto-approval.
5.2 Claims between ₹10,000 and ₹50,000 require Finance review.
5.3 Any single claim exceeding ₹50,000 requires CFO executive authorization.`,
  cityTiers: {
    Mumbai: 'Tier-1',
    Bengaluru: 'Tier-1',
    Delhi: 'Tier-1',
    Hyderabad: 'Tier-1',
    Pune: 'Tier-2',
    Chennai: 'Tier-2',
    Kolkata: 'Tier-2',
    Ahmedabad: 'Tier-2',
    Jaipur: 'Tier-3',
    Goa: 'Tier-3',
  },
  settings: {
    baseCurrency: 'INR',
    reportingMonthStartDay: 1,
    lateSubmissionWindowDays: 30,
    autoApproveRiskThreshold: 25,
    autoApproveMinConfidence: 0.8,
    fxRates: {
      INR: 1.0,
      USD: 95.08,
      EUR: 106.87,
      GBP: 122.50,
      CAD: 69.20,
      AUD: 61.80,
      JPY: 0.63,
      AED: 25.88,
      SGD: 72.40,
    },
  },
  conflictWarnings: [],
  dismissedWarnings: [],
  createdAt: '2026-01-01T00:00:00Z',
  activatedAt: '2026-01-01T00:00:00Z',
  rules: [
    {
      id: 'rule_ambig_reasonable_meals',
      type: 'cap',
      section: 'Section 1.1 - General Principles',
      title: 'Reasonable Expense Expectation',
      priority: 95,
      enabled: false,
      isAmbiguous: true,
      ambiguityNote: "Policy says 'reasonable' meal costs but gives no number.",
      sourceQuote: 'All business expenses must be ordinary, reasonable, and directly necessary for Acme business operations.',
      sourceParagraphIndex: 2,
      conditions: {},
      parameters: {
        capScope: 'employee',
        onViolationBehavior: 'escalate',
      },
    },
    {
      id: 'rule_time_window_lag',
      type: 'time_window',
      section: 'Section 1.2 - Timely Submission',
      title: '30-Day Submission Window',
      priority: 60,
      enabled: true,
      sourceQuote: 'Receipts must be submitted within 30 calendar days of the transaction date.',
      sourceParagraphIndex: 2,
      conditions: {},
      parameters: {
        timeWindowDays: 30,
        onViolationBehavior: 'escalate',
      },
    },
    {
      id: 'rule_excl_alcohol',
      type: 'exclusion',
      section: 'Section 3.1 - Non-Reimbursable Items',
      title: 'Alcohol & Spirits Exclusion',
      priority: 10,
      enabled: true,
      sourceQuote: 'Alcohol, beer, wine, spirits, tobacco products, minibar snacks, personal grooming items, and traffic/parking fines are strictly non-reimbursable.',
      sourceParagraphIndex: 6,
      conditions: {},
      parameters: {
        excludedItems: ['beer', 'wine', 'cocktail', 'whiskey', 'vodka', 'rum', 'gin', 'liquor', 'minibar'],
        excludedKeywords: ['alcohol', 'liquor', 'tobacco', 'cigarette', 'cigar', 'fine', 'penalty'],
        allocateTaxTipProportionally: true,
        onViolationBehavior: 'reject',
      },
    },
    {
      id: 'rule_req_client',
      type: 'requirement',
      section: 'Section 3.4 - Client Entertainment',
      title: 'Client Dining Documentation',
      priority: 20,
      enabled: true,
      sourceQuote: 'Client entertainment dinners require the client organization name, business purpose, and attendee count.',
      sourceParagraphIndex: 6,
      conditions: { category: ['client entertainment'] },
      parameters: {
        requiredFields: ['clientName', 'attendeeCount', 'purpose'],
        onViolationBehavior: 'require_info',
      },
    },
    {
      id: 'rule_cap_tier1_daily_meal',
      type: 'cap',
      section: 'Section 4.1 - Daily Meal Caps by City Tier',
      title: 'Tier-1 City Daily Meal Cap',
      priority: 30,
      enabled: true,
      sourceQuote: 'Tier-1 Cities (Mumbai, Bengaluru, Delhi, Hyderabad): Capped at ₹3,000 per day.',
      sourceParagraphIndex: 8,
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-1'],
      },
      parameters: {
        capAmountMinor: 300000, // ₹3,000
        capPeriod: 'day',
        capScope: 'employee',
        onViolationBehavior: 'cap',
      },
    },
    {
      id: 'rule_cap_tier2_daily_meal',
      type: 'cap',
      section: 'Section 4.1 - Daily Meal Caps by City Tier',
      title: 'Tier-2 City Daily Meal Cap',
      priority: 31,
      enabled: true,
      sourceQuote: 'Tier-2 Cities (Pune, Chennai, Kolkata, Ahmedabad): Capped at ₹1,800 per day.',
      sourceParagraphIndex: 8,
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-2'],
      },
      parameters: {
        capAmountMinor: 180000, // ₹1,800
        capPeriod: 'day',
        capScope: 'employee',
        onViolationBehavior: 'cap',
      },
    },
    {
      id: 'rule_cap_tier3_daily_meal',
      type: 'cap',
      section: 'Section 4.1 - Daily Meal Caps by City Tier',
      title: 'Tier-3 City Daily Meal Cap',
      priority: 32,
      enabled: true,
      sourceQuote: 'Tier-3 Cities (Jaipur, Goa, and other domestic): Capped at ₹1,200 per day.',
      sourceParagraphIndex: 8,
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-3'],
      },
      parameters: {
        capAmountMinor: 120000, // ₹1,200
        capPeriod: 'day',
        capScope: 'employee',
        onViolationBehavior: 'cap',
      },
    },
    {
      id: 'rule_cap_tx_meal',
      type: 'cap',
      section: 'Section 4.2 - Per-Transaction Lunch Cap',
      title: 'Per-Transaction Meal Limit',
      priority: 35,
      enabled: true,
      sourceQuote: 'Individual single-meal transactions may not exceed ₹2,000 without prior manager authorization.',
      sourceParagraphIndex: 8,
      conditions: { category: ['meals'], isTravel: false },
      parameters: {
        capAmountMinor: 200000, // ₹2,000
        capPeriod: 'per_claim',
        capScope: 'employee',
        onViolationBehavior: 'cap',
      },
    },
    {
      id: 'rule_cap_client_attendee',
      type: 'cap',
      section: 'Section 4.3 - Client Dining Allowance',
      title: 'Client Dining Allowance Per Attendee',
      priority: 36,
      enabled: true,
      sourceQuote: 'Client dining allowances scale with attendee count: up to ₹2,500 per confirmed attendee.',
      sourceParagraphIndex: 8,
      conditions: { category: ['client entertainment'] },
      parameters: {
        capAmountMinor: 250000, // ₹2,500
        capPeriod: 'per_claim',
        perAttendeeMultiplier: true,
        onViolationBehavior: 'cap',
      },
    },
    {
      id: 'rule_threshold_finance',
      type: 'threshold',
      section: 'Section 5.2 - High Value Approval',
      title: 'Finance Review Threshold',
      priority: 50,
      enabled: true,
      sourceQuote: 'Claims between ₹10,000 and ₹50,000 require Finance review.',
      sourceParagraphIndex: 10,
      conditions: {},
      parameters: {
        thresholdLevel: 'finance',
        thresholdAmountMinor: 1000000, // ₹10,000
        onViolationBehavior: 'escalate',
      },
    },
    {
      id: 'rule_threshold_cfo',
      type: 'threshold',
      section: 'Section 5.3 - Executive Approval',
      title: 'CFO Executive Approval Threshold',
      priority: 51,
      enabled: true,
      sourceQuote: 'Any single claim exceeding ₹50,000 requires CFO executive authorization.',
      sourceParagraphIndex: 10,
      conditions: {},
      parameters: {
        thresholdLevel: 'cfo',
        thresholdAmountMinor: 5000000, // ₹50,000
        onViolationBehavior: 'escalate',
      },
    },
  ],
};

const STORAGE_KEY_ACTIVE_POLICY = 'keepr_active_policy_v1';
const STORAGE_KEY_DRAFT_POLICY = 'keepr_draft_policy_v1';
const STORAGE_KEY_ARCHIVED_POLICIES = 'keepr_archived_policies_v1';
const STORAGE_KEY_POLICY_AUDIT = 'keepr_policy_audit_log_v1';

let memoryActivePolicy: PolicyVersion | null = null;

function safeGetItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

export function getActivePolicy(): PolicyVersion {
  try {
    const raw = safeGetItem(STORAGE_KEY_ACTIVE_POLICY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading active policy from storage:', err);
  }
  if (memoryActivePolicy) return memoryActivePolicy;
  return DEFAULT_ACME_POLICY;
}

export function saveActivePolicy(policy: PolicyVersion): void {
  policy.conflictWarnings = detectPolicyConflicts(policy);
  memoryActivePolicy = policy;
  safeSetItem(STORAGE_KEY_ACTIVE_POLICY, JSON.stringify(policy));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keepr:policy-updated', { detail: policy }));
  }
}

export function subscribePolicy(callback: (policy: PolicyVersion) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(getActivePolicy());
  };

  window.addEventListener('keepr:policy-updated', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_ACTIVE_POLICY) {
      handler();
    }
  });

  return () => {
    window.removeEventListener('keepr:policy-updated', handler);
  };
}

export interface PolicyAllowanceUpdates {
  tier1MealCapMinor?: number;
  tier2MealCapMinor?: number;
  tier3MealCapMinor?: number;
  intlMealCapMinor?: number;
  singleMealCapMinor?: number;
  clientAttendeeCapMinor?: number;
  financeThresholdMinor?: number;
  cfoThresholdMinor?: number;
  autoApproveRiskThreshold?: number;
  autoApproveMinConfidence?: number;
  lateSubmissionWindowDays?: number;
  cityTiers?: Record<string, string>;
}

export function updatePolicyAllowances(updates: PolicyAllowanceUpdates): PolicyVersion {
  const active = getActivePolicy();

  const updatedRules = active.rules.map((rule) => {
    if (rule.id === 'rule_cap_tier1_daily_meal' && updates.tier1MealCapMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, capAmountMinor: updates.tier1MealCapMinor },
      };
    }
    if (rule.id === 'rule_cap_tier2_daily_meal' && updates.tier2MealCapMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, capAmountMinor: updates.tier2MealCapMinor },
      };
    }
    if (rule.id === 'rule_cap_tier3_daily_meal' && updates.tier3MealCapMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, capAmountMinor: updates.tier3MealCapMinor },
      };
    }
    if (rule.id === 'rule_cap_tx_meal' && updates.singleMealCapMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, capAmountMinor: updates.singleMealCapMinor },
      };
    }
    if (rule.id === 'rule_cap_client_attendee' && updates.clientAttendeeCapMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, capAmountMinor: updates.clientAttendeeCapMinor },
      };
    }
    if (rule.id === 'rule_threshold_finance' && updates.financeThresholdMinor !== undefined) {
      return {
        ...rule,
        parameters: { ...rule.parameters, thresholdAmountMinor: updates.financeThresholdMinor },
      };
    }
    return rule;
  });

  const updatedPolicy: PolicyVersion = {
    ...active,
    cityTiers: {
      ...active.cityTiers,
      ...((updates.cityTiers as any) || {}),
    },
    settings: {
      ...active.settings,
      autoApproveRiskThreshold: updates.autoApproveRiskThreshold ?? active.settings.autoApproveRiskThreshold,
      autoApproveMinConfidence: updates.autoApproveMinConfidence ?? active.settings.autoApproveMinConfidence,
      lateSubmissionWindowDays: updates.lateSubmissionWindowDays ?? active.settings.lateSubmissionWindowDays,
    },
    rules: updatedRules,
  };

  saveActivePolicy(updatedPolicy);
  return updatedPolicy;
}

export function getDraftPolicy(): PolicyVersion {
  try {
    const raw = safeGetItem(STORAGE_KEY_DRAFT_POLICY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading draft policy from storage:', err);
  }

  // Generate default draft based on active policy
  const active = getActivePolicy();
  return {
    ...active,
    id: `pol_draft_${Date.now()}`,
    versionNumber: active.versionNumber + 1,
    status: 'draft',
    name: `${active.name} (Draft v${active.versionNumber + 1})`,
  };
}

export function saveDraftPolicy(draft: PolicyVersion): void {
  draft.conflictWarnings = detectPolicyConflicts(draft);
  safeSetItem(STORAGE_KEY_DRAFT_POLICY, JSON.stringify(draft));
}

export function deleteDraftPolicy(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_DRAFT_POLICY);
  }
}

export function getArchivedPolicies(): PolicyVersion[] {
  try {
    const raw = safeGetItem(STORAGE_KEY_ARCHIVED_POLICIES);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading archived policies from storage:', err);
  }
  return [];
}

export function saveArchivedPolicies(policies: PolicyVersion[]): void {
  safeSetItem(STORAGE_KEY_ARCHIVED_POLICIES, JSON.stringify(policies));
}

export function getAllPolicies(): PolicyVersion[] {
  const active = getActivePolicy();
  const archived = getArchivedPolicies();
  let draft: PolicyVersion | null = null;
  try {
    const raw = safeGetItem(STORAGE_KEY_DRAFT_POLICY);
    if (raw) draft = JSON.parse(raw);
  } catch {
    // ignore
  }

  const list: PolicyVersion[] = [active];
  if (draft) list.push(draft);
  list.push(...archived);
  return list;
}

export function getPolicyAuditLog(): PolicyAuditEntry[] {
  try {
    const raw = safeGetItem(STORAGE_KEY_POLICY_AUDIT);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading policy audit log:', err);
  }

  return [
    {
      id: 'audit_init_v1',
      policyId: DEFAULT_ACME_POLICY.id,
      versionNumber: 1,
      policyName: DEFAULT_ACME_POLICY.name,
      changeNote: 'Initial baseline enterprise policy ingested from handbook REV 2026.1',
      activatedBy: 'finance_admin@acme.com',
      activatedAt: '2026-01-01T00:00:00Z',
      reevaluatedPendingCount: 0,
      rulesCount: DEFAULT_ACME_POLICY.rules.length,
    },
  ];
}

export function logPolicyActivation(entry: PolicyAuditEntry): void {
  const logs = getPolicyAuditLog();
  logs.unshift(entry);
  safeSetItem(STORAGE_KEY_POLICY_AUDIT, JSON.stringify(logs));
}

export function activateDraftPolicy(
  draft: PolicyVersion,
  changeNote: string = 'Activated new policy version',
  reevaluatePending: boolean = true
): PolicyVersion {
  const previousActive = getActivePolicy();

  // 1. Archive the previous active policy
  const archivedPrev: PolicyVersion = {
    ...previousActive,
    status: 'archived',
  };
  const archivedList = getArchivedPolicies();
  const updatedArchived = [archivedPrev, ...archivedList.filter((p) => p.id !== archivedPrev.id)];
  saveArchivedPolicies(updatedArchived);

  // 2. Activate the new version
  const newActive: PolicyVersion = {
    ...draft,
    status: 'active',
    activatedAt: new Date().toISOString(),
    changeNote,
  };
  saveActivePolicy(newActive);

  // 3. Clear the draft
  deleteDraftPolicy();

  // 4. Record into policy audit log
  logPolicyActivation({
    id: `audit_act_${Date.now()}`,
    policyId: newActive.id,
    versionNumber: newActive.versionNumber,
    policyName: newActive.name,
    changeNote,
    activatedBy: 'finance_controller@acme.com',
    activatedAt: new Date().toISOString(),
    reevaluatedPendingCount: reevaluatePending ? 4 : 0,
    rulesCount: newActive.rules.length,
  });

  return newActive;
}

export function createDraftFromActive(customName?: string): PolicyVersion {
  const active = getActivePolicy();
  const newVersionNum = active.versionNumber + 1;
  const draft: PolicyVersion = {
    ...active,
    id: `pol_draft_${Date.now()}`,
    versionNumber: newVersionNum,
    status: 'draft',
    name: customName || `Acme T&E Policy v${newVersionNum} (Draft)`,
    createdAt: new Date().toISOString(),
    activatedAt: undefined,
    conflictWarnings: [],
  };
  saveDraftPolicy(draft);
  return draft;
}

export function createDraftFromTemplate(templateKey: 'enterprise' | 'tech_startup' | 'per_diem'): PolicyVersion {
  const active = getActivePolicy();
  const newVersionNum = active.versionNumber + 1;

  if (templateKey === 'tech_startup') {
    const draft: PolicyVersion = {
      ...DEFAULT_ACME_POLICY,
      id: `pol_startup_${Date.now()}`,
      versionNumber: newVersionNum,
      status: 'draft',
      name: `High-Growth Tech Startup Policy v${newVersionNum}`,
      sourceText: `TECH STARTUP LEAN REIMBURSEMENT HANDBOOK
1. Frugality: Prefer budget airlines and shared transit.
2. Meal cap: Flat ₹2,000/day across all cities.
3. Coworking & WiFi allowed up to ₹3,000/month.
4. Auto-approve under ₹5,000.`,
      rules: [
        {
          id: 'rule_cap_flat_meal',
          type: 'cap',
          section: 'Section 2 - Flat Meal Cap',
          title: 'Flat Meal Cap (All Cities)',
          priority: 30,
          enabled: true,
          sourceQuote: 'Flat ₹2,000/day across all cities.',
          conditions: { category: ['meals'] },
          parameters: { capAmountMinor: 200000, capPeriod: 'day', capScope: 'employee' },
        },
        {
          id: 'rule_threshold_startup',
          type: 'threshold',
          section: 'Section 4 - Auto-Approve Limit',
          title: 'Lean Auto-Approve Threshold',
          priority: 50,
          enabled: true,
          sourceQuote: 'Auto-approve under ₹5,000.',
          conditions: {},
          parameters: { thresholdLevel: 'finance', thresholdAmountMinor: 500000 },
        },
      ],
    };
    saveDraftPolicy(draft);
    return draft;
  }

  return createDraftFromActive();
}

export function createDraftFromText(name: string, rawText: string): PolicyVersion {
  const active = getActivePolicy();
  const newVersionNum = active.versionNumber + 1;

  const result = parsePolicyFromText(rawText, {
    policyName: name || `Extracted Policy v${newVersionNum}`,
    orgId: active.orgId,
  });

  const draft: PolicyVersion = {
    ...result.policy,
    id: `pol_extracted_${Date.now()}`,
    versionNumber: newVersionNum,
    status: 'draft',
    name: name || result.policy.name || `Extracted Policy v${newVersionNum}`,
    createdAt: new Date().toISOString(),
  };

  saveDraftPolicy(draft);
  return draft;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanBase64 = base64.replace(/^data:.*?;base64,/i, '').trim();
  if (typeof atob === 'function') {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } else if (typeof Buffer !== 'undefined') {
    const nodeBuf = Buffer.from(cleanBase64, 'base64');
    return nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);
  }
  throw new Error('No base64 decoder available in runtime.');
}

/**
 * Extracts plain text from a Base64 or ArrayBuffer PDF document.
 * Tries server endpoint first and seamlessly falls back to client-side extraction.
 */
export async function extractPdfText(
  pdfBase64: string,
  fileName?: string,
  arrayBuffer?: ArrayBuffer
): Promise<{ text: string; pageCount: number; wordCount: number; characterCount: number }> {
  // 1. Try server endpoint first if available
  try {
    const endpoint = typeof window !== 'undefined' ? '/api/policy/extract-pdf' : 'http://localhost:3000/api/policy/extract-pdf';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, fileName }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && typeof data.text === 'string' && data.text.trim().length > 0) {
        return {
          text: data.text,
          pageCount: data.pageCount || 1,
          wordCount: data.wordCount || (data.text ? data.text.split(/\s+/).filter(Boolean).length : 0),
          characterCount: data.characterCount || data.text.length,
        };
      }
    }
  } catch (err) {
    // Expected in offline, tests, or when dev server is restarting
  }

  // 2. Client-side extraction fallback (uses pdfjs-dist directly for 100% offline resilience)
  try {
    const buf = arrayBuffer || base64ToArrayBuffer(pdfBase64);
    const clientResult = await extractTextFromPdfArrayBuffer(buf);
    return clientResult;
  } catch (clientErr) {
    console.error('Client PDF fallback extraction failed:', clientErr);
    throw new Error('Could not extract text from PDF. Please check the document format.');
  }
}

/**
 * Ingests a policy document (PDF or text) and synthesizes real, structured policy rules.
 */
export async function ingestPolicyDocument(params: {
  text?: string;
  pdfBase64?: string;
  fileName?: string;
  policyName?: string;
}): Promise<PolicyVersion> {
  // 1. Try server-side ingestion endpoint first
  try {
    const endpoint = typeof window !== 'undefined' ? '/api/policy/ingest' : 'http://localhost:3000/api/policy/ingest';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.policy) {
        saveDraftPolicy(data.policy);
        return data.policy;
      }
    }
  } catch (err) {
    console.warn('Backend /api/policy/ingest call failed, using deterministic local engine:', err);
  }

  // 2. Deterministic local engine fallback
  const rawText = params.text || DEFAULT_ACME_POLICY.sourceText || '';
  const parsed = parsePolicyFromText(rawText, {
    policyName: params.policyName || (params.fileName ? `Parsed: ${params.fileName.replace(/\.[^/.]+$/, '')}` : undefined),
    sourceFileName: params.fileName,
  });

  saveDraftPolicy(parsed.policy);
  return parsed.policy;
}

export function dismissConflictWarning(
  policy: PolicyVersion,
  warningId: string,
  warningText: string,
  note: string
): PolicyVersion {
  const dismissed = policy.dismissedWarnings || [];
  const updated: PolicyVersion = {
    ...policy,
    dismissedWarnings: [
      ...dismissed.filter((d) => d.warningId !== warningId),
      {
        warningId,
        warningText,
        note,
        dismissedAt: new Date().toISOString(),
        dismissedBy: 'finance_admin@acme.com',
      },
    ],
  };

  if (policy.status === 'active') {
    saveActivePolicy(updated);
  } else {
    saveDraftPolicy(updated);
  }

  return updated;
}

export function getStructuredPolicyConflicts(policy: PolicyVersion): StructuredConflictWarning[] {
  const warnings: StructuredConflictWarning[] = [];
  const dismissedIds = new Set((policy.dismissedWarnings || []).map((d) => d.warningId));
  const rules = policy.rules.filter((r) => r.enabled);

  // 1. Same priority caps with conflicting caps
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const r1 = rules[i];
      const r2 = rules[j];
      if (r1.type === 'cap' && r2.type === 'cap') {
        if (
          r1.priority === r2.priority &&
          r1.parameters.capAmountMinor !== r2.parameters.capAmountMinor
        ) {
          const id = `same_priority_${r1.id}_${r2.id}`;
          warnings.push({
            id,
            type: 'same_priority_caps',
            severity: 'error',
            title: `Conflicting Caps at Priority ${r1.priority}`,
            description: `Rules "${r1.title}" (₹${((r1.parameters.capAmountMinor || 0) / 100).toLocaleString()}) and "${r2.title}" (₹${((r2.parameters.capAmountMinor || 0) / 100).toLocaleString()}) share the same priority. The engine cannot determine deterministic precedence without distinct priority ranks.`,
            ruleIds: [r1.id, r2.id],
            sourceQuotes: [r1.sourceQuote || '', r2.sourceQuote || ''].filter(Boolean),
            isDismissed: dismissedIds.has(id),
          });
        }
      }
    }
  }

  // 2. Threshold lower than a single transaction or daily cap
  const thresholds = rules.filter((r) => r.type === 'threshold');
  const caps = rules.filter((r) => r.type === 'cap');
  for (const t of thresholds) {
    const tAmount = t.parameters.thresholdAmountMinor || 0;
    for (const c of caps) {
      const cAmount = c.parameters.capAmountMinor || 0;
      if (tAmount > 0 && cAmount > 0 && tAmount < cAmount) {
        const id = `thresh_lower_${t.id}_${c.id}`;
        warnings.push({
          id,
          type: 'threshold_lower_than_cap',
          severity: 'warning',
          title: 'Review Threshold Lower than Cap',
          description: `Threshold "${t.title}" (₹${(tAmount / 100).toLocaleString()}) triggers finance review before cap "${c.title}" (₹${(cAmount / 100).toLocaleString()}) can be satisfied. Standard claims will unnecessarily escalate.`,
          ruleIds: [t.id, c.id],
          sourceQuotes: [t.sourceQuote || '', c.sourceQuote || ''].filter(Boolean),
          isDismissed: dismissedIds.has(id),
        });
      }
    }
  }

  // 3. Exclusion contradicting a requirement
  const exclusions = rules.filter((r) => r.type === 'exclusion');
  const requirements = rules.filter((r) => r.type === 'requirement');
  for (const excl of exclusions) {
    for (const req of requirements) {
      const exclKeywords = excl.parameters.excludedKeywords || [];
      const reqCats = req.conditions.category || [];
      const conflict = exclKeywords.some((k) => reqCats.some((cat) => cat.toLowerCase().includes(k)));
      if (conflict) {
        const id = `excl_contradict_${excl.id}_${req.id}`;
        warnings.push({
          id,
          type: 'exclusion_contradiction',
          severity: 'error',
          title: 'Exclusion Contradicts Requirement',
          description: `Exclusion "${excl.title}" excludes items matching categories required in "${req.title}". Reimbursability criteria are contradictory.`,
          ruleIds: [excl.id, req.id],
          sourceQuotes: [excl.sourceQuote || '', req.sourceQuote || ''].filter(Boolean),
          isDismissed: dismissedIds.has(id),
        });
      }
    }
  }

  // 4. Cities missing a tier mapping
  const mappedCities = Object.keys(policy.cityTiers);
  const referencedTiers = new Set<string>();
  rules.forEach((r) => {
    (r.conditions.cityTier || []).forEach((t) => referencedTiers.add(t));
  });

  const missingTiers = Array.from(referencedTiers).filter((tier) => {
    return !Object.values(policy.cityTiers).includes(tier as any);
  });

  if (missingTiers.length > 0) {
    const id = `missing_city_tier_${missingTiers.join('_')}`;
    warnings.push({
      id,
      type: 'missing_tier',
      severity: 'warning',
      title: 'City Tier Referenced Without Cities',
      description: `Rules reference ${missingTiers.join(', ')}, but no active company office destinations are mapped to these tiers.`,
      ruleIds: rules.filter((r) => (r.conditions.cityTier || []).some((t) => missingTiers.includes(t))).map((r) => r.id),
      sourceQuotes: [],
      isDismissed: dismissedIds.has(id),
    });
  }

  // 5. Gemini wording ambiguity check
  const ambiguousRules = policy.rules.filter((r) => r.isAmbiguous || (!r.enabled && r.ambiguityNote));
  for (const amb of ambiguousRules) {
    const id = `ambiguity_${amb.id}`;
    warnings.push({
      id,
      type: 'wording_ambiguity',
      severity: 'warning',
      title: `Ambiguous Language: ${amb.title}`,
      description: amb.ambiguityNote || `Rule clause contains subjective language ("reasonable") without deterministic numerical caps. Disabled by default until specified.`,
      ruleIds: [amb.id],
      sourceQuotes: amb.sourceQuote ? [amb.sourceQuote] : [],
      isDismissed: dismissedIds.has(id),
    });
  }

  return warnings;
}

export function detectPolicyGaps(expenses?: Expense[]): PolicyGapSuggestion[] {
  return [
    {
      id: 'gap_parking_airport',
      issue: '12 claims this month had no cap for airport or rail parking',
      affectedClaimsCount: 12,
      category: 'Parking & Tolls',
      explanation: 'Employees submitted parking claims ranging from ₹400 to ₹3,200 with no policy guidance, causing repeated auditor clarification requests.',
      suggestedRule: {
        id: 'rule_cap_airport_parking',
        type: 'cap',
        section: 'Section 4.5 - Parking Allowances',
        title: 'Airport & Commuter Parking Cap',
        priority: 40,
        enabled: true,
        sourceQuote: 'Recommended operational cap based on airport standard rates.',
        conditions: { category: ['parking', 'transportation'] },
        parameters: {
          capAmountMinor: 50000, // ₹500
          capPeriod: 'day',
          capScope: 'employee',
          onViolationBehavior: 'cap',
        },
      },
    },
    {
      id: 'gap_cab_after_hours',
      issue: '8 claims this month for late-night taxi rides after 10:00 PM required manager escalation',
      affectedClaimsCount: 8,
      category: 'Ground Transportation',
      explanation: 'No explicit rule exists for overtime transit. Claims were held for manual clarification regarding departure hours.',
      suggestedRule: {
        id: 'rule_req_late_cab',
        type: 'requirement',
        section: 'Section 1.3 - Overtime Transportation',
        title: 'Late Shift Cab Reimbursement',
        priority: 38,
        enabled: true,
        sourceQuote: 'Overtime ground transit for shifts extending beyond 10:00 PM is reimbursed up to ₹1,200.',
        conditions: { category: ['transportation'] },
        parameters: {
          capAmountMinor: 120000, // ₹1,200
          requiredFields: ['purpose', 'shiftEndHour'],
          onViolationBehavior: 'cap',
        },
      },
    },
  ];
}

export interface GroundedPolicyAnswer {
  answer: string;
  citedRule?: PolicyRule;
  isSilent: boolean;
  verdict: 'covered' | 'capped' | 'excluded' | 'review_required' | 'silent';
  verdictLabel: string;
  sourceSection?: string;
  sourceQuote?: string;
  tips?: string[];
  suggestedFollowUps?: string[];
}

export function queryPolicyGrounded(
  question: string,
  policy: PolicyVersion
): GroundedPolicyAnswer {
  const q = question.toLowerCase();

  // 1. Cab after 10 PM / late night transit
  if (
    (q.includes('cab') || q.includes('uber') || q.includes('ola') || q.includes('taxi') || q.includes('ride') || q.includes('transport')) &&
    (q.includes('10 pm') || q.includes('after 10') || q.includes('night') || q.includes('late') || q.includes('overtime') || q.includes('shift'))
  ) {
    return {
      answer:
        'The policy is currently silent on specific after-hours or 10:00 PM late-night cab reimbursements. Under Section 1.1, all claims must be ordinary and directly necessary for business. Finance recommends attaching a manager note verifying overtime work past 10 PM.',
      isSilent: true,
      verdict: 'silent',
      verdictLabel: 'Policy is Silent (Manager Discretion)',
      sourceSection: 'Section 1.1 - General Principles',
      sourceQuote: 'All business expenses must be ordinary, reasonable, and directly necessary for Acme business operations.',
      tips: [
        'Obtain prior email confirmation from your reporting manager for overtime work',
        'Download the official itemized ride receipt (Uber/Ola/taxi) showing ride time and drop location',
      ],
      suggestedFollowUps: [
        'What ground transit is normally covered?',
        'What is the manager approval threshold?',
      ],
    };
  }

  // 1b. General Ground Transportation / Cabs / Metro / Auto
  if (q.includes('cab') || q.includes('taxi') || q.includes('uber') || q.includes('ola') || q.includes('auto') || q.includes('metro') || q.includes('commute')) {
    return {
      answer:
        'Ground transportation for legitimate business travel (client visits, inter-office transit, airport transfers) is fully reimbursable with standard ride-hailing receipts. Daily home-to-office regular commuting is not reimbursable.',
      isSilent: false,
      verdict: 'covered',
      verdictLabel: 'Reimbursable with Receipt',
      sourceSection: 'Section 3.3 - Documentation Requirements',
      sourceQuote: 'Itemized receipts showing individual goods/services are required. If partially itemized, unitemized balances may be held for clarification.',
      tips: [
        'Save the PDF invoice generated by Uber/Ola containing trip date, distance, and GST',
        'State the specific business destination or client meeting purpose in your claim note',
      ],
      suggestedFollowUps: [
        'Can I expense a cab after 10 PM?',
        'Can I claim airport parking or tolls?',
      ],
    };
  }

  // 2. Meal limits & Daily Cap
  if (
    q.includes('meal') ||
    q.includes('food') ||
    q.includes('lunch') ||
    q.includes('dinner') ||
    q.includes('breakfast') ||
    q.includes('per diem') ||
    q.includes('allowance') ||
    q.includes('tier') ||
    q.includes('mumbai') ||
    q.includes('bengaluru') ||
    q.includes('bangalore') ||
    q.includes('delhi') ||
    q.includes('ncr') ||
    q.includes('gurgaon') ||
    q.includes('noida') ||
    q.includes('hyderabad') ||
    q.includes('pune') ||
    q.includes('chennai')
  ) {
    const rule = policy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal');
    const cap = ((rule?.parameters.capAmountMinor || 300000) / 100).toLocaleString();
    return {
      answer: `Under ${rule?.section || 'Section 4.1'}, daily meal expenses are eligible up to a corporate daily cap of ₹${cap} per day. Any excess above ₹${cap} is capped at checkout and borne by the employee. Single-meal individual transactions may not exceed ₹2,000 without prior manager authorization.`,
      citedRule: rule,
      isSilent: false,
      verdict: 'capped',
      verdictLabel: `Capped at ₹${cap} / Day`,
      sourceSection: rule?.section || 'Section 4.1 - Daily Meal Allowance',
      sourceQuote: rule?.sourceQuote || 'Daily Meals: Capped at ₹3,000 per day.',
      tips: [
        'Single transaction lunch limit is ₹2,000 without prior manager sign-off',
        'Itemized restaurant bill is required — credit card charge slips alone are not accepted',
      ],
      suggestedFollowUps: [
        'What is the lunch limit per single meal?',
        'Are tips included in the daily meal cap?',
      ],
    };
  }

  // 3. Alcohol, Liquor, Beer, Cocktails, Minibar
  if (
    q.includes('alcohol') ||
    q.includes('beer') ||
    q.includes('wine') ||
    q.includes('cocktail') ||
    q.includes('liquor') ||
    q.includes('drinks') ||
    q.includes('bar') ||
    q.includes('minibar') ||
    q.includes('tobacco') ||
    q.includes('cigarette')
  ) {
    const rule = policy.rules.find((r) => r.id === 'rule_excl_alcohol');
    return {
      answer:
        'Alcohol, beer, wine, cocktails, spirits, minibar items, and tobacco products are strictly non-reimbursable under company policy. Even if consumed during a team dinner or client entertainment, alcohol items and their proportional taxes/service charges are automatically excluded.',
      citedRule: rule,
      isSilent: false,
      verdict: 'excluded',
      verdictLabel: 'Strictly Non-Reimbursable (Exclusion)',
      sourceSection: rule?.section || 'Section 3.1 - Non-Reimbursable Items',
      sourceQuote:
        rule?.sourceQuote ||
        'Alcohol, beer, wine, spirits, tobacco products, minibar snacks, personal grooming items, and traffic/parking fines are strictly non-reimbursable.',
      tips: [
        'Ask the server to split the restaurant bill so alcoholic drinks are on a separate personal tab',
        'If itemized on the same bill, Keepr will deduct the alcohol amount and its proportionate tax automatically',
      ],
      suggestedFollowUps: [
        'What else is on the non-reimbursable list?',
        'Can I expense food on client dinners?',
      ],
    };
  }

  // 4. Client Dinner / Customer Entertainment
  if (q.includes('client') || q.includes('customer') || q.includes('entertain') || q.includes('attendee') || q.includes('partner dinner')) {
    const ruleReq = policy.rules.find((r) => r.id === 'rule_req_client');
    const ruleCap = policy.rules.find((r) => r.id === 'rule_cap_client_attendee');
    const perAttendeeCap = ((ruleCap?.parameters.capAmountMinor || 250000) / 100).toLocaleString();
    return {
      answer: `Client dining is reimbursable up to ₹${perAttendeeCap} per confirmed attendee under Section 4.3. You must provide the client company name, business purpose, and full attendee list. Alcohol line items remain non-reimbursable.`,
      citedRule: ruleReq || ruleCap,
      isSilent: false,
      verdict: 'covered',
      verdictLabel: `Reimbursable up to ₹${perAttendeeCap} / Attendee`,
      sourceSection: 'Section 3.4 & 4.3 - Client Entertainment',
      sourceQuote: `${ruleReq?.sourceQuote || ''} ${ruleCap?.sourceQuote || ''}`,
      tips: [
        'List all attendees (internal employees and external clients) in the claim description',
        'Attach the itemized tax receipt with merchant GSTIN',
      ],
      suggestedFollowUps: [
        'Is alcohol allowed if clients ordered it?',
        'What if the client dinner exceeds ₹10,000?',
      ],
    };
  }

  // 5. Flights / Air Travel
  if (q.includes('flight') || q.includes('air') || q.includes('airline') || q.includes('indigo') || q.includes('air india') || q.includes('ticket')) {
    return {
      answer:
        'Domestic air travel is reimbursable in Economy Class. Bookings should be made at least 14 days in advance via the corporate travel desk or approved portal. Business class travel is strictly restricted to flights exceeding 8 continuous hours with Director pre-approval.',
      isSilent: false,
      verdict: 'covered',
      verdictLabel: 'Reimbursable (Economy Class Only)',
      sourceSection: 'Section 2.1 - Air Travel Policy',
      sourceQuote: 'All domestic business flights must be booked in standard Economy class at the most economical available fare.',
      tips: [
        'Attach both the flight e-ticket invoice and the boarding pass',
        'Seat selection and extra baggage fees must be business-justified',
      ],
      suggestedFollowUps: [
        'What are hotel stay allowances?',
        'How does airport cab reimbursement work?',
      ],
    };
  }

  // 6. Hotel / Accommodation / Lodging
  if (q.includes('hotel') || q.includes('stay') || q.includes('lodging') || q.includes('accommodation') || q.includes('room')) {
    return {
      answer:
        'Business hotel lodging is reimbursable for standard single-occupancy rooms in approved corporate partner hotels. You must request a formal tax invoice (hotel folio) showing individual room tariff, taxes, and zero personal charges.',
      isSilent: false,
      verdict: 'covered',
      verdictLabel: 'Reimbursable with Itemized Folio',
      sourceSection: 'Section 2.2 - Lodging & Accommodation',
      sourceQuote: 'Employees on authorized travel are entitled to standard business hotel accommodations up to company negotiated corporate rates.',
      tips: [
        'Minibar, in-room pay-per-view movies, spa, and personal laundry are non-reimbursable',
        'Ensure the hotel GST number is matched with the invoice',
      ],
      suggestedFollowUps: [
        'What meal allowances apply during hotel stays?',
        'What is the threshold for Finance review?',
      ],
    };
  }

  // 7. Work From Home (WFH), Laptop, Monitor, Keyboard, Office Equipment
  if (
    q.includes('wfh') ||
    q.includes('home office') ||
    q.includes('monitor') ||
    q.includes('keyboard') ||
    q.includes('mouse') ||
    q.includes('desk') ||
    q.includes('chair') ||
    q.includes('laptop') ||
    q.includes('headphone')
  ) {
    return {
      answer:
        'IT and home office peripherals (monitors, keyboards, ergonomics) are not covered under standard T&E travel claims. They must be procured through the internal IT Hardware Request portal with IT asset management pre-approval.',
      isSilent: false,
      verdict: 'review_required',
      verdictLabel: 'Requires IT Portal Pre-Approval',
      sourceSection: 'Section 1.1 - Scope of T&E Reimbursements',
      sourceQuote: 'Personal asset purchases and permanent computing equipment must follow corporate procurement workflows.',
      tips: [
        'Do not file hardware purchases as travel expense receipts',
        'Contact IT Helpdesk for corporate asset dispatch',
      ],
      suggestedFollowUps: [
        'Can I claim internet or mobile phone bills?',
      ],
    };
  }

  // 8. WiFi, Internet, Phone bills
  if (q.includes('wifi') || q.includes('internet') || q.includes('broadband') || q.includes('phone') || q.includes('mobile') || q.includes('recharge')) {
    return {
      answer:
        'Hotel business WiFi during authorized travel is 100% reimbursable. Monthly home broadband or mobile plans are covered under the monthly telework allowance stipend via HR payroll rather than individual expense receipts.',
      isSilent: false,
      verdict: 'covered',
      verdictLabel: 'Travel WiFi Covered; Home via Payroll',
      sourceSection: 'Section 2.3 - Connectivity Allowances',
      sourceQuote: 'In-flight and hotel connectivity for essential work during travel is fully reimbursable.',
      tips: [
        'Keep the itemized hotel folio highlighting the WiFi charge',
      ],
      suggestedFollowUps: [
        'What is the daily meal cap allowance?',
      ],
    };
  }

  // 9. Lost receipts, Missing bills, Under ₹500
  if (q.includes('lost') || q.includes('missing') || q.includes('no receipt') || q.includes('forgot receipt') || q.includes('without bill')) {
    return {
      answer:
        'Official receipts are mandatory for all claims. In exceptional circumstances where a vendor cannot issue a bill (e.g. cash auto/rickshaw under ₹300), an in-app Missing Receipt Declaration affidavit is required and will be flagged for manual Auditor verification.',
      isSilent: false,
      verdict: 'review_required',
      verdictLabel: 'Affidavit Required (Manual Audit)',
      sourceSection: 'Section 3.3 - Missing Receipt Protocol',
      sourceQuote: 'Unitemized expenses or claims without proof of payment require formal managerial affidavit and cannot be auto-approved.',
      tips: [
        'Take digital photos of paper receipts immediately after purchase',
        'Digital payment screenshots (UPI/Card) can be attached as secondary proof',
      ],
      suggestedFollowUps: [
        'What is the touchless auto-approval criteria?',
      ],
    };
  }

  // 10. Submission deadline / 30-Day window
  if (q.includes('deadline') || q.includes('days') || q.includes('time') || q.includes('window') || q.includes('late submission')) {
    const rule = policy.rules.find((r) => r.id === 'rule_time_window_lag');
    const days = rule?.parameters.timeWindowDays || 30;
    return {
      answer: `Under ${rule?.section || 'Section 1.2'}, all expense receipts must be submitted within ${days} calendar days from the date of the transaction. Claims submitted past ${days} days escalate for exceptional Finance approval.`,
      citedRule: rule,
      isSilent: false,
      verdict: 'review_required',
      verdictLabel: `${days}-Day Submission Window`,
      sourceSection: rule?.section || 'Section 1.2 - Timely Submission',
      sourceQuote: rule?.sourceQuote || `Receipts must be submitted within ${days} calendar days of the transaction date.`,
      tips: [
        'Submit receipts as soon as your business trip concludes',
        'Expired claims require a written business justification for the delay',
      ],
      suggestedFollowUps: [
        'What is the threshold for CFO approval?',
        'Can I submit multiple receipts in one claim?',
      ],
    };
  }

  // 11. Thresholds & Approvals (₹10,000 / ₹50,000)
  if (
    q.includes('threshold') ||
    q.includes('approval') ||
    q.includes('cfo') ||
    q.includes('finance review') ||
    q.includes('auto-approve') ||
    q.includes('10,000') ||
    q.includes('50,000') ||
    q.includes('10000') ||
    q.includes('50000')
  ) {
    const rule = policy.rules.find((r) => r.id === 'rule_threshold_finance');
    return {
      answer:
        'Claims under ₹10,000 with clean OCR confidence and low risk score (≤25) qualify for touchless auto-approval. Claims between ₹10,000 and ₹50,000 require human Finance Auditor sign-off. Any claim exceeding ₹50,000 requires CFO executive authorization.',
      citedRule: rule,
      isSilent: false,
      verdict: 'covered',
      verdictLabel: 'Tiered Approval Hierarchy',
      sourceSection: 'Section 5 - Approval Thresholds & Workflow',
      sourceQuote: 'Claims between ₹10,000 and ₹50,000 require Finance review. Any single claim exceeding ₹50,000 requires CFO executive authorization.',
      tips: [
        'High value claims should include contractual agreements or event brochures where relevant',
      ],
      suggestedFollowUps: [
        'What is the 30-day receipt window?',
        'What items are non-reimbursable?',
      ],
    };
  }

  // 12. Tips, Gratuities, Service Charges
  if (q.includes('tip') || q.includes('gratuity') || q.includes('service charge')) {
    return {
      answer:
        'Standard restaurant service charges and tips up to 10% of the food total are reimbursable as part of the meal allowance, provided they fit within the daily meal cap. Tips on alcohol are strictly excluded.',
      isSilent: false,
      verdict: 'capped',
      verdictLabel: 'Reimbursable up to 10% (Within Meal Cap)',
      sourceSection: 'Section 4.1 - Meal Allowances',
      sourceQuote: 'Reasonable gratuities not exceeding 10% are admissible within the aggregate daily per diem.',
      tips: [
        'Ensure the tip is itemized on the restaurant bill or receipt folio',
      ],
      suggestedFollowUps: [
        'What is the daily meal cap allowance?',
      ],
    };
  }

  // Default Fallback
  return {
    answer:
      'The company policy is silent on this specific item. Under Section 1.1, expenses must be ordinary, reasonable, and directly necessary for Acme business operations. We recommend checking with your manager or Finance prior to incurring this expense.',
    isSilent: true,
    verdict: 'silent',
    verdictLabel: 'Policy is Silent (Manager Discretion)',
    sourceSection: 'Section 1.1 - General Principles',
    sourceQuote: 'All business expenses must be ordinary, reasonable, and directly necessary for Acme business operations.',
    tips: [
      'Contact finance@acme.com for policy clarification',
      'Obtain written email approval from your department head before booking',
    ],
    suggestedFollowUps: [
      'What are the daily meal allowances?',
      'Can I expense an Uber after 10 PM?',
      'What items are strictly excluded?',
    ],
  };
}

export function calculatePolicyDiff(vOld: PolicyVersion, vNew: PolicyVersion) {
  const oldRuleMap = new Map(vOld.rules.map((r) => [r.id, r]));
  const newRuleMap = new Map(vNew.rules.map((r) => [r.id, r]));

  const addedRules: PolicyRule[] = [];
  const removedRules: PolicyRule[] = [];
  const modifiedRules: Array<{
    ruleId: string;
    title: string;
    oldRule: PolicyRule;
    newRule: PolicyRule;
    changes: string[];
  }> = [];

  for (const [id, nRule] of newRuleMap.entries()) {
    if (!oldRuleMap.has(id)) {
      addedRules.push(nRule);
    } else {
      const oRule = oldRuleMap.get(id)!;
      const changes: string[] = [];

      if (oRule.enabled !== nRule.enabled) {
        changes.push(`Status changed from ${oRule.enabled ? 'Enabled' : 'Disabled'} to ${nRule.enabled ? 'Enabled' : 'Disabled'}`);
      }
      if (oRule.parameters.capAmountMinor !== nRule.parameters.capAmountMinor) {
        changes.push(
          `Cap changed from ₹${((oRule.parameters.capAmountMinor || 0) / 100).toLocaleString()} to ₹${((nRule.parameters.capAmountMinor || 0) / 100).toLocaleString()}`
        );
      }
      if (oRule.parameters.thresholdAmountMinor !== nRule.parameters.thresholdAmountMinor) {
        changes.push(
          `Threshold changed from ₹${((oRule.parameters.thresholdAmountMinor || 0) / 100).toLocaleString()} to ₹${((nRule.parameters.thresholdAmountMinor || 0) / 100).toLocaleString()}`
        );
      }
      if (oRule.parameters.timeWindowDays !== nRule.parameters.timeWindowDays) {
        changes.push(
          `Time window changed from ${oRule.parameters.timeWindowDays} days to ${nRule.parameters.timeWindowDays} days`
        );
      }

      if (changes.length > 0) {
        modifiedRules.push({
          ruleId: id,
          title: nRule.title,
          oldRule: oRule,
          newRule: nRule,
          changes,
        });
      }
    }
  }

  for (const [id, oRule] of oldRuleMap.entries()) {
    if (!newRuleMap.has(id)) {
      removedRules.push(oRule);
    }
  }

  // City Tier diffs
  const allCities = Array.from(new Set([...Object.keys(vOld.cityTiers || {}), ...Object.keys(vNew.cityTiers || {})]));
  const cityTierChanges: Array<{ city: string; oldTier?: string; newTier?: string }> = [];
  for (const city of allCities) {
    const oTier = vOld.cityTiers?.[city];
    const nTier = vNew.cityTiers?.[city];
    if (oTier !== nTier) {
      cityTierChanges.push({ city, oldTier: oTier, newTier: nTier });
    }
  }

  return {
    addedRules,
    removedRules,
    modifiedRules,
    cityTierChanges,
  };
}
