import { NextResponse } from "next/server";
import {
  gregorianToEthiopian,
  ethiopianToGregorian,
  getHolidaysForYear,
  isHoliday,
  isWorkingDay,
  calculateWorkingDays,
  getNextWorkingDay,
  getPreviousWorkingDay,
  formatEthiopianDate,
  getCurrentEthiopianDate,
} from "../../utils/ethiopianCalendar";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const year = parseInt(searchParams.get("year")) || new Date().getFullYear();
    const month = parseInt(searchParams.get("month"));
    const day = parseInt(searchParams.get("day"));
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log("Ethiopian Calendar API called with:", {
      action,
      year,
      month,
      day,
      startDate,
      endDate,
    });

    switch (action) {
      case "current":
        const currentEthiopian = getCurrentEthiopianDate();
        return NextResponse.json({
          success: true,
          data: {
            gregorian: new Date().toISOString(),
            ethiopian: currentEthiopian,
            formatted: formatEthiopianDate(new Date()),
          },
        });

      case "convert-to-ethiopian":
        if (!month || !day) {
          return NextResponse.json(
            {
              success: false,
              error: "Month and day are required for conversion",
            },
            { status: 400 }
          );
        }

        const gregorianDate = new Date(year, month - 1, day);
        const ethiopianDate = gregorianToEthiopian(gregorianDate);

        return NextResponse.json({
          success: true,
          data: {
            gregorian: gregorianDate.toISOString(),
            ethiopian: ethiopianDate,
            formatted: formatEthiopianDate(gregorianDate),
          },
        });

      case "convert-to-gregorian":
        if (!month || !day) {
          return NextResponse.json(
            {
              success: false,
              error: "Month and day are required for conversion",
            },
            { status: 400 }
          );
        }

        const gregorianConverted = ethiopianToGregorian(year, month, day);

        return NextResponse.json({
          success: true,
          data: {
            gregorian: gregorianConverted.toISOString(),
            ethiopian: { year, month, day },
          },
        });

      case "holidays":
        const holidays = getHolidaysForYear(year);
        return NextResponse.json({
          success: true,
          data: {
            year,
            holidays: holidays.map((holiday) => ({
              date: holiday.date.toISOString(),
              name: holiday.name,
              nameAmharic: holiday.nameAmharic,
              type: holiday.type,
              isWorkingDay: holiday.isWorkingDay,
            })),
          },
        });

      case "is-holiday":
        if (!month || !day) {
          return NextResponse.json(
            {
              success: false,
              error: "Month and day are required",
            },
            { status: 400 }
          );
        }

        const checkDate = new Date(year, month - 1, day);
        const holidayInfo = isHoliday(checkDate);

        return NextResponse.json({
          success: true,
          data: {
            date: checkDate.toISOString(),
            isHoliday: !!holidayInfo,
            holiday: holidayInfo
              ? {
                  name: holidayInfo.name,
                  nameAmharic: holidayInfo.nameAmharic,
                  type: holidayInfo.type,
                }
              : null,
            isWorkingDay: isWorkingDay(checkDate),
          },
        });

      case "working-days":
        if (!startDate || !endDate) {
          return NextResponse.json(
            {
              success: false,
              error: "Start date and end date are required",
            },
            { status: 400 }
          );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const workingDaysCount = calculateWorkingDays(start, end);

        return NextResponse.json({
          success: true,
          data: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            workingDays: workingDaysCount,
            totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
          },
        });

      case "next-working-day":
        if (!month || !day) {
          return NextResponse.json(
            {
              success: false,
              error: "Month and day are required",
            },
            { status: 400 }
          );
        }

        const fromDate = new Date(year, month - 1, day);
        const nextWorking = getNextWorkingDay(fromDate);

        return NextResponse.json({
          success: true,
          data: {
            fromDate: fromDate.toISOString(),
            nextWorkingDay: nextWorking.toISOString(),
            ethiopian: gregorianToEthiopian(nextWorking),
          },
        });

      case "previous-working-day":
        if (!month || !day) {
          return NextResponse.json(
            {
              success: false,
              error: "Month and day are required",
            },
            { status: 400 }
          );
        }

        const fromDatePrev = new Date(year, month - 1, day);
        const prevWorking = getPreviousWorkingDay(fromDatePrev);

        return NextResponse.json({
          success: true,
          data: {
            fromDate: fromDatePrev.toISOString(),
            previousWorkingDay: prevWorking.toISOString(),
            ethiopian: gregorianToEthiopian(prevWorking),
          },
        });

      case "calendar-month":
        if (!month) {
          return NextResponse.json(
            {
              success: false,
              error: "Month is required",
            },
            { status: 400 }
          );
        }

        const calendarData = generateCalendarMonth(year, month);
        return NextResponse.json({
          success: true,
          data: calendarData,
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid action. Available actions: current, convert-to-ethiopian, convert-to-gregorian, holidays, is-holiday, working-days, next-working-day, previous-working-day, calendar-month",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Ethiopian Calendar API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate calendar data for a specific month
 */
function generateCalendarMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const calendar = [];
  const holidays = getHolidaysForYear(year);

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendar.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const ethiopian = gregorianToEthiopian(date);
    const holidayInfo = isHoliday(date);

    calendar.push({
      day,
      date: date.toISOString(),
      ethiopian: {
        day: ethiopian.day,
        month: ethiopian.month,
        year: ethiopian.year,
        monthName: ethiopian.monthName,
        dayName: ethiopian.dayName,
      },
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: !!holidayInfo,
      isWorkingDay: isWorkingDay(date),
      holiday: holidayInfo
        ? {
            name: holidayInfo.name,
            nameAmharic: holidayInfo.nameAmharic,
            type: holidayInfo.type,
          }
        : null,
    });
  }

  return {
    year,
    month,
    monthName: firstDay.toLocaleString("default", { month: "long" }),
    calendar,
    holidays: holidays.filter(
      (h) => h.date.getMonth() === month - 1 && h.date.getFullYear() === year
    ),
  };
}
