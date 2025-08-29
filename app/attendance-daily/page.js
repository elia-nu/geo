"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import DailyAttendance from "../components/DailyAttendance";
import AttendanceManagement from "../components/AttendanceManagement";
import { Users, Clock, UserCheck } from "lucide-react";

export default function DailyAttendancePage() {
  const [currentView, setCurrentView] = useState("employee"); // "employee" or "management"
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  useEffect(() => {
    fetchEmployees();
    // For demo purposes, we'll simulate a logged-in employee
    // In a real app, this would come from authentication
    setCurrentUser({
      id: "demo-employee-id",
      name: "Demo Employee",
      role: "employee",
    });
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
    <Layout activeSection="attendance-daily">
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView("employee")}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  currentView === "employee"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>Employee Attendance</span>
              </button>

              <button
                onClick={() => setCurrentView("management")}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  currentView === "management"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Attendance Management</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-6">
          {currentView === "employee" ? (
            <div className="max-w-4xl mx-auto px-6">
              {/* Employee Selection (for demo purposes) */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Select Employee (Demo Mode)</span>
                </h2>
                <div className="max-w-md">
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                  In a production environment, this would automatically detect
                  the logged-in employee.
                </p>
              </div>

              {/* Daily Attendance Component */}
              {selectedEmployee ? (
                <DailyAttendance
                  employeeId={selectedEmployee}
                  employeeName={employeeName}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Welcome to Daily Attendance
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Please select an employee to view their attendance
                    interface.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Attendance Management View */
            <AttendanceManagement />
          )}
        </div>
      </div>
    </Layout>
  );
}
