import express, { Request, Response } from 'express';
import crypto from 'crypto';
import {
  evaluateExpense,
  ExpenseLedger,
  detectDuplicates,
  calculateAnomalyRisk,
  normalizeCurrency,
  verifyReceiptIntegrity,
  bundleExpensesIntoTrips,
  simulatePolicyChange,
  detectPolicyConflicts,
  PolicyVersionSchema,
} from '../engine';
import { getActivePolicy, queryPolicyGrounded } from '../services/policyService';
import { DEMO_EMPLOYEES } from '../services/employeeService';
import { Expense, PolicyVersion } from '../types/expense';

const router = express.Router();

/**
 * Server-authoritative SHA-256 hash calculation
 */
function computeSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministic perceptual 64-bit dHash simulation from image base64
 */
function computeDHash(cleanBase64: string): string {
  const hash = crypto.createHash('md5').update(cleanBase64.slice(0, 1000)).digest('hex');
  return hash.slice(0, 16); // 16-hex characters = 64 bits
}

// ---------------------------------------------------------------------------
// 1. Authoritative Expense Evaluation
// ---------------------------------------------------------------------------
router.post('/api/expense/evaluate', (req: Request, res: Response) => {
  try {
    const { expense, policy = getActivePolicy(), existingExpenses = [] } = req.body;
    if (!expense) {
      return res.status(400).json({ ok: false, error: 'Missing expense payload' });
    }

    const employee =
      DEMO_EMPLOYEES.find((e) => e.id === expense.employeeId) || DEMO_EMPLOYEES[0];

    // Authoritative FX normalization
    const rawTotal = expense.corrected?.total ?? expense.extracted?.total?.value ?? 0;
    const rawCurr = expense.corrected?.currency ?? expense.extracted?.currency?.value ?? 'INR';
    const normalizedCurrency = normalizeCurrency({
      sourceCurrency: rawCurr,
      sourceAmount: rawTotal,
      targetCurrency: policy.settings.baseCurrency,
      expenseDate: expense.expenseDate,
      policyFxRates: policy.settings.fxRates,
    });
    expense.normalizedCurrency = normalizedCurrency;

    // Authoritative Arithmetic Integrity Check
    const lineItems = expense.corrected?.lineItems || expense.extracted?.lineItems || [];
    const tax = expense.corrected?.tax ?? expense.extracted?.tax?.value;
    const tip = expense.corrected?.tip ?? expense.extracted?.tip?.value;
    const integrityResult = verifyReceiptIntegrity({
      printedTotal: rawTotal,
      tax,
      tip,
      lineItems,
      expenseDate: expense.expenseDate,
    });
    expense.integritySignals = integrityResult.signals;

    // Authoritative Duplicate Detection
    const duplicateInfo = detectDuplicates({
      currentExpense: expense,
      existingExpenses,
    });
    expense.duplicateInfo = duplicateInfo;

    // Authoritative Anomaly Risk Scoring
    const riskResult = calculateAnomalyRisk({
      expense,
      historicalExpenses: existingExpenses,
      thresholdAmountMinor: 1000000,
    });

    // Populate chronological ledger from existing expenses
    const ledger = new ExpenseLedger();
    for (const exp of existingExpenses) {
      if (exp.id !== expense.id && (exp.verdict?.approvedAmountMinor || 0) > 0) {
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
      expense,
      policy,
      employee,
      ledger,
    });

    return res.json({
      ok: true,
      data: {
        verdict,
        normalizedCurrency,
        integritySignals: integrityResult.signals,
        duplicateInfo,
        riskScore: riskResult.riskScore,
        riskBand: riskResult.riskBand,
      },
    });
  } catch (error: any) {
    console.error('Server evaluation error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 2. Chronological Replay
// ---------------------------------------------------------------------------
router.post('/api/expense/replay', (req: Request, res: Response) => {
  try {
    const { expenses, policy = getActivePolicy() } = req.body;
    if (!Array.isArray(expenses)) {
      return res.status(400).json({ ok: false, error: 'Expected expenses array' });
    }

    const ledger = new ExpenseLedger();
    let reflowCount = 0;

    const sorted = [...expenses].sort((a, b) => {
      if (a.expenseDate !== b.expenseDate) return a.expenseDate.localeCompare(b.expenseDate);
      if (a.submittedAt !== b.submittedAt) return a.submittedAt.localeCompare(b.submittedAt);
      return a.id.localeCompare(b.id);
    });

    for (const exp of sorted) {
      const employee =
        DEMO_EMPLOYEES.find((e) => e.id === exp.employeeId) || DEMO_EMPLOYEES[0];

      const priorVerdict = exp.verdict;
      const newVerdict = evaluateExpense({
        expense: exp,
        policy,
        employee,
        ledger,
      });

      if (
        priorVerdict &&
        (priorVerdict.approvedAmountMinor !== newVerdict.approvedAmountMinor ||
          priorVerdict.decision !== newVerdict.decision)
      ) {
        reflowCount++;
      }

      exp.verdict = newVerdict;
      exp.status = newVerdict.status;

      ledger.record({
        expenseId: exp.id,
        employeeId: exp.employeeId,
        expenseDate: exp.expenseDate,
        submittedAt: exp.submittedAt,
        category: exp.extracted?.lineItems?.[0]?.category || 'General',
        city: exp.context?.city,
        tripId: exp.context?.tripId,
        approvedAmountMinor: newVerdict.approvedAmountMinor,
        status: newVerdict.status,
        verdictDecision: newVerdict.decision,
        isOverride: false,
      });
    }

    return res.json({ ok: true, data: { reflowCount, expenses: sorted } });
  } catch (error: any) {
    console.error('Server replay error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Duplicate Detection Check
// ---------------------------------------------------------------------------
router.post('/api/expense/duplicate-check', (req: Request, res: Response) => {
  try {
    const { currentExpense, existingExpenses = [] } = req.body;
    const dupInfo = detectDuplicates({
      currentExpense,
      existingExpenses,
    });
    return res.json({ ok: true, data: dupInfo });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Anomaly Risk Scoring
// ---------------------------------------------------------------------------
router.post('/api/expense/fraud-score', (req: Request, res: Response) => {
  try {
    const { expense, historicalExpenses = [], thresholdAmountMinor = 1000000 } = req.body;
    const risk = calculateAnomalyRisk({
      expense,
      historicalExpenses,
      thresholdAmountMinor,
    });
    return res.json({ ok: true, data: risk });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Grounded Verdict Explanation (No AI number fabrication)
// ---------------------------------------------------------------------------
router.post('/api/expense/explain', (req: Request, res: Response) => {
  try {
    const { verdict, expense } = req.body;
    if (!verdict) return res.status(400).json({ ok: false, error: 'Verdict required' });

    const parts: string[] = [];
    const curr = expense?.normalizedCurrency?.targetCurrency || 'INR';

    if (verdict.decision === 'auto_approve') {
      parts.push(`Claim of ${(verdict.totalAmountMinor / 100).toFixed(2)} ${curr} was auto-approved touchlessly.`);
      parts.push('All line items comply with standard category limits and OCR confidence is high.');
    } else if (verdict.decision === 'partial') {
      parts.push(`Claim of ${(verdict.totalAmountMinor / 100).toFixed(2)} ${curr} was partially approved for ${(verdict.approvedAmountMinor / 100).toFixed(2)} ${curr}.`);
      if (verdict.rejectedAmountMinor > 0) {
        parts.push(`${(verdict.rejectedAmountMinor / 100).toFixed(2)} ${curr} was excluded or capped based on policy.`);
      }
    } else if (verdict.decision === 'needs_info') {
      parts.push(`Claim is held in pending status because required information is missing: ${verdict.missingFields?.join(', ')}.`);
    } else if (verdict.decision === 'reject') {
      parts.push(`Claim was rejected: ${(verdict.rejectedAmountMinor / 100).toFixed(2)} ${curr} is non-reimbursable.`);
    } else {
      parts.push(`Claim escalated to Finance for manual review based on verification signals.`);
    }

    if (verdict.ruleImpacts && verdict.ruleImpacts.length > 0) {
      parts.push('\nRelevant Policy Rules:');
      for (const r of verdict.ruleImpacts) {
        parts.push(`• ${r.section} - ${r.title}: "${r.sourceQuote || r.explanation}"`);
      }
    }

    return res.json({ ok: true, data: { explanation: parts.join('\n') } });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Fix-It Loop: Generate Missing Info Query
// ---------------------------------------------------------------------------
router.post('/api/expense/query-employee', (req: Request, res: Response) => {
  try {
    const { missingFields, merchant, expenseDate } = req.body;
    const msg = `Hi! Regarding your claim at ${merchant || 'the vendor'} on ${expenseDate || 'your receipt'}: policy requires ${missingFields?.join(', ')} before we can process reimbursement. Please reply with these details so we can update and approve your claim.`;
    return res.json({ ok: true, data: { message: msg } });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Fix-It Loop: Parse Employee Reply into Typed Context Patch
// ---------------------------------------------------------------------------
router.post('/api/expense/parse-reply', (req: Request, res: Response) => {
  try {
    const { replyText } = req.body;
    if (!replyText) return res.status(400).json({ ok: false, error: 'Reply text required' });

    const patch: Record<string, any> = {};

    // Attendee count heuristic: "3 people", "4 attendees", "2 of us"
    const attendeeMatch = replyText.match(/(\d+)\s*(people|attendees|colleagues|guests|of us)/i);
    if (attendeeMatch) {
      patch.attendeeCount = parseInt(attendeeMatch[1], 10);
    }

    // Client organization heuristic: "with Client X", "client was Y"
    const clientMatch = replyText.match(/(?:with|client|customer)\s+([A-Z][a-zA-Z0-9\s&]+?)(?:,|\.|\s+and|\s+for|\s+regarding)/i);
    if (clientMatch) {
      patch.clientName = clientMatch[1].trim();
    } else if (replyText.length > 5) {
      patch.clientName = replyText.split(/[\n,.]/)[0].slice(0, 50).trim();
    }

    // Purpose heuristic
    patch.purpose = replyText.slice(0, 120).trim();

    return res.json({
      ok: true,
      data: {
        proposedPatch: patch,
        confirmationSummary: `Proposed update: Client Name: "${patch.clientName || 'Provided'}", Attendees: ${patch.attendeeCount || 2}, Purpose: "${patch.purpose}".`,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 8. Policy Ingestion, Conflict Checking & Grounded QA
// ---------------------------------------------------------------------------
router.post('/api/policy/conflicts', (req: Request, res: Response) => {
  try {
    const policy = req.body.policy || getActivePolicy();
    const warnings = detectPolicyConflicts(policy);
    return res.json({ ok: true, data: { warnings } });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/api/policy/qa', (req: Request, res: Response) => {
  try {
    const { question, policy = getActivePolicy() } = req.body;
    if (!question) return res.status(400).json({ ok: false, error: 'Question required' });
    const result = queryPolicyGrounded(question, policy);
    return res.json({ ok: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 9. Trip Bundling
// ---------------------------------------------------------------------------
router.post('/api/trips/bundle', (req: Request, res: Response) => {
  try {
    const { expenses, cityTiers = getActivePolicy().cityTiers } = req.body;
    const trips = bundleExpensesIntoTrips({
      expenses: expenses || [],
      cityTiers,
    });
    return res.json({ ok: true, data: { trips } });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 10. Policy Simulator
// ---------------------------------------------------------------------------
router.post('/api/finance/simulate', (req: Request, res: Response) => {
  try {
    const { activePolicy, draftPolicy, expenses, employees = DEMO_EMPLOYEES } = req.body;
    if (!activePolicy || !draftPolicy) {
      return res.status(400).json({ ok: false, error: 'Both activePolicy and draftPolicy are required' });
    }
    const simulation = simulatePolicyChange({
      activePolicy,
      draftPolicy,
      expenses: expenses || [],
      employees,
    });
    return res.json({ ok: true, data: simulation });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// ---------------------------------------------------------------------------
// 11. Batch CSV Export
// ---------------------------------------------------------------------------
router.post('/api/finance/batch-export', (req: Request, res: Response) => {
  try {
    const { expenses = [] } = req.body;
    const headers = [
      'Claim ID',
      'Employee ID',
      'Expense Date',
      'Merchant',
      'Category',
      'Currency',
      'Claimed Amount',
      'Approved Amount',
      'Status',
      'Decision',
      'Risk Score',
      'Payment Status',
    ];

    const rows = expenses.map((e: Expense) => {
      const amtClaimed = ((e.normalizedCurrency?.targetAmountMinor || 0) / 100).toFixed(2);
      const amtApproved = ((e.verdict?.approvedAmountMinor || 0) / 100).toFixed(2);
      return [
        `"${e.id}"`,
        `"${e.employeeId}"`,
        `"${e.expenseDate}"`,
        `"${(e.extracted?.merchant?.value || e.corrected?.merchant || '').replace(/"/g, '""')}"`,
        `"${e.extracted?.lineItems?.[0]?.category || 'General'}"`,
        `"${e.normalizedCurrency?.targetCurrency || 'INR'}"`,
        amtClaimed,
        amtApproved,
        `"${e.status}"`,
        `"${e.verdict?.decision || 'pending'}"`,
        e.verdict?.riskScore ?? 0,
        `"${e.status === 'paid' ? 'Paid' : 'Ready for Payment'}"`,
      ].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('\n');
    return res.json({
      ok: true,
      data: {
        csvString,
        recordCount: expenses.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export { router as expenseRoutes };
export default router;
