import { NormalizedCurrency } from '../types/expense';

export const STATIC_DEMO_FX_RATES: Record<string, number> = {
  // Rates normalized to INR base (1 Foreign Currency = X INR)
  INR: 1.0,
  USD: 85.0,
  EUR: 92.0,
  GBP: 108.0,
  CAD: 62.0,
  AUD: 55.0,
  JPY: 0.58,
  AED: 23.1,
  SGD: 64.5,
};

export interface NormalizeCurrencyOptions {
  sourceCurrency: string;
  sourceAmount: number; // e.g. 15.50
  targetCurrency: string; // e.g. "INR"
  expenseDate: string; // YYYY-MM-DD
  printedFxRate?: number;
  policyFxRates?: Record<string, number>;
}

/**
 * Deterministically normalizes amounts into base currency integer minor units (paise/cents).
 * Never silently guesses a rate; tags whether a fallback was used.
 */
export function normalizeCurrency(options: NormalizeCurrencyOptions): NormalizedCurrency {
  const {
    sourceCurrency,
    sourceAmount,
    targetCurrency,
    expenseDate,
    printedFxRate,
    policyFxRates,
  } = options;

  const cleanSourceCurr = (sourceCurrency || 'USD').toUpperCase().trim();
  const cleanTargetCurr = (targetCurrency || 'INR').toUpperCase().trim();

  // Convert source float to integer minor units (e.g. $15.50 -> 1550 cents)
  const sourceAmountMinor = Math.round(sourceAmount * 100);

  // If source and target are the same currency
  if (cleanSourceCurr === cleanTargetCurr) {
    return {
      sourceCurrency: cleanSourceCurr,
      sourceAmountMinor,
      targetCurrency: cleanTargetCurr,
      targetAmountMinor: sourceAmountMinor,
      fxRate: 1.0,
      fxDate: expenseDate,
      fxSource: 'printed',
      isInferred: false,
    };
  }

  // 1. Printed rate on receipt if explicitly provided
  if (printedFxRate && printedFxRate > 0) {
    const targetAmountMinor = Math.round(sourceAmountMinor * printedFxRate);
    return {
      sourceCurrency: cleanSourceCurr,
      sourceAmountMinor,
      targetCurrency: cleanTargetCurr,
      targetAmountMinor,
      fxRate: printedFxRate,
      fxDate: expenseDate,
      fxSource: 'printed',
      isInferred: false,
    };
  }

  // 2. Policy-defined FX table
  if (policyFxRates && policyFxRates[cleanSourceCurr]) {
    const rate = policyFxRates[cleanSourceCurr];
    const targetAmountMinor = Math.round(sourceAmountMinor * rate);
    return {
      sourceCurrency: cleanSourceCurr,
      sourceAmountMinor,
      targetCurrency: cleanTargetCurr,
      targetAmountMinor,
      fxRate: rate,
      fxDate: expenseDate,
      fxSource: 'policy',
      isInferred: false,
    };
  }

  // 3. Static demo fallback table with explicit flag
  const fallbackRate = STATIC_DEMO_FX_RATES[cleanSourceCurr] || 1.0;
  const targetAmountMinor = Math.round(sourceAmountMinor * fallbackRate);

  return {
    sourceCurrency: cleanSourceCurr,
    sourceAmountMinor,
    targetCurrency: cleanTargetCurr,
    targetAmountMinor,
    fxRate: fallbackRate,
    fxDate: expenseDate,
    fxSource: 'static_fallback',
    isInferred: true,
  };
}
