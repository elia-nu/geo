"use client";

import React, { useState } from "react";
import EthiopianDatePicker from "mui-ethiopian-datepicker";
import { toGregorian, toEthiopian } from "ethiopian-calendar-new";
import { Calendar, X } from "lucide-react";

export default function EthiopianDatePickerWidget({
  isOpen,
  onClose,
  onDateSelect,
}) {
  const [selectedEthiopianDate, setSelectedEthiopianDate] = useState(null);

  const handleDateChange = (year, month, day) => {
    if (year && month && day) {
      setSelectedEthiopianDate({ year, month, day });
    }
  };

  const handleSelect = () => {
    if (selectedEthiopianDate) {
      // Convert Ethiopian date to Gregorian
      const gregorian = toGregorian(
        selectedEthiopianDate.year,
        selectedEthiopianDate.month,
        selectedEthiopianDate.day
      );

      // Create a Date object
      const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);

      if (onDateSelect) {
        onDateSelect(date);
      }
    }
  };

  const handleClose = () => {
    setSelectedEthiopianDate(null);
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Ethiopian Date Picker
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Picker */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Ethiopian Date:
            </label>
            <EthiopianDatePicker
              value={
                selectedEthiopianDate
                  ? [
                      selectedEthiopianDate.year,
                      selectedEthiopianDate.month,
                      selectedEthiopianDate.day,
                    ]
                  : null
              }
              onChange={handleDateChange}
            />
          </div>

          {selectedEthiopianDate && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected Ethiopian Date:</strong>{" "}
                {selectedEthiopianDate.day}/{selectedEthiopianDate.month}/
                {selectedEthiopianDate.year}
              </p>
              {(() => {
                const gregorian = toGregorian(
                  selectedEthiopianDate.year,
                  selectedEthiopianDate.month,
                  selectedEthiopianDate.day
                );
                return (
                  <p className="text-sm text-blue-600 mt-1">
                    <strong>Gregorian Date:</strong> {gregorian.day}/
                    {gregorian.month}/{gregorian.year}
                  </p>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedEthiopianDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Date
          </button>
        </div>
      </div>
    </div>
  );
}
