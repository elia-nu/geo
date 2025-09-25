"use client";
import React, { useState, useEffect } from "react";
import { Users, X, User, Building, Award, Heart } from "lucide-react";
import EditStepperEmployeeForm from "./EditStepperEmployeeForm";
import StepperEmployeeForm from "./StepperEmployeeForm";

export default function EmployeeDatabase() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStepperFormOpen, setIsStepperFormOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [newEmployee, setNewEmployee] = useState({
    personalDetails: {
      name: "",
      dateOfBirth: "",
      address: "",
      contactNumber: "",
      emergencyContactNumber: "",
      email: "",
    },
    employmentHistory: [],
    certifications: [],
    skills: [],
    healthRecords: {
      bloodType: "",
      allergies: [],
      medicalConditions: [],
    },
    department: "",
    designation: "",
    workLocation: "",
  });

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Helper function to safely get employee name
  const getEmployeeName = (emp) => {
    return emp.personalDetails?.name || emp.name || "";
  };

  // Helper function to safely get employee email
  const getEmployeeEmail = (emp) => {
    return emp.personalDetails?.email || emp.email || "";
  };

  // Helper function to safely get employee skills
  const getEmployeeSkills = (emp) => {
    return emp.skills || [];
  };

  // Helper to normalize workLocation to a displayable string
  const getWorkLocationDisplay = (value) => {
    if (typeof value === "object" && value?.name) return String(value.name);
    if (typeof value === "string") return value;
    return "";
  };

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(
        (emp) =>
          getEmployeeName(emp)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getEmployeeEmail(emp)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (emp.department || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (emp.designation || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getWorkLocationDisplay(emp.workLocation)
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getEmployeeSkills(emp).some((skill) =>
            skill.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter((emp) => emp.department === departmentFilter);
    }

    if (skillFilter) {
      filtered = filtered.filter((emp) =>
        getEmployeeSkills(emp).includes(skillFilter)
      );
    }

    if (designationFilter) {
      filtered = filtered.filter(
        (emp) => emp.designation === designationFilter
      );
    }

    if (locationFilter) {
      filtered = filtered.filter(
        (emp) => getWorkLocationDisplay(emp.workLocation) === locationFilter
      );
    }

    setFilteredEmployees(filtered);
  }, [
    employees,
    searchTerm,
    departmentFilter,
    skillFilter,
    designationFilter,
    locationFilter,
  ]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/employee");
      if (!response.ok) {
        throw new Error(`Failed to fetch employees: ${response.statusText}`);
      }
      const data = await response.json();

      // Check if the API response has the correct structure
      if (data.success && Array.isArray(data.employees)) {
        setEmployees(data.employees);
      } else if (Array.isArray(data)) {
        // Fallback for old API format
        setEmployees(data);
      } else {
        console.error("Invalid API response format:", data);
        setEmployees([]);
        setError("Invalid data format received from server");
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Failed to load employees. Please try again.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const validateEmployee = (employee) => {
    const errors = {};

    const name = getEmployeeName(employee);
    const email = getEmployeeEmail(employee);

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email is invalid";
    }

    if (!employee.department?.trim()) {
      errors.department = "Department is required";
    }

    if (!employee.designation?.trim()) {
      errors.designation = "Designation is required";
    }

    // Check for duplicate email
    if (Array.isArray(employees)) {
      const existingEmployee = employees.find(
        (emp) => getEmployeeEmail(emp) === email && emp._id !== employee._id
      );
      if (existingEmployee) {
        errors.email = "Email already exists";
      }
    }

    return errors;
  };

  const handleAddEmployee = async () => {
    try {
      setFormErrors({});
      setError("");
      setSuccess("");

      // Validate form
      const errors = validateEmployee(newEmployee);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setLoading(true);

      // Add timestamp
      const employeeData = {
        ...newEmployee,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      };

      const response = await fetch("/api/employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create employee");
      }

      const result = await response.json();
      setSuccess("Employee created successfully!");
      setIsAddDialogOpen(false);

      // Reset form
      setNewEmployee({
        personalDetails: {
          name: "",
          dateOfBirth: "",
          address: "",
          contactNumber: "",
          email: "",
        },
        employmentHistory: [],
        certifications: [],
        skills: [],
        healthRecords: {
          bloodType: "",
          allergies: [],
          medicalConditions: [],
        },
        department: "",
        designation: "",
        workLocation: "",
      });

      await fetchEmployees();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error adding employee:", error);
      setError(error.message || "Failed to create employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      setFormErrors({});
      setError("");
      setSuccess("");

      // Validate form
      const errors = validateEmployee(selectedEmployee);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setLoading(true);

      // Add update timestamp
      const updatedEmployee = {
        ...selectedEmployee,
        updatedAt: new Date(),
      };

      const response = await fetch(`/api/employee/${selectedEmployee._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEmployee),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update employee");
      }

      setSuccess("Employee updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      await fetchEmployees();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating employee:", error);
      setError(error.message || "Failed to update employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${employeeName}? This action cannot be undone.`
      )
    ) {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/employee/${employeeId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete employee");
        }

        setSuccess("Employee deleted successfully!");
        await fetchEmployees();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      } catch (error) {
        console.error("Error deleting employee:", error);
        setError(
          error.message || "Failed to delete employee. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const getUniqueDepartments = () => {
    if (!Array.isArray(employees)) return [];
    return [...new Set(employees.map((emp) => emp.department).filter(Boolean))];
  };

  const getUniqueSkills = () => {
    if (!Array.isArray(employees)) return [];
    const allSkills = employees.flatMap((emp) => getEmployeeSkills(emp));
    return [...new Set(allSkills)];
  };

  const getUniqueDesignations = () => {
    if (!Array.isArray(employees)) return [];
    return [
      ...new Set(employees.map((emp) => emp.designation).filter(Boolean)),
    ];
  };

  const getUniqueLocations = () => {
    if (!Array.isArray(employees)) return [];
    return [
      ...new Set(
        employees
          .map((emp) => getWorkLocationDisplay(emp.workLocation))
          .filter(Boolean)
      ),
    ];
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError("")}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-green-400">✓</div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccess("")}
                className="inline-flex text-green-400 hover:text-green-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Employee Database
            </h2>
            <p className="text-gray-600 mt-1">
              Manage all employee information and profiles
            </p>
          </div>
          <button
            onClick={() => setIsStepperFormOpen(true)}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Loading..." : "Add Employee"}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Search & Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, department, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">All Departments</option>
              {getUniqueDepartments().map((dept, index) => (
                <option key={`dept-${index}-${dept}`} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Designation
            </label>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">All Designations</option>
              {getUniqueDesignations().map((designation, index) => (
                <option
                  key={`designation-${index}-${designation}`}
                  value={designation}
                >
                  {designation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Skills</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">All Skills</option>
              {getUniqueSkills().map((skill, index) => (
                <option key={`skill-${index}-${skill}`} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Work Location
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">All Locations</option>
              {getUniqueLocations().map((location, index) => (
                <option key={`location-${index}-${location}`} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setDepartmentFilter("");
                setSkillFilter("");
                setDesignationFilter("");
                setLocationFilter("");
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Showing {filteredEmployees.length} of{" "}
            {Array.isArray(employees) ? employees.length : 0} employees
            {searchTerm ||
            departmentFilter ||
            skillFilter ||
            designationFilter ||
            locationFilter ? (
              <span className="ml-2">
                (filtered by:{" "}
                {[
                  searchTerm && "search",
                  departmentFilter && "department",
                  skillFilter && "skills",
                  designationFilter && "designation",
                  locationFilter && "location",
                ]
                  .filter(Boolean)
                  .join(", ")}
                )
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Skills
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading &&
              (!Array.isArray(employees) || employees.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-500">Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">
                        No employees found
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchTerm ||
                        departmentFilter ||
                        skillFilter ||
                        designationFilter ||
                        locationFilter
                          ? "Try adjusting your search filters"
                          : "Get started by adding your first employee"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getEmployeeName(employee)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getEmployeeEmail(employee)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.designation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof employee.workLocation === "object" &&
                      employee.workLocation?.name
                        ? employee.workLocation.name
                        : typeof employee.workLocation === "string"
                        ? employee.workLocation
                        : "Not specified"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {getEmployeeSkills(employee)
                          .slice(0, 3)
                          .map((skill, index) => (
                            <span
                              key={`${employee._id}-skill-${index}-${skill}`}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                        {getEmployeeSkills(employee).length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{getEmployeeSkills(employee).length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsProfileDialogOpen(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="View Profile"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsEditDialogOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Employee"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteEmployee(
                              employee._id,
                              getEmployeeName(employee)
                            )
                          }
                          disabled={loading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Employee"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Dialog */}
      {isAddDialogOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ zIndex: 9999 }}
          onClick={() => setIsAddDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Add New Employee</h3>
                    <p className="text-blue-100 text-sm">
                      Create a comprehensive employee profile
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddDialogOpen(false)}
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
                <div className="bg-gray-50 rounded-xl p-4">
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
                        value={newEmployee.personalDetails.name}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
                              name: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter employee's full name"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                          formErrors.name
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
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
                        value={newEmployee.personalDetails.email}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
                              email: e.target.value,
                            },
                          })
                        }
                        placeholder="employee@company.com"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                          formErrors.email
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
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
                        value={newEmployee.personalDetails.contactNumber}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
                              contactNumber: e.target.value,
                            },
                          })
                        }
                        placeholder="+1 (555) 123-4567"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emergency Contact Number
                      </label>
                      <input
                        type="text"
                        value={
                          newEmployee.personalDetails.emergencyContactNumber
                        }
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
                              emergencyContactNumber: e.target.value,
                            },
                          })
                        }
                        placeholder="Contact in case of emergency"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={newEmployee.personalDetails.dateOfBirth}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
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
                        value={newEmployee.personalDetails.address}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
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
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
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
                        value={newEmployee.department}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
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
                        value={newEmployee.designation}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            designation: e.target.value,
                          })
                        }
                        placeholder="e.g., Software Engineer, Manager"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                          formErrors.designation
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-green-500"
                        }`}
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
                        value={newEmployee.workLocation}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
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

                {/* Skills & Qualifications Section */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Skills & Qualifications
                    </h4>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skills
                      </label>
                      <input
                        type="text"
                        placeholder="JavaScript, React, Node.js, Python, Project Management"
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            skills: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s),
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Separate skills with commas
                      </p>
                    </div>

                    {/* Certifications input */}
                    <div className="bg-white rounded-lg border p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Certificate Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., AWS Solutions Architect"
                            id="cert-title-input"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Issuing Institution
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Amazon Web Services"
                            id="cert-issuer-input"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Obtained
                          </label>
                          <input
                            type="date"
                            id="cert-date-input"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const titleEl =
                              document.getElementById("cert-title-input");
                            const issuerEl =
                              document.getElementById("cert-issuer-input");
                            const dateEl =
                              document.getElementById("cert-date-input");
                            const title = titleEl ? titleEl.value.trim() : "";
                            const issuingInstitution = issuerEl
                              ? issuerEl.value.trim()
                              : "";
                            const dateObtained = dateEl ? dateEl.value : "";
                            if (!title && !issuingInstitution && !dateObtained)
                              return;
                            setNewEmployee((prev) => ({
                              ...prev,
                              certifications: [
                                ...prev.certifications,
                                {
                                  title,
                                  issuer: issuingInstitution,
                                  issueDate: dateObtained,
                                },
                              ],
                            }));
                            if (titleEl) titleEl.value = "";
                            if (issuerEl) issuerEl.value = "";
                            if (dateEl) dateEl.value = "";
                          }}
                          className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                        >
                          Add Certification
                        </button>
                      </div>
                      {newEmployee.certifications.length > 0 && (
                        <div className="text-sm text-gray-700">
                          <div className="font-medium mb-2">
                            Added Certifications
                          </div>
                          <ul className="list-disc pl-5 space-y-1">
                            {newEmployee.certifications.map((c, idx) => (
                              <li key={`new-cert-${idx}`}>
                                {c.title || "(Untitled)"} —{" "}
                                {c.issuer ||
                                  c.issuingInstitution ||
                                  "Institution"}{" "}
                                ({c.issueDate || c.dateObtained || "Date"})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Health Information Section */}
                <div className="bg-orange-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Health Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Type
                      </label>
                      <select
                        value={newEmployee.healthRecords.bloodType}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            healthRecords: {
                              ...newEmployee.healthRecords,
                              bloodType: e.target.value,
                            },
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      >
                        <option value="">Select Blood Type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allergies
                      </label>
                      <input
                        type="text"
                        placeholder="Peanuts, Shellfish, etc."
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            healthRecords: {
                              ...newEmployee.healthRecords,
                              allergies: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s),
                            },
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsAddDialogOpen(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEmployee}
                  disabled={
                    loading ||
                    !newEmployee.personalDetails.name ||
                    !newEmployee.personalDetails.email ||
                    !newEmployee.department ||
                    !newEmployee.designation
                  }
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
                >
                  {loading ? "Creating..." : "Create Employee Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Employee Form */}
      <StepperEmployeeForm
        isOpen={isStepperFormOpen}
        onClose={() => setIsStepperFormOpen(false)}
        onEmployeeAdded={() => {
          fetchEmployees();
          setIsStepperFormOpen(false);
        }}
      />

      {/* Edit Employee Stepper Form */}
      <EditStepperEmployeeForm
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedEmployee(null);
          setFormErrors({});
        }}
        employee={selectedEmployee}
        onEmployeeUpdated={() => {
          fetchEmployees();
          setIsEditDialogOpen(false);
          setSelectedEmployee(null);
        }}
      />

      {/* Employee Profile Dialog */}
      {isProfileDialogOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-8 py-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                    <p className="text-green-100 text-sm">
                      {selectedEmployee.designation} •{" "}
                      {selectedEmployee.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileDialogOpen(false)}
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Personal Information
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Full Name
                      </label>
                      <p className="text-gray-900 font-medium">
                        {getEmployeeName(selectedEmployee)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Email
                      </label>
                      <p className="text-gray-900">
                        {getEmployeeEmail(selectedEmployee)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Contact Number
                      </label>
                      <p className="text-gray-900">
                        {selectedEmployee.personalDetails?.contactNumber ||
                          selectedEmployee.contactNumber ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Date of Birth
                      </label>
                      <p className="text-gray-900">
                        {selectedEmployee.personalDetails?.dateOfBirth ||
                          selectedEmployee.dateOfBirth ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Address
                      </label>
                      <p className="text-gray-900">
                        {selectedEmployee.personalDetails?.address ||
                          selectedEmployee.address ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Employment Information */}
                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Employment Information
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Department
                      </label>
                      <p className="text-gray-900 font-medium">
                        {selectedEmployee.department}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Designation
                      </label>
                      <p className="text-gray-900 font-medium">
                        {selectedEmployee.designation}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Work Location
                      </label>
                      <p className="text-gray-900">
                        {typeof selectedEmployee.workLocation === "object" &&
                        selectedEmployee.workLocation?.name
                          ? selectedEmployee.workLocation.name
                          : typeof selectedEmployee.workLocation === "string"
                          ? selectedEmployee.workLocation
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Status
                      </label>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {selectedEmployee.status || "Active"}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Joined Date
                      </label>
                      <p className="text-gray-900">
                        {selectedEmployee.createdAt
                          ? new Date(
                              selectedEmployee.createdAt
                            ).toLocaleDateString()
                          : "Not available"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skills & Qualifications */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Skills & Qualifications
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-2 block">
                        Skills
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getEmployeeSkills(selectedEmployee).length > 0 ? (
                          getEmployeeSkills(selectedEmployee).map(
                            (skill, index) => (
                              <span
                                key={`profile-skill-${index}-${skill}`}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                              >
                                {skill}
                              </span>
                            )
                          )
                        ) : (
                          <p className="text-gray-500 text-sm">
                            No skills listed
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedEmployee.certifications &&
                      selectedEmployee.certifications.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">
                            Certifications
                          </label>
                          <div className="space-y-2">
                            {selectedEmployee.certifications.map(
                              (cert, index) => (
                                <div
                                  key={`cert-${index}-${cert.title || index}`}
                                  className="bg-white p-3 rounded-lg border"
                                >
                                  <p className="font-medium text-gray-900">
                                    {cert.title}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {cert.issuer}
                                  </p>
                                  {cert.expiryDate && (
                                    <p className="text-xs text-gray-500">
                                      Expires:{" "}
                                      {new Date(
                                        cert.expiryDate
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Health Information */}
                <div className="bg-orange-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Heart className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Health Information
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Blood Type
                      </label>
                      <p className="text-gray-900">
                        {selectedEmployee.healthRecords?.bloodType ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Allergies
                      </label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedEmployee.healthRecords?.allergies?.length >
                        0 ? (
                          selectedEmployee.healthRecords.allergies.map(
                            (allergy, index) => (
                              <span
                                key={`allergy-${index}-${allergy}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                              >
                                {allergy}
                              </span>
                            )
                          )
                        ) : (
                          <p className="text-gray-500 text-sm">
                            No allergies listed
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedEmployee.healthRecords?.medicalConditions?.length >
                      0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Medical Conditions
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEmployee.healthRecords.medicalConditions.map(
                            (condition, index) => (
                              <span
                                key={`condition-${index}-${condition}`}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                              >
                                {condition}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Last updated:{" "}
                  {selectedEmployee.updatedAt
                    ? new Date(selectedEmployee.updatedAt).toLocaleDateString()
                    : "Not available"}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setIsProfileDialogOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setIsProfileDialogOpen(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
