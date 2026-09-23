/**
 * Nirman AI — Centralized Indian Number & Data Formatters
 */

/**
 * Format currency in Indian Rupees Crore (₹ Cr)
 * Example: 676477.5 -> "₹6,76,477.5 Cr"
 */
export function formatIndianCr(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return "N/A";
  const numStr = val.toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
  return `₹${numStr} Cr`;
}

/**
 * Format large Crore values in Lakh Crore for compact display
 * Example: 4223795.4 -> "₹42.24L Cr"
 */
export function formatLakhCr(valInCr?: number | null, decimals: number = 2): string {
  if (valInCr === undefined || valInCr === null || isNaN(valInCr)) return "N/A";
  if (valInCr >= 100000) {
    const lakhCr = valInCr / 100000;
    return `₹${lakhCr.toFixed(decimals)}L Cr`;
  }
  return formatIndianCr(valInCr, 1);
}

/**
 * Format integer or float using Indian Numbering System
 * Example: 3589 -> "3,589"
 */
export function formatIndianNumber(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return val.toLocaleString('en-IN');
}

/**
 * Format percentage with controlled decimal precision
 * Example: 16.034 -> "16.0%"
 */
export function formatPercent(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0%";
  return `${val.toFixed(decimals)}%`;
}

/**
 * Format duration in months
 * Example: 42.9 -> "42.9 Months"
 */
export function formatMonths(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0 Months";
  return `${val.toFixed(decimals)} Months`;
}
