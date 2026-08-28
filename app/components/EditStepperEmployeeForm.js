"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Briefcase,
  Award,
  Brain,
  Heart,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  X,
  FileText,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui/button";
import ClientOnly from "./ClientOnly";
import DocumentDetailViewerModal from "./DocumentDetailViewerModal";

const STEPS = [
  {
    id: 1,
    title: "Personal Details",
    description: "Basic info & contract",
    icon: User,
  },
  {
    id: 2,
    title: "Employment History",
    description: "Work experience",
    icon: Briefcase,
  },
  {
    id: 3,
    title: "Certifications",
    description: "Qualifications",
    icon: Award,
  },
  {
    id: 4,
    title: "Skills",
    description: "Competencies",
    icon: Brain,
  },
  {
    id: 5,
    title: "Health Records",
    description: "Medical info",
    icon: Heart,
  },
  {
    id: 6,
    title: "Documents & Files",
    description: "Uploaded files & actions",
    icon: FileText,
  },
];

const DOCUMENT_CATEGORIES = [
  "National ID / Passport",
  "Resume / CV",
  "Employment Contract",
  "Educational Certificate",
  "Professional License",
  "Medical Clearance",
  "Recommendation Letter",
  "Other Attachment",
];

export default function EditStepperEmployeeForm({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}) {
  const uploadFileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [replacingDoc, setReplacingDoc] = useState(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [selectedReplaceFile, setSelectedReplaceFile] = useState(null);
  const [isUploadingNewDoc, setIsUploadingNewDoc] = useState(false);

  // New document upload inside Edit form
  const [newDocData, setNewDocData] = useState({
    category: "National ID / Passport",
    title: "",
    description: "",
    expiryDate: "",
    file: null,
  });

  // Helper functions to safely get data from either structure
  const getEmployeeName = (emp) =>
    emp?.personalDetails?.name || emp?.name || "";
  const getEmployeeEmail = (emp) =>
    emp?.personalDetails?.email || emp?.email || "";
  const getEmployeeData = (emp, field) =>
    emp?.personalDetails?.[field] || emp?.[field] || "";

  // State for each step
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    email: "",
    employeeId: "",
    dateOfBirth: "",
    contactNumber: "",
    department: "",
    designation: "",
    workLocation: "",
    joiningDate: "",
    salary: "",
    bankAccount: "",
    bankName: "Commercial Bank of Ethiopia",
    emergencyContactName: "",
    emergencyContactNumber: "",
    address: "",
    employeeType: "",
    contractExpiryDate: "",
    transportAllowance: "",
    telephoneAllowance: "",
    posAllowance: "",
  });

  const [employmentHistory, setEmploymentHistory] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [skills, setSkills] = useState([]);
  const [healthRecords, setHealthRecords] = useState({
    bloodType: "",
    allergies: [],
    medicalConditions: [],
    medications: [],
    emergencyMedicalContact: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [fetchingData, setFetchingData] = useState(false);
  const [enhancedEmployee, setEnhancedEmployee] = useState(null);

  const canNavigateToStep = (targetStep) => {
    if (targetStep <= currentStep) return true;
    if (targetStep === currentStep + 1) {
      const errors = validateStep(currentStep);
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return false;
  };

  // Fetch employee documents
  const fetchEmployeeDocuments = async (empId) => {
    if (!empId) return;
    try {
      setFetchingDocs(true);
      const res = await fetch(`/api/documents?employeeId=${empId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch employee documents:", e);
    } finally {
      setFetchingDocs(false);
    }
  };

  // Fetch complete employee data including related records
  useEffect(() => {
    const fetchEnhancedEmployeeData = async () => {
      if (!employee?._id || !isOpen) {
        setEnhancedEmployee(null);
        return;
      }

      setFetchingData(true);
      try {
        const response = await fetch(
          `/api/employee/${employee._id}/enhanced-simple`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch employee data");
        }

        const data = await response.json();
        setEnhancedEmployee(data);
        if (data.documents && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        } else {
          fetchEmployeeDocuments(employee._id);
        }
      } catch (error) {
        console.error("Error fetching enhanced employee data:", error);
        setError("Failed to load employee data");
      } finally {
        setFetchingData(false);
      }
    };

    fetchEnhancedEmployeeData();
  }, [employee?._id, isOpen]);

  // Fetch departments and work locations when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchLists = async () => {
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
        // ignore
      }
    };
    fetchLists();
  }, [isOpen]);

  // Populate form when enhanced employee data is available
  useEffect(() => {
    if (enhancedEmployee && isOpen) {
      const emp = enhancedEmployee.employee;

      const rawDept = emp?.department || getEmployeeData(emp, "department") || "";
      const rawDesig = emp?.designation || getEmployeeData(emp, "designation") || "";
      const rawLoc = emp?.workLocation || getEmployeeData(emp, "workLocation") || "";

      let resolvedDept = rawDept;
      if (departments && departments.length > 0 && rawDept) {
        const matched = departments.find(
          (d) =>
            d.name?.toLowerCase() === rawDept.toLowerCase() ||
            d.shortName?.toLowerCase() === rawDept.toLowerCase() ||
            d.aliases?.some((a) => a.toLowerCase() === rawDept.toLowerCase())
        );
        if (matched) resolvedDept = matched.name;
      }

      setPersonalDetails({
        name: getEmployeeName(emp),
        email: getEmployeeEmail(emp),
        employeeId: getEmployeeData(emp, "employeeId"),
        dateOfBirth: getEmployeeData(emp, "dateOfBirth"),
        contactNumber: getEmployeeData(emp, "contactNumber"),
        department: resolvedDept,
        designation: rawDesig,
        workLocation: rawLoc,
        joiningDate: getEmployeeData(emp, "joiningDate"),
        salary: emp?.salary ?? getEmployeeData(emp, "salary") ?? getEmployeeData(emp, "salaryETB") ?? getEmployeeData(emp, "grossSalary") ?? getEmployeeData(emp, "baseSalary") ?? "",
        bankAccount: emp?.bankAccount ?? getEmployeeData(emp, "bankAccount") ?? getEmployeeData(emp, "bankAccountNumber") ?? getEmployeeData(emp, "accountNumber") ?? "",
        bankName: emp?.bankName ?? getEmployeeData(emp, "bankName") ?? "Commercial Bank of Ethiopia",
        emergencyContactName: getEmployeeData(emp, "emergencyContactName"),
        emergencyContactNumber: getEmployeeData(emp, "emergencyContactNumber"),
        address: getEmployeeData(emp, "address"),
        employeeType: emp?.employeeType || getEmployeeData(emp, "employeeType") || "",
        contractExpiryDate: emp?.contractExpiryDate || getEmployeeData(emp, "contractExpiryDate") || "",
        transportAllowance: emp?.transportAllowance ?? getEmployeeData(emp, "transportAllowance") ?? "",
        telephoneAllowance: emp?.telephoneAllowance ?? getEmployeeData(emp, "telephoneAllowance") ?? "",
        posAllowance: emp?.posAllowance ?? getEmployeeData(emp, "posAllowance") ?? "",
      });

      setEmploymentHistory(enhancedEmployee.employmentHistory || []);

      setCertifications(
        (enhancedEmployee.certifications || []).map((c) => ({
          ...c,
          issuer: c.issuer || c.institution || c.issuingInstitution || "",
          issueDate: c.issueDate || c.dateObtained || c.date || "",
        }))
      );

      setSkills(
        (enhancedEmployee.skills || []).map((skill, index) => ({
          id: skill.id || index,
          skillName: typeof skill === "string" ? skill : skill.skillName || "",
          proficiencyLevel:
            typeof skill === "string"
              ? "Intermediate"
              : skill.proficiencyLevel || "Intermediate",
          yearsOfExperience:
            typeof skill === "string" ? "" : skill.yearsOfExperience || "",
          category:
            typeof skill === "string"
              ? "Technical"
              : skill.category || "Technical",
        }))
      );

      const healthData = enhancedEmployee.healthRecords || {};
      setHealthRecords({
        bloodType: healthData.bloodType || "",
        allergies: healthData.allergies || [],
        medicalConditions: healthData.medicalConditions || [],
        medications: healthData.medications || [],
        emergencyMedicalContact: healthData.emergencyMedicalContact || "",
        insuranceProvider: healthData.insuranceProvider || "",
        insurancePolicyNumber: healthData.insurancePolicyNumber || "",
      });
    }
  }, [enhancedEmployee, isOpen, departments]);

  // Filter designations based on selected department
  useEffect(() => {
    if (personalDetails.department && departments.length > 0) {
      const selectedDept = departments.find(
        (d) =>
          d.name?.toLowerCase() === personalDetails.department?.toLowerCase() ||
          d.shortName?.toLowerCase() === personalDetails.department?.toLowerCase() ||
          d.aliases?.some(
            (a) => a.toLowerCase() === personalDetails.department?.toLowerCase()
          )
      );

      if (selectedDept && selectedDept._id) {
        const fetchDeptDesignations = async () => {
          try {
            const res = await fetch(
              `/api/departments/${selectedDept._id}/designations`
            );
            if (res.ok) {
              const data = await res.json();
              const deptDesignations = Array.isArray(data?.designations)
                ? data.designations
                : [];
              setFilteredDesignations(
                deptDesignations.length > 0 ? deptDesignations : designations
              );
            } else {
              setFilteredDesignations(designations);
            }
          } catch (error) {
            setFilteredDesignations(designations);
          }
        };

        fetchDeptDesignations();
      } else {
        setFilteredDesignations(designations);
      }
    } else {
      setFilteredDesignations(designations);
    }
  }, [personalDetails.department, departments, designations]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        resetForm();
      } else if (
        e.key === "ArrowRight" &&
        currentStep < STEPS.length &&
        !loading
      ) {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" && currentStep > 1 && !loading) {
        e.preventDefault();
        handlePrevious();
      } else if (
        e.key === "Enter" &&
        e.ctrlKey &&
        currentStep === STEPS.length
      ) {
        e.preventDefault();
        handleSubmit();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [currentStep, loading, isOpen]);

  if (!isOpen) return null;

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!personalDetails.name.trim()) {
          errors.name = "Name is required";
        }
        if (
          personalDetails.email &&
          personalDetails.email.trim() &&
          !/\S+@\S+\.\S+/.test(personalDetails.email)
        ) {
          errors.email = "Email is invalid";
        }
        if (!personalDetails.department.trim()) {
          errors.department = "Department is required";
        }
        if (!personalDetails.designation.trim()) {
          errors.designation = "Designation is required";
        }
        if (!personalDetails.joiningDate.trim()) {
          errors.joiningDate = "Joining date is required";
        }
        if (!personalDetails.employeeType) {
          errors.employeeType = "Employee type is required";
        }
        if (
          personalDetails.employeeType === "Contractual" &&
          !personalDetails.contractExpiryDate
        ) {
          errors.contractExpiryDate =
            "Contract expiry date is required for contractual employees";
        }
        break;
      case 2:
        employmentHistory.forEach((job, index) => {
          if (!job.company?.trim()) {
            errors[`employment_${index}_company`] = "Company name is required";
          }
          if (!job.position?.trim()) {
            errors[`employment_${index}_position`] = "Position is required";
          }
          if (!job.startDate?.trim()) {
            errors[`employment_${index}_startDate`] = "Start date is required";
          }
        });
        break;
      case 3:
        certifications.forEach((cert, index) => {
          if (!cert.title?.trim()) {
            errors[`cert_${index}_title`] = "Certification title is required";
          }
          if (!cert.issuer?.trim()) {
            errors[`cert_${index}_institution`] = "Institution is required";
          }
          if (!cert.issueDate?.trim()) {
            errors[`cert_${index}_dateObtained`] = "Date obtained is required";
          }
        });
        break;
      case 4:
        skills.forEach((skill, index) => {
          if (!skill.skillName?.trim()) {
            errors[`skill_${index}_skillName`] = "Skill name is required";
          }
        });
        break;
      case 5:
      case 6:
        break;
      default:
        break;
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setCurrentStep(currentStep + 1);
      setError("");
    } else {
      setError("Please fix the validation errors before continuing.");
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setFormErrors({});
    setError("");
  };

  const handleSubmit = async () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setError("Please fix the validation errors before submitting.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const employeeData = {
        personalDetails,
        employmentHistory: employmentHistory.filter((job) => job.company),
        certifications: certifications
          .filter((cert) => cert.title)
          .map((c) => ({
            title: c.title,
            issuer: c.issuer || "",
            issueDate: c.issueDate || "",
            expiryDate: c.expiryDate || "",
            credentialId: c.credentialId || "",
            description: c.description || "",
          })),
        skills: skills.filter((skill) => skill.skillName),
        healthRecords,
      };

      const response = await fetch(
        `/api/employee/${employee._id}/enhanced-simple`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(employeeData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update employee");
      }

      setSuccess("Employee updated successfully!");

      setTimeout(() => {
        onEmployeeUpdated();
        onClose();
        resetForm();
      }, 1500);
    } catch (error) {
      console.error("Error updating employee:", error);
      setError(error.message || "Failed to update employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Upload new document directly in Edit form
  const handleUploadNewDocument = async () => {
    if (!newDocData.file) {
      setError("Please select a file to upload.");
      return;
    }

    setIsUploadingNewDoc(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", newDocData.file);
      formData.append(
        "documentData",
        JSON.stringify({
          employeeId: employee._id,
          documentType: newDocData.category,
          type: newDocData.category,
          title: newDocData.title.trim() || newDocData.file.name.replace(/\.[^/.]+$/, ""),
          description: newDocData.description.trim(),
          expiryDate: newDocData.expiryDate || "",
          category: "employee",
          status: "active",
        })
      );

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload document");
      }

      setSuccess("Document uploaded successfully!");
      setNewDocData({
        category: "National ID / Passport",
        title: "",
        description: "",
        expiryDate: "",
        file: null,
      });
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = "";

      // Refresh documents
      await fetchEmployeeDocuments(employee._id);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error uploading document:", err);
      setError(err.message || "Failed to upload document");
    } finally {
      setIsUploadingNewDoc(false);
    }
  };

  // Replace existing document file
  const handleReplaceDocumentFile = async () => {
    if (!replacingDoc || !selectedReplaceFile) return;

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedReplaceFile);
      formData.append(
        "documentData",
        JSON.stringify({
          title: replacingDoc.title,
          documentType: replacingDoc.documentType || replacingDoc.type,
          description: replacingDoc.description || "",
          expiryDate: replacingDoc.expiryDate || "",
        })
      );

      const res = await fetch(`/api/documents/${replacingDoc._id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to replace document file");
      }

      setSuccess("Document file replaced successfully!");
      setIsReplaceModalOpen(false);
      setReplacingDoc(null);
      setSelectedReplaceFile(null);
      await fetchEmployeeDocuments(employee._id);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error replacing document:", err);
      setError(err.message || "Failed to replace document file");
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"?`)) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete document");
      }

      setSuccess("Document deleted successfully!");
      await fetchEmployeeDocuments(employee._id);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error deleting document:", err);
      setError(err.message || "Failed to delete document");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormErrors({});
    setError("");
    setSuccess("");
    setReplacingDoc(null);
    setSelectedReplaceFile(null);
    setIsReplaceModalOpen(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    try {
      const d = new Date(dateValue);
      if (isNaN(d.getTime())) return String(dateValue);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return String(dateValue);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Personal Details & Contract Terms
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Edit core identification, role assignment, and contractual dates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={personalDetails.name}
                  onChange={(e) =>
                    setPersonalDetails({ ...personalDetails, name: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white shadow-sm ${
                    formErrors.name
                      ? "border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={personalDetails.email}
                  onChange={(e) =>
                    setPersonalDetails({ ...personalDetails, email: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white shadow-sm ${
                    formErrors.email
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={personalDetails.employeeId}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-mono cursor-not-allowed shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={personalDetails.contactNumber}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      contactNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={personalDetails.department}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      department: e.target.value,
                      designation: "",
                    })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white shadow-sm ${
                    formErrors.department
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                >
                  <option value="" className="text-slate-900 bg-white">Select Department</option>
                  {personalDetails.department &&
                    !departments.some(
                      (d) =>
                        d.name === personalDetails.department ||
                        d.shortName === personalDetails.department
                    ) && (
                      <option
                        value={personalDetails.department}
                        className="text-slate-900 bg-white"
                      >
                        {personalDetails.department}
                      </option>
                    )}
                  {departments.map((dept) => {
                    const name = dept.name || "";
                    const key = dept._id || dept.departmentId || dept.name;
                    return (
                      <option key={key} value={name} className="text-slate-900 bg-white">
                        {name}
                      </option>
                    );
                  })}
                </select>
                {formErrors.department && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Designation <span className="text-red-500">*</span>
                </label>
                <select
                  value={personalDetails.designation}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      designation: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 bg-white shadow-sm ${
                    formErrors.designation
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                >
                  <option value="" className="text-slate-900 bg-white">Select Designation</option>
                  {personalDetails.designation &&
                    !filteredDesignations.some(
                      (d) =>
                        (typeof d === "string" ? d : d?.name) ===
                        personalDetails.designation
                    ) && (
                      <option
                        value={personalDetails.designation}
                        className="text-slate-900 bg-white"
                      >
                        {personalDetails.designation}
                      </option>
                    )}
                  {filteredDesignations.map((des) => {
                    const name = typeof des === "string" ? des : des?.name || "";
                    const key =
                      typeof des === "string"
                        ? `des-${des}`
                        : des?._id || des?.name || `des-${Math.random()}`;
                    if (!name) return null;
                    return (
                      <option
                        key={key}
                        value={name}
                        className="text-slate-900 bg-white"
                      >
                        {name}
                      </option>
                    );
                  })}
                </select>
                {formErrors.designation && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.designation}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={personalDetails.employeeType}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      employeeType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                >
                  <option value="Full Time" className="text-slate-900 bg-white">Full Time</option>
                  <option value="Part Time" className="text-slate-900 bg-white">Part Time</option>
                  <option value="Contractual" className="text-slate-900 bg-white">Contractual</option>
                  <option value="Intern" className="text-slate-900 bg-white">Intern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={personalDetails.joiningDate}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      joiningDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              {personalDetails.employeeType === "Contractual" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contract Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={personalDetails.contractExpiryDate}
                    onChange={(e) =>
                      setPersonalDetails({
                        ...personalDetails,
                        contractExpiryDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                  {formErrors.contractExpiryDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.contractExpiryDate}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Location
                </label>
                <select
                  value={personalDetails.workLocation}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      workLocation: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                >
                  <option value="" className="text-slate-900 bg-white">Select Work Location</option>
                  {personalDetails.workLocation &&
                    !workLocations.some(
                      (l) =>
                        (l.siteName || l.name) === personalDetails.workLocation
                    ) && (
                      <option
                        value={personalDetails.workLocation}
                        className="text-slate-900 bg-white"
                      >
                        {personalDetails.workLocation}
                      </option>
                    )}
                  {workLocations.map((loc) => {
                    const name = loc.siteName || loc.name || "";
                    const key = loc._id || loc.code || name;
                    return (
                      <option
                        key={key}
                        value={name}
                        className="text-slate-900 bg-white"
                      >
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={personalDetails.address}
                  onChange={(e) =>
                    setPersonalDetails({ ...personalDetails, address: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monthly Basic Salary (ETB)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={personalDetails.salary}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      salary: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1000076019651"
                  value={personalDetails.bankAccount}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      bankAccount: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="Commercial Bank of Ethiopia"
                  value={personalDetails.bankName}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      bankName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Emergency Contact Name & Phone
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={personalDetails.emergencyContactName}
                    onChange={(e) =>
                      setPersonalDetails({
                        ...personalDetails,
                        emergencyContactName: e.target.value,
                      })
                    }
                    placeholder="Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                  <input
                    type="tel"
                    value={personalDetails.emergencyContactNumber}
                    onChange={(e) =>
                      setPersonalDetails({
                        ...personalDetails,
                        emergencyContactNumber: e.target.value,
                      })
                    }
                    placeholder="Phone"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Employment History
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage previous job roles and companies.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEmploymentHistory([
                    ...employmentHistory,
                    {
                      company: "",
                      position: "",
                      startDate: "",
                      endDate: "",
                      responsibilities: "",
                      reasonForLeaving: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Entry
              </button>
            </div>

            <div className="space-y-4">
              {employmentHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No employment history recorded
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Add Entry" to record past experience.
                  </p>
                </div>
              ) : (
                employmentHistory.map((job, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Experience #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEmploymentHistory(
                            employmentHistory.filter((_, i) => i !== index)
                          )
                        }
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={job.company || ""}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].company = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                          placeholder="Company"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Position
                        </label>
                        <input
                          type="text"
                          value={job.position || ""}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].position = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                          placeholder="Position"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={job.startDate || ""}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].startDate = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={job.endDate || ""}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].endDate = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Certifications & Qualifications
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage professional credentials and licenses.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCertifications([
                    ...certifications,
                    {
                      title: "",
                      issuer: "",
                      issueDate: "",
                      expiryDate: "",
                      credentialId: "",
                      description: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Certification
              </button>
            </div>

            <div className="space-y-4">
              {certifications.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No certifications recorded
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Add Certification" to record certificates.
                  </p>
                </div>
              ) : (
                certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Certification #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCertifications(certifications.filter((_, i) => i !== index))
                        }
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Certification Title
                        </label>
                        <input
                          type="text"
                          value={cert.title || ""}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[index].title = e.target.value;
                            setCertifications(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Issuer / Institution
                        </label>
                        <input
                          type="text"
                          value={cert.issuer || ""}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[index].issuer = e.target.value;
                            setCertifications(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={cert.issueDate || ""}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[index].issueDate = e.target.value;
                            setCertifications(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={cert.expiryDate || ""}
                          onChange={(e) => {
                            const updated = [...certifications];
                            updated[index].expiryDate = e.target.value;
                            setCertifications(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  Skills & Competencies
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage skills and proficiency levels.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSkills([
                    ...skills,
                    {
                      skillName: "",
                      proficiencyLevel: "Intermediate",
                      yearsOfExperience: "",
                      category: "Technical",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill
              </button>
            </div>

            <div className="space-y-4">
              {skills.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Brain className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No skills recorded
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Add Skill" to record technical competencies.
                  </p>
                </div>
              ) : (
                skills.map((skill, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Skill #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Skill Name
                        </label>
                        <input
                          type="text"
                          value={skill.skillName || ""}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[index].skillName = e.target.value;
                            setSkills(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Proficiency
                        </label>
                        <select
                          value={skill.proficiencyLevel || "Intermediate"}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[index].proficiencyLevel = e.target.value;
                            setSkills(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Years Experience
                        </label>
                        <input
                          type="number"
                          value={skill.yearsOfExperience || ""}
                          onChange={(e) => {
                            const updated = [...skills];
                            updated[index].yearsOfExperience = e.target.value;
                            setSkills(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-indigo-600" />
                Health & Emergency Records
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confidential medical notes and insurance coverage details.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Blood Type
                </label>
                <select
                  value={healthRecords.bloodType || ""}
                  onChange={(e) =>
                    setHealthRecords({ ...healthRecords, bloodType: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white shadow-sm"
                >
                  <option value="">Select Blood Group</option>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Emergency Medical Contact
                </label>
                <input
                  type="text"
                  value={healthRecords.emergencyMedicalContact || ""}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      emergencyMedicalContact: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={healthRecords.insuranceProvider || ""}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      insuranceProvider: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Insurance Policy Number
                </label>
                <input
                  type="text"
                  value={healthRecords.insurancePolicyNumber || ""}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      insurancePolicyNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        /* Documents and Files Management in Edit */
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Employee Documents & Attachments
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  View in detail, download, change/replace existing documents, or upload new files.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadingNewDoc(!isUploadingNewDoc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                {isUploadingNewDoc ? "Hide Upload Form" : "Upload New Document"}
              </button>
            </div>

            {/* Upload New Document Card */}
            {isUploadingNewDoc && (
              <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Upload New Document for {personalDetails.name || "Employee"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsUploadingNewDoc(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Category
                    </label>
                    <select
                      value={newDocData.category}
                      onChange={(e) =>
                        setNewDocData({ ...newDocData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={newDocData.title}
                      onChange={(e) =>
                        setNewDocData({ ...newDocData, title: e.target.value })
                      }
                      placeholder="e.g. Passport Copy"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={newDocData.expiryDate}
                      onChange={(e) =>
                        setNewDocData({ ...newDocData, expiryDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
                    className="w-full sm:flex-1 text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    onChange={(e) =>
                      setNewDocData({ ...newDocData, file: e.target.files?.[0] || null })
                    }
                  />

                  <Button
                    type="button"
                    disabled={!newDocData.file || isUploadingNewDoc}
                    onClick={handleUploadNewDocument}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm"
                  >
                    {isUploadingNewDoc ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Upload & Attach
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* List of Existing Documents */}
            <div className="space-y-3">
              {fetchingDocs ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">
                    No documents attached yet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Click "Upload New Document" above to upload ID cards, contracts, CVs, or credentials.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => {
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
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex-shrink-0">
                            {isPdf ? (
                              <FileText className="w-6 h-6 text-rose-500" />
                            ) : isImage ? (
                              <ImageIcon className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <FileCheck className="w-6 h-6 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-sm font-bold text-slate-900 truncate">
                              {doc.title || doc.originalName || "Document"}
                            </h5>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {doc.documentType || doc.type || "Document"}
                              </span>
                              <span>•</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Uploaded: {formatDate(doc.uploadDate || doc.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons for Document */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {/* See in Detail / View */}
                            <button
                              type="button"
                              onClick={() => setViewingDoc(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all"
                              title="See in Detail & Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            {/* Download */}
                            <a
                              href={`/api/documents/${docId}/download`}
                              download={doc.originalName || "document"}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                              title="Download File"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>

                            {/* Change / Replace File */}
                            <button
                              type="button"
                              onClick={() => {
                                setReplacingDoc(doc);
                                setSelectedReplaceFile(null);
                                setIsReplaceModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200 transition-all"
                              title="Change / Replace Document File"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Replace</span>
                            </button>
                          </div>

                          {/* Delete Document */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteDocument(
                                docId,
                                doc.title || doc.originalName
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ClientOnly>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Edit Employee: {personalDetails.name || "Employee"}
                </h2>
                <p className="text-xs text-slate-300">
                  Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Navigation Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto flex-shrink-0">
            <div className="flex items-center justify-between min-w-max gap-2">
              {STEPS.map((step) => {
                const stepNumber = step.id;
                const isCompleted = currentStep > stepNumber;
                const isCurrent = currentStep === stepNumber;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (canNavigateToStep(stepNumber)) {
                        setCurrentStep(stepNumber);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"
                        : isCompleted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        isCurrent
                          ? "bg-white text-indigo-700 font-bold"
                          : isCompleted
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : stepNumber}
                    </div>
                    <span>{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert Banners */}
          {error && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Content Area */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm min-h-[380px]">
              {fetchingData ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">
                    Loading employee data...
                  </p>
                </div>
              ) : (
                renderStepContent()
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1 || loading}
              onClick={handlePrevious}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Step {currentStep} of {STEPS.length}
              </span>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  Next Step
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save & Update Employee
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document Detail / Preview Viewer Modal */}
      {viewingDoc && (
        <DocumentDetailViewerModal
          isOpen={!!viewingDoc}
          document={viewingDoc}
          employeeName={personalDetails.name}
          onClose={() => setViewingDoc(null)}
          onReplaceFile={(doc) => {
            setViewingDoc(null);
            setReplacingDoc(doc);
            setSelectedReplaceFile(null);
            setIsReplaceModalOpen(true);
          }}
        />
      )}

      {/* Replace Document Modal Dialog */}
      {isReplaceModalOpen && replacingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                Replace Document File
              </h3>
              <button
                type="button"
                onClick={() => setIsReplaceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Target Document</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {replacingDoc.title || replacingDoc.originalName}
              </p>
              <p className="text-[11px] text-slate-400">
                {replacingDoc.documentType || replacingDoc.type} • Current: {replacingDoc.originalName}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select New Replacement File
              </label>
              <input
                ref={replaceFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                onChange={(e) => setSelectedReplaceFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReplaceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedReplaceFile || loading}
                onClick={handleReplaceDocumentFile}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                {loading ? "Replacing..." : "Confirm Replacement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientOnly>
  );
}
