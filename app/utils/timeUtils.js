/**
 * Utility functions for attendance time calculation and human-readable formatting.
 */

/**
 * Calculates effective working hours in decimal hours (rounded to 2 decimals).
 * If lunch-out and lunch-in are provided, subtracts the actual lunch duration.
 *
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @param {string|Date} [lunchOut]
 * @param {string|Date} [lunchIn]
 * @returns {number|null} Decimal hours (e.g. 1.23, 8.5) or null if invalid
 */
export function calculateEffectiveWorkingHours(checkIn, checkOut, lunchOut, lunchIn) {
  if (!checkIn || !checkOut) return null;

  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  let totalMs = end - start;

  // If both lunch-out and lunch-in exist, deduct the actual lunch duration
  if (lunchOut && lunchIn) {
    const lunchStart = new Date(lunchOut).getTime();
    const lunchEnd = new Date(lunchIn).getTime();
    if (!isNaN(lunchStart) && !isNaN(lunchEnd) && lunchEnd > lunchStart) {
      const lunchDurationMs = lunchEnd - lunchStart;
      totalMs = Math.max(0, totalMs - lunchDurationMs);
    }
  } else if (lunchOut && !lunchIn) {
    // If lunch-out was logged but employee never logged lunch-in before checkout
    const lunchStart = new Date(lunchOut).getTime();
    if (!isNaN(lunchStart) && end > lunchStart) {
      const lunchDurationMs = end - lunchStart;
      totalMs = Math.max(0, totalMs - lunchDurationMs);
    }
  }

  const hours = totalMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Formats decimal hours or an attendance record into a human-readable "Xh Ym" string (e.g. "1h 14m", "0h 45m").
 *
 * @param {number|object|null|undefined} input Decimal hours (e.g. 1.24) OR an attendance record object with workingHours/checkInTime/checkOutTime
 * @returns {string} Human-readable time string (e.g. "1h 14m", "0h 14m", "—")
 */
export function formatWorkingHours(input) {
  if (input === null || input === undefined || input === "") return "—";

  let decimalHours = 0;

  if (typeof input === "object") {
    if (
      input.status === "not-checked-out" ||
      input.status === "missed-checkout" ||
      input.status === "incomplete"
    ) {
      return "Not Checked Out (Admin to Handle)";
    }

    if (input.checkInTime && input.checkOutTime) {
      decimalHours =
        calculateEffectiveWorkingHours(
          input.checkInTime,
          input.checkOutTime,
          input.lunchOutTime,
          input.lunchInTime
        ) || 0;
    } else if (typeof input.workingHours === "number" && !isNaN(input.workingHours)) {
      decimalHours = input.workingHours;
    } else if (input.checkInTime && !input.checkOutTime) {
      const todayStr = getEthiopianDate();
      const isPastDay = input.date && input.date < todayStr;
      const start = new Date(input.checkInTime).getTime();
      const now = Date.now();
      const elapsedMs = !isNaN(start) && now > start ? now - start : 0;
      const MAX_OPEN_SESSION_MS = 16 * 60 * 60 * 1000; // 16 hours max

      // If it is from a previous day or has exceeded 16 hours without check-out, kill the timer
      if (isPastDay || elapsedMs > MAX_OPEN_SESSION_MS) {
        return "Not Checked Out (Admin to Handle)";
      }

      // Currently active today: calculate from checkIn to now
      if (!isNaN(start) && now > start) {
        let diffMs = now - start;
        if (input.lunchOutTime && input.lunchInTime) {
          const lOut = new Date(input.lunchOutTime).getTime();
          const lIn = new Date(input.lunchInTime).getTime();
          if (!isNaN(lOut) && !isNaN(lIn) && lIn > lOut) {
            diffMs = Math.max(0, diffMs - (lIn - lOut));
          }
        }
        decimalHours = diffMs / (1000 * 60 * 60);
      } else {
        return "00hr 00m";
      }
    } else {
      return "00hr 00m";
    }
  } else {
    decimalHours = parseFloat(input);
    if (isNaN(decimalHours) || decimalHours < 0) return "00hr 00m";
  }

  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")}hr ${minutes.toString().padStart(2, "0")}m`;
}

/**
 * Formats decimal hours or string numbers (e.g. 0.7, 7.5, 8) into standard "00hr 00m" format (e.g. "00hr 42m", "07hr 30m").
 *
 * @param {number|string|null|undefined} val Decimal hours
 * @returns {string} Human-readable time string "00hr 00m"
 */
export function formatHoursToHrMin(val) {
  if (val === null || val === undefined || val === "") return "00hr 00m";
  const num = typeof val === "number" ? val : parseFloat(val);
  if (isNaN(num) || num < 0) return "00hr 00m";
  const totalMin = Math.round(num * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h.toString().padStart(2, "0")}hr ${m.toString().padStart(2, "0")}m`;
}

/**
 * Formats decimal hours into "HH:MM" (e.g. "01:14", "08:30").
 *
 * @param {number|null|undefined} decimalHours
 * @returns {string}
 */
export function formatHoursToHHMM(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return "00:00";
  const num = parseFloat(decimalHours);
  if (num < 0) return "00:00";

  const totalMinutes = Math.round(num * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Standard IANA Timezone for Ethiopia (East Africa Time, UTC+3).
 * Guarantees correct time across any server environment (e.g. Yegar Linux VPS, cPanel, Docker, UTC).
 */
export const ETHIOPIA_TIMEZONE = "Africa/Addis_Ababa";

/**
 * Returns the current or provided date in Ethiopian timezone (UTC+3) formatted as "YYYY-MM-DD".
 * This eliminates midnight date-shifting bugs when Linux servers run in UTC.
 *
 * @param {string|number|Date} [date=new Date()]
 * @returns {string} Formatted "YYYY-MM-DD"
 */
export function getEthiopianDate(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: ETHIOPIA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    // Fallback manual UTC+3 calculation
    const d = new Date(date);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const eat = new Date(utc + 3 * 3600000);
    return eat.toISOString().split("T")[0];
  }
}

/**
 * Returns formatted 24h time in Ethiopian timezone (e.g., "14:30:15" or "14:30").
 *
 * @param {string|number|Date} [date=new Date()]
 * @param {object} [options={ showSeconds: true }]
 * @returns {string}
 */
export function getEthiopianTime(date = new Date(), options = { showSeconds: true }) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "00:00:00";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: ETHIOPIA_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: options.showSeconds !== false ? "2-digit" : undefined,
      hour12: false,
    }).format(d);
  } catch {
    const d = new Date(date);
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const eat = new Date(utc + 3 * 3600000);
    return eat.toTimeString().split(" ")[0];
  }
}

/**
 * Formats a timestamp into human-readable Ethiopian local time representation.
 *
 * @param {string|number|Date} [date=new Date()]
 * @returns {string} e.g. "Sun, Oct 4, 2026, 10:15:30 AM"
 */
export function formatEthiopianDateTime(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ETHIOPIA_TIMEZONE,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return new Date(date).toLocaleString();
  }
}

/**
 * Calculates exact calendar service duration (Years, Months, Days).
 *
 * @param {string|number|Date} startDate
 * @param {string|number|Date} [endDate=new Date()]
 * @returns {{ years: number, months: number, days: number, formatted: string }}
 */
export function calculateDetailedServiceDuration(startDate, endDate = new Date()) {
  if (!startDate) return { years: 0, months: 0, days: 0, formatted: "0 Days" };

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { years: 0, months: 0, days: 0, formatted: "0 Days" };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);

  const parts = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);
  }

  return {
    years,
    months,
    days,
    formatted: parts.join(" "),
  };
}

/**
 * Formats decimal years (e.g. 1.18) or employment date into proper "1 Year 4 Months 3 Days" format.
 *
 * @param {number|string|Date} value Decimal years (e.g. 1.18) or date
 * @param {string|Date} [employmentDate] Optional employment/joining date for exact calendar precision
 * @returns {string} e.g. "1 Year 4 Months 3 Days"
 */
export function formatYearsOfService(value, employmentDate = null) {
  if (employmentDate) {
    const res = calculateDetailedServiceDuration(employmentDate);
    if (res.formatted && res.formatted !== "0 Days") return res.formatted;
  }

  if (
    value instanceof Date ||
    (typeof value === "string" &&
      (value.includes("-") || value.includes("/")) &&
      !isNaN(new Date(value).getTime()))
  ) {
    return calculateDetailedServiceDuration(value).formatted;
  }

  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) return "0 Days";

  const totalDays = Math.round(num * 365.25);
  const years = Math.floor(totalDays / 365.25);
  const remDays = totalDays - Math.floor(years * 365.25);
  const months = Math.floor(remDays / 30.4375);
  const days = Math.round(remDays - Math.floor(months * 30.4375));

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);

  return parts.join(" ");
}


