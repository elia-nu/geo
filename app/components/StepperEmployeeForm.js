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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ClientOnly from "./ClientOnly";

const STEPS = [
  {
    id: 1,
    title: "Personal Details",
    icon: User,
    description: "Basic information",
  },
  {
    id: 2,
    title: "Employment History",
    icon: Briefcase,
    description: "Work experience",
  },
  {
    id: 3,
    title: "Certifications",
    icon: Award,
    description: "Qualifications",
  },
  { id: 4, title: "Skills", icon: Brain, description: "Competencies" },
  {
    id: 5,
    title: "Health Records",
    icon: Heart,
    description: "Medical information",
  },
];

export default function StepperEmployeeForm({
  isOpen,
  onClose,
  onEmployeeAdded,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    emergencyContactName: "",
    emergencyContactNumber: "",
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
      institution: "",
      dateObtained: "",
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

  const [formErrors, setFormErrors] = useState({});

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
        if (!personalDetails.name.trim()) errors.name = "Name is required";
        if (!personalDetails.email.trim()) errors.email = "Email is required";
        if (
          personalDetails.email &&
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
        break;

      case 2:
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

      case 3:
        certifications.forEach((cert, index) => {
          if (cert.title || cert.institution || cert.dateObtained) {
            if (!cert.title)
              errors[`cert_${index}_title`] = "Certification title is required";
            if (!cert.institution)
              errors[`cert_${index}_institution`] = "Institution is required";
            if (!cert.dateObtained)
              errors[`cert_${index}_dateObtained`] =
                "Date obtained is required";
          }
        });
        break;

      case 4:
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
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const errors = validateStep(currentStep);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const employeeData = {
        personalDetails: {
          ...personalDetails,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        },
        employmentHistory: employmentHistory.filter(
          (job) => job.company || job.position || job.startDate
        ),
        certifications: certifications.filter(
          (cert) => cert.title || cert.institution || cert.dateObtained
        ),
        skills: skills.filter((skill) => skill.skillName),
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
      setSuccess("Employee created successfully!");

      setTimeout(() => {
        onEmployeeAdded?.();
        onClose();
        resetForm();
      }, 2000);
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
        institution: "",
        dateObtained: "",
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
    setFormErrors({});
    setError("");
    setSuccess("");
  };

  const addEmploymentEntry = () => {
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
    ]);
  };

  const removeEmploymentEntry = (index) => {
    if (employmentHistory.length > 1) {
      setEmploymentHistory(employmentHistory.filter((_, i) => i !== index));
    }
  };

  const addCertificationEntry = () => {
    setCertifications([
      ...certifications,
      {
        title: "",
        institution: "",
        dateObtained: "",
        expiryDate: "",
        credentialId: "",
        description: "",
      },
    ]);
  };

  const removeCertificationEntry = (index) => {
    if (certifications.length > 1) {
      setCertifications(certifications.filter((_, i) => i !== index));
    }
  };

  const addSkillEntry = () => {
    setSkills([
      ...skills,
      {
        skillName: "",
        proficiencyLevel: "Beginner",
        yearsOfExperience: "",
        category: "",
      },
    ]);
  };

  const removeSkillEntry = (index) => {
    if (skills.length > 1) {
      setSkills(skills.filter((_, i) => i !== index));
    }
  };

  const addArrayItem = (field, value) => {
    if (value.trim()) {
      setHealthRecords({
        ...healthRecords,
        [field]: [...healthRecords[field], value.trim()],
      });
    }
  };

  const removeArrayItem = (field, index) => {
    setHealthRecords({
      ...healthRecords,
      [field]: healthRecords[field].filter((_, i) => i !== index),
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
                Let's start with the basic details about the employee
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
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
                  type="tel"
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
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
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
                  placeholder="Enter designation"
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
                <input
                  type="text"
                  value={
                    typeof personalDetails.workLocation === "object" &&
                    personalDetails.workLocation?.name
                      ? personalDetails.workLocation.name
                      : typeof personalDetails.workLocation === "string"
                      ? personalDetails.workLocation
                      : ""
                  }
                  onChange={(e) =>
                    setPersonalDetails({
                      ...personalDetails,
                      workLocation: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  placeholder="Enter work location"
                />
              </div>

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
                  type="tel"
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
            </div>

            <div>
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
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Employment History
              </h3>
              <p className="text-gray-600">
                Add previous work experience and professional background
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

            {employmentHistory.map((job, index) => (
              <div
                key={index}
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
                      Position
                    </label>
                    <input
                      type="text"
                      value={job.position}
                      onChange={(e) => {
                        const updated = [...employmentHistory];
                        updated[index].position = e.target.value;
                        setEmploymentHistory(updated);
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition-all text-gray-900 placeholder-gray-500 ${
                        formErrors[`employment_${index}_position`]
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="Enter position"
                    />
                    {formErrors[`employment_${index}_position`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors[`employment_${index}_position`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      value={job.endDate}
                      onChange={(e) => {
                        const updated = [...employmentHistory];
                        updated[index].endDate = e.target.value;
                        setEmploymentHistory(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Responsibilities
                  </label>
                  <textarea
                    value={job.responsibilities}
                    onChange={(e) => {
                      const updated = [...employmentHistory];
                      updated[index].responsibilities = e.target.value;
                      setEmploymentHistory(updated);
                    }}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Describe key responsibilities and achievements"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Leaving
                  </label>
                  <input
                    type="text"
                    value={job.reasonForLeaving}
                    onChange={(e) => {
                      const updated = [...employmentHistory];
                      updated[index].reasonForLeaving = e.target.value;
                      setEmploymentHistory(updated);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Reason for leaving (optional)"
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Certifications</h3>
              <Button
                onClick={addCertificationEntry}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Certification
              </Button>
            </div>

            {certifications.map((cert, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Certification #{index + 1}</h4>
                  {certifications.length > 1 && (
                    <Button
                      onClick={() => removeCertificationEntry(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      Institution
                    </label>
                    <input
                      type="text"
                      value={cert.institution}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[index].institution = e.target.value;
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
                      Date Obtained
                    </label>
                    <input
                      type="date"
                      value={cert.dateObtained}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[index].dateObtained = e.target.value;
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
                      value={cert.expiryDate}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[index].expiryDate = e.target.value;
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
                      value={cert.credentialId}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[index].credentialId = e.target.value;
                        setCertifications(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                      placeholder="Enter credential ID (optional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={cert.description}
                    onChange={(e) => {
                      const updated = [...certifications];
                      updated[index].description = e.target.value;
                      setCertifications(updated);
                    }}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    placeholder="Brief description of the certification"
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Skills & Competencies</h3>
              <Button
                onClick={addSkillEntry}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </Button>
            </div>

            {skills.map((skill, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Skill #{index + 1}</h4>
                  {skills.length > 1 && (
                    <Button
                      onClick={() => removeSkillEntry(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      value={skill.proficiencyLevel}
                      onChange={(e) => {
                        const updated = [...skills];
                        updated[index].proficiencyLevel = e.target.value;
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
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={skill.yearsOfExperience}
                      onChange={(e) => {
                        const updated = [...skills];
                        updated[index].yearsOfExperience = e.target.value;
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
                      value={skill.category}
                      onChange={(e) => {
                        const updated = [...skills];
                        updated[index].category = e.target.value;
                        setSkills(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                    >
                      <option value="">Select Category</option>
                      <option value="Technical">Technical</option>
                      <option value="Soft Skills">Soft Skills</option>
                      <option value="Leadership">Leadership</option>
                      <option value="Communication">Communication</option>
                      <option value="Analytical">Analytical</option>
                      <option value="Creative">Creative</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Health Records</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex flex-wrap gap-2 mb-2">
                {healthRecords.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {allergy}
                    <button
                      onClick={() => removeArrayItem("allergies", index)}
                      className="ml-1 text-red-600 hover:text-red-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add allergy"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addArrayItem("allergies", e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={(e) => {
                    const input = e.target.parentElement.querySelector("input");
                    addArrayItem("allergies", input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Medical Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Conditions
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {healthRecords.medicalConditions.map((condition, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    {condition}
                    <button
                      onClick={() =>
                        removeArrayItem("medicalConditions", index)
                      }
                      className="ml-1 text-yellow-600 hover:text-yellow-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add medical condition"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addArrayItem("medicalConditions", e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={(e) => {
                    const input = e.target.parentElement.querySelector("input");
                    addArrayItem("medicalConditions", input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Medications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Medications
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {healthRecords.medications.map((medication, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {medication}
                    <button
                      onClick={() => removeArrayItem("medications", index)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add medication"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addArrayItem("medications", e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={(e) => {
                    const input = e.target.parentElement.querySelector("input");
                    addArrayItem("medications", input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
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
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-6 text-white">
            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Add New Employee</h2>
                <p className="text-blue-100 text-sm">
                  Step {currentStep} of {STEPS.length} -{" "}
                  {STEPS[currentStep - 1]?.title}
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Enhanced Step Indicator */}
            <div className="relative mt-8">
              {/* Progress Bar Background */}
              <div className="absolute top-5 left-0 right-0 h-1 bg-blue-400 bg-opacity-30 rounded-full"></div>
              {/* Progress Bar Fill */}
              <div
                className="absolute top-5 left-0 h-1 bg-white bg-opacity-80 rounded-full transition-all duration-500 ease-out"
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
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full border-3 transition-all duration-300 transform ${
                        currentStep > step.id
                          ? "bg-green-500 border-green-400 text-white scale-110 shadow-lg"
                          : currentStep === step.id
                          ? "bg-white border-white text-blue-700 scale-110 shadow-lg animate-pulse"
                          : "bg-blue-500 border-blue-400 text-white hover:scale-105"
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
                            ? "text-white"
                            : "text-blue-200"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          currentStep >= step.id
                            ? "text-blue-100"
                            : "text-blue-300"
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Connection Line */}
                    {index < STEPS.length - 1 && (
                      <div className="absolute top-6 left-12 w-full h-px bg-blue-300 bg-opacity-50 hidden lg:block"></div>
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
          <div className="px-8 py-6 overflow-y-auto max-h-[calc(95vh-320px)] bg-gray-50">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
              <div className="animate-in fade-in slide-in-from-right duration-300">
                {renderStepContent()}
              </div>
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 1 || loading}
                variant="outline"
                className="flex items-center gap-2 px-6 py-3 text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
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
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating Employee...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Create Employee
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
