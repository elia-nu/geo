"use client";

import React, { useState, useEffect } from "react";
import { toGregorian, toEthiopian } from "ethiopian-calendar-new";
import { Calendar, ChevronLeft, ChevronRight, X, MapPin } from "lucide-react";

// Ethiopian holidays in Ethiopian calendar dates
const ETHIOPIAN_HOLIDAYS = [
  { month: 1, day: 1, name: "New Year (Enkutatash)", nameAmharic: "እንቁጣጣሽ" },
  {
    month: 1,
    day: 17,
    name: "Finding of the True Cross (Meskel)",
    nameAmharic: "መስቀል",
  },
  { month: 2, day: 12, name: "Victory of Adwa", nameAmharic: "የአድዋ ድል" },
  { month: 3, day: 10, name: "Victory Day", nameAmharic: "የድል ቀን" },
  { month: 5, day: 5, name: "Labour Day", nameAmharic: "የሰራተኞች ቀን" },
  { month: 5, day: 28, name: "Downfall of Derg", nameAmharic: "የደርግ ውድቀት" },
  { month: 6, day: 1, name: "Patriots Victory Day", nameAmharic: "የፓትሪዮቶች ድል" },
];

const ETHIOPIAN_MONTHS = [
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

const ETHIOPIAN_DAYS = [
  "Ehud",
  "Segno",
  "Maksegno",
  "Rob",
  "Hamus",
  "Arb",
  "Kidame",
];

export default function EthiopianCalendarWithHolidays({
  isOpen,
  onClose,
  onDateSelect,
}) {
  const [currentEthiopianDate, setCurrentEthiopianDate] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(null);
  const [displayYear, setDisplayYear] = useState(null);
  const [holidays, setHolidays] = useState([]);

  // Initialize with current date
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const ethDate = toEthiopian(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );
      setCurrentEthiopianDate(ethDate);
      setDisplayMonth(ethDate.month);
      setDisplayYear(ethDate.year);
      setHolidays(ETHIOPIAN_HOLIDAYS);
    }
  }, [isOpen]);

  const navigateMonth = (direction) => {
    let newMonth = displayMonth + direction;
    let newYear = displayYear;

    if (newMonth > 13) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 13;
      newYear -= 1;
    }

    setDisplayMonth(newMonth);
    setDisplayYear(newYear);
  };

  const navigateYear = (direction) => {
    setDisplayYear(displayYear + direction);
  };

  const isHoliday = (month, day) => {
    return holidays.some(
      (holiday) => holiday.month === month && holiday.day === day
    );
  };

  const getHolidayInfo = (month, day) => {
    return holidays.find(
      (holiday) => holiday.month === month && holiday.day === day
    );
  };

  const isToday = (month, day) => {
    if (!currentEthiopianDate) return false;
    return (
      currentEthiopianDate.month === month &&
      currentEthiopianDate.day === day &&
      currentEthiopianDate.year === displayYear
    );
  };

  const getDaysInMonth = (month, year) => {
    // Ethiopian months have 30 days, except Pagume (13th month) which has 5 or 6 days
    if (month === 13) {
      // Pagume has 5 days in normal years, 6 in leap years
      // Ethiopian leap year calculation: year % 4 === 3
      return year % 4 === 3 ? 6 : 5;
    }
    return 30;
  };

  const getFirstDayOfWeek = (month, year) => {
    // Calculate the day of the week for the first day of the month
    const firstDay = toGregorian(year, month, 1);
    const gregorianDate = new Date(
      firstDay.year,
      firstDay.month - 1,
      firstDay.day
    );
    return gregorianDate.getDay();
  };

  const handleDateClick = (month, day) => {
    if (onDateSelect) {
      const gregorian = toGregorian(displayYear, month, day);
      const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
      onDateSelect(date);
    }
  };

  const getMonthHolidays = () => {
    return holidays.filter((holiday) => holiday.month === displayMonth);
  };

  if (!isOpen || !displayMonth || !displayYear) return null;

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDayOfWeek = getFirstDayOfWeek(displayMonth, displayYear);
  const monthHolidays = getMonthHolidays();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Ethiopian Calendar & Holidays
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Calendar Section */}
          <div className="flex-1 p-6">
            {/* Current Ethiopian Date */}
            {currentEthiopianDate && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Current Ethiopian Date:</span>
                </div>
                <p className="text-blue-700 mt-1">
                  {currentEthiopianDate.day}{" "}
                  {ETHIOPIAN_MONTHS[currentEthiopianDate.month - 1]}{" "}
                  {currentEthiopianDate.year}
                </p>
              </div>
            )}

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-semibold">
                  {ETHIOPIAN_MONTHS[displayMonth - 1]} {displayYear}
                </h3>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <button
                  onClick={() => navigateYear(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateYear(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day headers */}
              {ETHIOPIAN_DAYS.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}

              {/* Calendar days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const isHolidayDate = isHoliday(displayMonth, day);
                const holidayInfo = getHolidayInfo(displayMonth, day);
                const isTodayDate = isToday(displayMonth, day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(displayMonth, day)}
                    className={`
                      p-2 text-sm rounded-lg border transition-colors
                      ${
                        isTodayDate
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : isHolidayDate
                          ? "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                          : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
                      }
                    `}
                  >
                    <div className="font-medium">{day}</div>
                    {isHolidayDate && (
                      <div className="text-xs mt-1 truncate">
                        {holidayInfo?.name}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Holiday</span>
              </div>
            </div>
          </div>

          {/* Holidays Section */}
          <div className="w-full lg:w-80 border-l border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Holidays in {ETHIOPIAN_MONTHS[displayMonth - 1]} {displayYear}
            </h3>

            <div className="space-y-3">
              {monthHolidays.map((holiday, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-red-800">
                      {holiday.day}
                    </div>
                    <div className="text-xs text-red-600">Ethiopian</div>
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {holiday.name}
                  </div>
                  {holiday.nameAmharic && (
                    <div className="text-xs text-red-600 mt-1">
                      {holiday.nameAmharic}
                    </div>
                  )}
                </div>
              ))}

              {monthHolidays.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No holidays in this month</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Ethiopian Orthodox Calendar System
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
