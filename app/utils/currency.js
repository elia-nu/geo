/**
 * Currency display helpers for ETB amounts.
 * Large values use compact notation in UI; full value stays available via title/tooltip.
 */

const DEFAULT_CURRENCY = "ETB";
const COMPACT_THRESHOLD = 100_000;

export function formatCurrencyFull(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

export function formatCurrencyCompact(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);

  if (abs < COMPACT_THRESHOLD) {
    return formatCurrencyFull(value, currency);
  }

  try {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: abs >= 1_000_000 ? 2 : 1,
    }).format(value);
  } catch {
    // Fallback if compact notation unsupported
    if (abs >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}B ${currency || DEFAULT_CURRENCY}`;
    }
    if (abs >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M ${currency || DEFAULT_CURRENCY}`;
    }
    return `${(value / 1_000).toFixed(1)}K ${currency || DEFAULT_CURRENCY}`;
  }
}

/**
 * Smart display formatter: compact for large amounts, full otherwise.
 * Always safe for cards/tables that overflow with long ETB strings.
 */
export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  return formatCurrencyCompact(amount, currency);
}

export function currencyTitle(amount, currency = DEFAULT_CURRENCY) {
  return formatCurrencyFull(amount, currency);
}
