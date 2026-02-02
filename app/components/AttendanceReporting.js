"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  CalendarDays,
  MapPin,
  Camera,
} from "lucide-react";

export default function AttendanceReporting() {
  const [currentReport, setCurrentReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Report generation form state
  const [reportForm, setReportForm] = useState({
    reportType: "daily",
    startDate: "",
    endDate: "",
    employeeId: "",
    department: "",
    includePhotos: false,
    includeLocationData: true,
  });

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  // Function to format date as YYYY-MM-DD for input fields
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Function to get dates based on report type
  const getDatesForReportType = (reportType) => {
    const today = new Date();
    let startDate, endDate;

    switch (reportType) {
      case "daily":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "weekly":
        // Get start of week (Monday)
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        startDate = new Date(today);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        // Get end of week (Sunday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "monthly":
        // Get first day of current month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        // Get last day of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "random":
        // For random, don't auto-fill
        return { startDate: "", endDate: "" };
      default:
        startDate = new Date(today);
        endDate = new Date(today);
    }

    return {
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
    };
  };

  // Auto-fill dates when report type changes
  useEffect(() => {
    if (reportForm.reportType !== "random") {
      const dates = getDatesForReportType(reportForm.reportType);
      setReportForm((prev) => ({
        ...prev,
        startDate: dates.startDate,
        endDate: dates.endDate,
      }));
    } else {
      // Clear dates for random type
      setReportForm((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
      }));
    }
  }, [reportForm.reportType]);

  const handleGenerateReport = async () => {
    if (!reportForm.startDate || !reportForm.endDate) {
      showMessage("Start date and end date are required", "error");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/attendance/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...reportForm,
          adminId: "admin", // Replace with actual admin ID
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentReport(result.data);
        showMessage(result.message, "success");
        setShowGenerateModal(false);
      } else {
        showMessage(result.error || "Failed to generate report", "error");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      showMessage("Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportToPDF = async () => {
    if (!currentReport) {
      showMessage("No report to export", "error");
      return;
    }

    setExporting(true);
    try {
      const response = await fetch("/api/attendance/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentReport),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Generate filename based on report type and date
        let fileName;
        switch (currentReport.reportType) {
          case "daily":
            fileName = `daily_attendance_${currentReport.startDate}.xlsx`;
            break;
          case "weekly":
            fileName = `weekly_attendance_${currentReport.startDate}_to_${currentReport.endDate}.xlsx`;
            break;
          case "monthly":
            fileName = `monthly_attendance_${currentReport.startDate.substring(
              0,
              7
            )}.xlsx`;
            break;
          case "random":
            fileName = `random_attendance_${currentReport.startDate}_to_${currentReport.endDate}.xlsx`;
            break;
          default:
            fileName = `attendance_report_${currentReport.startDate}.xlsx`;
        }

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage("Report exported to Excel file successfully", "success");
      } else {
        const errorData = await response.json();
        showMessage(errorData.error || "Failed to export report", "error");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      showMessage("Failed to export report", "error");
    } finally {
      setExporting(false);
    }
  };

  const clearCurrentReport = () => {
    setCurrentReport(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-full p-3 ring-1 ring-white/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Attendance Reports
              </h2>
              <p className="text-white/80">
                Generate and export attendance reports
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 text-white"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-2 ${
            messageType === "success"
              ? "bg-green-100 text-green-800"
              : messageType === "error"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : messageType === "error" ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Current Report Display */}
      {currentReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Report
            </h3>
            <button
              onClick={clearCurrentReport}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Clear Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {currentReport.reportType.charAt(0).toUpperCase() +
                    currentReport.reportType.slice(1)}{" "}
                  Report
                </span>
              </div>
              <p className="text-sm text-blue-700">
                {formatDate(currentReport.startDate)} -{" "}
                {formatDate(currentReport.endDate)}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Summary</span>
              </div>
              <p className="text-sm text-green-700">
                {currentReport.summary.totalRecords} records,{" "}
                {currentReport.summary.uniqueEmployees} employees
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">
                  Working Hours
                </span>
              </div>
              <p className="text-sm text-purple-700">
                Total: {currentReport.summary.totalWorkingHours} hours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentReport.summary.totalCheckIns}
              </div>
              <div className="text-sm text-gray-600">Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentReport.summary.totalCheckOuts}
              </div>
              <div className="text-sm text-gray-600">Check-outs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentReport.summary.totalFaceVerified}
              </div>
              <div className="text-sm text-gray-600">Face Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {currentReport.summary.averageWorkingHours}
              </div>
              <div className="text-sm text-gray-600">Avg Hours</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportToPDF}
              disabled={exporting}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <h3 className="text-lg font-semibold">
                Generate Attendance Report
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Report Type
                  </label>
                  <select
                    value={reportForm.reportType}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        reportType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  >
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Start Date
                    {reportForm.reportType !== "random" && (
                      <span className="text-gray-500 text-xs ml-1">
                        (Auto-filled)
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={reportForm.startDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    End Date
                    {reportForm.reportType !== "random" && (
                      <span className="text-gray-500 text-xs ml-1">
                        (Auto-filled)
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={reportForm.endDate}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by employee ID"
                    value={reportForm.employeeId}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        employeeId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by department"
                    value={reportForm.department}
                    onChange={(e) =>
                      setReportForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reportForm.includePhotos}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          includePhotos: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">
                      Include Photos
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reportForm.includeLocationData}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          includeLocationData: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-900">
                      Include Location Data
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
