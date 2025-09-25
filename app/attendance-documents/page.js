"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import AttendanceDocuments from "../components/AttendanceDocuments";
import { FileText, Clock, ArrowLeft } from "lucide-react";

export default function AttendanceDocumentsPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee");
      const result = await response.json();

      if (result.success) {
        const employeeList = result.employees || [];
        setEmployees(employeeList);

        // Set first employee as default if none selected
        if (employeeList.length > 0 && !selectedEmployee) {
          setSelectedEmployee(employeeList[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const selectedEmployeeData = employees.find(
    (emp) => emp._id === selectedEmployee
  );
  const employeeName =
    selectedEmployeeData?.personalDetails?.name ||
    selectedEmployeeData?.name ||
    "Unknown Employee";

  return (
    <Layout activeSection="attendance-documents">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Attendance</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-purple-600" />
                  <h1 className="text-xl font-semibold text-gray-900">
                    Attendance Documents & Requests
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-6">
          {/* Employee Selection (for demo purposes) */}
          <div className="max-w-6xl mx-auto px-6 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span>Select Employee (Demo Mode)</span>
              </h2>
              <div className="max-w-md">
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                >
                  <option value="">Select an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.personalDetails?.name || emp.name || "Unknown"} -{" "}
                      {emp.personalDetails?.department ||
                        emp.department ||
                        "No Department"}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                In a production environment, this would automatically detect the
                logged-in employee.
              </p>
            </div>
          </div>

          {/* Attendance Documents Component */}
          {selectedEmployee ? (
            <AttendanceDocuments
              employeeId={selectedEmployee}
              employeeName={employeeName}
            />
          ) : (
            <div className="max-w-6xl mx-auto px-6">
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Attendance Documents
                </h3>
                <p className="text-gray-600 mb-6">
                  Please select an employee to view their document submission
                  interface.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
