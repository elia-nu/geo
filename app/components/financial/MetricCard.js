"use client";

/**
 * Metric card that keeps large currency amounts from overflowing.
 * Pass formatCurrency + currencyTitle (from utils/currency) for amount display.
 */
export default function MetricCard({
  label,
  value,
  formatCurrency,
  currencyTitle,
  icon: Icon,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-600",
  valueClassName = "text-slate-900",
  subtitle,
  footer,
}) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
      ? Number(value)
      : null;

  const isCurrency = numericValue !== null && typeof formatCurrency === "function";
  const display = isCurrency
    ? formatCurrency(numericValue)
    : value ?? "—";
  const title =
    isCurrency && currencyTitle
      ? currencyTitle(numericValue)
      : typeof value === "string"
      ? value
      : undefined;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm min-w-0 overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {Icon && (
          <div
            className={`flex-shrink-0 p-2.5 rounded-xl ${iconBg}`}
          >
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
            {label}
          </p>
          <p
            className={`mt-1 text-base sm:text-lg lg:text-xl font-bold tabular-nums leading-tight break-words ${valueClassName}`}
            title={title}
          >
            {display}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 truncate" title={subtitle}>
              {subtitle}
            </p>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}
