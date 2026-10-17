import { PolicyRule, PolicyVersion } from '../types/expense';
import { detectPolicyConflicts } from '../engine/policySchema';

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
      USD: 85.0,
      EUR: 92.0,
      GBP: 108.0,
      CAD: 62.0,
      AUD: 55.0,
      JPY: 0.58,
      AED: 23.1,
      SGD: 64.5,
    },
  },
  conflictWarnings: [],
  createdAt: '2026-01-01T00:00:00Z',
  activatedAt: '2026-01-01T00:00:00Z',
  rules: [
    {
      id: 'rule_excl_alcohol',
      type: 'exclusion',
      section: 'Section 3.1 - Non-Reimbursable Items',
      title: 'Alcohol & Spirits Exclusion',
      priority: 10,
      enabled: true,
      sourceQuote: 'Alcohol, beer, wine, spirits, tobacco products, minibar snacks, personal grooming items, and traffic/parking fines are strictly non-reimbursable.',
      conditions: {},
      parameters: {
        excludedItems: ['beer', 'wine', 'cocktail', 'whiskey', 'vodka', 'rum', 'gin', 'liquor', 'minibar'],
        excludedKeywords: ['alcohol', 'liquor', 'tobacco', 'cigarette', 'cigar', 'fine', 'penalty'],
        allocateTaxTipProportionally: true,
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
      conditions: { category: ['client entertainment'] },
      parameters: {
        requiredFields: ['clientName', 'attendeeCount', 'purpose'],
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
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-1'],
      },
      parameters: {
        capAmountMinor: 300000, // ₹3,000
        capPeriod: 'day',
        capScope: 'employee',
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
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-2'],
      },
      parameters: {
        capAmountMinor: 180000, // ₹1,800
        capPeriod: 'day',
        capScope: 'employee',
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
      conditions: {
        category: ['meals'],
        cityTier: ['Tier-3'],
      },
      parameters: {
        capAmountMinor: 120000, // ₹1,200
        capPeriod: 'day',
        capScope: 'employee',
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
      conditions: { category: ['meals'], isTravel: false },
      parameters: {
        capAmountMinor: 200000, // ₹2,000
        capPeriod: 'per_claim',
        capScope: 'employee',
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
      conditions: { category: ['client entertainment'] },
      parameters: {
        capAmountMinor: 250000, // ₹2,500
        capPeriod: 'per_claim',
        perAttendeeMultiplier: true,
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
      conditions: {},
      parameters: {
        thresholdLevel: 'finance',
        thresholdAmountMinor: 1000000, // ₹10,000
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
      conditions: {},
      parameters: {
        thresholdLevel: 'cfo',
        thresholdAmountMinor: 5000000, // ₹50,000
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
      conditions: {},
      parameters: {
        timeWindowDays: 30,
      },
    },
  ],
};

const STORAGE_KEY_ACTIVE_POLICY = 'keepr_active_policy_v1';
const STORAGE_KEY_DRAFT_POLICY = 'keepr_draft_policy_v1';

function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
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
  return DEFAULT_ACME_POLICY;
}

export function saveActivePolicy(policy: PolicyVersion): void {
  policy.conflictWarnings = detectPolicyConflicts(policy);
  safeSetItem(STORAGE_KEY_ACTIVE_POLICY, JSON.stringify(policy));
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

export function activateDraftPolicy(draft: PolicyVersion): PolicyVersion {
  const active: PolicyVersion = {
    ...draft,
    status: 'active',
    activatedAt: new Date().toISOString(),
  };
  saveActivePolicy(active);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_DRAFT_POLICY);
  }
  return active;
}

/**
 * Deterministic Policy Q&A engine with source citation:
 * Cites rule section/sourceQuote and says "Policy is silent on this" when no source supports it.
 */
export function queryPolicyGrounded(question: string, policy: PolicyVersion): {
  answer: string;
  citedRule?: PolicyRule;
  isSilent: boolean;
} {
  const q = question.toLowerCase();

  // 1. Meal limits / Tier caps
  if (q.includes('tier 1') || q.includes('mumbai') || q.includes('bengaluru') || q.includes('delhi')) {
    const rule = policy.rules.find((r) => r.id === 'rule_cap_tier1_daily_meal');
    return {
      answer: `Under ${rule?.section}, daily meal expenses in Tier-1 cities are capped at ₹${((rule?.parameters.capAmountMinor || 0) / 100).toLocaleString()}. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  if (q.includes('tier 2') || q.includes('pune') || q.includes('chennai') || q.includes('kolkata')) {
    const rule = policy.rules.find((r) => r.id === 'rule_cap_tier2_daily_meal');
    return {
      answer: `Under ${rule?.section}, daily meal expenses in Tier-2 cities are capped at ₹${((rule?.parameters.capAmountMinor || 0) / 100).toLocaleString()}. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  // 2. Alcohol
  if (q.includes('alcohol') || q.includes('beer') || q.includes('wine') || q.includes('cocktail') || q.includes('liquor')) {
    const rule = policy.rules.find((r) => r.id === 'rule_excl_alcohol');
    return {
      answer: `Under ${rule?.section}, alcohol, beer, wine, and associated taxes are strictly non-reimbursable. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  // 3. Client Dinner / Entertainment
  if (q.includes('client') || q.includes('attendee') || q.includes('dinner')) {
    const rule = policy.rules.find((r) => r.id === 'rule_req_client');
    return {
      answer: `Under ${rule?.section}, client dining requires the client organization name, business purpose, and attendee count. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  // 4. Thresholds
  if (q.includes('threshold') || q.includes('cfo') || q.includes('finance review') || q.includes('approval limit')) {
    const rule = policy.rules.find((r) => r.id === 'rule_threshold_finance');
    return {
      answer: `Under ${rule?.section}, claims over ₹${((rule?.parameters.thresholdAmountMinor || 0) / 100).toLocaleString()} require Finance review. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  // 5. Late submission
  if (q.includes('late') || q.includes('days') || q.includes('submission deadline')) {
    const rule = policy.rules.find((r) => r.id === 'rule_time_window_lag');
    return {
      answer: `Under ${rule?.section}, receipts must be submitted within ${rule?.parameters.timeWindowDays} days of the transaction. Source: "${rule?.sourceQuote}"`,
      citedRule: rule,
      isSilent: false,
    };
  }

  return {
    answer: 'Policy is silent on this question. Please contact Finance for clarification.',
    isSilent: true,
  };
}
