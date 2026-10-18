import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolicyVersion,
  Employee,
  Expense,
  evaluateExpense,
  ExpenseLedger,
  normalizeCurrency,
  verifyReceiptIntegrity,
  detectDuplicates,
  calculateAnomalyRisk,
  simulatePolicyChange,
  bundleExpensesIntoTrips,
} from '../src/engine';
import { applyReviewerDecision, saveAllExpenses } from '../src/services/expenseService';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as any;
}

describe('Corporate Expense Reimbursement Pure Engine', () => {
  let samplePolicy: PolicyVersion;
  let sampleEmployee: Employee;
  let ledger: ExpenseLedger;

  beforeEach(() => {
    ledger = new ExpenseLedger();

    sampleEmployee = {
      id: 'emp_101',
      orgId: 'org_acme',
      identity: { email: 'alice@acme.com', name: 'Alice Walker' },
      role: 'employee',
      department: 'Engineering',
      grade: 'L4',
      homeCity: 'Bengaluru',
    };

    samplePolicy = {
      id: 'pol_v1',
      orgId: 'org_acme',
      versionNumber: 1,
      status: 'active',
      name: 'Acme Global Expense Policy 2026',
      sourceText: 'Standard corporate expense policy rules.',
      cityTiers: {
        Mumbai: 'Tier-1',
        Bengaluru: 'Tier-1',
        Delhi: 'Tier-1',
        Pune: 'Tier-2',
        Jaipur: 'Tier-3',
      },
      settings: {
        baseCurrency: 'INR',
        reportingMonthStartDay: 1,
        lateSubmissionWindowDays: 30,
        autoApproveRiskThreshold: 25,
        autoApproveMinConfidence: 0.8,
        fxRates: { INR: 1.0, USD: 85.0, EUR: 92.0 },
      },
      conflictWarnings: [],
      createdAt: '2026-01-01T00:00:00Z',
      rules: [
        {
          id: 'rule_excl_alcohol',
          type: 'exclusion',
          section: 'Section 3.1 - Alcohol & Intoxicants',
          title: 'Alcohol Exclusion',
          priority: 10,
          enabled: true,
          sourceQuote: 'Alcohol, liquor, and associated taxes are strictly non-reimbursable.',
          conditions: {},
          parameters: {
            excludedItems: ['beer', 'wine', 'cocktail', 'whiskey', 'vodka'],
            allocateTaxTipProportionally: true,
          },
        },
        {
          id: 'rule_req_client',
          type: 'requirement',
          section: 'Section 3.4 - Client Entertainment',
          title: 'Client Entertainment Documentation',
          priority: 20,
          enabled: true,
          sourceQuote: 'All client dinners require client organization name and attendee count.',
          conditions: { category: ['client entertainment'] },
          parameters: {
            requiredFields: ['clientName', 'attendeeCount'],
          },
        },
        {
          id: 'rule_cap_tier1_daily_meal',
          type: 'cap',
          section: 'Section 4.1 - Daily Meal Caps by City Tier',
          title: 'Tier-1 City Daily Meal Cap',
          priority: 30,
          enabled: true,
          sourceQuote: 'Daily meal expenses in Tier-1 cities are capped at ₹3,000 per day.',
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
          section: 'Section 4.2 - Tier-2 Daily Meal Cap',
          title: 'Tier-2 City Daily Meal Cap',
          priority: 31,
          enabled: true,
          sourceQuote: 'Daily meal expenses in Tier-2 cities are capped at ₹1,800 per day.',
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
          id: 'rule_cap_tx_meal',
          type: 'cap',
          section: 'Section 4.3 - Per-Transaction Lunch Cap',
          title: 'Per-Transaction Meal Limit',
          priority: 32,
          enabled: true,
          sourceQuote: 'Single meal transactions are capped at ₹2,000 per claim.',
          conditions: { category: ['meals'], isTravel: false },
          parameters: {
            capAmountMinor: 200000, // ₹2,000
            capPeriod: 'per_claim',
            capScope: 'employee',
          },
        },
        {
          id: 'rule_threshold_cfo',
          type: 'threshold',
          section: 'Section 5.1 - High Value Approval',
          title: 'Finance Escalation Threshold',
          priority: 50,
          enabled: true,
          sourceQuote: 'Any claim over ₹10,000 requires Finance review.',
          conditions: {},
          parameters: {
            thresholdLevel: 'finance',
            thresholdAmountMinor: 1000000, // ₹10,000
          },
        },
      ],
    };
  });

  it('1. Excludes alcohol line item and allocates proportional tax correctly', () => {
    // Total receipt: Food ₹1,000, Beer ₹500, Tax 10% = ₹150. Total = ₹1,650
    const expense: Expense = {
      id: 'exp_1',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T12:00:00Z',
      extracted: {
        merchant: { value: 'Bistro Central', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 1650, confidence: 0.95, inferred: false, source: 'ocr' },
        tax: { value: 150, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_1',
            description: 'Grilled Salmon',
            quantity: 1,
            unitPrice: 1000,
            amount: 1000,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
          {
            id: 'li_2',
            description: 'Craft Beer',
            quantity: 1,
            unitPrice: 500,
            amount: 500,
            category: 'meals',
            confidence: 0.95,
            itemFlags: ['alcohol'],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 165000,
        targetCurrency: 'INR',
        targetAmountMinor: 165000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    // Beer = 500. Total items = 1500. Proportional tax = (500 / 1500) * 150 = 50. Total excluded = 550.
    // Approved = 1650 - 550 = 1100 (₹1,100 -> 110000 minor units)
    expect(verdict.rejectedAmountMinor).toBe(55000);
    expect(verdict.approvedAmountMinor).toBe(110000);
    expect(verdict.decision).toBe('partial');
    expect(verdict.ruleImpacts.some((r) => r.ruleId === 'rule_excl_alcohol')).toBe(true);
  });

  it('2. Evaluates simultaneous caps and enforces the most restrictive cap with citations', () => {
    // Both Tier-1 daily cap (₹3,000) and Per-Transaction meal cap (₹2,000) apply
    // If expense is ₹2,500, the per-transaction cap (₹2,000) should restrict it to ₹2,000
    const expense: Expense = {
      id: 'exp_2',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T14:00:00Z',
      extracted: {
        merchant: { value: 'Grand Buffet', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 2500, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_1',
            description: 'Lunch Buffet',
            quantity: 1,
            unitPrice: 2500,
            amount: 2500,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 250000,
        targetCurrency: 'INR',
        targetAmountMinor: 250000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    // Per-transaction cap ₹2,000 wins over daily cap ₹3,000
    expect(verdict.approvedAmountMinor).toBe(200000);
    expect(verdict.rejectedAmountMinor).toBe(50000);
    expect(verdict.decision).toBe('partial');

    // Both caps must be cited
    const ruleIds = verdict.ruleImpacts.map((r) => r.ruleId);
    expect(ruleIds).toContain('rule_cap_tier1_daily_meal');
    expect(ruleIds).toContain('rule_cap_tx_meal');
  });

  it('3. Enforces city tier overrides (Tier-2 cap ₹1,800 vs Tier-1 cap ₹3,000)', () => {
    const expenseInPune: Expense = {
      id: 'exp_pune',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-16',
      submittedAt: '2026-10-16T12:00:00Z',
      extracted: {
        merchant: { value: 'Pune Diner', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-16', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 1900, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_pune',
            description: 'Team Lunch',
            quantity: 1,
            unitPrice: 1900,
            amount: 1900,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 190000,
        targetCurrency: 'INR',
        targetAmountMinor: 190000,
        fxRate: 1.0,
        fxDate: '2026-10-16',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Pune', cityTier: 'Tier-2', isTravel: true, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense: expenseInPune,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    // Tier-2 cap is ₹1,800. Claim is ₹1,900. Approved = ₹1,800
    expect(verdict.approvedAmountMinor).toBe(180000);
    expect(verdict.rejectedAmountMinor).toBe(10000);
    expect(verdict.ruleImpacts.some((r) => r.ruleId === 'rule_cap_tier2_daily_meal')).toBe(true);
  });

  it('4. Holds amount in pending status when client details are missing, then approves upon correction', () => {
    const dinnerWithMissingClient: Expense = {
      id: 'exp_client_meal',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-17',
      submittedAt: '2026-10-17T19:00:00Z',
      extracted: {
        merchant: { value: 'The Olive Grill', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-17', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 1800, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_c1',
            description: 'Dinner',
            quantity: 1,
            unitPrice: 1800,
            amount: 1800,
            category: 'client entertainment',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 180000,
        targetCurrency: 'INR',
        targetAmountMinor: 180000,
        fxRate: 1.0,
        fxDate: '2026-10-17',
        fxSource: 'printed',
        isInferred: false,
      },
      context: {
        city: 'Bengaluru',
        cityTier: 'Tier-1',
        isTravel: false,
        source: 'user',
        // clientName is missing!
      },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    // Phase 1: Missing client info -> needs_info
    const initialVerdict = evaluateExpense({
      expense: dinnerWithMissingClient,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    expect(initialVerdict.decision).toBe('needs_info');
    expect(initialVerdict.status).toBe('needs_info');
    expect(initialVerdict.pendingAmountMinor).toBe(180000);
    expect(initialVerdict.missingFields).toContain('Client Name');

    // Phase 2: Employee fixes client info -> Re-evaluation approves
    dinnerWithMissingClient.context.clientName = 'Acme Global Partner';
    dinnerWithMissingClient.context.attendeeCount = 2;

    const revisedVerdict = evaluateExpense({
      expense: dinnerWithMissingClient,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    expect(revisedVerdict.decision).toBe('auto_approve');
    expect(revisedVerdict.approvedAmountMinor).toBe(180000);
    expect(revisedVerdict.pendingAmountMinor).toBe(0);
  });

  it('5. Escalates claims that exceed Finance threshold (₹10,000)', () => {
    const largeClaim: Expense = {
      id: 'exp_large',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-18',
      submittedAt: '2026-10-18T10:00:00Z',
      extracted: {
        merchant: { value: 'Dell Hardware Direct', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-18', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 15000, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_hard',
            description: '4K Monitor',
            quantity: 1,
            unitPrice: 15000,
            amount: 15000,
            category: 'hardware',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 1500000,
        targetCurrency: 'INR',
        targetAmountMinor: 1500000,
        fxRate: 1.0,
        fxDate: '2026-10-18',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense: largeClaim,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    expect(verdict.decision).toBe('escalate');
    expect(verdict.status).toBe('in_review');
    expect(verdict.flags.some((f) => f.code.includes('THRESHOLD'))).toBe(true);
  });

  it('6. Replays cumulative ledger and demonstrates late-arriving receipt reflow', () => {
    // Scenario: Daily cap in Tier-1 is ₹3,000.
    // In morning, employee had lunch of ₹2,000 (Claim A on 2026-10-15, but submitted late!)
    // In evening, employee had dinner of ₹1,500 (Claim B on 2026-10-15, submitted first at 6 PM).
    // When Claim B was evaluated first, allowance remaining was ₹3,000, so full ₹1,500 was approved.
    // Later, Claim A (Lunch ₹2,000) is submitted for the same day.
    // Chronological replay sorts Claim A before Claim B.
    // Claim A gets ₹2,000 approved (remaining allowance becomes ₹1,000).
    // Replay reflows Claim B: prior spend is now ₹2,000, so only ₹1,000 of Claim B is approved!

    const claimB_Dinner: Expense = {
      id: 'exp_dinner',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T18:00:00Z', // 6 PM
      extracted: {
        merchant: { value: 'Dinner Place', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 1500, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_din',
            description: 'Dinner',
            quantity: 1,
            unitPrice: 1500,
            amount: 1500,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 150000,
        targetCurrency: 'INR',
        targetAmountMinor: 150000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    // Step 1: Claim B evaluated alone
    const initialBVerdict = evaluateExpense({
      expense: claimB_Dinner,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });
    expect(initialBVerdict.approvedAmountMinor).toBe(150000); // Full ₹1,500 approved

    // Record B in ledger
    ledger.record({
      expenseId: claimB_Dinner.id,
      employeeId: claimB_Dinner.employeeId,
      expenseDate: claimB_Dinner.expenseDate,
      submittedAt: claimB_Dinner.submittedAt,
      category: 'meals',
      city: 'Bengaluru',
      approvedAmountMinor: initialBVerdict.approvedAmountMinor,
      status: initialBVerdict.status,
      verdictDecision: initialBVerdict.decision,
      isOverride: false,
    });

    // Step 2: Late-arriving Claim A (Lunch at 12 PM)
    const claimA_Lunch: Expense = {
      id: 'exp_lunch',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T12:00:00Z', // 12 PM (earlier in day)
      extracted: {
        merchant: { value: 'Lunch Cafe', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 2000, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          {
            id: 'li_lun',
            description: 'Lunch',
            quantity: 1,
            unitPrice: 2000,
            amount: 2000,
            category: 'meals',
            confidence: 0.95,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 200000,
        targetCurrency: 'INR',
        targetAmountMinor: 200000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    // Replay chronological order:
    // Reset ledger, record in sorted order
    const replayLedger = new ExpenseLedger();

    // 1. Evaluate Lunch (A)
    const verdictA = evaluateExpense({
      expense: claimA_Lunch,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger: replayLedger,
    });
    expect(verdictA.approvedAmountMinor).toBe(200000); // ₹2,000 approved

    replayLedger.record({
      expenseId: claimA_Lunch.id,
      employeeId: claimA_Lunch.employeeId,
      expenseDate: claimA_Lunch.expenseDate,
      submittedAt: claimA_Lunch.submittedAt,
      category: 'meals',
      city: 'Bengaluru',
      approvedAmountMinor: verdictA.approvedAmountMinor,
      status: verdictA.status,
      verdictDecision: verdictA.decision,
      isOverride: false,
    });

    // 2. Reflow Dinner (B)
    const reflowedBVerdict = evaluateExpense({
      expense: claimB_Dinner,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger: replayLedger,
    });

    // Since daily cap is ₹3,000 and Lunch took ₹2,000, only ₹1,000 remains for Dinner!
    expect(reflowedBVerdict.approvedAmountMinor).toBe(100000);
    expect(reflowedBVerdict.rejectedAmountMinor).toBe(50000);
    expect(reflowedBVerdict.decision).toBe('partial');
  });

  it('7. Normalizes foreign currency deterministically with recorded provenance', () => {
    const fxResult = normalizeCurrency({
      sourceCurrency: 'USD',
      sourceAmount: 100.5,
      targetCurrency: 'INR',
      expenseDate: '2026-10-15',
      policyFxRates: { USD: 85.0 },
    });

    // $100.50 * 85 = ₹8,542.50 = 854250 minor units
    expect(fxResult.sourceAmountMinor).toBe(10050);
    expect(fxResult.targetAmountMinor).toBe(854250);
    expect(fxResult.fxRate).toBe(85.0);
    expect(fxResult.fxSource).toBe('policy');
    expect(fxResult.isInferred).toBe(false);
  });

  it('8. Verifies receipt arithmetic integrity and flags math mismatches', () => {
    const mathMismatchCheck = verifyReceiptIntegrity({
      printedTotal: 1200,
      tax: 100,
      tip: 0,
      lineItems: [
        { id: '1', description: 'Item A', quantity: 1, unitPrice: 500, amount: 500, confidence: 1, itemFlags: [] },
        { id: '2', description: 'Item B', quantity: 1, unitPrice: 400, amount: 400, confidence: 1, itemFlags: [] },
      ], // items = 900 + 100 tax = 1000 != printed 1200
    });

    expect(mathMismatchCheck.signals.mathMismatch).toBe(true);
    expect(mathMismatchCheck.difference).toBe(200);
  });

  it('9. Detects SHA-256 exact duplicates and cross-employee shared meals', () => {
    const claim1: Expense = {
      id: 'c1',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'approved',
      channel: 'upload',
      expenseDate: '2026-10-15',
      submittedAt: '2026-10-15T12:00:00Z',
      receiptRef: {
        originalSha256: 'abc123sha256',
        dHash: 'ffff0000ffff0000',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      },
      extracted: {
        merchant: { value: 'The Capital Grille', confidence: 0.95, inferred: false, source: 'ocr' },
        date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
        total: { value: 4500, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 450000,
        targetCurrency: 'INR',
        targetAmountMinor: 450000,
        fxRate: 1.0,
        fxDate: '2026-10-15',
        fxSource: 'printed',
        isInferred: false,
      },
      context: { city: 'Bengaluru', source: 'user' },
      integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
    };

    // Submitting identical receipt with same SHA-256
    const claim2Exact: Expense = {
      ...claim1,
      id: 'c2',
      submittedAt: '2026-10-15T14:00:00Z',
    };

    const exactMatch = detectDuplicates({
      currentExpense: claim2Exact,
      existingExpenses: [claim1],
    });

    expect(exactMatch.highestScore).toBe(1.0);
    expect(exactMatch.primaryMatchKind).toBe('sha256');

    // Cross-employee shared meal (different employee, same date & merchant, amount within 2%)
    const claim3Shared: Expense = {
      ...claim1,
      id: 'c3',
      employeeId: 'emp_102', // Bob
      receiptRef: undefined,
      submittedAt: '2026-10-15T15:00:00Z',
    };

    const sharedMatch = detectDuplicates({
      currentExpense: claim3Shared,
      existingExpenses: [claim1],
    });

    expect(sharedMatch.highestScore).toBe(0.75);
    expect(sharedMatch.primaryMatchKind).toBe('shared_meal');
  });

  it('10. Simulates policy change without mutating original claims', () => {
    // Create draft policy that reduces Tier-1 cap to ₹2,500
    const draftPolicy: PolicyVersion = {
      ...samplePolicy,
      id: 'pol_v2_draft',
      versionNumber: 2,
      name: 'Proposed Reduced Caps Policy',
      rules: samplePolicy.rules.map((r) => {
        if (r.id === 'rule_cap_tier1_daily_meal') {
          return {
            ...r,
            parameters: { ...r.parameters, capAmountMinor: 250000 }, // ₹2,500 instead of ₹3,000
          };
        }
        return r;
      }),
    };

    const testExpenses: Expense[] = [
      {
        id: 'sim_exp_1',
        orgId: 'org_acme',
        employeeId: 'emp_101',
        status: 'submitted',
        channel: 'upload',
        expenseDate: '2026-10-15',
        submittedAt: '2026-10-15T12:00:00Z',
        extracted: {
          merchant: { value: 'City Diner', confidence: 0.95, inferred: false, source: 'ocr' },
          date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
          total: { value: 2800, confidence: 0.95, inferred: false, source: 'ocr' },
          currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
          lineItems: [
            { id: '1', description: 'Meal', quantity: 1, unitPrice: 2800, amount: 2800, category: 'meals', confidence: 1, itemFlags: [] }
          ],
        },
        normalizedCurrency: {
          sourceCurrency: 'INR',
          sourceAmountMinor: 280000,
          targetCurrency: 'INR',
          targetAmountMinor: 280000,
          fxRate: 1.0,
          fxDate: '2026-10-15',
          fxSource: 'printed',
          isInferred: false,
        },
        context: { city: 'Bengaluru', cityTier: 'Tier-1', source: 'user' },
        integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
      },
    ];

    const simulation = simulatePolicyChange({
      activePolicy: samplePolicy,
      draftPolicy,
      expenses: testExpenses,
      employees: [sampleEmployee],
    });

    expect(simulation.totalExpensesEvaluated).toBe(1);
    expect(simulation.simulationId).toBeDefined();
    // Active cap was ₹2,000 per claim, so both cap at ₹2,000 because of per-claim cap
    expect(simulation.activeTotalReimbursedMinor).toBe(200000);
  });

  it('11. Enforces ₹3,000 daily meal cap on Royal Indiana Grand receipt of ₹4,640 (Mumbai Tier-1), disbursing only ₹3,000 and excluding ₹1,640, preventing auto-approval', () => {
    // Royal Indiana Grand receipt from user
    // Subtotal: ₹4,640.00, Mumbai (Tier-1 City), Date: 2026-10-17, Lunch / Daily Meal
    // Line items extracted with category "Food"
    const royalIndianaReceipt: Expense = {
      id: 'exp_royal_indiana_1',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-17',
      submittedAt: '2026-10-17T13:30:00Z',
      extracted: {
        merchant: { value: 'ROYAL INDIANA GRAND', confidence: 0.99, inferred: false, source: 'ocr' },
        date: { value: '2026-10-17', confidence: 0.98, inferred: false, source: 'ocr' },
        total: { value: 4640, confidence: 0.99, inferred: false, source: 'ocr' },
        tax: { value: 464, confidence: 0.95, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          { id: '1', description: 'Murgh Tandoori (Full)', quantity: 1, unitPrice: 750, amount: 750, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '2', description: 'Butter Chicken (Large)', quantity: 1, unitPrice: 680, amount: 680, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '3', description: 'Mutton Rogan Josh', quantity: 1, unitPrice: 780, amount: 780, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '4', description: 'Paneer Lababdar', quantity: 1, unitPrice: 490, amount: 490, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '5', description: 'Veg Biryani (Double)', quantity: 1, unitPrice: 450, amount: 450, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '6', description: 'Butter Naan', quantity: 5, unitPrice: 90, amount: 450, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '7', description: 'Garlic Naan', quantity: 2, unitPrice: 110, amount: 220, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '8', description: 'Jeera Rice', quantity: 1, unitPrice: 220, amount: 220, category: 'Food', confidence: 0.98, itemFlags: [] },
          { id: '9', description: 'Mango Lassi', quantity: 4, unitPrice: 150, amount: 600, category: 'Beverage', confidence: 0.98, itemFlags: [] },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 464000,
        targetCurrency: 'INR',
        targetAmountMinor: 464000,
        fxRate: 1.0,
        fxDate: '2026-10-17',
        fxSource: 'printed',
        isInferred: false,
      },
      context: {
        category: 'meals',
        city: 'Mumbai',
        cityTier: 'Tier-1',
        isTravel: true,
        source: 'user',
      },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense: royalIndianaReceipt,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    // 1. Only amount UP TO policy cap of ₹3,000 (300000 minor) is disbursed
    expect(verdict.approvedAmountMinor).toBe(300000);
    expect(verdict.disbursedAmountMinor).toBe(300000);

    // 2. The rest (₹4,640 - ₹3,000 = ₹1,640 / 164000 minor) is excluded
    expect(verdict.excludedAmountMinor).toBe(164000);
    expect(verdict.rejectedAmountMinor).toBe(164000);

    // 3. Status must be partially_approved and decision partial (NEVER auto_approved!)
    expect(verdict.decision).toBe('partial');
    expect(verdict.status).toBe('partially_approved');
    expect(verdict.autoApprovable).toBe(false);

    // 4. Exclusion citation is recorded
    const exclusionCitation = verdict.ruleImpacts.find((r) => r.impactType === 'exclusion');
    expect(exclusionCitation).toBeDefined();
    expect(exclusionCitation?.impactAmountMinor).toBe(164000);
    expect(exclusionCitation?.title).toContain('Tier-1 City Daily Meal Cap');
    expect(exclusionCitation?.explanation).toContain('exceeds the policy cap limit');
  });

  it('12. Applies universal cap enforcement across lodging/hotel caps, disbursing up to cap and excluding excess', () => {
    // Policy with a Lodging Cap rule of ₹5,000 per day in Tier-2
    const policyWithLodgingCap: PolicyVersion = {
      ...samplePolicy,
      rules: [
        ...samplePolicy.rules,
        {
          id: 'rule_cap_hotel_tier2',
          type: 'cap',
          section: 'Section 4.4 - Lodging Allowances',
          title: 'Tier-2 Hotel Daily Allowance',
          priority: 33,
          enabled: true,
          sourceQuote: 'Lodging in Tier-2 cities is capped at ₹5,000 per night.',
          conditions: {
            category: ['travel'],
            cityTier: ['Tier-2'],
          },
          parameters: {
            capAmountMinor: 500000, // ₹5,000
            capPeriod: 'day',
            capScope: 'employee',
          },
        },
      ],
    };

    const hotelExpense: Expense = {
      id: 'exp_hotel_1',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-18',
      submittedAt: '2026-10-18T10:00:00Z',
      extracted: {
        merchant: { value: 'The Westin Pune', confidence: 0.99, inferred: false, source: 'ocr' },
        date: { value: '2026-10-18', confidence: 0.99, inferred: false, source: 'ocr' },
        total: { value: 7500, confidence: 0.99, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          { id: '1', description: 'Deluxe Room 1 Night', quantity: 1, unitPrice: 7500, amount: 7500, category: 'hotel', confidence: 0.98, itemFlags: [] },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 750000,
        targetCurrency: 'INR',
        targetAmountMinor: 750000,
        fxRate: 1.0,
        fxDate: '2026-10-18',
        fxSource: 'printed',
        isInferred: false,
      },
      context: {
        category: 'travel',
        city: 'Pune',
        cityTier: 'Tier-2',
        isTravel: true,
        source: 'user',
      },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const verdict = evaluateExpense({
      expense: hotelExpense,
      policy: policyWithLodgingCap,
      employee: sampleEmployee,
      ledger,
    });

    // Capped at ₹5,000 (500000 minor units disbursed); ₹2,500 (250000 minor units) excluded
    expect(verdict.approvedAmountMinor).toBe(500000);
    expect(verdict.disbursedAmountMinor).toBe(500000);
    expect(verdict.excludedAmountMinor).toBe(250000);
    expect(verdict.decision).toBe('partial');
    expect(verdict.status).toBe('partially_approved');
    expect(verdict.autoApprovable).toBe(false);
  });

  it('13. Reviewer approval of capped claim maintains partial approval, disbursing only up to cap and excluding excess', () => {
    const cappedExpense: Expense = {
      id: 'exp_royal_mumbai_review',
      orgId: 'org_acme',
      employeeId: 'emp_101',
      status: 'submitted',
      channel: 'upload',
      expenseDate: '2026-10-17',
      submittedAt: '2026-10-17T14:00:00Z',
      extracted: {
        merchant: { value: 'Royal Indiana Grand', confidence: 0.99, inferred: false, source: 'ocr' },
        date: { value: '2026-10-17', confidence: 0.99, inferred: false, source: 'ocr' },
        total: { value: 4640, confidence: 0.99, inferred: false, source: 'ocr' },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
        lineItems: [
          { id: '1', description: 'Murgh Tandoori', quantity: 1, unitPrice: 750, amount: 750, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '2', description: 'Butter Chicken', quantity: 1, unitPrice: 680, amount: 680, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '3', description: 'Mutton Rogan Josh', quantity: 1, unitPrice: 780, amount: 780, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '4', description: 'Paneer Lababdar', quantity: 1, unitPrice: 490, amount: 490, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '5', description: 'Veg Biryani', quantity: 1, unitPrice: 450, amount: 450, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '6', description: 'Butter Naan', quantity: 5, unitPrice: 90, amount: 450, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '7', description: 'Garlic Naan', quantity: 2, unitPrice: 110, amount: 220, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '8', description: 'Jeera Rice', quantity: 1, unitPrice: 220, amount: 220, category: 'food', confidence: 0.98, itemFlags: [] },
          { id: '9', description: 'Mango Lassi', quantity: 4, unitPrice: 150, amount: 600, category: 'beverage', confidence: 0.98, itemFlags: [] },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: 464000,
        targetCurrency: 'INR',
        targetAmountMinor: 464000,
        fxRate: 1.0,
        fxDate: '2026-10-17',
        fxSource: 'printed',
        isInferred: false,
      },
      context: {
        category: 'meals',
        city: 'Mumbai',
        cityTier: 'Tier-1',
        isTravel: true,
        source: 'user',
      },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };

    const initialVerdict = evaluateExpense({
      expense: cappedExpense,
      policy: samplePolicy,
      employee: sampleEmployee,
      ledger,
    });

    cappedExpense.verdict = initialVerdict;
    cappedExpense.status = initialVerdict.status;
    saveAllExpenses([cappedExpense]);

    const reviewerActor = {
      id: 'rev_admin_1',
      name: 'Finance Manager',
      role: 'admin' as const,
    };

    // Reviewer clicks 'approve' on the capped claim
    const approvedExpense = applyReviewerDecision({
      expenseId: cappedExpense.id,
      reviewer: reviewerActor,
      action: 'approve',
      reason: 'Approved up to allowable cap',
    });

    // Must be partially_approved and disburse ONLY up to cap (₹3,000), NOT auto-approve or fully approve ₹4,640
    expect(approvedExpense.status).toBe('partially_approved');
    expect(approvedExpense.verdict?.decision).toBe('partial');
    expect(approvedExpense.verdict?.approvedAmountMinor).toBe(300000);
    expect(approvedExpense.verdict?.disbursedAmountMinor).toBe(300000);
    expect(approvedExpense.verdict?.excludedAmountMinor).toBe(164000);
  });
});
