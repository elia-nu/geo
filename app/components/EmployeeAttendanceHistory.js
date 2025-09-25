"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Calendar,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Camera,
  Eye,
} from "lucide-react";

export default function EmployeeAttendanceHistory({
  employeeId,
  employeeName,
}) {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [employeeId, filters]);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);

      let url = `/api/attendance/daily?employeeId=${employeeId}`;

      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        let filteredData = result.data;

        // Apply status filter
        if (filters.status) {
          filteredData = filteredData.filter((record) => {
            if (filters.status === "complete") {
              return record.checkInTime && record.checkOutTime;
            } else if (filters.status === "partial") {
              return record.checkInTime && !record.checkOutTime;
            } else if (filters.status === "absent") {
              return !record.checkInTime;
            }
            return true;
          });
        }

        // Apply search filter
        if (searchTerm) {
          filteredData = filteredData.filter(
            (record) =>
              record.date?.includes(searchTerm) ||
              record.notes?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setAttendanceRecords(filteredData);
      }
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      status: "",
    });
    setSearchTerm("");
  };

  const getStatusDisplay = (record) => {
    if (record.checkInTime && record.checkOutTime) {
      return {
        text: "Complete",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      };
    } else if (record.checkInTime) {
      return {
        text: "Partial",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        icon: Clock,
      };
    } else {
      return {
        text: "Absent",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: XCircle,
      };
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);

    return Math.round(hours * 100) / 100;
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Check-in",
      "Check-out",
      "Working Hours",
      "Status",
      "Location",
      "Notes",
    ];
    const csvData = attendanceRecords.map((record) => [
      formatDate(record.date),
      formatTime(record.checkInTime),
      formatTime(record.checkOutTime),
      calculateWorkingHours(record.checkInTime, record.checkOutTime) || "N/A",
      getStatusDisplay(record).text,
      record.checkInLocation ? "Yes" : "No",
      record.notes || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_history_${employeeName}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Attendance History
          </h1>
          <p className="text-gray-600 mt-1">
            View your complete attendance records
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by date or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="complete">Complete</option>
                  <option value="partial">Partial</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <History className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Attendance Records
            </h2>
            <p className="text-sm text-gray-600">
              {attendanceRecords.length} records found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : attendanceRecords.length > 0 ? (
          <div className="space-y-4">
            {attendanceRecords.map((record, index) => {
              const status = getStatusDisplay(record);
              const StatusIcon = status.icon;
              const workingHours = calculateWorkingHours(
                record.checkInTime,
                record.checkOutTime
              );

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {new Date(record.date).getDate()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString([], {
                            month: "short",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(record.date)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(record.date).toLocaleDateString([], {
                            weekday: "long",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="w-5 h-5" />
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                      >
                        {status.text}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Check-in:
                        </span>
                        <span className="text-sm text-gray-900">
                          {formatTime(record.checkInTime)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Check-out:
                        </span>
                        <span className="text-sm text-gray-900">
                          {formatTime(record.checkOutTime)}
                        </span>
                      </div>
                      {workingHours && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Hours:
                          </span>
                          <span className="text-sm text-gray-900">
                            {workingHours}h
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {record.checkInLocation && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            Location recorded
                          </span>
                        </div>
                      )}
                      {record.checkInPhoto && (
                        <div className="flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600">
                            Photo captured
                          </span>
                        </div>
                      )}
                      {record.faceVerified && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            Face verified
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {record.notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">
                            Notes:
                          </span>
                          <p className="text-sm text-gray-600 mt-1">
                            {record.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No attendance records found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
