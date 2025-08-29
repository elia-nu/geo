"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  MapPin,
  Timer,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Camera,
  Navigation,
} from "lucide-react";

export default function AttendanceManagement() {
  // State management
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchEmployees();
    fetchAttendanceRecords();
  }, []);

  // Fetch attendance records when filters change
  useEffect(() => {
    fetchAttendanceRecords();
  }, [selectedEmployee, dateRange, statusFilter]);

  // Fetch employees list
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee");
      const result = await response.json();

      if (result.success) {
        setEmployees(result.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (selectedEmployee) {
        params.append("employeeId", selectedEmployee);
      }

      if (dateRange.startDate && dateRange.endDate) {
        params.append("startDate", dateRange.startDate);
        params.append("endDate", dateRange.endDate);
      }

      const response = await fetch(
        `/api/attendance/daily?${params.toString()}`
      );
      const result = await response.json();

      if (result.success) {
        setAttendanceRecords(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter records based on search and status
  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      !searchTerm ||
      record.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.employee?.department
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "complete" && record.checkOutTime) ||
      (statusFilter === "incomplete" &&
        record.checkInTime &&
        !record.checkOutTime) ||
      (statusFilter === "absent" && !record.checkInTime);

    return matchesSearch && matchesStatus;
  });

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString();
  };

  // Get status info
  const getStatusInfo = (record) => {
    if (!record.checkInTime) {
      return {
        text: "Absent",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: XCircle,
      };
    }
    if (record.checkOutTime) {
      return {
        text: "Complete",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      };
    }
    return {
      text: "Working",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      icon: Clock,
    };
  };

  // Calculate working hours
  const calculateWorkingHours = (record) => {
    if (!record.checkInTime) return "0:00";

    const checkIn = new Date(record.checkInTime);
    const checkOut = record.checkOutTime
      ? new Date(record.checkOutTime)
      : new Date();
    const diffMs = checkOut - checkIn;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Employee Name",
      "Department",
      "Check-in",
      "Check-out",
      "Working Hours",
      "Status",
      "Check-in Notes",
      "Check-out Notes",
    ];

    const csvData = filteredRecords.map((record) => [
      record.date,
      record.employee?.name || "Unknown",
      record.employee?.department || "",
      formatTime(record.checkInTime),
      formatTime(record.checkOutTime),
      calculateWorkingHours(record),
      getStatusInfo(record).text,
      record.checkInNotes || "",
      record.checkOutNotes || "",
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // View record details
  const viewRecord = (record) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  // Edit record
  const editRecord = (record) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Attendance Management</h1>
              <p className="text-indigo-100">
                Monitor and manage employee attendance
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-indigo-100">Total Records</div>
            <div className="text-3xl font-bold">{filteredRecords.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Employee
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or department..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.personalDetails?.name || emp.name || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <div className="flex space-x-2">
              {[
                { value: "all", label: "All" },
                { value: "complete", label: "Complete" },
                { value: "incomplete", label: "Working" },
                { value: "absent", label: "Absent" },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    statusFilter === status.value
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      <span>Loading attendance records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Calendar className="w-12 h-12 text-gray-300" />
                      <span>No attendance records found</span>
                      <span className="text-sm">
                        Try adjusting your filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const status = getStatusInfo(record);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {record.employee?.name || "Unknown"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {record.employee?.department || "No Department"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(record.checkInTime)}
                        </div>
                        {record.checkInLocation && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            Location verified
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(record.checkOutTime)}
                        </div>
                        {record.checkOutLocation && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            Location verified
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Timer className="w-4 h-4 mr-1 text-blue-500" />
                          {calculateWorkingHours(record)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => viewRecord(record)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => editRecord(record)}
                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {isViewModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendance Details
                </h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Employee Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Name:</span>
                    <p className="font-medium">
                      {selectedRecord.employee?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Department:</span>
                    <p className="font-medium">
                      {selectedRecord.employee?.department || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Attendance Details
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Date:</span>
                      <p className="font-medium">
                        {formatDate(selectedRecord.date)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">
                        Working Hours:
                      </span>
                      <p className="font-medium">
                        {calculateWorkingHours(selectedRecord)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">
                        Check-in Time:
                      </span>
                      <p className="font-medium">
                        {formatTime(selectedRecord.checkInTime)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">
                        Check-out Time:
                      </span>
                      <p className="font-medium">
                        {formatTime(selectedRecord.checkOutTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(selectedRecord.checkInNotes ||
                selectedRecord.checkOutNotes) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <div className="space-y-2">
                    {selectedRecord.checkInNotes && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-blue-700">
                          Check-in Notes:
                        </span>
                        <p className="text-blue-600 mt-1">
                          {selectedRecord.checkInNotes}
                        </p>
                      </div>
                    )}
                    {selectedRecord.checkOutNotes && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <span className="text-sm font-medium text-green-700">
                          Check-out Notes:
                        </span>
                        <p className="text-green-600 mt-1">
                          {selectedRecord.checkOutNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Geofence Validation */}
              {selectedRecord.geofenceValidation && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Location Validation
                  </h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Navigation className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">
                        Location Verified
                      </span>
                    </div>
                    <p className="text-sm text-green-600">
                      Distance from center:{" "}
                      {selectedRecord.geofenceValidation.distanceFromCenter}m
                      (within {selectedRecord.geofenceValidation.geofenceRadius}
                      m radius)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
