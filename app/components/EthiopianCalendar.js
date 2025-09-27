"use client";

import React, { useMemo, useState } from "react";
import Kenat from "kenat";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

function getDaysInEthiopianMonth(etYear, etMonth) {
  // Months 1-12 have 30 days; Pagume (13) has 5 or 6 days in leap years
  if (etMonth >= 1 && etMonth <= 12) return 30;
  const isLeap = (etYear + 1) % 4 === 0;
  return isLeap ? 6 : 5;
}

function ecToGregorianDate(etYear, etMonth, etDay) {
  const k = new Kenat(`${etYear}/${etMonth}/${etDay}`);
  const g = k.getGregorian();
  return new Date(Date.UTC(g.year, g.month - 1, g.day));
}

function getWeekdayIndexMonStart(dateUtc) {
  // Convert JS Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const dow = dateUtc.getUTCDay();
  return (dow + 6) % 7;
}

function classifyHoliday(holidayName) {
  const name = (holidayName || "").toLowerCase();
  const isMuslim = ["eid", "ara", "mawl", "ramad"].some((k) =>
    name.includes(k)
  );
  const isOrthodox = [
    "fasika",
    "good friday",
    "meskel",
    "timkat",
    "genna",
    "enkutatash",
    "epiphany",
  ].some((k) => name.includes(k));
  return isMuslim ? "muslim" : isOrthodox ? "orthodox" : "national";
}

export default function EthiopianCalendar() {
  // Determine current Ethiopian year from today
  const today = new Date();
  const todayEc = new Kenat(today).getEthiopian();
  const [etYear, setEtYear] = useState(todayEc.year);
  const [modal, setModal] = useState({ open: false, holiday: null, et: null });

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
    "Nehasse",
    "Pagume",
  ];

  const monthData = useMemo(() => {
    const data = [];
    for (let m = 1; m <= 13; m++) {
      const daysInMonth = getDaysInEthiopianMonth(etYear, m);
      const firstDayG = ecToGregorianDate(etYear, m, 1);
      const startOffset = getWeekdayIndexMonStart(firstDayG);

      const cells = [];
      for (let i = 0; i < startOffset; i++)
        cells.push({ empty: true, key: `e-${i}` });
      for (let d = 1; d <= daysInMonth; d++) {
        // Check holiday per day via Kenat instance to be robust
        let holiday = null;
        try {
          const k = new Kenat(`${etYear}/${m}/${d}`);
          const hol = k.isHoliday();
          if (hol && (Array.isArray(hol) ? hol.length > 0 : true)) {
            holiday = Array.isArray(hol) ? hol[0] : hol;
          }
        } catch (_) {}
        const category = holiday
          ? classifyHoliday(holiday?.name || holiday?.title)
          : null;
        cells.push({ empty: false, d, holiday, category, key: `d-${d}` });
      }
      // Pad to full weeks (multiples of 7)
      while (cells.length % 7 !== 0)
        cells.push({ empty: true, key: `p-${cells.length}` });

      data.push({ month: m, name: months[m - 1], cells });
    }
    return data;
  }, [etYear]);

  return (
    <div className="space-y-6 bg-white/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-900">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Ethiopian Calendar — {etYear}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEtYear((y) => y - 1)}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Prev Year
          </button>
          <button
            onClick={() => setEtYear(todayEc.year)}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Today (EC {todayEc.year})
          </button>
          <button
            onClick={() => setEtYear((y) => y + 1)}
            className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
          >
            Next Year <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {monthData.map((m) => (
          <div key={m.month} className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b font-semibold text-gray-800">
              {m.name}
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-600 bg-white">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => (
                <div key={h} className="py-2 border-b border-gray-100">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 p-2">
              {m.cells.map((cell) => {
                if (cell.empty) return <div key={cell.key} className="h-8" />;
                const base =
                  "h-8 flex items-center justify-center rounded text-xs border transition-colors";
                const isHoliday = !!cell.holiday;
                let style =
                  "bg-white border-gray-200 text-gray-900 hover:bg-gray-50";
                if (isHoliday) {
                  style =
                    cell.category === "muslim"
                      ? "bg-green-100 border-green-300 text-green-800"
                      : cell.category === "orthodox"
                      ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                      : "bg-red-100 border-red-300 text-red-800";
                }
                return (
                  <div
                    key={cell.key}
                    className={`${base} ${style} ${
                      isHoliday ? "cursor-pointer" : "cursor-default"
                    }`}
                    title={
                      cell.holiday
                        ? cell.holiday.name || cell.holiday.title
                        : undefined
                    }
                    onClick={() => {
                      if (!isHoliday) return;
                      setModal({
                        open: true,
                        holiday: cell.holiday,
                        et: { year: etYear, month: m.month, day: cell.d },
                      });
                    }}
                  >
                    {cell.d}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200"></span>
          National/Ethiopian Holiday
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-indigo-100 border border-indigo-200"></span>
          Orthodox Holiday
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-green-100 border border-green-200"></span>
          Muslim Holiday
        </div>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold text-gray-900">Holiday Details</div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() =>
                  setModal({ open: false, holiday: null, et: null })
                }
              >
                ×
              </button>
            </div>
            <div className="p-4 space-y-2 text-sm text-gray-800">
              <div>
                <span className="font-medium">Name: </span>
                {modal.holiday?.name || modal.holiday?.title || "Holiday"}
              </div>
              {modal.holiday?.nameAmharic && (
                <div>
                  <span className="font-medium">Amharic: </span>
                  {modal.holiday.nameAmharic}
                </div>
              )}
              <div>
                <span className="font-medium">Type: </span>
                {classifyHoliday(modal.holiday?.name || modal.holiday?.title)}
              </div>
              <div>
                <span className="font-medium">Ethiopian Date: </span>
                {modal.et?.year}/{modal.et?.month}/{modal.et?.day}
              </div>
              <div>
                <span className="font-medium">Gregorian Date: </span>
                {(() => {
                  try {
                    const g = new Kenat(
                      `${modal.et?.year}/${modal.et?.month}/${modal.et?.day}`
                    ).getGregorian();
                    const d = new Date(Date.UTC(g.year, g.month - 1, g.day));
                    return d.toISOString().slice(0, 10);
                  } catch {
                    return "-";
                  }
                })()}
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-end">
              <button
                onClick={() =>
                  setModal({ open: false, holiday: null, et: null })
                }
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
