"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  X,
  User,
  Building,
  Award,
  Heart,
  Eye,
  Edit2,
  Trash2,
  Settings,
  Lock,
  MapPin,
} from "lucide-react";
import EditStepperEmployeeForm from "./EditStepperEmployeeForm";
import StepperEmployeeForm from "./StepperEmployeeForm";
import EmployeeSetupModal from "./EmployeeSetupModal";

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
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
  const [departments, setDepartments] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);
  const [designations, setDesignations] = useState([]);

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDepartmentsAndLocations();
  }, []);

  const fetchDepartmentsAndLocations = async () => {
    try {
      const [deptRes, locRes, desRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/work-locations"),
        fetch("/api/designations"),
      ]);
      if (deptRes.ok) {
        const deptData = await deptRes.json();
        const list = Array.isArray(deptData?.departments)
          ? deptData.departments
          : Array.isArray(deptData)
          ? deptData
          : [];
        setDepartments(list);
      }
      if (locRes.ok) {
        const locData = await locRes.json();
        const list = Array.isArray(locData?.locations)
          ? locData.locations
          : Array.isArray(locData)
          ? locData
          : [];
        setWorkLocations(list);
      }
      if (desRes?.ok) {
        const desData = await desRes.json();
        const list = Array.isArray(desData?.designations)
          ? desData.designations
          : Array.isArray(desData)
          ? desData
          : [];
        setDesignations(list);
      }
    } catch (e) {
      // Ignore quietly; UI will just show empty selects
    }
  };

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

  const handleDeleteEmployee = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/employee/${selectedEmployee._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete employee");
      }

      setSuccess("Employee and all related data deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      await fetchEmployees();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting employee:", error);
      setError(error.message || "Failed to delete employee. Please try again.");
    } finally {
      setLoading(false);
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
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
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
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
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
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
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
              className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900"
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
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all hover:scale-110 transform"
                          title="View Profile"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsEditDialogOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 transform"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsSetupDialogOpen(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all hover:scale-110 transform"
                          title="Setup Employee (Password & Locations)"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={loading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-5 h-5" />
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500 ${
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500 ${
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white text-gray-900 placeholder-gray-500"
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        {departments.map((dept) => (
                          <option key={dept._id || dept.name} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      {formErrors.department && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.department}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newEmployee.designation}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            designation: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                          formErrors.designation
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-green-500"
                        }`}
                      >
                        <option value="">Select Designation</option>
                        {designations.map((des) => (
                          <option key={`des-${des}`} value={des}>
                            {des}
                          </option>
                        ))}
                      </select>
                      {formErrors.designation && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.designation}
                        </p>
                      )}
                    </div>
                    {/* Work Location removed - set later via settings */}
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Obtained
                          </label>
                          <input
                            type="date"
                            id="cert-date-input"
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-500"
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-500"
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
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                    <User className="w-7 h-7 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold drop-shadow-sm">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                    <p className="text-white text-opacity-90 text-sm font-medium">
                      {selectedEmployee.designation} •{" "}
                      {selectedEmployee.department}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileDialogOpen(false)}
                  className="w-10 h-10 bg-white rounded-lg flex items-center justify-center hover:bg-red-50 transition-all shadow-md group"
                >
                  <X className="w-6 h-6 text-gray-700 group-hover:text-red-600" />
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
                      <label className="text-sm font-semibold text-gray-700">
                        Full Name
                      </label>
                      <p className="text-gray-900 font-semibold mt-1">
                        {getEmployeeName(selectedEmployee)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Email
                      </label>
                      <p className="text-gray-900 mt-1">
                        {getEmployeeEmail(selectedEmployee)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Contact Number
                      </label>
                      <p className="text-gray-900 mt-1">
                        {selectedEmployee.personalDetails?.contactNumber ||
                          selectedEmployee.contactNumber ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Date of Birth
                      </label>
                      <p className="text-gray-900 mt-1">
                        {selectedEmployee.personalDetails?.dateOfBirth ||
                          selectedEmployee.dateOfBirth ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Address
                      </label>
                      <p className="text-gray-900 mt-1">
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
                      <label className="text-sm font-semibold text-gray-700">
                        Department
                      </label>
                      <p className="text-gray-900 font-semibold mt-1">
                        {selectedEmployee.department}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Designation
                      </label>
                      <p className="text-gray-900 font-semibold mt-1">
                        {selectedEmployee.designation}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Work Location
                      </label>
                      <p className="text-gray-900 mt-1">
                        {typeof selectedEmployee.workLocation === "object" &&
                        selectedEmployee.workLocation?.name
                          ? selectedEmployee.workLocation.name
                          : typeof selectedEmployee.workLocation === "string"
                          ? selectedEmployee.workLocation
                          : "Not specified"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        Status
                      </label>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        {selectedEmployee.status || "Active"}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Joined Date
                      </label>
                      <p className="text-gray-900 mt-1">
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
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">
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
                          <label className="text-sm font-semibold text-gray-700 mb-3 block">
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
                      <label className="text-sm font-semibold text-gray-700">
                        Blood Type
                      </label>
                      <p className="text-gray-900 mt-1 font-medium">
                        {selectedEmployee.healthRecords?.bloodType ||
                          "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
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
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
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

      {/* Employee Setup Dialog */}
      {isSetupDialogOpen && selectedEmployee && (
        <EmployeeSetupModal
          employee={selectedEmployee}
          onClose={() => {
            setIsSetupDialogOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={(message) => {
            setSuccess(message);
            setIsSetupDialogOpen(false);
            setSelectedEmployee(null);
            // Clear search and filters
            setSearchTerm("");
            setDepartmentFilter("");
            setSkillFilter("");
            setDesignationFilter("");
            setLocationFilter("");
            setTimeout(() => setSuccess(""), 3000);
          }}
          onError={(message) => {
            setError(message);
            setTimeout(() => setError(""), 5000);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold">Delete Employee</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-900 font-medium text-lg mb-4">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-red-600">
                    {getEmployeeName(selectedEmployee)}
                  </span>
                  ?
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800 font-medium">
                        This action cannot be undone. This will permanently
                        delete:
                      </p>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Personal information and profile
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Employment history
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Certifications and qualifications
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Skills and competencies
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Health records
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    User account and permissions
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setSelectedEmployee(null);
                }}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
