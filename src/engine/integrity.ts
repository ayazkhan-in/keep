import { IntegritySignals, LineItem } from '../types/expense';

export interface IntegrityCheckInput {
  printedTotal?: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  lineItems: LineItem[];
  expenseDate?: string;
}

export interface IntegrityCheckResult {
  signals: IntegritySignals;
  computedTotal: number;
  difference: number;
  calculatedTaxRate: number;
  unitemizedAmount: number;
  explanation: string[];
}

/**
 * Pure deterministic arithmetic integrity checks.
 * Compares itemized sum, tax, and tip to printed total.
 */
export function verifyReceiptIntegrity(input: IntegrityCheckInput): IntegrityCheckResult {
  const { printedTotal, tax = 0, tip = 0, lineItems, expenseDate } = input;
  const explanations: string[] = [];

  const itemsSum = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const computedTotal = Number((itemsSum + tax + tip).toFixed(2));

  let mathMismatch = false;
  let difference = 0;

  if (printedTotal !== undefined && printedTotal !== null && printedTotal > 0) {
    difference = Number(Math.abs(printedTotal - computedTotal).toFixed(2));
    const tolerance = Math.max(0.5, printedTotal * 0.01); // 1% or 50 cents/paise

    if (lineItems.length > 0 && difference > tolerance) {
      mathMismatch = true;
      explanations.push(
        `Itemized sum + tax/tip (${computedTotal.toFixed(2)}) differs from printed total (${printedTotal.toFixed(2)}) by ${difference.toFixed(2)}.`
      );
    }
  }

  // Tax rate check: tax / subtotal (or tax / itemsSum)
  let taxRateAnomalous = false;
  let calculatedTaxRate = 0;
  const baseForTax = itemsSum > 0 ? itemsSum : (printedTotal || 0) - tax - tip;

  if (baseForTax > 0 && tax > 0) {
    calculatedTaxRate = Number((tax / baseForTax).toFixed(4));
    // Plausible tax bracket: 0% to 30%
    if (calculatedTaxRate > 0.35) {
      taxRateAnomalous = true;
      explanations.push(
        `Calculated tax rate of ${(calculatedTaxRate * 100).toFixed(1)}% exceeds standard 0–30% statutory range.`
      );
    }
  }

  // Unitemized balance: if printedTotal > itemsSum + tax + tip
  let unitemizedAmount = 0;
  if (printedTotal && itemsSum > 0 && printedTotal > computedTotal) {
    unitemizedAmount = Number((printedTotal - computedTotal).toFixed(2));
    if (unitemizedAmount > 1.0) {
      explanations.push(
        `Partially itemized receipt: ${unitemizedAmount.toFixed(2)} unitemized balance remains.`
      );
    }
  }

  // Missing date check: never silently use today
  const missingDate = !expenseDate || expenseDate.trim() === '' || expenseDate.toLowerCase().includes('unknown');
  if (missingDate) {
    explanations.push('Receipt date could not be determined; manual entry required.');
  }

  // Inferred total check: when printed total is missing but items are present
  const inferredTotal = (!printedTotal || printedTotal <= 0) && itemsSum > 0;
  if (inferredTotal) {
    explanations.push(`Printed total was missing; inferred as ${computedTotal.toFixed(2)} from line items and tax.`);
  }

  return {
    signals: {
      mathMismatch,
      taxRateAnomalous,
      missingDate,
      inferredTotal,
      unitemizedBalance: unitemizedAmount,
    },
    computedTotal,
    difference,
    calculatedTaxRate,
    unitemizedAmount,
    explanation: explanations,
  };
}
