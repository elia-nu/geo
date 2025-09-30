"use client";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import ClientOnly from "./ClientOnly";

const STEPS = [
  {
    id: 1,
    title: "Personal Details",
    description: "Basic information",
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
    description: "Technical abilities",
    icon: Brain,
  },
  {
    id: 5,
    title: "Health Records",
    description: "Medical information",
    icon: Heart,
  },
];

export default function EditStepperEmployeeForm({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [departments, setDepartments] = useState([]);
  const [workLocations, setWorkLocations] = useState([]);
  const [designations, setDesignations] = useState([]);

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
    emergencyContactName: "",
    emergencyContactNumber: "",
    address: "",
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
        console.log("Fetched enhanced employee data:", data);
        setEnhancedEmployee(data);
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
        // ignore; selects will be empty
      }
    };
    fetchLists();
  }, [isOpen]);

  // Populate form when enhanced employee data is available
  useEffect(() => {
    if (enhancedEmployee && isOpen) {
      const emp = enhancedEmployee.employee;

      // Personal Details
      setPersonalDetails({
        name: getEmployeeName(emp),
        email: getEmployeeEmail(emp),
        employeeId: getEmployeeData(emp, "employeeId"),
        dateOfBirth: getEmployeeData(emp, "dateOfBirth"),
        contactNumber: getEmployeeData(emp, "contactNumber"),
        department: emp.department || "",
        designation: emp.designation || "",
        workLocation: emp.workLocation || "",
        joiningDate: getEmployeeData(emp, "joiningDate"),
        emergencyContactName: getEmployeeData(emp, "emergencyContactName"),
        emergencyContactNumber: getEmployeeData(emp, "emergencyContactNumber"),
        address: getEmployeeData(emp, "address"),
      });

      // Employment History - from separate collection
      setEmploymentHistory(enhancedEmployee.employmentHistory || []);

      // Certifications - from separate collection
      // Normalize certification fields to { title, issuer, issueDate, ... }
      setCertifications(
        (enhancedEmployee.certifications || []).map((c) => ({
          ...c,
          issuer: c.issuer || c.institution || c.issuingInstitution || "",
          issueDate: c.issueDate || c.dateObtained || c.date || "",
        }))
      );

      // Skills - from separate collection
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

      // Health Records - from separate collection
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
  }, [enhancedEmployee, isOpen]);

  // Add keyboard navigation
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
        if (!personalDetails.email.trim()) {
          errors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(personalDetails.email)) {
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
        break;
      case 2:
        // Employment history validation
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
        // Certifications validation
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
        // Skills validation
        skills.forEach((skill, index) => {
          if (!skill.skillName?.trim()) {
            errors[`skill_${index}_skillName`] = "Skill name is required";
          }
        });
        break;
      case 5:
        // Health records - optional fields, no validation needed
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
      setError("Please fix the errors before continuing.");
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
      setError("Please fix the errors before submitting.");
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

      const result = await response.json();
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

  const resetForm = () => {
    setCurrentStep(1);
    setPersonalDetails({
      name: "",
      email: "",
      employeeId: "",
      dateOfBirth: "",
      contactNumber: "",
      department: "",
      designation: "",
      workLocation: "",
      joiningDate: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      address: "",
    });
    setEmploymentHistory([]);
    setCertifications([]);
    setSkills([]);
    setHealthRecords({
      bloodType: "",
      allergies: [],
      medicalConditions: [],
      medications: [],
      emergencyMedicalContact: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
    });
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  // Helper functions for dynamic arrays
  const addEmploymentEntry = () => {
    setEmploymentHistory([
      ...employmentHistory,
      {
        id: Date.now(),
        company: "",
        position: "",
        startDate: "",
        endDate: "",
        responsibilities: "",
        reasonForLeaving: "",
      },
    ]);
  };

  const removeEmploymentEntry = (index) => {
    setEmploymentHistory(employmentHistory.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    setCertifications([
      ...certifications,
      {
        id: Date.now(),
        title: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
        description: "",
      },
    ]);
  };

  const removeCertification = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    setSkills([
      ...skills,
      {
        id: Date.now(),
        skillName: "",
        proficiencyLevel: "Beginner",
        experienceYears: "",
        category: "Technical",
      },
    ]);
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addHealthItem = (type, value) => {
    if (value.trim()) {
      setHealthRecords({
        ...healthRecords,
        [type]: [...healthRecords[type], value.trim()],
      });
    }
  };

  const removeHealthItem = (type, index) => {
    setHealthRecords({
      ...healthRecords,
      [type]: healthRecords[type].filter((_, i) => i !== index),
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Personal Information
              </h3>
              <p className="text-gray-600">
                Update the basic details about the employee
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={personalDetails.name}
                    onChange={(e) =>
                      setPersonalDetails({
                        ...personalDetails,
                        name: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 bg-white text-gray-900 placeholder-gray-500 ${
                      formErrors.name
                        ? "border-red-300 focus:ring-red-500 bg-red-50"
                        : "border-gray-300 focus:ring-blue-500 hover:border-gray-400"
                    }`}
                    placeholder="Enter full name"
                  />
                  {formErrors.name && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <X className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {formErrors.name && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <X className="w-4 h-4 mr-1" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={personalDetails.email}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      email: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    formErrors.email
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Enter email address"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={personalDetails.employeeId}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      employeeId: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter employee ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={personalDetails.dateOfBirth}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      dateOfBirth: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={personalDetails.contactNumber}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      contactNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={personalDetails.department}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      department: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    formErrors.department
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    formErrors.designation
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select Designation</option>
                  {designations.map((des) => (
                    <option key={`edit-des-${des}`} value={des}>
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

              {/* Work Location removed - configured later in settings */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                    formErrors.joiningDate
                      ? "border-red-300 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {formErrors.joiningDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.joiningDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={personalDetails.emergencyContactName}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      emergencyContactName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter emergency contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact Number
                </label>
                <input
                  type="text"
                  value={personalDetails.emergencyContactNumber}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      emergencyContactNumber: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter emergency contact number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={personalDetails.address}
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      address: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter full address"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Employment History
              </h3>
              <p className="text-gray-600">
                Update previous work experience and professional background
              </p>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Work Experience
                </span>
              </div>
              <Button
                onClick={addEmploymentEntry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Experience
              </Button>
            </div>

            {employmentHistory.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No employment history added yet
                </p>
                <Button
                  onClick={addEmploymentEntry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Experience
                </Button>
              </div>
            ) : (
              employmentHistory.map((job, index) => (
                <div
                  key={job.id || index}
                  className="p-6 border border-gray-200 rounded-xl space-y-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Experience #{index + 1}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Professional experience details
                        </p>
                      </div>
                    </div>
                    {employmentHistory.length > 1 && (
                      <Button
                        onClick={() => removeEmploymentEntry(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={job.company || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            company: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`employment_${index}_company`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter company name"
                      />
                      {formErrors[`employment_${index}_company`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`employment_${index}_company`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={job.position || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            position: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`employment_${index}_position`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter position/role"
                      />
                      {formErrors[`employment_${index}_position`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`employment_${index}_position`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={job.startDate || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            startDate: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`employment_${index}_startDate`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                      />
                      {formErrors[`employment_${index}_startDate`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`employment_${index}_startDate`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={job.endDate || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            endDate: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Responsibilities
                      </label>
                      <textarea
                        value={job.responsibilities || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            responsibilities: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Describe key responsibilities and achievements"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Leaving
                      </label>
                      <input
                        type="text"
                        value={job.reasonForLeaving || ""}
                        onChange={(e) => {
                          const updated = [...employmentHistory];
                          updated[index] = {
                            ...updated[index],
                            reasonForLeaving: e.target.value,
                          };
                          setEmploymentHistory(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Reason for leaving (optional)"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Certifications
              </h3>
              <p className="text-gray-600">
                Update professional certifications and qualifications
              </p>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Professional Certifications
                </span>
              </div>
              <Button
                onClick={addCertification}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Certification
              </Button>
            </div>

            {certifications.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  No certifications added yet
                </p>
                <Button
                  onClick={addCertification}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Certification
                </Button>
              </div>
            ) : (
              certifications.map((cert, index) => (
                <div
                  key={cert.id || index}
                  className="p-6 border border-gray-200 rounded-xl space-y-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Award className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Certification #{index + 1}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Professional qualification details
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeCertification(index)}
                      variant="outline"
                      size="sm"
                      className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 border-yellow-200 hover:border-yellow-300 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certification Title{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cert.title || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            title: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`cert_${index}_title`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter certification title"
                      />
                      {formErrors[`cert_${index}_title`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`cert_${index}_title`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issuing Institution{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cert.issuer || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            issuer: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`cert_${index}_institution`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter issuing institution"
                      />
                      {formErrors[`cert_${index}_institution`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`cert_${index}_institution`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Obtained <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={cert.issueDate || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            issueDate: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`cert_${index}_dateObtained`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                      />
                      {formErrors[`cert_${index}_dateObtained`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`cert_${index}_dateObtained`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={cert.expiryDate || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            expiryDate: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credential ID
                      </label>
                      <input
                        type="text"
                        value={cert.credentialId || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            credentialId: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Enter credential ID (optional)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={cert.description || ""}
                        onChange={(e) => {
                          const updated = [...certifications];
                          updated[index] = {
                            ...updated[index],
                            description: e.target.value,
                          };
                          setCertifications(updated);
                        }}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Brief description of the certification"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Skills & Expertise
              </h3>
              <p className="text-gray-600">
                Update technical and professional skills
              </p>
            </div>

            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Professional Skills
                </span>
              </div>
              <Button
                onClick={addSkill}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </Button>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No skills added yet</p>
                <Button
                  onClick={addSkill}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Skill
                </Button>
              </div>
            ) : (
              skills.map((skill, index) => (
                <div
                  key={skill.id || index}
                  className="p-6 border border-gray-200 rounded-xl space-y-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Brain className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          Skill #{index + 1}
                        </h4>
                        <p className="text-sm text-gray-500">
                          Professional skill details
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => removeSkill(index)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skill Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={skill.skillName || ""}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index] = {
                            ...updated[index],
                            skillName: e.target.value,
                          };
                          setSkills(updated);
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                          formErrors[`skill_${index}_skillName`]
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                        placeholder="Enter skill name"
                      />
                      {formErrors[`skill_${index}_skillName`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors[`skill_${index}_skillName`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proficiency Level
                      </label>
                      <select
                        value={skill.proficiencyLevel || "Beginner"}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index] = {
                            ...updated[index],
                            proficiencyLevel: e.target.value,
                          };
                          setSkills(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Experience (Years)
                      </label>
                      <input
                        type="number"
                        value={skill.experienceYears || ""}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index] = {
                            ...updated[index],
                            experienceYears: e.target.value,
                          };
                          setSkills(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                        placeholder="Years of experience"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={skill.category || "Technical"}
                        onChange={(e) => {
                          const updated = [...skills];
                          updated[index] = {
                            ...updated[index],
                            category: e.target.value,
                          };
                          setSkills(updated);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      >
                        <option value="">Select Category</option>
                        <option value="Technical">Technical</option>
                        <option value="Management">Management</option>
                        <option value="Communication">Communication</option>
                        <option value="Design">Design</option>
                        <option value="Languages">Languages</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Health Records
              </h3>
              <p className="text-gray-600">
                Update confidential health and medical information
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Type
                  </label>
                  <select
                    value={healthRecords.bloodType}
                    onChange={(e) =>
                      setHealthRecords({
                        ...healthRecords,
                        bloodType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Emergency medical contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Insurance provider name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Policy Number
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Policy number"
                  />
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add allergy"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          addHealthItem("allergies", e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <Button
                      onClick={(e) => {
                        const input =
                          e.target.parentElement.querySelector("input");
                        if (input.value.trim()) {
                          addHealthItem("allergies", input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {healthRecords.allergies.map((allergy, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {allergy}
                        <button
                          onClick={() => removeHealthItem("allergies", index)}
                          className="ml-1 text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medical Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Conditions
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add medical condition"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          addHealthItem("medicalConditions", e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <Button
                      onClick={(e) => {
                        const input =
                          e.target.parentElement.querySelector("input");
                        if (input.value.trim()) {
                          addHealthItem("medicalConditions", input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {healthRecords.medicalConditions.map((condition, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                      >
                        {condition}
                        <button
                          onClick={() =>
                            removeHealthItem("medicalConditions", index)
                          }
                          className="ml-1 text-yellow-600 hover:text-yellow-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Medications
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add medication"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          addHealthItem("medications", e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                    <Button
                      onClick={(e) => {
                        const input =
                          e.target.parentElement.querySelector("input");
                        if (input.value.trim()) {
                          addHealthItem("medications", input.value);
                          input.value = "";
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {healthRecords.medications.map((medication, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {medication}
                        <button
                          onClick={() => removeHealthItem("medications", index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ClientOnly
      fallback={
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden animate-pulse">
            <div className="h-32 bg-gradient-to-r from-blue-50 to-indigo-50"></div>
            <div className="p-8 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      }
    >
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        suppressHydrationWarning={true}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-gray-100">
          {/* Enhanced Header */}
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 px-8 py-6 text-white">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.4),transparent_50%)]" />
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2 drop-shadow-sm">
                  Edit Employee
                </h2>
                <p className="text-white text-opacity-90 text-sm">
                  Step {currentStep} of {STEPS.length} -{" "}
                  {STEPS[currentStep - 1]?.title}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="text-white hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Enhanced Step Indicator */}
            <div className="relative mt-8">
              {/* Progress Bar Background */}
              <div className="absolute top-5 left-0 right-0 h-1.5 bg-white bg-opacity-25 rounded-full"></div>
              {/* Progress Bar Fill */}
              <div
                className="absolute top-5 left-0 h-1.5 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{
                  width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                }}
              ></div>

              <div className="relative flex justify-between">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center group"
                  >
                    {/* Step Circle */}
                    <div
                      onClick={() => {
                        if (canNavigateToStep(step.id)) setCurrentStep(step.id);
                      }}
                      role="button"
                      title={step.title}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full border-3 transition-all duration-300 transform cursor-pointer ${
                        currentStep > step.id
                          ? "bg-amber-400 border-amber-300 text-white scale-110 shadow-xl shadow-amber-500/50"
                          : currentStep === step.id
                          ? "bg-white border-white text-teal-700 scale-110 shadow-xl shadow-white/50 animate-pulse"
                          : "bg-teal-400 bg-opacity-40 border-teal-300 text-white hover:scale-105 hover:bg-opacity-60"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-6 h-6 animate-in zoom-in duration-300" />
                      ) : (
                        <step.icon
                          className={`w-6 h-6 ${
                            currentStep === step.id ? "animate-bounce" : ""
                          }`}
                        />
                      )}

                      {/* Pulse Animation for Current Step */}
                      {currentStep === step.id && (
                        <div className="absolute inset-0 rounded-full border-3 border-white animate-ping opacity-75"></div>
                      )}
                    </div>

                    {/* Step Label */}
                    <div className="mt-3 text-center">
                      <p
                        className={`text-sm font-semibold transition-colors ${
                          currentStep >= step.id
                            ? "text-white drop-shadow"
                            : "text-white text-opacity-60"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          currentStep >= step.id
                            ? "text-white text-opacity-90"
                            : "text-white text-opacity-50"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Connection Line - Removed for cleaner look */}
                    {index < STEPS.length - 1 && false && (
                      <div className="absolute top-6 left-12 w-full h-0.5 bg-green-200/60 hidden lg:block">
                        <div
                          className={`h-0.5 transition-all duration-500 ${
                            currentStep > step.id
                              ? "bg-white w-full"
                              : "bg-transparent w-0"
                          }`}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Status Messages */}
          {error && (
            <div className="mx-8 mt-6 bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4 shadow-sm animate-in slide-in-from-top duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mx-8 mt-6 bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4 shadow-sm animate-in slide-in-from-top duration-300">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-green-800 font-medium">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Content Area */}
          <div className="px-8 py-6 overflow-y-auto max-h-[calc(95vh-320px)] bg-gradient-to-b from-slate-50 to-white">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 min-h-[400px]">
              {fetchingData ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 font-medium">
                    Loading employee data...
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right duration-300">
                  {renderStepContent()}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="px-8 py-6 bg-gradient-to-t from-slate-50 to-white border-t border-slate-200">
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 1 || loading}
                variant="outline"
                className="flex items-center gap-2 px-6 py-3 text-gray-800 border-gray-300 hover:bg-gray-100 disabled:text-gray-600 disabled:bg-white disabled:opacity-90 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-gray-800 disabled:text-gray-600">
                  Previous
                </span>
              </Button>

              <div className="flex items-center gap-4">
                {/* Keyboard Shortcuts Hint */}
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                  <span>⌨️ Shortcuts:</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">← →</span>
                  <span>Navigate</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">Esc</span>
                  <span>Close</span>
                  {currentStep === STEPS.length && (
                    <>
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        Ctrl+Enter
                      </span>
                      <span>Submit</span>
                    </>
                  )}
                </div>

                {/* Step Counter */}
                <span className="text-sm text-gray-500 font-medium">
                  {currentStep} of {STEPS.length}
                </span>

                {currentStep < STEPS.length ? (
                  <Button
                    onClick={handleNext}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <span className="text-white">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:bg-gray-300 disabled:text-gray-700 disabled:opacity-100"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Updating Employee...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span className="text-white">Update Employee</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
