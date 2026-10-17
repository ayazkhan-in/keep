import { Expense } from '../types/expense';

export interface ExpectedLabel {
  expenseId: string;
  expectedDecision: 'approve' | 'auto_approve' | 'partial' | 'needs_info' | 'escalate' | 'reject';
  expectedApprovedMinor: number;
  expectedRejectedMinor: number;
  expectedFlags: string[];
  isDuplicate: boolean;
  notes: string;
}

export const SYNTHETIC_EXPENSES: Expense[] = [
  // -------------------------------------------------------------------------
  // 1 & 2. Exact Duplicate (Same SHA-256)
  // -------------------------------------------------------------------------
  {
    id: 'exp_dup_original',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'auto_approved',
    channel: 'upload',
    expenseDate: '2026-10-02',
    submittedAt: '2026-10-02T10:15:00Z',
    receiptRef: {
      originalSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      dHash: 'a8b8c8d8e8f80818',
      mimeType: 'image/jpeg',
      fileSize: 245100,
    },
    extracted: {
      merchant: { value: 'Chai Point', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-02', confidence: 0.99, inferred: false, source: 'ocr' },
      total: { value: 350, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: 'li_1', description: 'Ginger Tea & Snacks', quantity: 1, unitPrice: 350, amount: 350, category: 'meals', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 35000,
      targetCurrency: 'INR',
      targetAmountMinor: 35000,
      fxRate: 1.0,
      fxDate: '2026-10-02',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_dup_exact_resubmit',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-02',
    submittedAt: '2026-10-05T09:00:00Z',
    receiptRef: {
      originalSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // EXACT MATCH
      dHash: 'a8b8c8d8e8f80818',
      mimeType: 'image/jpeg',
      fileSize: 245100,
    },
    extracted: {
      merchant: { value: 'Chai Point', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-02', confidence: 0.99, inferred: false, source: 'ocr' },
      total: { value: 350, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: 'li_1', description: 'Ginger Tea & Snacks', quantity: 1, unitPrice: 350, amount: 350, category: 'meals', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 35000,
      targetCurrency: 'INR',
      targetAmountMinor: 35000,
      fxRate: 1.0,
      fxDate: '2026-10-02',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 3. Re-photographed Duplicate (dHash distance <= 6)
  // -------------------------------------------------------------------------
  {
    id: 'exp_dup_rephoto',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'camera',
    expenseDate: '2026-10-02',
    submittedAt: '2026-10-06T11:20:00Z',
    receiptRef: {
      originalSha256: 'ffffffff00000000111122223333444455556666777788889999aaaabbbbcccc',
      dHash: 'a8b8c8d8e8f80819', // Hamming distance = 1 from original
      mimeType: 'image/jpeg',
      fileSize: 312000,
    },
    extracted: {
      merchant: { value: 'Chai Point', confidence: 0.88, inferred: false, source: 'ocr' },
      date: { value: '2026-10-02', confidence: 0.92, inferred: false, source: 'ocr' },
      total: { value: 350, confidence: 0.90, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: 'li_1', description: 'Ginger Tea & Snacks', quantity: 1, unitPrice: 350, amount: 350, category: 'meals', confidence: 0.90, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 35000,
      targetCurrency: 'INR',
      targetAmountMinor: 35000,
      fxRate: 1.0,
      fxDate: '2026-10-02',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 4 & 5. Cross-Employee Shared Meal (Alice & Bob claim same meal)
  // -------------------------------------------------------------------------
  {
    id: 'exp_shared_alice',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-08',
    submittedAt: '2026-10-08T20:30:00Z',
    extracted: {
      merchant: { value: 'Toit Brewpub Indiranagar', confidence: 0.96, inferred: false, source: 'ocr' },
      date: { value: '2026-10-08', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 1850, confidence: 0.96, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: 'li_1', description: 'Woodfired Pizza & Pasta', quantity: 2, unitPrice: 925, amount: 1850, category: 'meals', confidence: 0.96, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 185000,
      targetCurrency: 'INR',
      targetAmountMinor: 185000,
      fxRate: 1.0,
      fxDate: '2026-10-08',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_shared_bob',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-08',
    submittedAt: '2026-10-08T21:10:00Z',
    extracted: {
      merchant: { value: 'Toit Brewpub Indiranagar', confidence: 0.95, inferred: false, source: 'ocr' },
      date: { value: '2026-10-08', confidence: 0.97, inferred: false, source: 'ocr' },
      total: { value: 1850, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: 'li_1', description: 'Dinner Share', quantity: 1, unitPrice: 1850, amount: 1850, category: 'meals', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 185000,
      targetCurrency: 'INR',
      targetAmountMinor: 185000,
      fxRate: 1.0,
      fxDate: '2026-10-08',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 6. Alcohol line item with proportional tax exclusion
  // -------------------------------------------------------------------------
  {
    id: 'exp_alcohol_proportional_tax',
    orgId: 'org_acme',
    employeeId: 'emp_103',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-09',
    submittedAt: '2026-10-09T22:00:00Z',
    extracted: {
      merchant: { value: 'Smoke House Deli', confidence: 0.97, inferred: false, source: 'ocr' },
      date: { value: '2026-10-09', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 2300, confidence: 0.97, inferred: false, source: 'ocr' },
      tax: { value: 300, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Truffle Risotto', quantity: 1, unitPrice: 1200, amount: 1200, category: 'meals', confidence: 0.98, itemFlags: [] },
        { id: '2', description: 'Red Wine Glass', quantity: 1, unitPrice: 800, amount: 800, category: 'meals', confidence: 0.95, itemFlags: ['alcohol'] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 230000,
      targetCurrency: 'INR',
      targetAmountMinor: 230000,
      fxRate: 1.0,
      fxDate: '2026-10-09',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Delhi', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 7, 8, 9. Three Claims Repeatedly Just Under ₹10,000 Threshold (Bob)
  // -------------------------------------------------------------------------
  {
    id: 'exp_under_thresh_1',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-10',
    submittedAt: '2026-10-10T14:00:00Z',
    extracted: {
      merchant: { value: 'Tech Solutions Depot', confidence: 0.95, inferred: false, source: 'ocr' },
      date: { value: '2026-10-10', confidence: 0.95, inferred: false, source: 'ocr' },
      total: { value: 9800, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Client Demo Accessories', quantity: 1, unitPrice: 9800, amount: 9800, category: 'supplies', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 980000,
      targetCurrency: 'INR',
      targetAmountMinor: 980000,
      fxRate: 1.0,
      fxDate: '2026-10-10',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Mumbai', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_under_thresh_2',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-12',
    submittedAt: '2026-10-12T16:00:00Z',
    extracted: {
      merchant: { value: 'Digital Mart Hardware', confidence: 0.95, inferred: false, source: 'ocr' },
      date: { value: '2026-10-12', confidence: 0.95, inferred: false, source: 'ocr' },
      total: { value: 9750, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Display Cables & Hubs', quantity: 1, unitPrice: 9750, amount: 9750, category: 'supplies', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 975000,
      targetCurrency: 'INR',
      targetAmountMinor: 975000,
      fxRate: 1.0,
      fxDate: '2026-10-12',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Mumbai', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_under_thresh_3',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-14',
    submittedAt: '2026-10-14T17:30:00Z',
    extracted: {
      merchant: { value: 'Electronics Hub Central', confidence: 0.95, inferred: false, source: 'ocr' },
      date: { value: '2026-10-14', confidence: 0.95, inferred: false, source: 'ocr' },
      total: { value: 9900, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Webcams and Microphones', quantity: 1, unitPrice: 9900, amount: 9900, category: 'supplies', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 990000,
      targetCurrency: 'INR',
      targetAmountMinor: 990000,
      fxRate: 1.0,
      fxDate: '2026-10-14',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Mumbai', cityTier: 'Tier-1', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 10 & 11. Foreign Currencies: USD and EUR
  // -------------------------------------------------------------------------
  {
    id: 'exp_fx_usd',
    orgId: 'org_acme',
    employeeId: 'emp_103',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-15',
    submittedAt: '2026-10-15T18:00:00Z',
    extracted: {
      merchant: { value: 'AWS Cloud Services', confidence: 0.99, inferred: false, source: 'ocr' },
      date: { value: '2026-10-15', confidence: 0.99, inferred: false, source: 'ocr' },
      total: { value: 85.50, confidence: 0.99, inferred: false, source: 'ocr' },
      currency: { value: 'USD', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'EC2 & S3 Cloud Usage', quantity: 1, unitPrice: 85.50, amount: 85.50, category: 'software', confidence: 0.99, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'USD',
      sourceAmountMinor: 8550,
      targetCurrency: 'INR',
      targetAmountMinor: 726750, // $85.50 * 85 = ₹7,267.50
      fxRate: 85.0,
      fxDate: '2026-10-15',
      fxSource: 'policy',
      isInferred: false,
    },
    context: { city: 'Seattle', cityTier: 'International', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_fx_eur',
    orgId: 'org_acme',
    employeeId: 'emp_103',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-16',
    submittedAt: '2026-10-16T19:00:00Z',
    extracted: {
      merchant: { value: 'Hotel Berlin Mitte', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-16', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 65.00, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'EUR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Conference Breakfast', quantity: 1, unitPrice: 65.00, amount: 65.00, category: 'meals', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'EUR',
      sourceAmountMinor: 6500,
      targetCurrency: 'INR',
      targetAmountMinor: 598000, // €65 * 92 = ₹5,980.00
      fxRate: 92.0,
      fxDate: '2026-10-16',
      fxSource: 'policy',
      isInferred: false,
    },
    context: { city: 'Berlin', cityTier: 'International', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 12. Arithmetic Math Mismatch (Items sum != Printed total)
  // -------------------------------------------------------------------------
  {
    id: 'exp_math_mismatch',
    orgId: 'org_acme',
    employeeId: 'emp_104',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-17',
    submittedAt: '2026-10-17T13:00:00Z',
    extracted: {
      merchant: { value: 'Urban Dhaba', confidence: 0.92, inferred: false, source: 'ocr' },
      date: { value: '2026-10-17', confidence: 0.94, inferred: false, source: 'ocr' },
      total: { value: 2400, confidence: 0.90, inferred: false, source: 'ocr' }, // Printed: 2400
      tax: { value: 100, confidence: 0.90, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Butter Chicken', quantity: 1, unitPrice: 800, amount: 800, category: 'meals', confidence: 0.92, itemFlags: [] },
        { id: '2', description: 'Roti Basket', quantity: 1, unitPrice: 300, amount: 300, category: 'meals', confidence: 0.92, itemFlags: [] },
        // Sum items = 1,100 + 100 tax = 1,200. Discrepancy of 1,200 from printed 2,400!
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 240000,
      targetCurrency: 'INR',
      targetAmountMinor: 240000,
      fxRate: 1.0,
      fxDate: '2026-10-17',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Pune', cityTier: 'Tier-2', isTravel: false, source: 'user' },
    integritySignals: {
      mathMismatch: true,
      taxRateAnomalous: false,
      missingDate: false,
      inferredTotal: false,
      unitemizedBalance: 1200,
    },
  },

  // -------------------------------------------------------------------------
  // 13. Missing Date (Needs manual info entry)
  // -------------------------------------------------------------------------
  {
    id: 'exp_missing_date',
    orgId: 'org_acme',
    employeeId: 'emp_104',
    status: 'needs_info',
    channel: 'upload',
    expenseDate: '', // UNKNOWN DATE
    submittedAt: '2026-10-18T10:00:00Z',
    extracted: {
      merchant: { value: 'Corner Stationery', confidence: 0.94, inferred: false, source: 'ocr' },
      date: { value: '', confidence: 0.0, inferred: false, source: 'ocr' },
      total: { value: 450, confidence: 0.95, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Whiteboard Markers & Erasers', quantity: 1, unitPrice: 450, amount: 450, category: 'supplies', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 45000,
      targetCurrency: 'INR',
      targetAmountMinor: 45000,
      fxRate: 1.0,
      fxDate: '',
      fxSource: 'printed',
      isInferred: false,
    },
    context: { city: 'Pune', cityTier: 'Tier-2', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: true, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 14. Missing Printed Total (Inferable from items + tax)
  // -------------------------------------------------------------------------
  {
    id: 'exp_inferred_total',
    orgId: 'org_acme',
    employeeId: 'emp_105',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-18',
    submittedAt: '2026-10-18T15:00:00Z',
    extracted: {
      merchant: { value: 'Jaipur Crafts & Supplies', confidence: 0.95, inferred: false, source: 'ocr' },
      date: { value: '2026-10-18', confidence: 0.96, inferred: false, source: 'ocr' },
      total: { value: 0, confidence: 0.3, inferred: true, source: 'computed' }, // Missing on receipt
      tax: { value: 90, confidence: 0.90, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Filing Folders', quantity: 2, unitPrice: 300, amount: 600, category: 'supplies', confidence: 0.95, itemFlags: [] },
        { id: '2', description: 'Desk Organizers', quantity: 1, unitPrice: 400, amount: 400, category: 'supplies', confidence: 0.95, itemFlags: [] },
      ],
    },
    normalizedCurrency: {
      sourceCurrency: 'INR',
      sourceAmountMinor: 109000, // 600 + 400 + 90 = 1,090
      targetCurrency: 'INR',
      targetAmountMinor: 109000,
      fxRate: 1.0,
      fxDate: '2026-10-18',
      fxSource: 'printed',
      isInferred: true,
    },
    context: { city: 'Jaipur', cityTier: 'Tier-3', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: true, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 15 to 19. Five Same-Day Tier-1 Meals that Cumulatively Exceed Cap (₹3,000)
  // -------------------------------------------------------------------------
  {
    id: 'exp_daycap_1',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-19',
    submittedAt: '2026-10-19T08:30:00Z',
    extracted: {
      merchant: { value: 'Third Wave Coffee', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-19', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 450, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Breakfast Bagel & Latte', quantity: 1, unitPrice: 450, amount: 450, category: 'meals', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 45000, targetCurrency: 'INR', targetAmountMinor: 45000, fxRate: 1.0, fxDate: '2026-10-19', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_daycap_2',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-19',
    submittedAt: '2026-10-19T13:00:00Z',
    extracted: {
      merchant: { value: 'Mainland China', confidence: 0.97, inferred: false, source: 'ocr' },
      date: { value: '2026-10-19', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 1200, confidence: 0.97, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Executive Lunch Set', quantity: 1, unitPrice: 1200, amount: 1200, category: 'meals', confidence: 0.97, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 120000, targetCurrency: 'INR', targetAmountMinor: 120000, fxRate: 1.0, fxDate: '2026-10-19', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_daycap_3',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-19',
    submittedAt: '2026-10-19T16:30:00Z',
    extracted: {
      merchant: { value: 'Starbucks Indiranagar', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-19', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 550, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Iced Americano & Croissant', quantity: 1, unitPrice: 550, amount: 550, category: 'meals', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 55000, targetCurrency: 'INR', targetAmountMinor: 55000, fxRate: 1.0, fxDate: '2026-10-19', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_daycap_4',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-19',
    submittedAt: '2026-10-19T19:45:00Z',
    extracted: {
      merchant: { value: 'Chutney Chang', confidence: 0.96, inferred: false, source: 'ocr' },
      date: { value: '2026-10-19', confidence: 0.97, inferred: false, source: 'ocr' },
      total: { value: 700, confidence: 0.96, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Dinner Thali', quantity: 1, unitPrice: 700, amount: 700, category: 'meals', confidence: 0.96, itemFlags: [] },
      ],
    },
    // Cumulative spend so far: 450 + 1200 + 550 = 2200. Remaining allowance = 3000 - 2200 = 800.
    // Full 700 fits in remaining allowance (Total spend now 2900).
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 70000, targetCurrency: 'INR', targetAmountMinor: 70000, fxRate: 1.0, fxDate: '2026-10-19', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_daycap_5',
    orgId: 'org_acme',
    employeeId: 'emp_101',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-19',
    submittedAt: '2026-10-19T22:30:00Z',
    extracted: {
      merchant: { value: 'Late Night Gelato', confidence: 0.96, inferred: false, source: 'ocr' },
      date: { value: '2026-10-19', confidence: 0.97, inferred: false, source: 'ocr' },
      total: { value: 600, confidence: 0.96, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Artisan Dessert', quantity: 1, unitPrice: 600, amount: 600, category: 'meals', confidence: 0.96, itemFlags: [] },
      ],
    },
    // Cumulative spend so far: 2900. Daily cap is 3000.
    // Remaining allowance is only 100! So 100 approved, 500 rejected!
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 60000, targetCurrency: 'INR', targetAmountMinor: 60000, fxRate: 1.0, fxDate: '2026-10-19', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 20. Late Submission (> 30 days)
  // -------------------------------------------------------------------------
  {
    id: 'exp_late_submission',
    orgId: 'org_acme',
    employeeId: 'emp_105',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-08-10', // 70 days ago
    submittedAt: '2026-10-20T10:00:00Z',
    extracted: {
      merchant: { value: 'Jaipur Station Cabs', confidence: 0.96, inferred: false, source: 'ocr' },
      date: { value: '2026-08-10', confidence: 0.96, inferred: false, source: 'ocr' },
      total: { value: 750, confidence: 0.96, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Station Taxi Fare', quantity: 1, unitPrice: 750, amount: 750, category: 'transport', confidence: 0.96, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 75000, targetCurrency: 'INR', targetAmountMinor: 75000, fxRate: 1.0, fxDate: '2026-08-10', fxSource: 'printed', isInferred: false },
    context: { city: 'Jaipur', cityTier: 'Tier-3', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 21. Weekend Non-Travel Expense
  // -------------------------------------------------------------------------
  {
    id: 'exp_weekend_office',
    orgId: 'org_acme',
    employeeId: 'emp_104',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-18', // Sunday
    submittedAt: '2026-10-19T09:00:00Z',
    extracted: {
      merchant: { value: 'Cafe Peter Pune', confidence: 0.96, inferred: false, source: 'ocr' },
      date: { value: '2026-10-18', confidence: 0.97, inferred: false, source: 'ocr' },
      total: { value: 650, confidence: 0.96, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Sandwich & Coffee', quantity: 1, unitPrice: 650, amount: 650, category: 'meals', confidence: 0.96, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 65000, targetCurrency: 'INR', targetAmountMinor: 65000, fxRate: 1.0, fxDate: '2026-10-18', fxSource: 'printed', isInferred: false },
    context: { city: 'Pune', cityTier: 'Tier-2', isTravel: false, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 22. Multi-City Trip: Mumbai Flight, Hotel, Meals, Cabs
  // -------------------------------------------------------------------------
  {
    id: 'exp_trip_flight',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-21',
    submittedAt: '2026-10-21T07:00:00Z',
    extracted: {
      merchant: { value: 'IndiGo Airlines', confidence: 0.99, inferred: false, source: 'ocr' },
      date: { value: '2026-10-21', confidence: 0.99, inferred: false, source: 'ocr' },
      total: { value: 4800, confidence: 0.99, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Flight 6E-204 BOM -> BLR', quantity: 1, unitPrice: 4800, amount: 4800, category: 'travel', confidence: 0.99, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 480000, targetCurrency: 'INR', targetAmountMinor: 480000, fxRate: 1.0, fxDate: '2026-10-21', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },
  {
    id: 'exp_trip_hotel',
    orgId: 'org_acme',
    employeeId: 'emp_102',
    status: 'submitted',
    channel: 'upload',
    expenseDate: '2026-10-21',
    submittedAt: '2026-10-22T09:00:00Z',
    extracted: {
      merchant: { value: 'Lemon Tree Premier', confidence: 0.98, inferred: false, source: 'ocr' },
      date: { value: '2026-10-21', confidence: 0.98, inferred: false, source: 'ocr' },
      total: { value: 6500, confidence: 0.98, inferred: false, source: 'ocr' },
      currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' },
      lineItems: [
        { id: '1', description: 'Deluxe Room 1 Night', quantity: 1, unitPrice: 6500, amount: 6500, category: 'travel', confidence: 0.98, itemFlags: [] },
      ],
    },
    normalizedCurrency: { sourceCurrency: 'INR', sourceAmountMinor: 650000, targetCurrency: 'INR', targetAmountMinor: 650000, fxRate: 1.0, fxDate: '2026-10-21', fxSource: 'printed', isInferred: false },
    context: { city: 'Bengaluru', cityTier: 'Tier-1', isTravel: true, source: 'user' },
    integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
  },

  // -------------------------------------------------------------------------
  // 23 to 60. Touchless Clean Routine Expenses (38 claims)
  // Ensures touchless auto-approval rate is accurately >= 60%
  // -------------------------------------------------------------------------
  ...Array.from({ length: 37 }).map((_, idx) => {
    const day = String((idx % 25) + 1).padStart(2, '0');
    const empIdx = idx % 5;
    const emp = ['emp_101', 'emp_102', 'emp_103', 'emp_104', 'emp_105'][empIdx];
    const vendors = [
      { name: 'Uber India', cat: 'transport', amt: 320, desc: 'City Cab Ride' },
      { name: 'Blue Tokai Coffee', cat: 'meals', amt: 380, desc: 'Coffee & Sandwich' },
      { name: 'Amazon Web Services', cat: 'software', amt: 1250, desc: 'Dev Infrastructure' },
      { name: 'Github Inc', cat: 'software', amt: 1600, desc: 'Team Copilot Subscription' },
      { name: 'Ola Cabs', cat: 'transport', amt: 410, desc: 'Airport Shuttle' },
      { name: 'Swiggy Instamart', cat: 'supplies', amt: 290, desc: 'Office Refreshments' },
      { name: 'Fastrack Courier', cat: 'shipping', amt: 180, desc: 'Client Document Dispatch' },
    ];
    const vendor = vendors[idx % vendors.length];
    const dateStr = `2026-10-${day}`;

    return {
      id: `exp_touchless_${idx + 1}`,
      orgId: 'org_acme',
      employeeId: emp,
      status: 'submitted' as const,
      channel: 'upload' as const,
      expenseDate: dateStr,
      submittedAt: `${dateStr}T17:00:00Z`,
      extracted: {
        merchant: { value: vendor.name, confidence: 0.98, inferred: false, source: 'ocr' as const },
        date: { value: dateStr, confidence: 0.99, inferred: false, source: 'ocr' as const },
        total: { value: vendor.amt, confidence: 0.98, inferred: false, source: 'ocr' as const },
        currency: { value: 'INR', confidence: 0.99, inferred: false, source: 'ocr' as const },
        lineItems: [
          {
            id: `li_${idx + 1}`,
            description: vendor.desc,
            quantity: 1,
            unitPrice: vendor.amt,
            amount: vendor.amt,
            category: vendor.cat,
            confidence: 0.98,
            itemFlags: [],
          },
        ],
      },
      normalizedCurrency: {
        sourceCurrency: 'INR',
        sourceAmountMinor: vendor.amt * 100,
        targetCurrency: 'INR',
        targetAmountMinor: vendor.amt * 100,
        fxRate: 1.0,
        fxDate: dateStr,
        fxSource: 'printed' as const,
        isInferred: false,
      },
      context: { city: 'Bengaluru', cityTier: 'Tier-1' as const, isTravel: false, source: 'user' as const },
      integritySignals: {
        mathMismatch: false,
        taxRateAnomalous: false,
        missingDate: false,
        inferredTotal: false,
        unitemizedBalance: 0,
      },
    };
  }),
];

/**
 * Expected ground truth labels for the 60 synthetic claims
 */
export const SYNTHETIC_LABELS: Record<string, ExpectedLabel> = {
  exp_dup_original: {
    expenseId: 'exp_dup_original',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 35000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Initial clean submission of Chai Point receipt.',
  },
  exp_dup_exact_resubmit: {
    expenseId: 'exp_dup_exact_resubmit',
    expectedDecision: 'reject',
    expectedApprovedMinor: 0,
    expectedRejectedMinor: 35000,
    expectedFlags: ['CONFIRMED_DUPLICATE'],
    isDuplicate: true,
    notes: 'Identical SHA-256 hash match with earlier claim.',
  },
  exp_dup_rephoto: {
    expenseId: 'exp_dup_rephoto',
    expectedDecision: 'escalate',
    expectedApprovedMinor: 0,
    expectedRejectedMinor: 0,
    expectedFlags: ['SUSPECTED_DUPLICATE'],
    isDuplicate: true,
    notes: 'Re-photographed receipt detected via dHash Hamming distance <= 6.',
  },
  exp_shared_alice: {
    expenseId: 'exp_shared_alice',
    expectedDecision: 'approve',
    expectedApprovedMinor: 185000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'First submission of dinner at Toit.',
  },
  exp_shared_bob: {
    expenseId: 'exp_shared_bob',
    expectedDecision: 'escalate',
    expectedApprovedMinor: 0,
    expectedRejectedMinor: 0,
    expectedFlags: ['SUSPECTED_DUPLICATE'],
    isDuplicate: true,
    notes: 'Cross-employee shared expense detected (same date & vendor).',
  },
  exp_alcohol_proportional_tax: {
    expenseId: 'exp_alcohol_proportional_tax',
    expectedDecision: 'partial',
    expectedApprovedMinor: 138000,
    expectedRejectedMinor: 92000,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Alcohol (Red Wine) excluded along with proportional 40% share of tax.',
  },
  exp_under_thresh_1: {
    expenseId: 'exp_under_thresh_1',
    expectedDecision: 'approve',
    expectedApprovedMinor: 980000,
    expectedRejectedMinor: 0,
    expectedFlags: ['JUST_UNDER_THRESHOLD'],
    isDuplicate: false,
    notes: 'Claim positioned just under ₹10,000 threshold.',
  },
  exp_under_thresh_2: {
    expenseId: 'exp_under_thresh_2',
    expectedDecision: 'escalate',
    expectedApprovedMinor: 975000,
    expectedRejectedMinor: 0,
    expectedFlags: ['JUST_UNDER_THRESHOLD_CLUSTER'],
    isDuplicate: false,
    notes: 'Cluster of repeated near-threshold claims.',
  },
  exp_under_thresh_3: {
    expenseId: 'exp_under_thresh_3',
    expectedDecision: 'escalate',
    expectedApprovedMinor: 990000,
    expectedRejectedMinor: 0,
    expectedFlags: ['JUST_UNDER_THRESHOLD_CLUSTER'],
    isDuplicate: false,
    notes: 'Third claim in near-threshold cluster.',
  },
  exp_fx_usd: {
    expenseId: 'exp_fx_usd',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 726750,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'USD AWS expense converted at policy rate 85.0.',
  },
  exp_fx_eur: {
    expenseId: 'exp_fx_eur',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 598000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'EUR travel meal converted at policy rate 92.0.',
  },
  exp_math_mismatch: {
    expenseId: 'exp_math_mismatch',
    expectedDecision: 'escalate',
    expectedApprovedMinor: 0,
    expectedRejectedMinor: 0,
    expectedFlags: ['MATH_MISMATCH'],
    isDuplicate: false,
    notes: 'Printed total exceeds line item sum by 1,200.',
  },
  exp_missing_date: {
    expenseId: 'exp_missing_date',
    expectedDecision: 'needs_info',
    expectedApprovedMinor: 0,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Missing date requires employee input.',
  },
  exp_inferred_total: {
    expenseId: 'exp_inferred_total',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 109000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Total inferred from items + tax.',
  },
  exp_daycap_1: {
    expenseId: 'exp_daycap_1',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 45000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Breakfast fits within daily cap.',
  },
  exp_daycap_2: {
    expenseId: 'exp_daycap_2',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 120000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Lunch fits within daily cap (cumulative spend 1,650).',
  },
  exp_daycap_3: {
    expenseId: 'exp_daycap_3',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 55000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Afternoon coffee fits (cumulative spend 2,200).',
  },
  exp_daycap_4: {
    expenseId: 'exp_daycap_4',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 70000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Dinner fits (cumulative spend 2,900).',
  },
  exp_daycap_5: {
    expenseId: 'exp_daycap_5',
    expectedDecision: 'partial',
    expectedApprovedMinor: 10000,
    expectedRejectedMinor: 50000,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Only ₹100 of ₹600 approved as daily cap of ₹3,000 is reached.',
  },
  exp_late_submission: {
    expenseId: 'exp_late_submission',
    expectedDecision: 'approve',
    expectedApprovedMinor: 75000,
    expectedRejectedMinor: 0,
    expectedFlags: ['LATE_SUBMISSION', 'SUBMISSION_LAG'],
    isDuplicate: false,
    notes: 'Submitted 70 days after expense date.',
  },
  exp_weekend_office: {
    expenseId: 'exp_weekend_office',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 65000,
    expectedRejectedMinor: 0,
    expectedFlags: ['WEEKEND_NON_TRAVEL'],
    isDuplicate: false,
    notes: 'Weekend meal in non-travel office context.',
  },
  exp_trip_flight: {
    expenseId: 'exp_trip_flight',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 480000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Standard domestic airline fare.',
  },
  exp_trip_hotel: {
    expenseId: 'exp_trip_hotel',
    expectedDecision: 'auto_approve',
    expectedApprovedMinor: 650000,
    expectedRejectedMinor: 0,
    expectedFlags: [],
    isDuplicate: false,
    notes: 'Hotel accommodation.',
  },
};
