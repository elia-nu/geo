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
  Upload,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
  Shield,
  Eye,
  AlertCircle,
  Sparkles,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import ClientOnly from "./ClientOnly";

const ALL_STEPS = [
  { id: "personal", title: "Personal Details", icon: User, description: "Basic information & contract" },
  { id: "employment", title: "Employment History", icon: Briefcase, description: "Work experience" },
  { id: "certifications", title: "Certifications", icon: Award, description: "Qualifications & credentials" },
  { id: "skills", title: "Skills", icon: Brain, description: "Competencies & levels" },
  { id: "health", title: "Health Records", icon: Heart, description: "Medical & emergency info" },
  { id: "documents", title: "Documents & Files", icon: FileText, description: "ID, Resume, Contract & Attachments" },
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

export default function StepperEmployeeForm({
  isOpen,
  onClose,
  onEmployeeAdded,
}) {
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [workLocationsList, setWorkLocationsList] = useState([]);
  const [suggestedEmployeeId, setSuggestedEmployeeId] = useState("");
  const [filteredDesignations, setFilteredDesignations] = useState([]);

  // Form data for each step
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    dateOfBirth: "",
    address: "",
    contactNumber: "",
    email: "",
    department: "",
    designation: "",
    workLocation: "",
    joiningDate: "",
    employeeId: "",
    salary: "",
    bankAccount: "",
    bankName: "Commercial Bank of Ethiopia",
    emergencyContactName: "",
    emergencyContactNumber: "",
    employeeType: "Full Time",
    contractExpiryDate: "",
    transportAllowance: "",
    telephoneAllowance: "",
    posAllowance: "",
  });

  const [employmentHistory, setEmploymentHistory] = useState([
    {
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      responsibilities: "",
      reasonForLeaving: "",
    },
  ]);

  const [certifications, setCertifications] = useState([
    {
      title: "",
      issuer: "",
      issueDate: "",
      expiryDate: "",
      credentialId: "",
      description: "",
    },
  ]);

  const [skills, setSkills] = useState([
    {
      skillName: "",
      proficiencyLevel: "Beginner",
      yearsOfExperience: "",
      category: "",
    },
  ]);

  const [healthRecords, setHealthRecords] = useState({
    bloodType: "",
    allergies: [],
    medicalConditions: [],
    medications: [],
    emergencyMedicalContact: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
  });

  // Attached documents state (for creation step)
  const [attachedDocuments, setAttachedDocuments] = useState([]);
  const [newDocCategory, setNewDocCategory] = useState("National ID / Passport");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocExpiryDate, setNewDocExpiryDate] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [formErrors, setFormErrors] = useState({});
  const [employmentHistoryPdfFile, setEmploymentHistoryPdfFile] = useState(null);

  // If user attaches a PDF for employment history, skip Certifications and Skills steps
  const visibleSteps = employmentHistoryPdfFile
    ? ALL_STEPS.filter((s) => ["personal", "employment", "health", "documents"].includes(s.id))
    : ALL_STEPS;

  // Fetch departments, designations, work locations and next employee id when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;

    const fetchMeta = async () => {
      try {
        const [depRes, desRes, nextIdRes, locRes] = await Promise.all([
          fetch("/api/departments", { cache: "no-store" }),
          fetch("/api/designations", { cache: "no-store" }),
          fetch("/api/employee/next-id", { cache: "no-store" }),
          fetch("/api/work-locations", { cache: "no-store" }),
        ]);

        if (!isCancelled) {
          if (depRes.ok) {
            const depData = await depRes.json();
            const depList = Array.isArray(depData?.departments)
              ? depData.departments
              : Array.isArray(depData)
              ? depData
              : [];
            setDepartments(depList);
          }
          if (desRes.ok) {
            const desData = await desRes.json();
            const desList = Array.isArray(desData?.designations)
              ? desData.designations
              : Array.isArray(desData)
              ? desData
              : [];
            setDesignations(desList);
          }
          if (locRes.ok) {
            const locData = await locRes.json();
            setWorkLocationsList(locData.locations || []);
          }
          if (nextIdRes?.ok) {
            const nextData = await nextIdRes.json();
            if (nextData?.nextId) {
              setSuggestedEmployeeId(nextData.nextId);
              setPersonalDetails((prev) => ({
                ...prev,
                employeeId: prev.employeeId || nextData.nextId,
              }));
            }
          }
        }
      } catch (e) {
        // ignore network error
      }
    };

    fetchMeta();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

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

  const canNavigateToStep = (targetStepIndex) => {
    if (targetStepIndex <= currentStep) return true;
    if (targetStepIndex === currentStep + 1) {
      const stepId = visibleSteps[currentStep - 1]?.id;
      const errors = stepId ? validateStep(stepId) : {};
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }
    return false;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        resetForm();
      } else if (
        e.key === "ArrowRight" &&
        currentStep < visibleSteps.length &&
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
        currentStep === visibleSteps.length
      ) {
        e.preventDefault();
        handleSubmit();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [currentStep, loading, isOpen, visibleSteps.length]);

  if (!isOpen) return null;

  const validateStep = (stepId) => {
    const errors = {};

    switch (stepId) {
      case "personal":
        if (!personalDetails.name.trim()) errors.name = "Name is required";
        if (
          personalDetails.email &&
          personalDetails.email.trim() &&
          !/\S+@\S+\.\S+/.test(personalDetails.email)
        ) {
          errors.email = "Please enter a valid email";
        }
        if (!personalDetails.department)
          errors.department = "Department is required";
        if (!personalDetails.designation)
          errors.designation = "Designation is required";
        if (!personalDetails.joiningDate)
          errors.joiningDate = "Joining date is required";
        if (!personalDetails.employeeType)
          errors.employeeType = "Employee type is required";
        if (
          personalDetails.employeeType === "Contractual" &&
          !personalDetails.contractExpiryDate
        )
          errors.contractExpiryDate =
            "Contract expiry date is required for contractual employees";
        break;

      case "employment":
        if (employmentHistoryPdfFile) break;
        employmentHistory.forEach((job, index) => {
          if (job.company || job.position || job.startDate) {
            if (!job.company)
              errors[`employment_${index}_company`] =
                "Company name is required";
            if (!job.position)
              errors[`employment_${index}_position`] = "Position is required";
            if (!job.startDate)
              errors[`employment_${index}_startDate`] =
                "Start date is required";
          }
        });
        break;

      case "certifications":
        certifications.forEach((cert, index) => {
          if (cert.title || cert.issuer || cert.issueDate) {
            if (!cert.title)
              errors[`cert_${index}_title`] = "Certification title is required";
            if (!cert.issuer)
              errors[`cert_${index}_issuer`] = "Institution is required";
            if (!cert.issueDate)
              errors[`cert_${index}_issueDate`] = "Date obtained is required";
          }
        });
        break;

      case "skills":
        skills.forEach((skill, index) => {
          if (
            skill.skillName ||
            skill.proficiencyLevel ||
            skill.yearsOfExperience
          ) {
            if (!skill.skillName)
              errors[`skill_${index}_skillName`] = "Skill name is required";
          }
        });
        break;

      case "documents":
        // Documents are optional on creation, but if provided, validated
        break;
    }

    return errors;
  };

  const handleNext = () => {
    const stepId = visibleSteps[currentStep - 1]?.id;
    const errors = stepId ? validateStep(stepId) : {};
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, visibleSteps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle adding documents to attachment queue
  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;

    const newDocs = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      type: newDocCategory,
      title: newDocTitle.trim() || file.name.replace(/\.[^/.]+$/, ""),
      description: newDocDescription.trim(),
      expiryDate: newDocExpiryDate || "",
    }));

    setAttachedDocuments((prev) => [...prev, ...newDocs]);
    setNewDocTitle("");
    setNewDocDescription("");
    setNewDocExpiryDate("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachedDocument = (id) => {
    setAttachedDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmit = async () => {
    const stepId = visibleSteps[currentStep - 1]?.id;
    const errors = stepId ? validateStep(stepId) : {};
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const usePdfForHistory = !!employmentHistoryPdfFile;
      const employeeData = {
        personalDetails: {
          ...personalDetails,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        },
        employmentHistory: usePdfForHistory
          ? []
          : employmentHistory.filter(
              (job) => job.company || job.position || job.startDate
            ),
        certifications: usePdfForHistory
          ? []
          : certifications.filter(
              (cert) => cert.title || cert.issuer || cert.issueDate
            ),
        skills: usePdfForHistory
          ? []
          : skills.filter((skill) => skill.skillName),
        healthRecords,
      };

      const response = await fetch("/api/employee/stepper-simple", {
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
      const newEmployeeId = result.employeeId;

      // 1. Upload employment history PDF if provided
      if (usePdfForHistory && employmentHistoryPdfFile && newEmployeeId) {
        try {
          const formData = new FormData();
          formData.append("file", employmentHistoryPdfFile);
          formData.append(
            "documentData",
            JSON.stringify({
              employeeId: newEmployeeId,
              documentType: "Employment History",
              type: "employment_history",
              title: `Employment History - ${personalDetails.name || "Employee"}`,
              category: "employee",
            })
          );
          await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
        } catch (docErr) {
          console.warn("Employment history PDF upload error:", docErr);
        }
      }

      // 2. Upload all other attached documents
      if (attachedDocuments.length > 0 && newEmployeeId) {
        for (const doc of attachedDocuments) {
          try {
            const formData = new FormData();
            formData.append("file", doc.file);
            formData.append(
              "documentData",
              JSON.stringify({
                employeeId: newEmployeeId,
                documentType: doc.type,
                type: doc.type,
                title: doc.title || doc.name,
                description: doc.description || "",
                expiryDate: doc.expiryDate || "",
                category: "employee",
                status: "active",
              })
            );
            await fetch("/api/documents/upload", {
              method: "POST",
              body: formData,
            });
          } catch (docErr) {
            console.warn(`Failed to upload document ${doc.name}:`, docErr);
          }
        }
      }

      setSuccess("Employee and documents created successfully!");

      setTimeout(() => {
        onEmployeeAdded?.();
        onClose();
        resetForm();
      }, 1500);
    } catch (error) {
      console.error("Error creating employee:", error);
      setError(error.message || "Failed to create employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setPersonalDetails({
      name: "",
      dateOfBirth: "",
      address: "",
      contactNumber: "",
      email: "",
      department: "",
      designation: "",
      workLocation: "",
      joiningDate: "",
      employeeId: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      employeeType: "Full Time",
      contractExpiryDate: "",
      transportAllowance: "",
      telephoneAllowance: "",
      posAllowance: "",
    });
    setEmploymentHistory([
      {
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        responsibilities: "",
        reasonForLeaving: "",
      },
    ]);
    setCertifications([
      {
        title: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
        description: "",
      },
    ]);
    setSkills([
      {
        skillName: "",
        proficiencyLevel: "Beginner",
        yearsOfExperience: "",
        category: "",
      },
    ]);
    setHealthRecords({
      bloodType: "",
      allergies: [],
      medicalConditions: [],
      medications: [],
      emergencyMedicalContact: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
    });
    setAttachedDocuments([]);
    setEmploymentHistoryPdfFile(null);
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const renderStepContent = () => {
    const stepId = visibleSteps[currentStep - 1]?.id;
    switch (stepId) {
      case "personal":
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Personal & Employment Basics
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the primary identification, role details, and contract terms.
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all text-slate-900 bg-white shadow-sm ${
                    formErrors.name
                      ? "border-red-400 focus:ring-2 focus:ring-red-200 bg-red-50"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                  placeholder="e.g. Abebe Kebede"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {formErrors.name}
                  </p>
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all text-slate-900 bg-white shadow-sm ${
                    formErrors.email
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                  placeholder="abebe@example.com"
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
                  value={personalDetails.employeeId || suggestedEmployeeId}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-mono cursor-not-allowed shadow-inner"
                  placeholder="Auto-generated"
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
                    setPersonalDetails({ ...personalDetails, contactNumber: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  placeholder="+251 9..."
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
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all text-slate-900 bg-white shadow-sm ${
                    formErrors.department
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  }`}
                >
                  <option value="" className="text-slate-900 bg-white">Select Department</option>
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
                  Designation / Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={personalDetails.designation}
                  onChange={(e) =>
                    setPersonalDetails({ ...personalDetails, designation: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all text-slate-900 bg-white shadow-sm ${
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
                    setPersonalDetails({ ...personalDetails, employeeType: e.target.value })
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
                    setPersonalDetails({ ...personalDetails, joiningDate: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
                {formErrors.joiningDate && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.joiningDate}</p>
                )}
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
                    setPersonalDetails({ ...personalDetails, workLocation: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                >
                  <option value="" className="text-slate-900 bg-white">Select Work Location</option>
                  {personalDetails.workLocation &&
                    !workLocationsList.some(
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
                  {workLocationsList.map((loc) => {
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
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={personalDetails.dateOfBirth}
                  onChange={(e) =>
                    setPersonalDetails({ ...personalDetails, dateOfBirth: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                />
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
                  placeholder="Subcity, Woreda, House No..."
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
            </div>
          </div>
        );

      case "employment":
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Employment History
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add previous work experience or upload a CV/history document.
                </p>
              </div>

              {/* Upload PDF Option */}
              <div className="flex items-center gap-2">
                {!employmentHistoryPdfFile ? (
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload History PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEmploymentHistoryPdfFile(file);
                      }}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[150px]">{employmentHistoryPdfFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setEmploymentHistoryPdfFile(null)}
                      className="text-red-500 hover:text-red-700 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!employmentHistoryPdfFile ? (
              <div className="space-y-4">
                {employmentHistory.map((job, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Experience #{index + 1}
                      </span>
                      {employmentHistory.length > 1 && (
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
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={job.company}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].company = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                          placeholder="Previous Company"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Position / Title
                        </label>
                        <input
                          type="text"
                          value={job.position}
                          onChange={(e) => {
                            const updated = [...employmentHistory];
                            updated[index].position = e.target.value;
                            setEmploymentHistory(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                          placeholder="Job Title"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={job.startDate}
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
                          value={job.endDate}
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
                ))}

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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-600 hover:text-indigo-700 text-xs font-semibold bg-indigo-50/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Experience
                </button>
              </div>
            ) : (
              <div className="p-8 text-center bg-indigo-50/50 rounded-2xl border border-indigo-200">
                <FileCheck className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-900">
                  Employment History PDF Attached
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {employmentHistoryPdfFile.name} ({(employmentHistoryPdfFile.size / 1024).toFixed(1)} KB)
                  will be uploaded and attached directly to this employee.
                </p>
              </div>
            )}
          </div>
        );

      case "certifications":
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Certifications & Credentials
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Record professional certifications, degrees, and licenses.
              </p>
            </div>

            <div className="space-y-4">
              {certifications.map((cert, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Certification #{index + 1}
                    </span>
                    {certifications.length > 1 && (
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
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Certification Title
                      </label>
                      <input
                        type="text"
                        value={cert.title}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index].title = e.target.value;
                          setCertifications(updated);
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        placeholder="e.g. PMP, AWS Certified"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Issuer / Institution
                      </label>
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index].issuer = e.target.value;
                          setCertifications(updated);
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        placeholder="Issuing Organization"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        value={cert.issueDate}
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
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={cert.expiryDate}
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
              ))}

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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-600 hover:text-indigo-700 text-xs font-semibold bg-indigo-50/40 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Certification
              </button>
            </div>
          </div>
        );

      case "skills":
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                Skills & Competencies
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                List relevant skills, technical capabilities, and proficiency levels.
              </p>
            </div>

            <div className="space-y-4">
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Skill #{index + 1}
                    </span>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        value={skill.skillName}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index].skillName = e.target.value;
                          setSkills(updated);
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        placeholder="e.g. Surveying, AutoCAD, GIS"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Proficiency
                      </label>
                      <select
                        value={skill.proficiencyLevel}
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
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={skill.yearsOfExperience}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index].yearsOfExperience = e.target.value;
                          setSkills(updated);
                        }}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                        placeholder="Years"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setSkills([
                    ...skills,
                    {
                      skillName: "",
                      proficiencyLevel: "Beginner",
                      yearsOfExperience: "",
                      category: "",
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-600 hover:text-indigo-700 text-xs font-semibold bg-indigo-50/40 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Skill
              </button>
            </div>
          </div>
        );

      case "health":
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-indigo-600" />
                Health & Emergency Information
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confidential medical notes and emergency contact records.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Blood Type
                </label>
                <select
                  value={healthRecords.bloodType}
                  onChange={(e) =>
                    setHealthRecords({ ...healthRecords, bloodType: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
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
                  value={healthRecords.emergencyMedicalContact}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      emergencyMedicalContact: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  placeholder="Doctor or Contact Name & Phone"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={healthRecords.insuranceProvider}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      insuranceProvider: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  placeholder="Insurance Company"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={healthRecords.insurancePolicyNumber}
                  onChange={(e) =>
                    setHealthRecords({
                      ...healthRecords,
                      insurancePolicyNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  placeholder="Policy / Card ID"
                />
              </div>
            </div>
          </div>
        );

      case "documents":
        return (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Employee Documents & Attachments
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload national ID copies, resume/CV, signed contract, educational degrees, or health certificates.
              </p>
            </div>

            {/* Document Upload Card */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Document Category
                  </label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-medium"
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
                    Custom Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g. Passport Copy (2026)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date (If applicable)
                  </label>
                  <input
                    type="date"
                    value={newDocExpiryDate}
                    onChange={(e) => setNewDocExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files);
                }}
                className={`py-8 px-4 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  isDragging
                    ? "border-indigo-600 bg-indigo-100/50"
                    : "border-slate-300 bg-white/70 hover:bg-white hover:border-indigo-400"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  Click or drag & drop files here to attach
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, DOCX, XLSX, JPG, PNG (Max 15MB each)
                </p>
              </div>
            </div>

            {/* List of Attached Documents */}
            {attachedDocuments.length > 0 ? (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Files to be uploaded ({attachedDocuments.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                          {doc.name.endsWith(".pdf") ? (
                            <FileText className="w-5 h-5 text-rose-500" />
                          ) : doc.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                            <ImageIcon className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <FileCheck className="w-5 h-5 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {doc.type} • {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachedDocument(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200">
                <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">
                  No documents attached yet. Documents can also be added anytime after creation.
                </p>
              </div>
            )}
          </div>
        );
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
                  Add New Employee
                </h2>
                <p className="text-xs text-slate-300">
                  Step {currentStep} of {visibleSteps.length}:{" "}
                  {visibleSteps[currentStep - 1]?.title}
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
              {visibleSteps.map((step, idx) => {
                const stepNumber = idx + 1;
                const isCompleted = currentStep > stepNumber;
                const isCurrent = currentStep === stepNumber;
                const Icon = step.icon;

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
              {renderStepContent()}
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
                Step {currentStep} of {visibleSteps.length}
              </span>

              {currentStep < visibleSteps.length ? (
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
                      Creating Employee...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Complete & Create Employee
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
