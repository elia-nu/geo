"use client";
import React from "react";
import { X, User, Building, Award, Heart } from "lucide-react";

export default function EditEmployeeDialog({
  isOpen,
  onClose,
  selectedEmployee,
  setSelectedEmployee,
  onUpdate,
  loading,
  formErrors,
}) {
  if (!isOpen || !selectedEmployee) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Edit Employee</h3>
                <p className="text-green-100 text-sm">
                  Update employee information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Personal Information Section */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.personalDetails.name}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        personalDetails: {
                          ...selectedEmployee.personalDetails,
                          name: e.target.value,
                        },
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      formErrors.name
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Enter employee's full name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={selectedEmployee.personalDetails.email}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        personalDetails: {
                          ...selectedEmployee.personalDetails,
                          email: e.target.value,
                        },
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      formErrors.email
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="employee@company.com"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.personalDetails.contactNumber || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        personalDetails: {
                          ...selectedEmployee.personalDetails,
                          contactNumber: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={selectedEmployee.personalDetails.dateOfBirth || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        personalDetails: {
                          ...selectedEmployee.personalDetails,
                          dateOfBirth: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={selectedEmployee.personalDetails.address || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        personalDetails: {
                          ...selectedEmployee.personalDetails,
                          address: e.target.value,
                        },
                      })
                    }
                    placeholder="Enter employee's address"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Employment Information Section */}
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Employment Information
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEmployee.department}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        department: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      formErrors.department
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500"
                    }`}
                  >
                    <option value="">Select Department</option>
                    <option value="IT">Information Technology</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Legal">Legal</option>
                  </select>
                  {formErrors.department && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.department}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedEmployee.designation}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        designation: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                      formErrors.designation
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-green-500"
                    }`}
                    placeholder="e.g., Software Engineer, Manager"
                  />
                  {formErrors.designation && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.designation}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Location
                  </label>
                  <select
                    value={
                      typeof selectedEmployee.workLocation === "object" &&
                      selectedEmployee.workLocation?.name
                        ? selectedEmployee.workLocation.name
                        : typeof selectedEmployee.workLocation === "string"
                        ? selectedEmployee.workLocation
                        : ""
                    }
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        workLocation: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Location</option>
                    <option value="New York">New York</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="London">London</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Skills</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                <input
                  type="text"
                  value={
                    selectedEmployee.skills
                      ? selectedEmployee.skills.join(", ")
                      : ""
                  }
                  onChange={(e) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s),
                    })
                  }
                  placeholder="JavaScript, React, Node.js, Python, Project Management"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Separate skills with commas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onUpdate}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
            >
              {loading ? "Updating..." : "Update Employee"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
