"use client";

import React, { useState } from "react";
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
            fileName = `daily_attendance_${currentReport.startDate}.txt`;
            break;
          case "weekly":
            fileName = `weekly_attendance_${currentReport.startDate}_to_${currentReport.endDate}.txt`;
            break;
          case "monthly":
            fileName = `monthly_attendance_${currentReport.startDate.substring(
              0,
              7
            )}.txt`;
            break;
          default:
            fileName = `attendance_report_${currentReport.startDate}.txt`;
        }

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage("Report exported to text file successfully", "success");
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Attendance Reports
          </h2>
          <p className="text-gray-600">
            Generate attendance reports and export to text files for compliance and
            analysis
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Generate Report</span>
        </button>
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
              className="text-sm text-gray-600 hover:text-gray-800"
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
                  <span>Export to Text File</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Generate Attendance Report
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-4">
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
                    <span className="ml-2 text-sm text-gray-700">
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
                    <span className="ml-2 text-sm text-gray-700">
                      Include Location Data
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
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
