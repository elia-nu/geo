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
  const dayOfWeek = date.getDay();
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
export function getHolidaysForYear(year) {
  try {
    // Kenat provides holiday data for Ethiopian calendar
    const holidays = [];
    for (let month = 1; month <= 13; month++) {
      const monthHolidays = Kenat.getHolidaysInMonth(year, month);
      holidays.push(...monthHolidays);
    }
    return holidays;
  } catch (error) {
    console.error("Error getting holidays for year:", error);
    return [];
  }
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
