import { Expense, RiskFlag } from '../types/expense';

export interface AnomalyEvaluationContext {
  expense: Expense;
  historicalExpenses?: Expense[];
  thresholdAmountMinor?: number;
}

export interface AnomalyScoreResult {
  riskScore: number; // 0..100
  riskBand: 'low' | 'medium' | 'high';
  flags: RiskFlag[];
  neutralExplanations: string[];
}

/**
 * Pure deterministic explainable anomaly risk scorer.
 * Uses calibrated, weighted signals capped at 100 with strictly neutral language.
 * Never accuses or uses the word "fraud".
 */
export function calculateAnomalyRisk(context: AnomalyEvaluationContext): AnomalyScoreResult {
  const { expense, historicalExpenses = [], thresholdAmountMinor = 1000000 } = context;
  const flags: RiskFlag[] = [];
  const explanations: string[] = [];

  const amountMinor = expense.normalizedCurrency?.targetAmountMinor || 0;
  const dateStr = expense.expenseDate;
  const isTravel = Boolean(expense.context?.isTravel);
  const employeeId = expense.employeeId;

  // Signal 1: Suspected Duplicate (+40)
  if (expense.duplicateInfo && expense.duplicateInfo.highestScore >= 0.70 && expense.duplicateInfo.resolutionStatus !== 'dismissed') {
    flags.push({
      code: 'SUSPECTED_DUPLICATE',
      label: 'Suspected Duplicate Submission',
      severity: 'high',
      explanation: expense.duplicateInfo.evidenceSummary,
      weight: 40,
    });
    explanations.push('Receipt exhibits similarity to another submitted document; review recommended.');
  }

  // Signal 2: Math Discrepancy (+20)
  if (expense.integritySignals?.mathMismatch) {
    flags.push({
      code: 'MATH_MISMATCH',
      label: 'Receipt Math Discrepancy',
      severity: 'medium',
      explanation: 'Itemized lines sum does not match printed receipt total within tolerance.',
      weight: 20,
    });
    explanations.push('Printed line items do not sum up to the recorded total.');
  }

  // Signal 3: Suspected Tampering (+30)
  if (expense.extracted?.imageQualityHints?.tamperingSuspected || expense.integritySignals?.tamperingSuspected) {
    flags.push({
      code: 'SUSPECTED_TAMPERING',
      label: 'Document Integrity Flag',
      severity: 'high',
      explanation: 'Visual artifacts or font inconsistency detected on printed figures.',
      weight: 30,
    });
    explanations.push('Document contains visual inconsistencies that warrant manual verification.');
  }

  // Signal 4: Round Amount Without Tax (+8)
  const isRoundAmount = amountMinor > 0 && amountMinor % 10000 === 0; // whole hundreds (e.g. 500.00, 1000.00)
  const hasZeroTax = (expense.extracted?.tax?.value ?? 0) === 0 && (expense.corrected?.tax ?? 0) === 0;
  if (isRoundAmount && hasZeroTax && amountMinor > 100000) {
    flags.push({
      code: 'ROUND_AMOUNT_NO_TAX',
      label: 'Round Amount Without Itemized Tax',
      severity: 'low',
      explanation: 'Total is an exact round figure without itemized tax or tip.',
      weight: 8,
    });
    explanations.push('Claim is a round integer amount with no recorded tax breakdown.');
  }

  // Signal 5: Weekend Expense without Travel Context (+10)
  if (dateStr) {
    const dayOfWeek = new Date(dateStr + 'T00:00:00Z').getUTCDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !isTravel) {
      flags.push({
        code: 'WEEKEND_NON_TRAVEL',
        label: 'Weekend Incurred (Office Context)',
        severity: 'low',
        explanation: 'Expense occurred over the weekend outside of registered travel dates.',
        weight: 10,
      });
      explanations.push('Expense occurred on a weekend without travel context.');
    }
  }

  // Signal 6: Repeated Just-Under-Threshold Claims (+20 / +35)
  // Check if this employee submitted claims within 5% below thresholdAmountMinor in past 30 days
  if (thresholdAmountMinor > 0 && historicalExpenses.length > 0) {
    const lowerBand = thresholdAmountMinor * 0.90;
    const isJustUnder = amountMinor >= lowerBand && amountMinor < thresholdAmountMinor;

    if (isJustUnder) {
      const pastJustUnder = historicalExpenses.filter((h) => {
        if (h.employeeId !== employeeId || h.id === expense.id) return false;
        const amt = h.normalizedCurrency?.targetAmountMinor || 0;
        return amt >= lowerBand && amt < thresholdAmountMinor;
      });

      if (pastJustUnder.length >= 2) {
        flags.push({
          code: 'JUST_UNDER_THRESHOLD_CLUSTER',
          label: 'Pattern of Near-Threshold Submissions',
          severity: 'high',
          explanation: `Multiple previous claims (${pastJustUnder.length}) submitted just under policy review threshold.`,
          weight: 35,
        });
        explanations.push(`Multiple claims submitted close to the review threshold (${(thresholdAmountMinor / 100).toFixed(0)}).`);
      } else if (pastJustUnder.length === 1) {
        flags.push({
          code: 'JUST_UNDER_THRESHOLD',
          label: 'Near Review Threshold',
          severity: 'medium',
          explanation: `Claim amount is within 10% below the approval threshold.`,
          weight: 20,
        });
        explanations.push('Claim is positioned just under the mandatory threshold limit.');
      }
    }
  }

  // Signal 7: Late Submission Lag > 30 Days (+10)
  if (expense.expenseDate && expense.submittedAt) {
    const expDate = new Date(expense.expenseDate).getTime();
    const subDate = new Date(expense.submittedAt).getTime();
    const lagDays = Math.floor((subDate - expDate) / (1000 * 60 * 60 * 24));
    if (lagDays > 30) {
      flags.push({
        code: 'SUBMISSION_LAG',
        label: `Submission Lag (${lagDays} days)`,
        severity: 'low',
        explanation: `Submitted ${lagDays} days after receipt date.`,
        weight: 10,
      });
      explanations.push(`Submitted ${lagDays} days after expense date.`);
    }
  }

  // Signal 8: Poor Legibility on High-Value Claim (+10)
  if (amountMinor > 500000) { // > ₹5,000 / $50
    const conf = expense.extracted?.total?.confidence ?? 1.0;
    if (conf < 0.70 || expense.extracted?.imageQualityHints?.isBlurry) {
      flags.push({
        code: 'LOW_LEGIBILITY_HIGH_VALUE',
        label: 'Low Legibility on Significant Claim',
        severity: 'medium',
        explanation: 'Receipt scan is blurred or low confidence on an amount exceeding threshold.',
        weight: 10,
      });
      explanations.push('Receipt legibility is low on a higher-value expense.');
    }
  }

  const rawSum = flags.reduce((acc, f) => acc + f.weight, 0);
  const riskScore = Math.min(100, Math.max(0, rawSum));
  const riskBand: 'low' | 'medium' | 'high' =
    riskScore >= 60 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

  return {
    riskScore,
    riskBand,
    flags,
    neutralExplanations: explanations,
  };
}
