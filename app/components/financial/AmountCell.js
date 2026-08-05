"use client";

/**
 * Table / list amount cell: compact display, full value on hover, no wrap blowout.
 */
export default function AmountCell({
  amount,
  formatCurrency,
  currencyTitle,
  className = "text-black",
  align = "left",
}) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "";

  return (
    <span
      className={`inline-block max-w-[9.5rem] sm:max-w-[11rem] tabular-nums text-xs sm:text-sm font-medium truncate ${alignClass} ${className}`}
      title={currencyTitle ? currencyTitle(amount) : undefined}
    >
      {formatCurrency(amount)}
    </span>
  );
}
