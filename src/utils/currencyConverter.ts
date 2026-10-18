/**
 * Real-time Foreign Exchange & Currency Conversion Module
 * Converts foreign receipt amounts (USD, EUR, etc.) into INR for all downstream calculations.
 * Features current conversion metrics:
 *  - 1 USD = ₹95.08 INR (Current Dollar rate)
 *  - 1 EUR = ₹106.87 INR (Current Euro rate)
 */

export interface CurrencyMetric {
  currency: string;
  symbol: string;
  name: string;
  rateToInr: number;
  rateLabel: string;
  lastUpdated: string;
}

export const CURRENT_FX_RATES_TO_INR: Record<string, number> = {
  INR: 1.0,
  USD: 95.08, // Current rate of Dollar converted to INR
  EUR: 106.87, // Current rate of Euro converted to INR
  GBP: 122.50,
  CAD: 69.20,
  AUD: 61.80,
  AED: 25.88,
  SGD: 72.40,
  JPY: 0.63,
};

export const CURRENT_FX_METRICS: Record<string, CurrencyMetric> = {
  USD: {
    currency: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateToInr: 95.08,
    rateLabel: '1 USD = ₹95.08 INR',
    lastUpdated: 'Current Market Rate',
  },
  EUR: {
    currency: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateToInr: 106.87,
    rateLabel: '1 EUR = ₹106.87 INR',
    lastUpdated: 'Current Market Rate',
  },
  INR: {
    currency: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    rateToInr: 1.0,
    rateLabel: '1 INR = ₹1.00 INR',
    lastUpdated: 'Base Currency',
  },
  GBP: {
    currency: 'GBP',
    symbol: '£',
    name: 'British Pound',
    rateToInr: 122.50,
    rateLabel: '1 GBP = ₹122.50 INR',
    lastUpdated: 'Current Market Rate',
  },
  CAD: {
    currency: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    rateToInr: 69.20,
    rateLabel: '1 CAD = ₹69.20 INR',
    lastUpdated: 'Current Market Rate',
  },
  AED: {
    currency: 'AED',
    symbol: 'AED',
    name: 'UAE Dirham',
    rateToInr: 25.88,
    rateLabel: '1 AED = ₹25.88 INR',
    lastUpdated: 'Current Market Rate',
  },
  SGD: {
    currency: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    rateToInr: 72.40,
    rateLabel: '1 SGD = ₹72.40 INR',
    lastUpdated: 'Current Market Rate',
  },
};

export interface ConversionMetrics {
  isConverted: boolean;
  originalCurrency: string;
  targetCurrency: 'INR';
  rate: number;
  rateFormatted: string;
  originalPrice: number;
  convertedPriceInr: number;
  originalTax?: number;
  convertedTaxInr?: number;
  appliedAt: string;
}

/**
 * Normalizes raw currency strings or symbols to standard ISO 3-letter codes
 */
export function normalizeCurrencyCode(rawCurrency?: string, textContext?: string): string {
  if (!rawCurrency && !textContext) return 'INR';

  const raw = (rawCurrency || '').trim().toUpperCase();
  const text = (textContext || '').toLowerCase();

  // Explicit symbols / codes
  if (raw === 'INR' || raw === '₹' || raw.includes('RS') || raw.includes('RUPEE')) return 'INR';
  if (raw === 'USD' || raw === '$' || raw.includes('DOLLAR') || raw.includes('BUCKS')) return 'USD';
  if (raw === 'EUR' || raw === '€' || raw.includes('EURO')) return 'EUR';
  if (raw === 'GBP' || raw === '£' || raw.includes('POUND')) return 'GBP';
  if (raw === 'CAD' || raw.includes('C$')) return 'CAD';
  if (raw === 'AUD' || raw.includes('A$')) return 'AUD';
  if (raw === 'AED' || raw.includes('DIRHAM')) return 'AED';
  if (raw === 'SGD' || raw.includes('S$')) return 'SGD';
  if (raw === 'JPY' || raw === '¥' || raw.includes('YEN')) return 'JPY';

  // Contextual inspection if raw was ambiguous
  if (text.includes('₹') || text.includes('inr') || text.includes('rupees') || text.includes('bengaluru') || text.includes('mumbai') || text.includes('delhi')) {
    return 'INR';
  }
  if (text.includes('€') || text.includes('eur') || text.includes('euro') || text.includes('paris') || text.includes('berlin')) {
    return 'EUR';
  }
  if (text.includes('$') || text.includes('usd') || text.includes('dollar') || text.includes('san francisco') || text.includes('new york')) {
    return 'USD';
  }

  return raw || 'INR';
}

/**
 * Get FX conversion rate to INR
 */
export function getFxRateToInr(currency: string, customRates?: Record<string, number>): number {
  const code = normalizeCurrencyCode(currency);
  if (customRates && customRates[code]) {
    return customRates[code];
  }
  return CURRENT_FX_RATES_TO_INR[code] ?? 1.0;
}

/**
 * Convert arbitrary amount from source currency into INR
 */
export function convertAmountToInr(
  amount: number,
  fromCurrency: string,
  customRates?: Record<string, number>
): { inrAmount: number; rate: number; label: string; isConverted: boolean } {
  const code = normalizeCurrencyCode(fromCurrency);
  const rate = getFxRateToInr(code, customRates);
  const isConverted = code !== 'INR';
  const inrAmount = Number((amount * rate).toFixed(2));
  const label = CURRENT_FX_METRICS[code]?.rateLabel || `1 ${code} = ₹${rate} INR`;

  return {
    inrAmount,
    rate,
    label,
    isConverted,
  };
}

/**
 * Converts a scanned receipt object into INR for all downstream calculations.
 * Preserves original amounts while updating active figures to INR.
 */
export function convertReceiptToInr<T extends Record<string, any>>(
  receipt: T,
  customRates?: Record<string, number>
): T & { conversionMetrics: ConversionMetrics } {
  if (!receipt) return receipt as any;

  const rawCurr = receipt.currency || receipt.originalCurrency || 'INR';
  const cleanCurrency = normalizeCurrencyCode(rawCurr);
  const rate = getFxRateToInr(cleanCurrency, customRates);
  const isConverted = cleanCurrency !== 'INR';

  const originalPrice = Number(receipt.price ?? receipt.total ?? 0);
  const convertedPriceInr = isConverted
    ? Number((originalPrice * rate).toFixed(2))
    : originalPrice;

  const originalTax = receipt.tax !== undefined && receipt.tax !== null ? Number(receipt.tax) : undefined;
  const convertedTaxInr = originalTax !== undefined
    ? (isConverted ? Number((originalTax * rate).toFixed(2)) : originalTax)
    : undefined;

  const originalSubtotal = receipt.subtotal !== undefined && receipt.subtotal !== null ? Number(receipt.subtotal) : undefined;
  const convertedSubtotalInr = originalSubtotal !== undefined
    ? (isConverted ? Number((originalSubtotal * rate).toFixed(2)) : originalSubtotal)
    : undefined;

  const originalTip = receipt.tip !== undefined && receipt.tip !== null ? Number(receipt.tip) : undefined;
  const convertedTipInr = originalTip !== undefined
    ? (isConverted ? Number((originalTip * rate).toFixed(2)) : originalTip)
    : undefined;

  // Convert line items
  let convertedLineItems = receipt.lineItems;
  if (Array.isArray(receipt.lineItems) && receipt.lineItems.length > 0) {
    convertedLineItems = receipt.lineItems.map((item: any) => {
      const origAmt = Number(item.amount ?? item.unitPrice ?? 0);
      const origUnit = Number(item.unitPrice ?? item.amount ?? 0);
      return {
        ...item,
        originalAmount: isConverted ? origAmt : (item.originalAmount ?? origAmt),
        originalUnitPrice: isConverted ? origUnit : (item.originalUnitPrice ?? origUnit),
        amount: isConverted ? Number((origAmt * rate).toFixed(2)) : origAmt,
        unitPrice: isConverted ? Number((origUnit * rate).toFixed(2)) : origUnit,
      };
    });
  }

  // Convert mealsContext alcoholTotal if present
  let convertedMeals = receipt.mealsContext;
  if (convertedMeals && typeof convertedMeals.alcoholTotal === 'number' && isConverted) {
    convertedMeals = {
      ...convertedMeals,
      originalAlcoholTotal: convertedMeals.alcoholTotal,
      alcoholTotal: Number((convertedMeals.alcoholTotal * rate).toFixed(2)),
    };
  }

  const rateFormatted = CURRENT_FX_METRICS[cleanCurrency]?.rateLabel || `1 ${cleanCurrency} = ₹${rate} INR`;

  const conversionMetrics: ConversionMetrics = {
    isConverted,
    originalCurrency: cleanCurrency,
    targetCurrency: 'INR',
    rate,
    rateFormatted,
    originalPrice,
    convertedPriceInr,
    originalTax,
    convertedTaxInr,
    appliedAt: new Date().toISOString(),
  };

  return {
    ...receipt,
    originalCurrency: isConverted ? cleanCurrency : (receipt.originalCurrency || 'INR'),
    originalPrice: isConverted ? originalPrice : (receipt.originalPrice || originalPrice),
    currency: 'INR', // Calculation currency set to INR for all downstream policy & math checks
    price: convertedPriceInr,
    total: convertedPriceInr,
    ...(convertedSubtotalInr !== undefined ? { subtotal: convertedSubtotalInr } : {}),
    ...(convertedTaxInr !== undefined ? { tax: convertedTaxInr } : {}),
    ...(convertedTipInr !== undefined ? { tip: convertedTipInr } : {}),
    ...(convertedLineItems ? { lineItems: convertedLineItems } : {}),
    ...(convertedMeals ? { mealsContext: convertedMeals } : {}),
    conversionMetrics,
  };
}
