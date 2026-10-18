import { describe, it, expect, beforeEach } from 'vitest';
import { jsPDF } from 'jspdf';
import {
  extractTextFromPdfBuffer,
  extractTextFromPdfBase64,
  cleanExtractedPdfText,
} from '../src/server/pdfExtractor';
import {
  parsePolicyFromText,
  detectBaseCurrency,
  extractMinorUnits,
} from '../src/engine/policyIngestion';
import { extractTextFromPdfArrayBuffer } from '../src/utils/pdfExtractorClient';
import { extractPdfText } from '../src/services/policyService';
import {
  PolicyVersionSchema,
  evaluateExpense,
  ExpenseLedger,
  detectPolicyConflicts,
} from '../src/engine';
import { Employee, Expense } from '../src/types/expense';

describe('Policy PDF Extraction & Rule Ingestion Engine', () => {
  const samplePolicyHandbookText = `ACME GLOBAL CORP EXPENSE & REIMBURSEMENT POLICY (REV 2026.3)

SECTION 1. GENERAL PRINCIPLES & AMBIGUITY
1.1 All business expenses must be ordinary, reasonable, and directly necessary for Acme business operations.
1.2 Receipts must be submitted within 30 calendar days of the transaction date. Late submissions require finance justification.

SECTION 2. NON-REIMBURSABLE EXPENSES
2.1 Alcohol, beer, wine, spirits, tobacco products, minibar snacks, and parking or traffic fines are strictly non-reimbursable.
2.2 Associated statutory tax and tip on non-reimbursable items will be excluded proportionally.

SECTION 3. CLIENT ENTERTAINMENT & DINING
3.1 Client entertainment dinners require the client organization name, business purpose, and attendee count.
3.2 Client dining allowances scale with attendee count: up to ₹2,500 per confirmed attendee.

SECTION 4. DAILY MEAL PER-DIEM & COMMUTE CAPS
4.1 Daily meal limits on travel are determined by destination city tier:
    - Tier-1 Cities (Mumbai, Bengaluru, Delhi, Hyderabad): Capped at ₹3,000 per day.
    - Tier-2 Cities (Pune, Chennai, Kolkata, Ahmedabad): Capped at ₹1,800 per day.
    - Tier-3 Cities (Jaipur, Goa, other domestic): Capped at ₹1,200 per day.
    - International Travel: Capped at ₹6,500 per day.
4.2 Individual single-meal transactions may not exceed ₹2,000 without prior manager authorization.
4.3 Local commute and taxi charges are reimbursed up to ₹1,500 per day.

SECTION 5. APPROVAL THRESHOLDS
5.1 Standard claims below ₹10,000 are eligible for automated touchless approval.
5.2 Claims between ₹10,000 and ₹50,000 require Finance authorization.
5.3 Claims exceeding ₹50,000 require CFO executive approval.`;

  describe('1. PDF Text Extraction from Buffer and Base64', () => {
    it('generates a PDF from policy text, extracts text with PDFParse, and normalizes formatting', async () => {
      // Create a PDF document containing the sample policy text (using INR for ASCII font compatibility)
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.text('ACME GLOBAL CORP EXPENSE POLICY', 10, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const asciiPolicyText = samplePolicyHandbookText.replace(/₹/g, 'INR ');
      const splitLines = doc.splitTextToSize(asciiPolicyText, 180);
      doc.text(splitLines, 10, 25);

      const arrayBuffer = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(arrayBuffer);

      // Extract text from the PDF buffer
      const result = await extractTextFromPdfBuffer(pdfBuffer);

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(100);
      expect(result.wordCount).toBeGreaterThan(20);
      expect(result.pageCount).toBeGreaterThanOrEqual(1);

      // Verify key policy clauses were extracted from the PDF text layer
      expect(result.text).toContain('SECTION 1. GENERAL PRINCIPLES');
      expect(result.text).toContain('Tier-1 Cities');
      expect(result.text).toContain('3,000');
      expect(result.text).toContain('Alcohol');
      expect(result.text).toContain('30 calendar days');
    });

    it('extracts text from a base64 encoded data URI', async () => {
      const doc = new jsPDF();
      doc.text('Section 4.1 Tier-1 Meal Cap: 3000 INR per day.', 10, 10);
      const dataUri = doc.output('datauristring');

      const extracted = await extractTextFromPdfBase64(dataUri);
      expect(extracted.text).toContain('Section 4.1 Tier-1 Meal Cap: 3000 INR per day.');
      expect(extracted.pageCount).toBe(1);
    });

    it('cleans up pagination artifacts without altering clause content', () => {
      const dirty = `Section 1. General\nClause text\n-- 1 of 3 --\n\nPage 2 of 3\n\nSection 2. Meals\nDaily cap 3000`;
      const cleaned = cleanExtractedPdfText(dirty);
      expect(cleaned).not.toContain('-- 1 of 3 --');
      expect(cleaned).not.toContain('Page 2 of 3');
      expect(cleaned).toContain('Section 1. General');
      expect(cleaned).toContain('Section 2. Meals');
    });

    it('extracts text directly from an ArrayBuffer using client-side pdfjs extractor', async () => {
      const doc = new jsPDF();
      doc.text('Client Extraction Test: Flight travel must be booked 14 days in advance.', 10, 10);
      const arrayBuffer = doc.output('arraybuffer');

      const clientResult = await extractTextFromPdfArrayBuffer(arrayBuffer);
      expect(clientResult.text).toContain('Flight travel must be booked 14 days in advance.');
      expect(clientResult.pageCount).toBe(1);
      expect(clientResult.wordCount).toBeGreaterThan(5);
    });

    it('extractPdfText seamlessly extracts text using dual-mode fallback', async () => {
      const doc = new jsPDF();
      doc.text('Dual Mode Test: Cab reimbursement capped at 1500 INR.', 10, 10);
      const dataUri = doc.output('datauristring');
      const arrayBuffer = doc.output('arraybuffer');

      const result = await extractPdfText(dataUri, 'policy_test.pdf', arrayBuffer);
      expect(result.text).toContain('Cab reimbursement capped at 1500 INR.');
      expect(result.pageCount).toBe(1);
    });
  });

  describe('2. Structured Policy Rule Synthesis from Extracted Text', () => {
    it('detects base currency and minor unit conversions accurately', () => {
      expect(detectBaseCurrency('Meal allowance capped at ₹3,000 per day')).toBe('INR');
      expect(detectBaseCurrency('Meal allowance capped at $75 per day')).toBe('USD');
      expect(detectBaseCurrency('Meal allowance capped at 80 EUR per day')).toBe('EUR');

      expect(extractMinorUnits('₹3,000 per day', 'INR')).toBe(300000);
      expect(extractMinorUnits('capped at 1,800 INR', 'INR')).toBe(180000);
      expect(extractMinorUnits('Claims exceeding 50,000', 'INR')).toBe(5000000);
    });

    it('synthesizes a complete, validated PolicyVersion with all rule types from extracted text', () => {
      const parsed = parsePolicyFromText(samplePolicyHandbookText, {
        policyName: 'Acme Ingested Policy 2026',
      });

      const policy = parsed.policy;
      expect(policy.name).toBe('Acme Ingested Policy 2026');
      expect(policy.status).toBe('draft');
      expect(policy.settings.baseCurrency).toBe('INR');
      expect(policy.settings.lateSubmissionWindowDays).toBe(30);

      // Validate schema
      const validation = PolicyVersionSchema.safeParse(policy);
      expect(validation.success).toBe(true);

      // Verify Rule Counts
      expect(policy.rules.length).toBeGreaterThanOrEqual(8);

      // Check Exclusions (Alcohol, Tobacco, Minibar, Fines)
      const exclRule = policy.rules.find((r) => r.type === 'exclusion');
      expect(exclRule).toBeDefined();
      expect(exclRule?.priority).toBe(10);
      expect(exclRule?.enabled).toBe(true);
      expect(exclRule?.parameters.excludedItems).toContain('beer');
      expect(exclRule?.parameters.excludedItems).toContain('tobacco');
      expect(exclRule?.parameters.allocateTaxTipProportionally).toBe(true);
      expect(exclRule?.sourceQuote).toBeDefined();

      // Check Tier-1 Meal Cap
      const tier1Rule = policy.rules.find((r) => r.id.includes('cap_meal_tier1'));
      expect(tier1Rule).toBeDefined();
      expect(tier1Rule?.parameters.capAmountMinor).toBe(300000); // ₹3,000
      expect(tier1Rule?.parameters.capPeriod).toBe('day');
      expect(tier1Rule?.conditions.cityTier).toContain('Tier-1');
      expect(tier1Rule?.sourceQuote).toContain('Tier-1 Cities');

      // Check Single-Meal Cap
      const singleMealRule = policy.rules.find((r) => r.id.includes('cap_single_meal'));
      expect(singleMealRule).toBeDefined();
      expect(singleMealRule?.parameters.capAmountMinor).toBe(200000); // ₹2,000
      expect(singleMealRule?.parameters.capPeriod).toBe('per_claim');

      // Check Ground Commute / Taxi Cap
      const commuteRule = policy.rules.find((r) => r.id.includes('cap_transport'));
      expect(commuteRule).toBeDefined();
      expect(commuteRule?.parameters.capAmountMinor).toBe(150000); // ₹1,500
      expect(commuteRule?.conditions.category).toContain('transportation');

      // Check Client Entertainment Requirements and Attendee Cap
      const clientReqRule = policy.rules.find((r) => r.type === 'requirement');
      expect(clientReqRule).toBeDefined();
      expect(clientReqRule?.parameters.requiredFields).toContain('clientName');
      expect(clientReqRule?.parameters.requiredFields).toContain('attendeeCount');

      const clientAttendeeRule = policy.rules.find((r) => r.id.includes('cap_client_attendee'));
      expect(clientAttendeeRule).toBeDefined();
      expect(clientAttendeeRule?.parameters.capAmountMinor).toBe(250000); // ₹2,500
      expect(clientAttendeeRule?.parameters.perAttendeeMultiplier).toBe(true);

      // Check Approval Thresholds
      const financeThreshRule = policy.rules.find((r) => r.parameters.thresholdLevel === 'finance');
      expect(financeThreshRule).toBeDefined();
      expect(financeThreshRule?.parameters.thresholdAmountMinor).toBe(1000000); // ₹10,000

      const cfoThreshRule = policy.rules.find((r) => r.parameters.thresholdLevel === 'cfo');
      expect(cfoThreshRule).toBeDefined();
      expect(cfoThreshRule?.parameters.thresholdAmountMinor).toBe(5000000); // ₹50,000

      // Check Submission Window
      const windowRule = policy.rules.find((r) => r.type === 'time_window');
      expect(windowRule).toBeDefined();
      expect(windowRule?.parameters.timeWindowDays).toBe(30);

      // Check Ambiguous Clause (must be disabled with ambiguityNote)
      const ambigRule = policy.rules.find((r) => r.isAmbiguous);
      expect(ambigRule).toBeDefined();
      expect(ambigRule?.enabled).toBe(false);
      expect(ambigRule?.ambiguityNote).toBeDefined();
      expect(ambigRule?.sourceQuote).toContain('ordinary, reasonable');

      // Check bidirectional paragraph index linking
      policy.rules.forEach((rule) => {
        expect(rule.sourceParagraphIndex).toBeDefined();
        expect(rule.sourceQuote).toBeDefined();
      });
    });
  });

  describe('3. Deterministic Evaluation against Synthesized Policy', () => {
    let synthesizedPolicy: any;
    let employee: Employee;
    let ledger: ExpenseLedger;

    beforeEach(() => {
      ledger = new ExpenseLedger();
      employee = {
        id: 'emp_202',
        orgId: 'org_acme',
        identity: { email: 'john@acme.com', name: 'John Doe' },
        role: 'employee',
        department: 'Sales',
        grade: 'L4',
        homeCity: 'Mumbai',
      };

      const parsed = parsePolicyFromText(samplePolicyHandbookText, {
        policyName: 'Live Synthesized Acme Policy',
      });
      synthesizedPolicy = parsed.policy;
    });

    it('enforces alcohol exclusion with proportional tax and tip deduction on the synthesized policy', () => {
      const expense: Expense = {
        id: 'exp_synth_1',
        orgId: 'org_acme',
        employeeId: employee.id,
        expenseDate: '2026-10-15',
        submittedAt: '2026-10-16T10:00:00Z',
        channel: 'upload',
        status: 'submitted',
        integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
        normalizedCurrency: {
          sourceCurrency: 'INR',
          sourceAmountMinor: 350000,
          targetCurrency: 'INR',
          targetAmountMinor: 350000,
          fxRate: 1.0,
          fxDate: '2026-10-15',
          fxSource: 'policy',
          isInferred: false,
        },
        receiptRef: { mimeType: 'image/jpeg', originalSha256: 'h1', fileSize: 1000 },
        context: { isTravel: true, city: 'Mumbai', cityTier: 'Tier-1', source: 'user' },
        extracted: {
          total: { value: 3500, confidence: 0.95, inferred: false, source: 'ocr' },
          currency: { value: 'INR', confidence: 0.95, inferred: false, source: 'ocr' },
          date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
          merchant: { value: 'Smoke House Deli', confidence: 0.95, inferred: false, source: 'ocr' },
          tax: { value: 500, confidence: 0.9, inferred: false, source: 'ocr' },
          lineItems: [
            { id: '1', description: 'Grilled Salmon', category: 'meals', quantity: 1, unitPrice: 2000, amount: 2000, confidence: 0.9, itemFlags: [] },
            { id: '2', description: 'Craft Beer', category: 'meals', quantity: 2, unitPrice: 500, amount: 1000, confidence: 0.95, itemFlags: ['alcohol'] },
          ],
        },
      };

      const verdict = evaluateExpense({
        expense,
        policy: synthesizedPolicy,
        employee,
        ledger,
      });

      // Beer is ₹1,000 + ₹166.67 proportional tax = ₹1,167 excluded
      expect(verdict.rejectedAmountMinor).toBeGreaterThan(100000);
      expect(verdict.ruleImpacts.some((i) => i.impactType === 'exclusion')).toBe(true);
      expect(verdict.approvedAmountMinor).toBeLessThan(350000);
    });

    it('enforces Tier-1 daily meal cap extracted from the document', () => {
      const expense: Expense = {
        id: 'exp_synth_2',
        orgId: 'org_acme',
        employeeId: employee.id,
        expenseDate: '2026-10-15',
        submittedAt: '2026-10-16T12:00:00Z',
        channel: 'upload',
        status: 'submitted',
        integritySignals: { mathMismatch: false, taxRateAnomalous: false, missingDate: false, inferredTotal: false, unitemizedBalance: 0 },
        normalizedCurrency: {
          sourceCurrency: 'INR',
          sourceAmountMinor: 450000,
          targetCurrency: 'INR',
          targetAmountMinor: 450000,
          fxRate: 1.0,
          fxDate: '2026-10-15',
          fxSource: 'policy',
          isInferred: false,
        },
        receiptRef: { mimeType: 'image/jpeg', originalSha256: 'h2', fileSize: 1000 },
        context: { isTravel: true, city: 'Bengaluru', cityTier: 'Tier-1', source: 'user' },
        extracted: {
          total: { value: 4500, confidence: 0.95, inferred: false, source: 'ocr' },
          currency: { value: 'INR', confidence: 0.95, inferred: false, source: 'ocr' },
          date: { value: '2026-10-15', confidence: 0.95, inferred: false, source: 'ocr' },
          merchant: { value: 'Grand Hyatt Dining', confidence: 0.95, inferred: false, source: 'ocr' },
          lineItems: [
            { id: '1', description: 'Team Dinner Food Platter', category: 'meals', quantity: 1, unitPrice: 4500, amount: 4500, confidence: 0.95, itemFlags: [] },
          ],
        },
      };

      const verdict = evaluateExpense({
        expense,
        policy: synthesizedPolicy,
        employee,
        ledger,
      });

      // Governed by the most restrictive simultaneous cap: Single-Meal Limit (₹2,000 / 200,000 minor units)
      expect(verdict.approvedAmountMinor).toBe(200000);
      expect(verdict.rejectedAmountMinor).toBe(250000);
      expect(verdict.decision).toBe('partial');
      expect(verdict.ruleImpacts.some((i) => i.title === 'Single-Meal Transaction Limit')).toBe(true);
    });
  });
});
