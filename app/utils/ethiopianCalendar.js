/**
 * Ethiopian Calendar Utility Functions
 * Uses Kenat for accurate ET↔GR conversion and holiday calculations.
 * Store all dates as UTC/Gregorian; convert at the UI/API edges.
 */
import Kenat from "kenat";

/**
 * Convert Gregorian Date -> Ethiopian parts (year, month, day)
 * Returns with month/day in 1-based ET calendar and names for convenience.
 */
export function gregorianToEthiopian(gregorianDate) {
  const d = new Date(gregorianDate);
  const kenat = new Kenat(d);
  const et = kenat.getEthiopian();
  return {
    year: et.year,
    month: et.month,
    day: et.day,
    monthName: getEthiopianMonthName(et.month),
    dayName: getEthiopianDayName(d.getUTCDay()),
  };
}

/**
 * Convert Ethiopian parts -> Gregorian Date (UTC midnight)
 */
export function ethiopianToGregorian(year, month, day) {
  const kenat = new Kenat(`${year}/${month}/${day}`);
  const g = kenat.getGregorian();
  // Return UTC-normalized Date to avoid TZ shifts
  return new Date(Date.UTC(g.year, g.month - 1, g.day));
}

/**
 * Get Ethiopian month name
 */
function getEthiopianMonthName(month) {
  const months = [
    "Meskerem",
    "Tikimt",
    "Hidar",
    "Tahesas",
    "Tir",
    "Yekatit",
    "Megabit",
    "Miazia",
    "Ginbot",
    "Sene",
    "Hamle",
    "Nehase",
    "Pagume",
  ];
  return months[month - 1] || "Unknown";
}

/**
 * Get Ethiopian day name
 */
function getEthiopianDayName(dayOfWeek) {
  const days = ["Ehud", "Segno", "Maksegno", "Rob", "Hamus", "Arb", "Kidame"];
  return days[dayOfWeek] || "Unknown";
}

/**
 * Format Ethiopian date for display
 * @param {Date} gregorianDate - Gregorian date
 * @returns {string} Formatted Ethiopian date string
 */
export function formatEthiopianDate(gregorianDate) {
  const ethiopian = gregorianToEthiopian(gregorianDate);
  return `${ethiopian.day} ${ethiopian.monthName} ${ethiopian.year} (${ethiopian.dayName})`;
}

/**
 * Get current Ethiopian date
 * @returns {Object} Current Ethiopian date
 */
export function getCurrentEthiopianDate() {
  return gregorianToEthiopian(new Date());
}

// Simple working day calculation (weekends only)
export function isWorkingDay(date) {
  // Use UTC day to avoid timezone shifting dates across boundaries
  const dayOfWeek = date.getUTCDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday or Saturday
}

export function calculateWorkingDays(startDate, endDate) {
  let workingDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

// Holiday functions using Kenat
// Simple in-memory cache to avoid recomputing the same year's holidays
const holidayCacheByYear = new Map();

export function getHolidaysForYear(year) {
  try {
    if (holidayCacheByYear.has(year)) {
      return holidayCacheByYear.get(year);
    }

    // Use library API if available
    if (typeof Kenat.getHolidaysInMonth === "function") {
      const libHolidays = [];
      for (let month = 1; month <= 13; month++) {
        const monthHolidays = Kenat.getHolidaysInMonth(year, month) || [];
        libHolidays.push(...monthHolidays);
      }
      holidayCacheByYear.set(year, libHolidays);
      return libHolidays;
    }

    // Fallback: derive holidays by scanning each day using isHoliday()
    const startUtc = new Date(Date.UTC(year, 0, 1));
    const endUtc = new Date(Date.UTC(year, 11, 31));
    const dayMs = 24 * 60 * 60 * 1000;
    const computed = [];
    for (let t = startUtc.getTime(); t <= endUtc.getTime(); t += dayMs) {
      // Use mid-day local date to avoid TZ boundary issues, then normalize back to UTC
      const midUtc = new Date(t + 12 * 60 * 60 * 1000);
      const y = midUtc.getUTCFullYear();
      const m = midUtc.getUTCMonth();
      const d = midUtc.getUTCDate();
      const localDate = new Date(y, m, d);
      const h = isHoliday(localDate);
      const isHol = h === true || (h && (h.isHoliday || h.name || h.type));
      if (isHol) {
        computed.push({
          date: new Date(Date.UTC(y, m, d)),
          name: (h && h.name) || "Holiday",
          nameAmharic: h && h.nameAmharic,
          type: h && h.type,
        });
      }
    }
    holidayCacheByYear.set(year, computed);
    return computed;
  } catch (error) {
    return [];
  }
}

// Returns an array of holiday objects for a specific Gregorian month (1-12)
export function getHolidaysForMonth(year, month) {
  try {
    const all = getHolidaysForYear(year) || [];
    return all.filter((h) => {
      const d = h.date instanceof Date ? h.date : new Date(h.date);
      return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
    });
  } catch {
    return [];
  }
}

// Calculate working days excluding holidays between two dates (inclusive)
// holidays can be an array of {date} or a Set of ISO YYYY-MM-DD strings
export function calculateWorkingDaysExcludingHolidays(
  startDate,
  endDate,
  holidays
) {
  // Normalize to a Set of ISO strings
  let holidayIso = new Set();
  if (Array.isArray(holidays)) {
    holidayIso = new Set(
      holidays.map((h) => {
        const d = h.date instanceof Date ? h.date : new Date(h.date);
        const utc = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        );
        return utc.toISOString().slice(0, 10);
      })
    );
  } else if (holidays instanceof Set) {
    holidayIso = holidays;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  let workingDays = 0;
  const startUtc = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  );
  const endUtc = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  );
  for (let t = startUtc.getTime(); t <= endUtc.getTime(); t += dayMs) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    const isWeekday = dow !== 0 && dow !== 6;
    if (isWeekday && !holidayIso.has(iso)) workingDays += 1;
  }
  return workingDays;
}

export function isHoliday(date) {
  try {
    const kenat = new Kenat(date);
    const holiday = kenat.isHoliday();
    return holiday || false;
  } catch (error) {
    console.error("Error checking if date is holiday:", error);
    return false;
  }
}

/**
 * Get the next working day after the given date
 * @param {Date} date - Starting date
 * @returns {Date} Next working day
 */
export function getNextWorkingDay(date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  while (!isWorkingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
}

/**
 * Get the previous working day before the given date
 * @param {Date} date - Starting date
 * @returns {Date} Previous working day
 */
export function getPreviousWorkingDay(date) {
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);

  while (!isWorkingDay(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }

  return prevDay;
}
