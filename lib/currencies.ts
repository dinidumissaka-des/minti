export type Currency = {
  code: string;
  name: string;
  decimals: number;
};

export const CURRENCIES: Currency[] = [
  { code: "AED", name: "UAE Dirham",         decimals: 2 },
  { code: "USD", name: "US Dollar",          decimals: 2 },
  { code: "EUR", name: "Euro",               decimals: 2 },
  { code: "GBP", name: "British Pound",      decimals: 2 },
  { code: "INR", name: "Indian Rupee",       decimals: 2 },
  { code: "SAR", name: "Saudi Riyal",        decimals: 2 },
  { code: "QAR", name: "Qatari Riyal",       decimals: 2 },
  { code: "PKR", name: "Pakistani Rupee",    decimals: 0 },
  { code: "BDT", name: "Bangladeshi Taka",   decimals: 0 },
  { code: "LKR", name: "Sri Lankan Rupee",   decimals: 2 },
  { code: "CAD", name: "Canadian Dollar",    decimals: 2 },
  { code: "AUD", name: "Australian Dollar",  decimals: 2 },
  { code: "SGD", name: "Singapore Dollar",   decimals: 2 },
  { code: "JPY", name: "Japanese Yen",       decimals: 0 },
  { code: "CNY", name: "Chinese Yuan",       decimals: 2 },
  { code: "MYR", name: "Malaysian Ringgit",  decimals: 2 },
  { code: "KWD", name: "Kuwaiti Dinar",      decimals: 3 },
  { code: "OMR", name: "Omani Rial",         decimals: 3 },
  { code: "BHD", name: "Bahraini Dinar",     decimals: 3 },
];

export const DEFAULT_CURRENCY = "AED";

export function currencyDecimals(currencyCode: string): number {
  return CURRENCIES.find((c) => c.code === currencyCode)?.decimals ?? 2;
}

// A plain number at the currency's precision — for a number input, where
// formatAmount's thousands separators would not parse back.
export function roundAmount(amount: number, currencyCode: string): number {
  return Number(Number(amount).toFixed(currencyDecimals(currencyCode)));
}

export function formatAmount(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const decimals = currency?.decimals ?? 2;
  return Number(amount).toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
