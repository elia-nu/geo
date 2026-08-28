"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Briefcase,
  Building,
  IdCard,
  Phone,
  Calendar,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  KeyRound,
  Loader2,
  CreditCard,
} from "lucide-react";

export default function EmployeeProfile({ employeeData, workLocations = [] }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  if (!employeeData) return null;

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please enter your current password.",
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      setPasswordLoading(true);
      const employeeId = employeeData._id || employeeData.id;

      const response = await fetch("/api/employee/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPasswordMessage({
          type: "success",
          text: data.message || "Password updated successfully!",
        });
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordMessage({
          type: "error",
          text: data.error || "Failed to update password. Please try again.",
        });
      }
    } catch (err) {
      console.error("Password update error:", err);
      setPasswordMessage({
        type: "error",
        text: "An unexpected error occurred. Please check your connection and try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const empName = employeeData.personalDetails?.name || employeeData.name || "Employee";
  const empEmail = employeeData.personalDetails?.email || employeeData.email || "N/A";
  const empIdCode =
    employeeData.employeeId ||
    employeeData.personalDetails?.employeeId ||
    "N/A";
  const empDept =
    employeeData.department ||
    employeeData.personalDetails?.department ||
    "General";
  const empDesignation =
    employeeData.designation ||
    employeeData.personalDetails?.designation ||
    "Staff";
  const empContact =
    employeeData.contactNumber ||
    employeeData.personalDetails?.contactNumber ||
    employeeData.personalDetails?.phone ||
    "N/A";
  const empJoinDate =
    employeeData.joiningDate ||
    employeeData.personalDetails?.joiningDate ||
    null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/30 flex items-center justify-center text-3xl font-black text-white shadow-lg shrink-0">
            {empName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {empName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Active
              </span>
            </div>
            <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
              <span>{empDesignation}</span>
              <span>•</span>
              <span>{empDept}</span>
            </p>
            <p className="text-blue-200/80 text-xs font-mono">
              ID: {empIdCode}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Profile info & Work locations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Personal Information
                </h2>
                <p className="text-xs text-gray-500">
                  Your registered details with the organization
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Full Name
                </span>
                <p className="font-semibold text-gray-900">{empName}</p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Email Address
                </span>
                <p className="font-semibold text-gray-900 truncate">
                  {empEmail}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Employee ID
                </span>
                <p className="font-semibold text-gray-900 font-mono">
                  {empIdCode}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Contact Number
                </span>
                <p className="font-semibold text-gray-900">{empContact}</p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Department
                </span>
                <p className="font-semibold text-gray-900">{empDept}</p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Designation / Role
                </span>
                <p className="font-semibold text-gray-900">{empDesignation}</p>
              </div>

              {empJoinDate && (
                <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 sm:col-span-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                    Joining Date
                  </span>
                  <p className="font-semibold text-gray-900">
                    {new Date(empJoinDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Banking & Compensation Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Banking & Payroll Details
                  </h2>
                  <p className="text-xs text-gray-500">
                    Registered bank account for direct deposit salary disbursement
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                Direct Deposit
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Bank Account Number
                </span>
                <p className="font-mono font-bold text-gray-900 tracking-wide">
                  {employeeData.bankAccount ||
                    employeeData.bankAccountNumber ||
                    employeeData.personalDetails?.bankAccount ||
                    employeeData.payrollDetails?.bankAccount ||
                    "Not configured"}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Bank Name
                </span>
                <p className="font-semibold text-gray-900">
                  {employeeData.bankName ||
                    employeeData.personalDetails?.bankName ||
                    employeeData.payrollDetails?.bankName ||
                    "Commercial Bank of Ethiopia (CBE)"}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
                  Basic Monthly Salary
                </span>
                <p className="font-bold text-emerald-600">
                  {(
                    employeeData.salary ||
                    employeeData.grossSalary ||
                    employeeData.salaryETB ||
                    employeeData.personalDetails?.salary ||
                    employeeData.payrollDetails?.grossSalary ||
                    0
                  ).toLocaleString()}{" "}
                  ETB
                </p>
              </div>
            </div>
          </div>

          {/* Work Locations */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Assigned Work Locations
                  </h2>
                  <p className="text-xs text-gray-500">
                    Authorized geofenced sites for check-in and check-out
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full">
                {workLocations.length} {workLocations.length === 1 ? "Location" : "Locations"}
              </span>
            </div>

            {workLocations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workLocations.map((location) => {
                  const radiusVal =
                    typeof location.radius === "number"
                      ? location.radius
                      : parseInt(String(location.radius || "100"), 10) || 100;

                  return (
                    <div
                      key={location._id || location.name}
                      className="p-4 rounded-xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/30 to-blue-50/20 hover:border-indigo-200 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{location.name}</span>
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                          {radiusVal}m radius
                        </span>
                      </div>

                      {location.address && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {location.address}
                        </p>
                      )}

                      {location.latitude && location.longitude && (
                        <p className="text-[11px] font-mono text-gray-400">
                          {Number(location.latitude).toFixed(5)},{" "}
                          {Number(location.longitude).toFixed(5)}
                        </p>
                      )}

                      {location.description && (
                        <p className="text-xs text-gray-500 italic pt-1 border-t border-indigo-50">
                          {location.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  No work locations assigned yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Please contact your administrator to configure your work sites.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right col: Security & Password Update */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Security & Password
                </h2>
                <p className="text-xs text-gray-500">
                  Update your portal login password
                </p>
              </div>
            </div>

            {passwordMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2 mb-4 ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-[11px] text-gray-500 space-y-1">
                <p className="font-semibold text-gray-700">Security Tips:</p>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  <li>Use at least 6 characters.</li>
                  <li>Avoid sharing credentials with anyone.</li>
                </ul>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
