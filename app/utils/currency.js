/**
 * Currency display helpers with smart compact notation (1K, 1M, 1B).
 * Large values use compact notation in UI to prevent layout blowout;
 * full value remains available via tooltip / title attribute.
 */

const DEFAULT_CURRENCY = "ETB";
const COMPACT_THRESHOLD = 1_000;

function cleanCurrency(curr) {
  if (!curr) return DEFAULT_CURRENCY;
  const s = String(curr).trim().toUpperCase();
  if (s === "BIRR") return "ETB";
  return s;
}

export function formatCurrencyFull(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0;
  const cur = cleanCurrency(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${cur ? cur + " " : ""}${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function formatCurrencyCompact(
  amount,
  currency = DEFAULT_CURRENCY,
  options = {}
) {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  const threshold = options.threshold ?? COMPACT_THRESHOLD;
  const cur = cleanCurrency(currency);

  if (abs < threshold && !options.compact) {
    return formatCurrencyFull(value, cur);
  }

  const maxDecimals = options.maxDecimals ?? (abs >= 1_000_000 ? 2 : 1);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    }).format(value);
  } catch {
    // Fallback if compact notation is unsupported
    if (abs >= 1_000_000_000) {
      const b = (value / 1_000_000_000).toFixed(maxDecimals).replace(/\.0+$/, "");
      return `${b}B ${cur}`;
    }
    if (abs >= 1_000_000) {
      const m = (value / 1_000_000).toFixed(maxDecimals).replace(/\.0+$/, "");
      return `${m}M ${cur}`;
    }
    if (abs >= 1_000) {
      const k = (value / 1_000).toFixed(1).replace(/\.0+$/, "");
      return `${k}K ${cur}`;
    }
    return formatCurrencyFull(value, cur);
  }
}

/**
 * Smart display formatter: compact for amounts >= 1,000 (1K, 1M, 1B),
 * full otherwise. Always safe for cards, tables, and reports that overflow.
 */
export function formatCurrency(amount, currency = DEFAULT_CURRENCY, options = {}) {
  if (options.full) {
    return formatCurrencyFull(amount, currency);
  }
  return formatCurrencyCompact(amount, currency, options);
}

/**
 * Returns the exact full amount for title="..." attributes / tooltips.
 */
export function currencyTitle(amount, currency = DEFAULT_CURRENCY) {
  return formatCurrencyFull(amount, currency);
}
