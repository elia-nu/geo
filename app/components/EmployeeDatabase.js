"use client";
import React, { useState, useEffect, useRef } from "react";
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
  Search,
  Filter,
  RefreshCw,
  UserPlus,
  TrendingUp,
  ChevronDown,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Shield,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  Activity,
  CalendarCheck,
  BadgeAlert,
  IdCard,
  Upload,
  Download,
  Image as ImageIcon,
  FileCheck,
} from "lucide-react";
import EditStepperEmployeeForm from "./EditStepperEmployeeForm";
import StepperEmployeeForm from "./StepperEmployeeForm";
import EmployeeSetupModal from "./EmployeeSetupModal";
import DocumentDetailViewerModal from "./DocumentDetailViewerModal";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";

export default function EmployeeDatabase() {
  const searchInputRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStepperFormOpen, setIsStepperFormOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState(null);
  const [viewingDocInProfile, setViewingDocInProfile] = useState(null);
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
      employeeType: "",
      contractExpiryDate: "",
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

  // When opening the profile dialog, fetch the enhanced employee document to ensure
  // skills, health records and work locations are present (from related tables)
  useEffect(() => {
    const fetchEnhancedEmployee = async (id) => {
      try {
        const res = await fetch(`/api/employee/${id}/enhanced-simple`);
        if (!res.ok) return;
        const data = await res.json();
        const base = data?.employee || {};
        // Resolve workLocations -> array of ids and friendly names
        const rawWorkLocationIds =
          base?.workLocations || data?.workLocations || [];
        const workLocationIds = Array.isArray(rawWorkLocationIds)
          ? rawWorkLocationIds
              .map((v) =>
                typeof v === "string" ? v : v?.$oid || v?._id || v?.id || ""
              )
              .filter(Boolean)
          : [];

        let workLocationsDetails = [];
        try {
          const wlRes = await fetch(`/api/work-locations`);
          if (wlRes.ok) {
            const wlData = await wlRes.json();
            const list = Array.isArray(wlData?.locations)
              ? wlData.locations
              : Array.isArray(wlData)
              ? wlData
              : [];
            const idSet = new Set(workLocationIds.map(String));
            workLocationsDetails = list
              .filter((loc) => idSet.has(String(loc._id || loc.id || "")))
              .map((loc) => ({
                id: String(loc._id || loc.id),
                name: loc.name,
              }));
          }
        } catch {}

        const merged = {
          ...(selectedEmployee || {}),
          ...base,
          skills: data?.skills ?? base?.skills ?? [],
          healthRecords: data?.healthRecords ?? base?.healthRecords ?? {},
          employmentHistory: data?.employmentHistory ?? base?.employmentHistory,
          certifications: data?.certifications ?? base?.certifications,
          documents: data?.documents ?? base?.documents ?? [],
          workLocations: workLocationIds,
          workLocationsDetails,
        };
        if (merged && typeof merged === "object") {
          setSelectedEmployee(merged);
        }
      } catch {}
    };

    if (
      isProfileDialogOpen &&
      selectedEmployee &&
      (selectedEmployee._id || selectedEmployee.id)
    ) {
      const empId = selectedEmployee._id || selectedEmployee.id;
      fetchEnhancedEmployee(empId);
    }
  }, [isProfileDialogOpen, selectedEmployee]);

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

  // Helper function to safely get employee phone/contact number
  const getEmployeePhone = (emp) => {
    return (
      emp.personalDetails?.contactNumber ||
      emp.contactNumber ||
      emp.personalDetails?.phone ||
      emp.phone ||
      ""
    );
  };

  // Helper to normalize skills for display (supports string, array of strings, array of objects)
  const getEmployeeSkills = (emp) => {
    const raw = emp?.skills ?? emp?.personalDetails?.skills ?? [];
    if (Array.isArray(raw)) {
      if (raw.length > 0 && typeof raw[0] === "object") {
        return raw
          .map(
            (s) => s?.skillName || s?.name || s?.title || String(s || "").trim()
          )
          .filter(Boolean);
      }
      return raw.map((s) => String(s || "").trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  // Normalize health records fields for display
  const getHealthRecords = (emp) => {
    const records =
      emp?.healthRecords || emp?.personalDetails?.healthRecords || {};
    const normalizeList = (value) => {
      if (Array.isArray(value))
        return value.map((v) => String(v || "").trim()).filter(Boolean);
      if (typeof value === "string")
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      return [];
    };
    return {
      bloodType: records?.bloodType || emp?.bloodType || "",
      allergies: normalizeList(records?.allergies || emp?.allergies),
      medicalConditions: normalizeList(
        records?.medicalConditions || emp?.medicalConditions
      ),
    };
  };

  // Helper to normalize workLocation to a displayable string
  const getWorkLocationDisplay = (value) => {
    if (typeof value === "object" && value?.name) return String(value.name);
    if (typeof value === "string") return value;
    return "";
  };

  // Resolve all known location names for an employee (supports legacy and new formats)
  const getEmployeeLocationNames = (emp) => {
    const names = new Set();
    // Legacy single location
    const legacy = getWorkLocationDisplay(emp.workLocation);
    if (legacy) names.add(legacy);
    // New: details array with names
    if (Array.isArray(emp.workLocationsDetails)) {
      emp.workLocationsDetails.forEach((wl) => {
        if (wl && (wl.name || typeof wl === "string")) {
          names.add(String(wl.name || wl));
        }
      });
    }
    // New: ids array -> map to names using workLocations state
    if (Array.isArray(emp.workLocations) && Array.isArray(workLocations)) {
      const idToName = new Map(
        workLocations.map((wl) => [String(wl._id || wl.id), wl.name])
      );
      emp.workLocations.forEach((id) => {
        const key = String(id && (id.$oid || id._id || id.id || id));
        const nm = idToName.get(key);
        if (nm) names.add(nm);
      });
    }
    return Array.from(names);
  };

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = employees;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (emp) =>
          (emp.employeeId || emp.personalDetails?.employeeId || "")
            .toLowerCase()
            .includes(term) ||
          getEmployeeName(emp)
            .toLowerCase()
            .includes(term) ||
          getEmployeeEmail(emp)
            .toLowerCase()
            .includes(term) ||
          (emp.department || "")
            .toLowerCase()
            .includes(term) ||
          (emp.designation || "")
            .toLowerCase()
            .includes(term) ||
          getWorkLocationDisplay(emp.workLocation)
            .toLowerCase()
            .includes(term) ||
          getEmployeeSkills(emp).some((skill) =>
            skill.toLowerCase().includes(term)
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
      filtered = filtered.filter((emp) => {
        const names = getEmployeeLocationNames(emp);
        return names.includes(locationFilter);
      });
    }

    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [
    employees,
    searchTerm,
    departmentFilter,
    skillFilter,
    designationFilter,
    locationFilter,
  ]);

  const totalPages = Math.ceil((filteredEmployees.length || 0) / itemsPerPage) || 1;
  const paginatedEmployees = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage, itemsPerPage]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");
      // Guard: clear any unintended autofill in the search box after async events
      if (searchInputRef?.current) {
        searchInputRef.current.setAttribute("autocomplete", "new-password");
      }
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

    const employeeType = employee.personalDetails?.employeeType || employee.employeeType;
    if (!employeeType) {
      errors.employeeType = "Employee type is required";
    }

    if (employeeType === "Contractual") {
      const contractExpiryDate = employee.personalDetails?.contractExpiryDate || employee.contractExpiryDate;
      if (!contractExpiryDate) {
        errors.contractExpiryDate = "Contract expiry date is required for contractual employees";
      }
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

      toast.success("Employee updated successfully!");
      setSuccess("Employee updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      await fetchEmployees();

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee. Please try again.");
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

      toast.success("Employee and all related data deleted successfully!");
      setSuccess("Employee and all related data deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      await fetchEmployees();

      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error(error.message || "Failed to delete employee. Please try again.");
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-green-500 flex-shrink-0">✓</span>
          <p className="text-sm font-medium text-green-800 flex-1">{success}</p>
          <button onClick={() => setSuccess("")} className="text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 shadow-xl">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-indigo-500/10 rounded-full" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-300" />
              </div>
              <h2 className="text-2xl font-bold text-white">Employee Management</h2>
            </div>
            <p className="text-blue-200 text-sm">
              Manage your workforce — profiles, contracts, locations, and more.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-blue-100 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                {Array.isArray(employees) ? employees.length : 0} Total Employees
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-green-100 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {Array.isArray(employees) ? employees.filter(e => (e.status || 'active') === 'active').length : 0} Active
              </div>
              {filteredEmployees.length !== (Array.isArray(employees) ? employees.length : 0) && (
                <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-yellow-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  {filteredEmployees.length} Filtered
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsStepperFormOpen(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 self-start lg:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Loading..." : "Add Employee"}
          </button>
        </div>
      </div>
      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Filter Employees</h3>
          {(searchTerm || departmentFilter || skillFilter || designationFilter || locationFilter) && (
            <span className="ml-auto text-xs text-blue-600 font-medium">
              {filteredEmployees.length} of {Array.isArray(employees) ? employees.length : 0} shown
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Search */}
          <div className="xl:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Employee ID, Name, Email, Role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-black text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              name="employeeSearch"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              ref={searchInputRef}
              data-lpignore="true"
              data-1p-ignore="true"
            />
          </div>
          {/* Department */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">All Departments</option>
              {Array.isArray(departments) &&
                departments
                  .map((d) => ({
                    id: String(d?._id || d?.id || d?.value || d),
                    name: String(d?.name || d?.title || d?.label || d || ""),
                  }))
                  .filter((d) => d.id && d.name)
                  .map((d) => (
                    <option key={`dept-${d.id}`} value={d.name}>
                      {d.name}
                    </option>
                  ))}
            </select>
          </div>
          {/* Designation */}
          <div>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">All Designations</option>
              {Array.isArray(designations) &&
                designations
                  .map((d) => ({
                    id: String(d?._id || d?.id || d?.value || d),
                    name: String(d?.name || d?.title || d?.label || d || ""),
                  }))
                  .filter((d) => d.id && d.name)
                  .map((d) => (
                    <option key={`designation-${d.id}`} value={d.name}>
                      {d.name}
                    </option>
                  ))}
            </select>
          </div>
          {/* Location */}
          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white text-black text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            >
              <option value="">All Locations</option>
              {Array.isArray(workLocations) &&
                workLocations.map((loc) => (
                  <option
                    key={`location-${loc._id || loc.id || loc.name}`}
                    value={loc.name}
                  >
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>
          {/* Clear */}
          <div>
            <button
              onClick={() => {
                setSearchTerm("");
                setDepartmentFilter("");
                setSkillFilter("");
                setDesignationFilter("");
                setLocationFilter("");
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
      {/* Employee List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table header bar */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">
              Employees
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredEmployees.length})
              </span>
            </h3>
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="min-w-[980px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (!Array.isArray(employees) || employees.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-gray-400 text-sm">Loading employees...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-gray-600 font-medium">No employees found</p>
                      <p className="text-gray-400 text-sm">
                        {searchTerm || departmentFilter || skillFilter || designationFilter || locationFilter
                          ? "Try adjusting your filters"
                          : "Add your first employee to get started"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((employee) => {
                  const name = getEmployeeName(employee);
                  const initials = name
                    ? name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
                    : "??";
                  const colors = [
                    "from-blue-500 to-blue-600",
                    "from-purple-500 to-purple-600",
                    "from-green-500 to-green-600",
                    "from-orange-500 to-orange-600",
                    "from-pink-500 to-pink-600",
                    "from-teal-500 to-teal-600",
                  ];
                  const colorIdx =
                    name
                      ? name.charCodeAt(0) % colors.length
                      : 0;
                  return (
                    <tr
                      key={employee._id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 bg-gradient-to-br ${colors[colorIdx]} rounded-xl flex items-center justify-center flex-shrink-0`}
                          >
                            <span className="text-white text-xs font-bold">
                              {initials}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                              {name}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-[150px]">
                              {getEmployeeEmail(employee)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">
                          {getEmployeePhone(employee) || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {employee.department ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">
                            {employee.department}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">
                          {employee.designation || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsProfileDialogOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsEditDialogOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsSetupDialogOpen(true);
                            }}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Setup Employee"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsDeleteDialogOpen(true);
                            }}
                            disabled={loading}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredEmployees.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(sz) => {
            setItemsPerPage(sz);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Add Employee Dialog */}
      {isAddDialogOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ zIndex: 9999 }}
          onClick={() => {
            setIsAddDialogOpen(false);
            setSearchTerm("");
          }}
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
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSearchTerm("");
                  }}
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
                    <h4 className="text-lg font-semibold text-black">
                      Personal Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black placeholder-gray-500 ${
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
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all bg-white text-black placeholder-gray-500 ${
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
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white text-black placeholder-gray-500"
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
                    <h4 className="text-lg font-semibold text-black">
                      Employment Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                      <label className="block text-sm font-medium text-black mb-2">
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
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
                        Employee Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newEmployee.personalDetails.employeeType}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            personalDetails: {
                              ...newEmployee.personalDetails,
                              employeeType: e.target.value,
                              // Clear contract expiry date if not contractual
                              contractExpiryDate: e.target.value === "Contractual" ? newEmployee.personalDetails.contractExpiryDate : "",
                            },
                          })
                        }
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                          formErrors.employeeType
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-green-500"
                        }`}
                      >
                        <option value="">Select Employee Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contractual">Contractual</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                      {formErrors.employeeType && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.employeeType}
                        </p>
                      )}
                    </div>
                    {newEmployee.personalDetails.employeeType === "Contractual" && (
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Contract Expiry Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={newEmployee.personalDetails.contractExpiryDate}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              personalDetails: {
                                ...newEmployee.personalDetails,
                                contractExpiryDate: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all ${
                            formErrors.contractExpiryDate
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-300 focus:ring-green-500"
                          }`}
                          min={new Date().toISOString().split("T")[0]}
                        />
                        {formErrors.contractExpiryDate && (
                          <p className="text-red-500 text-sm mt-1">
                            {formErrors.contractExpiryDate}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Work Location removed - set later via settings */}
                  </div>
                </div>

                {/* Skills & Qualifications Section */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-black">
                      Skills & Qualifications
                    </h4>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-black placeholder-gray-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-black placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Obtained
                          </label>
                          <input
                            type="date"
                            id="cert-date-input"
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-black placeholder-gray-500"
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
                    <h4 className="text-lg font-semibold text-black">
                      Health Information
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
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
                      <label className="block text-sm font-medium text-black mb-2">
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all bg-white text-black placeholder-gray-500"
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
                    !newEmployee.designation ||
                    !newEmployee.personalDetails.employeeType ||
                    (newEmployee.personalDetails.employeeType === "Contractual" && !newEmployee.personalDetails.contractExpiryDate)
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
        onClose={() => {
          setIsStepperFormOpen(false);
          setSearchTerm("");
        }}
        onEmployeeAdded={() => {
          fetchEmployees();
          setIsStepperFormOpen(false);
          setSearchTerm("");
        }}
      />

      {/* Edit Employee Stepper Form */}
      <EditStepperEmployeeForm
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedEmployee(null);
          setFormErrors({});
          setSearchTerm("");
        }}
        employee={selectedEmployee}
        onEmployeeUpdated={() => {
          fetchEmployees();
          setIsEditDialogOpen(false);
          setSelectedEmployee(null);
          setSearchTerm("");
        }}
      />

      {/* Modern Employee Profile Dialog */}
      {isProfileDialogOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 ring-1 ring-slate-900/5">
            {/* Hero Header */}
            <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 sm:px-8 pt-6 pb-5 text-white overflow-hidden flex-shrink-0">
              {/* Subtle background effects */}
              <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Top row with Close & Quick Actions */}
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 backdrop-blur-sm border border-white/10">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        (selectedEmployee.status || "active").toLowerCase() === "active"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    {selectedEmployee.status
                      ? selectedEmployee.status.toUpperCase()
                      : "ACTIVE"}
                  </span>
                  {(selectedEmployee.personalDetails?.employeeType || selectedEmployee.employeeType) && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedEmployee.personalDetails?.employeeType || selectedEmployee.employeeType}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsProfileDialogOpen(false);
                      setIsEditDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-sm transition-all border border-white/10"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileDialogOpen(false);
                      setIsSetupDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-sm"
                    title="Setup Credentials & Locations"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Setup</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileDialogOpen(false);
                      setProfileActiveTab("overview");
                    }}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all ml-1"
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Identity Bar */}
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar with gradient border */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 p-0.5 shadow-xl flex items-center justify-center">
                    <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
                        {getEmployeeName(selectedEmployee)
                          ? getEmployeeName(selectedEmployee)
                              .split(" ")
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          : "EM"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Name, Roles, ID */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                      {getEmployeeName(selectedEmployee)}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-300 mt-1">
                    {selectedEmployee.designation && (
                      <span className="flex items-center gap-1.5 text-indigo-200">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium">{selectedEmployee.designation}</span>
                      </span>
                    )}
                    {selectedEmployee.department && (
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedEmployee.department}</span>
                      </span>
                    )}
                  </div>

                  {/* ID with Copy action */}
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      onClick={() => {
                        const idVal =
                          selectedEmployee.personalDetails?.employeeId ||
                          selectedEmployee.employeeId ||
                          selectedEmployee._id?.toString() ||
                          "";
                        if (idVal) {
                          navigator.clipboard.writeText(idVal);
                          setCopiedField("id");
                          toast.success("Employee ID copied to clipboard");
                          setTimeout(() => setCopiedField(null), 2000);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/40 cursor-pointer border border-white/10 text-xs text-slate-300 transition-colors"
                      title="Click to copy ID"
                    >
                      <span className="text-slate-400 font-mono text-[11px]">ID:</span>
                      <span className="font-mono font-medium text-white">
                        {selectedEmployee.personalDetails?.employeeId ||
                          selectedEmployee.employeeId ||
                          selectedEmployee._id?.toString()?.slice(-8) ||
                          "—"}
                      </span>
                      {copiedField === "id" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </div>

                    {getEmployeeEmail(selectedEmployee) && (
                      <div
                        onClick={() => {
                          const em = getEmployeeEmail(selectedEmployee);
                          navigator.clipboard.writeText(em);
                          setCopiedField("email");
                          toast.success("Email copied to clipboard");
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/40 cursor-pointer border border-white/10 text-xs text-slate-300 transition-colors truncate max-w-[220px]"
                        title="Click to copy Email"
                      >
                        <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{getEmployeeEmail(selectedEmployee)}</span>
                        {copiedField === "email" ? (
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 mt-6 border-b border-white/10 -mx-6 sm:-mx-8 px-6 sm:px-8 overflow-x-auto scrollbar-none">
                {[
                  { id: "overview", label: "Overview & Personal", icon: User },
                  { id: "employment", label: "Work & Locations", icon: Building },
                  { id: "skills", label: "Skills & History", icon: Award },
                  { id: "health", label: "Health & Emergency", icon: Heart },
                  { id: "documents", label: "Documents & Files", icon: FileText },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = profileActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setProfileActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                        isActive
                          ? "text-white border-indigo-400 bg-white/5 rounded-t-lg"
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <TabIcon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Tab Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
              {/* TAB 1: OVERVIEW & PERSONAL */}
              {profileActiveTab === "overview" && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                        {selectedEmployee.department || "Unassigned"}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Designation</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 truncate">
                        {selectedEmployee.designation || "Unassigned"}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employment</p>
                      <p className="text-sm font-bold text-indigo-600 mt-1 truncate">
                        {selectedEmployee.personalDetails?.employeeType || selectedEmployee.employeeType || "Regular"}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Locations</p>
                      <p className="text-sm font-bold text-emerald-600 mt-1">
                        {Array.isArray(selectedEmployee.workLocationsDetails) && selectedEmployee.workLocationsDetails.length > 0
                          ? `${selectedEmployee.workLocationsDetails.length} Assigned`
                          : "Standard"}
                      </p>
                    </div>
                  </div>

                  {/* Personal & Contact Details Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Details Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Mail className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">Contact Information</h4>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 font-medium text-xs">Email Address</span>
                          {getEmployeeEmail(selectedEmployee) ? (
                            <a
                              href={`mailto:${getEmployeeEmail(selectedEmployee)}`}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs sm:text-sm text-right truncate max-w-[220px]"
                            >
                              {getEmployeeEmail(selectedEmployee)}
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Phone Number</span>
                          {getEmployeePhone(selectedEmployee) ? (
                            <a
                              href={`tel:${getEmployeePhone(selectedEmployee)}`}
                              className="text-slate-900 hover:text-blue-600 font-semibold text-xs sm:text-sm"
                            >
                              {getEmployeePhone(selectedEmployee)}
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Emergency Phone</span>
                          {selectedEmployee.personalDetails?.emergencyContactNumber ||
                          selectedEmployee.emergencyContactNumber ? (
                            <a
                              href={`tel:${
                                selectedEmployee.personalDetails?.emergencyContactNumber ||
                                selectedEmployee.emergencyContactNumber
                              }`}
                              className="text-rose-600 hover:text-rose-700 font-semibold text-xs sm:text-sm"
                            >
                              {selectedEmployee.personalDetails?.emergencyContactNumber ||
                                selectedEmployee.emergencyContactNumber}
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">Not provided</span>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Residential Address</span>
                          <span className="text-slate-800 font-medium text-xs sm:text-sm text-right max-w-[200px]">
                            {selectedEmployee.personalDetails?.address ||
                              selectedEmployee.address ||
                              "Not provided"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Personal Details Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <User className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">Personal Information</h4>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 font-medium text-xs">Official Full Name</span>
                          <span className="text-slate-900 font-semibold text-xs sm:text-sm text-right">
                            {getEmployeeName(selectedEmployee)}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Date of Birth</span>
                          <span className="text-slate-800 font-medium text-xs sm:text-sm">
                            {selectedEmployee.personalDetails?.dateOfBirth ||
                            selectedEmployee.dateOfBirth
                              ? new Date(
                                  selectedEmployee.personalDetails?.dateOfBirth ||
                                    selectedEmployee.dateOfBirth
                                ).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "Not provided"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Joined System Date</span>
                          <span className="text-slate-800 font-medium text-xs sm:text-sm">
                            {selectedEmployee.createdAt
                              ? new Date(selectedEmployee.createdAt).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Not available"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">System Account Status</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {selectedEmployee.status || "Active"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: EMPLOYMENT & LOCATIONS */}
              {profileActiveTab === "employment" && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Organization Placement Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Building className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">Role & Department</h4>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-500 font-medium text-xs">Department</span>
                          <span className="text-slate-900 font-bold text-xs sm:text-sm">
                            {selectedEmployee.department || "Unassigned"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Designation / Role</span>
                          <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                            {selectedEmployee.designation || "Unassigned"}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs">Employment Type</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {selectedEmployee.personalDetails?.employeeType ||
                              selectedEmployee.employeeType ||
                              "Permanent"}
                          </span>
                        </div>

                        {(selectedEmployee.personalDetails?.contractExpiryDate ||
                          selectedEmployee.contractExpiryDate) && (
                          <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-50">
                            <span className="text-slate-500 font-medium text-xs">Contract Expiry Date</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-xs sm:text-sm text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                              <Calendar className="w-3 h-3" />
                              {new Date(
                                selectedEmployee.personalDetails?.contractExpiryDate ||
                                  selectedEmployee.contractExpiryDate
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Locations Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">Assigned Work Locations</h4>
                          <p className="text-xs text-slate-400">Locations permitted for check-in</p>
                        </div>
                      </div>

                      <div>
                        {Array.isArray(selectedEmployee.workLocationsDetails) &&
                        selectedEmployee.workLocationsDetails.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedEmployee.workLocationsDetails.map((wl) => (
                              <div
                                key={wl.id}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium"
                              >
                                <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                <span className="truncate">{wl.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : getWorkLocationDisplay(selectedEmployee.workLocation) ? (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium">
                            <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span>{getWorkLocationDisplay(selectedEmployee.workLocation)}</span>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 text-center text-slate-400 text-xs">
                            No specific work locations assigned. Default organizational settings apply.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SKILLS & HISTORY */}
              {profileActiveTab === "skills" && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  {/* Skills Cloud Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm">Professional Skills</h4>
                    </div>

                    <div className="pt-1">
                      {getEmployeeSkills(selectedEmployee).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {getEmployeeSkills(selectedEmployee).map((skill, index) => (
                            <span
                              key={`profile-skill-${index}-${skill}`}
                              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-2">No skills registered yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Certifications Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Award className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm">Certifications & Credentials</h4>
                    </div>

                    <div>
                      {selectedEmployee.certifications && selectedEmployee.certifications.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {selectedEmployee.certifications.map((cert, index) => (
                            <div
                              key={`cert-${index}-${cert.title || index}`}
                              className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                            >
                              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                                {cert.title || "Certification"}
                              </p>
                              {cert.issuer && (
                                <p className="text-xs text-slate-600 font-medium">
                                  Issuer: <span className="text-slate-800">{cert.issuer}</span>
                                </p>
                              )}
                              {cert.expiryDate && (
                                <p className="text-[11px] text-slate-400">
                                  Valid until: {new Date(cert.expiryDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 py-2">No certifications listed.</p>
                      )}
                    </div>
                  </div>

                  {/* Past Employment History Timeline */}
                  {Array.isArray(selectedEmployee.employmentHistory) &&
                    selectedEmployee.employmentHistory.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <h4 className="font-semibold text-slate-900 text-sm">Past Experience</h4>
                        </div>

                        <div className="space-y-4 pt-1">
                          {selectedEmployee.employmentHistory.map((job, idx) => (
                            <div key={idx} className="relative pl-6 border-l-2 border-indigo-200 pb-3 last:pb-0">
                              <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
                              <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900">
                                  {job.position || job.title || "Position"}
                                </p>
                                <p className="text-xs font-semibold text-indigo-600">
                                  {job.company || "Company"}
                                </p>
                                {(job.startDate || job.endDate) && (
                                  <p className="text-[11px] text-slate-400">
                                    {job.startDate ? new Date(job.startDate).toLocaleDateString() : ""} -{" "}
                                    {job.endDate ? new Date(job.endDate).toLocaleDateString() : "Present"}
                                  </p>
                                )}
                                {job.description && (
                                  <p className="text-xs text-slate-600 mt-1">
                                    {job.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* TAB 4: HEALTH & EMERGENCY */}
              {profileActiveTab === "health" && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Medical Overview Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                          <Heart className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">Health Records</h4>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 font-medium text-xs">Blood Group</span>
                          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            {getHealthRecords(selectedEmployee).bloodType || "Not recorded"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs block mb-2">Known Allergies</span>
                          {getHealthRecords(selectedEmployee).allergies.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {getHealthRecords(selectedEmployee).allergies.map((allergy, index) => (
                                <span
                                  key={`allergy-${index}-${allergy}`}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100"
                                >
                                  {allergy}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No known allergies</span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-50">
                          <span className="text-slate-500 font-medium text-xs block mb-2">Medical Conditions</span>
                          {getHealthRecords(selectedEmployee).medicalConditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {getHealthRecords(selectedEmployee).medicalConditions.map((cond, index) => (
                                <span
                                  key={`cond-${index}-${cond}`}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100"
                                >
                                  {cond}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">No conditions recorded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contacts Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                          <Shield className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">Emergency Response Info</h4>
                      </div>

                      <div className="space-y-3.5 text-sm">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                          <p className="text-xs text-slate-500 font-medium">Primary Emergency Contact</p>
                          <p className="text-base font-bold text-slate-900">
                            {selectedEmployee.personalDetails?.emergencyContactNumber ||
                              selectedEmployee.emergencyContactNumber ||
                              "Not registered"}
                          </p>
                          {(selectedEmployee.personalDetails?.emergencyContactNumber ||
                            selectedEmployee.emergencyContactNumber) && (
                            <a
                              href={`tel:${
                                selectedEmployee.personalDetails?.emergencyContactNumber ||
                                selectedEmployee.emergencyContactNumber
                              }`}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 mt-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call Emergency Line</span>
                            </a>
                          )}
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs text-amber-800 leading-relaxed">
                          This health and emergency data is strictly confidential and only accessible to authorized HR administrators for safety and emergency handling.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENTS & FILES */}
              {profileActiveTab === "documents" && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">
                            Employee Documents & Verification
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            ID copies, credentials, contracts, and uploaded attachments
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileDialogOpen(false);
                          setIsEditDialogOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Manage / Upload in Edit</span>
                      </button>
                    </div>

                    {Array.isArray(selectedEmployee.documents) && selectedEmployee.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {selectedEmployee.documents.map((doc) => {
                          const docId = doc._id || doc.id;
                          const isPdf =
                            doc.mimeType?.includes("pdf") ||
                            doc.originalName?.toLowerCase().endsWith(".pdf") ||
                            doc.documentType === "pdf";
                          const isImage =
                            doc.mimeType?.startsWith("image/") ||
                            doc.originalName?.match(/\.(jpg|jpeg|png|webp)$/i);

                          return (
                            <div
                              key={docId}
                              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                                  {isPdf ? (
                                    <FileText className="w-5 h-5 text-rose-500" />
                                  ) : isImage ? (
                                    <ImageIcon className="w-5 h-5 text-emerald-500" />
                                  ) : (
                                    <FileCheck className="w-5 h-5 text-indigo-500" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 truncate">
                                    {doc.title || doc.originalName || "Document"}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {doc.documentType || doc.type || "Document"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {doc.uploadDate
                                      ? new Date(doc.uploadDate).toLocaleDateString()
                                      : "Recently"}
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingDocInProfile(doc)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>See in Detail</span>
                                </button>
                                <a
                                  href={`/api/documents/${docId}/download`}
                                  download={doc.originalName || "document"}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">
                          No documents attached to this employee profile
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Documents can be uploaded in the Edit Employee wizard or Setup modal.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="bg-white px-6 sm:px-8 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <p className="text-xs text-slate-400">
                Last modified:{" "}
                <span className="text-slate-600 font-medium">
                  {selectedEmployee.updatedAt
                    ? new Date(selectedEmployee.updatedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Recently"}
                </span>
              </p>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setIsProfileDialogOpen(false);
                    setIsEditDialogOpen(true);
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileDialogOpen(false);
                    setProfileActiveTab("overview");
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-colors"
                >
                  Close
                </button>
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
            setSearchTerm("");
          }}
          onSuccess={(message) => {
            setSuccess(message);
            setIsSetupDialogOpen(false);
            setSelectedEmployee(null);
            // Do not modify user search/filter inputs here
            // Refresh employees to reflect latest changes
            fetchEmployees();
            // Extra guard: clear any unintended autofill
            setSearchTerm("");
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
                <p className="text-black font-medium text-lg mb-4">
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
                  setSearchTerm("");
                }}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteEmployee();
                  setSearchTerm("");
                }}
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

      {/* Profile Document Detail Modal */}
      {viewingDocInProfile && selectedEmployee && (
        <DocumentDetailViewerModal
          isOpen={!!viewingDocInProfile}
          document={viewingDocInProfile}
          employeeName={getEmployeeName(selectedEmployee)}
          onClose={() => setViewingDocInProfile(null)}
        />
      )}
    </div>
  );
}
