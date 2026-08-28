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
      // Currently working: calculate from checkIn to now
      const start = new Date(input.checkInTime).getTime();
      const now = Date.now();
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
        return "0h 00m";
      }
    } else {
      return "0h 00m";
    }
  } else {
    decimalHours = parseFloat(input);
    if (isNaN(decimalHours) || decimalHours < 0) return "0h 00m";
  }

  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "0h 00m";
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
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
