import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', label: 'INR (₹)', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', label: 'USD ($)', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', label: 'EUR (€)', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', label: 'GBP (£)', locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: 'CA$', label: 'CAD ($)', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'AU$', label: 'AUD ($)', locale: 'en-AU' },
  JPY: { code: 'JPY', symbol: '¥', label: 'JPY (¥)', locale: 'ja-JP' },
};

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
  currencySymbol: string;
  formatPrice: (amount: number, overrideCurrency?: string) => string;
  formatCompact: (amount: number, overrideCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to INR per user requirement, with localStorage persistence
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    try {
      const saved = localStorage.getItem('keepr_currency_v1');
      if (saved && saved in CURRENCY_CONFIGS) {
        return saved as SupportedCurrency;
      }
    } catch (e) {
      console.error(e);
    }
    return 'INR';
  });

  const setCurrency = (newCurrency: SupportedCurrency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem('keepr_currency_v1', newCurrency);
    } catch (e) {
      console.error(e);
    }
  };

  const currentConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.INR;

  const formatPrice = (amount: number, overrideCurrency?: string): string => {
    const code = (overrideCurrency && overrideCurrency in CURRENCY_CONFIGS
      ? overrideCurrency
      : currency) as SupportedCurrency;
    const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;

    const formattedNumber = amount.toLocaleString(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${config.symbol}${formattedNumber}`;
  };

  const formatCompact = (amount: number, overrideCurrency?: string): string => {
    const code = (overrideCurrency && overrideCurrency in CURRENCY_CONFIGS
      ? overrideCurrency
      : currency) as SupportedCurrency;
    const config = CURRENCY_CONFIGS[code] || CURRENCY_CONFIGS.INR;

    if (amount >= 10000000 && code === 'INR') {
      return `${config.symbol}${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (amount >= 100000 && code === 'INR') {
      return `${config.symbol}${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000000) {
      return `${config.symbol}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${config.symbol}${(amount / 1000).toFixed(1)}k`;
    }
    return `${config.symbol}${amount.toFixed(0)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        currencySymbol: currentConfig.symbol,
        formatPrice,
        formatCompact,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
