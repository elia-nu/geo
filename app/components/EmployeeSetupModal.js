"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Lock,
  MapPin,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  FileText,
  Download,
  Eye,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  FileCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Shield,
  Briefcase,
  Building,
} from "lucide-react";
import DocumentDetailViewerModal from "./DocumentDetailViewerModal";

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

export default function EmployeeSetupModal({
  employee,
  onClose,
  onSuccess,
  onError,
  defaultTab = "password",
}) {
  const uploadDocInputRef = useRef(null);
  const [setupType, setSetupType] = useState(defaultTab); // "password" | "location" | "salary" | "documents"
  const [loading, setLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");

  // Password setup form
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  });

  // Location setup form
  const [workLocations, setWorkLocations] = useState([]);
  const [selectedWorkLocations, setSelectedWorkLocations] = useState([]);
  const [employeeWorkLocations, setEmployeeWorkLocations] = useState([]);

  // Salary setup form
  const [salaryForm, setSalaryForm] = useState({
    grossSalary: "",
    transportAllowance: "",
    telephoneAllowance: "",
    posAllowance: "",
  });

  // Documents state for Setup
  const [documents, setDocuments] = useState([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDocData, setNewDocData] = useState({
    category: "Employment Contract",
    title: "",
    description: "",
    expiryDate: "",
    file: null,
  });

  // Populate salary fields from existing employee data
  useEffect(() => {
    try {
      const existingGross =
        employee?.grossSalary ?? employee?.salary?.grossSalary ?? "";
      const existingTransport =
        employee?.transportAllowance ??
        employee?.salary?.transportAllowance ??
        "";
      const existingTelephone =
        employee?.telephoneAllowance ??
        employee?.salary?.telephoneAllowance ??
        "";
      const existingPos =
        employee?.posAllowance ?? employee?.salary?.posAllowance ?? "";
      setSalaryForm({
        grossSalary:
          existingGross === null || existingGross === undefined
            ? ""
            : String(existingGross),
        transportAllowance:
          existingTransport === null || existingTransport === undefined
            ? ""
            : String(existingTransport),
        telephoneAllowance:
          existingTelephone === null || existingTelephone === undefined
            ? ""
            : String(existingTelephone),
        posAllowance:
          existingPos === null || existingPos === undefined
            ? ""
            : String(existingPos),
      });
    } catch {}
  }, [employee]);

  useEffect(() => {
    if (setupType === "location" || setupType === "salary") {
      fetchWorkLocations();
      if (employee?._id) {
        fetchEmployeeWorkLocations();
      }
    } else if (setupType === "documents") {
      if (employee?._id) {
        fetchEmployeeDocuments();
      }
    }
  }, [setupType, employee?._id]);

  const fetchWorkLocations = async () => {
    try {
      const response = await fetch("/api/work-locations");
      const data = await response.json();
      if (data.success) {
        setWorkLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Error fetching work locations:", error);
    }
  };

  const fetchEmployeeWorkLocations = async () => {
    try {
      const response = await fetch(
        `/api/employee/${employee._id}/work-location`
      );
      const data = await response.json();
      if (data.success && data.workLocations) {
        const locations = data.workLocations || [];
        setEmployeeWorkLocations(locations);
        setSelectedWorkLocations((prev) => {
          if (prev.length === 0) {
            return locations
              .map((loc) => {
                const id = loc._id || loc.id;
                return id ? String(id) : null;
              })
              .filter(Boolean);
          }
          return prev;
        });
      } else {
        setEmployeeWorkLocations([]);
      }
    } catch (error) {
      console.error("Error fetching employee work locations:", error);
      setEmployeeWorkLocations([]);
    }
  };

  const fetchEmployeeDocuments = async () => {
    try {
      setFetchingDocs(true);
      const res = await fetch(`/api/documents?employeeId=${employee._id}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching documents:", e);
    } finally {
      setFetchingDocs(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      onError("Please fill in all password fields");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      onError("Passwords do not match");
      return;
    }

    if (passwordForm.password.length < 6) {
      onError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/employee/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee._id,
          password: passwordForm.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess("Password setup successfully!");
        setPasswordForm({ password: "", confirmPassword: "" });
      } else {
        onError(data.error || "Failed to setup password");
      }
    } catch (error) {
      console.error("Error setting up password:", error);
      onError("Failed to setup password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (selectedWorkLocations.length === 0) {
      onError("Please select at least one work location");
      return;
    }

    setLoading(true);
    try {
      const assignmentPromises = selectedWorkLocations.map((locationId) =>
        fetch(`/api/work-locations/${locationId}/assign-employees`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [employee._id] }),
        })
      );

      const responses = await Promise.all(assignmentPromises);
      const results = await Promise.all(responses.map((res) => res.json()));

      const failedAssignments = results.filter((result) => !result.success);

      if (failedAssignments.length > 0) {
        onError(
          `Failed to assign ${failedAssignments.length} location(s). Please try again.`
        );
        return;
      }

      onSuccess(
        `${selectedWorkLocations.length} work location(s) assigned successfully!`
      );
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error assigning work locations:", error);
      onError("Failed to assign work locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalarySubmit = async () => {
    const gross = Number(salaryForm.grossSalary);
    const transport = Number(salaryForm.transportAllowance);
    const telephone = Number(
      salaryForm.telephoneAllowance === ""
        ? 0
        : salaryForm.telephoneAllowance
    );
    const pos = Number(
      salaryForm.posAllowance === "" ? 0 : salaryForm.posAllowance
    );

    if (Number.isNaN(gross) || gross <= 0) {
      onError("Please enter a valid gross salary");
      return;
    }

    if (Number.isNaN(transport) || transport < 0) {
      onError("Please enter a valid transport allowance");
      return;
    }

    if (Number.isNaN(telephone) || telephone < 0) {
      onError("Please enter a valid telephone allowance");
      return;
    }

    if (Number.isNaN(pos) || pos < 0) {
      onError("Please enter a valid POS allowance");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/employee/${employee._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grossSalary: gross,
          transportAllowance: transport,
          telephoneAllowance: telephone,
          posAllowance: pos,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        onError(data.error || "Failed to save salary settings");
        return;
      }
      onSuccess("Salary settings saved successfully!");
    } catch (error) {
      console.error("Error saving salary settings:", error);
      onError("Failed to save salary settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocData.file) {
      onError("Please select a document file to upload");
      return;
    }

    setIsUploadingDoc(true);
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

      onSuccess("Document uploaded successfully!");
      setNewDocData({
        category: "Employment Contract",
        title: "",
        description: "",
        expiryDate: "",
        file: null,
      });
      setShowUploadForm(false);
      if (uploadDocInputRef.current) uploadDocInputRef.current.value = "";
      await fetchEmployeeDocuments();
    } catch (e) {
      console.error("Document upload error:", e);
      onError(e.message || "Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const toggleWorkLocation = (locationId) => {
    setSelectedWorkLocations((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleRemoveLocation = async (locationId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/work-locations/${locationId}/assign-employees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds: [employee._id] }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        onError(result.error || "Failed to remove work location");
        return;
      }

      onSuccess("Work location removed successfully!");
      await fetchEmployeeWorkLocations();
    } catch (error) {
      console.error("Error removing location:", error);
      onError("Failed to remove work location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = () => {
    return employee.personalDetails?.name || employee.name || "Employee";
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

  const totalMonthlyCompensation =
    (Number(salaryForm.grossSalary) || 0) +
    (Number(salaryForm.transportAllowance) || 0) +
    (Number(salaryForm.telephoneAllowance) || 0) +
    (Number(salaryForm.posAllowance) || 0);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center text-indigo-300">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white leading-tight">
                  Employee Setup: {getEmployeeName()}
                </h3>
                <p className="text-slate-300 text-xs mt-0.5 flex items-center gap-2">
                  <span>ID: {employee.employeeId || employee.personalDetails?.employeeId || "N/A"}</span>
                  <span>•</span>
                  <span>{employee.department || employee.personalDetails?.department || "General"}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-slate-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex-shrink-0">
          <div className="flex space-x-2 py-2 overflow-x-auto">
            <button
              onClick={() => setSetupType("password")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                setupType === "password"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Password & Access</span>
            </button>

            <button
              onClick={() => setSetupType("location")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                setupType === "location"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Work Locations</span>
            </button>

            <button
              onClick={() => setSetupType("salary")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                setupType === "salary"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Salary & Allowances</span>
            </button>

            <button
              onClick={() => setSetupType("documents")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                setupType === "documents"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documents & Compliance</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/40">
          {setupType === "password" ? (
            <div className="space-y-5">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-950">
                    Employee Portal Access Setup
                  </p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Set or reset credentials for {getEmployeeName()} to sign in to the self-service mobile & web portal.
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        password: e.target.value,
                      })
                    }
                    placeholder="Enter password (min. 6 characters)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={loading || !passwordForm.password}
                    onClick={handlePasswordSubmit}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Save New Password
                  </button>
                </div>
              </div>
            </div>
          ) : setupType === "location" ? (
            <div className="space-y-5">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-950">
                    Geofenced Work Site Assignments
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Select the work locations where this employee is authorized to clock-in and record GPS attendance.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Available Work Locations ({workLocations.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {workLocations.map((loc) => {
                    const locId = loc._id || loc.id;
                    const isSelected = selectedWorkLocations.includes(locId);

                    return (
                      <div
                        key={locId}
                        onClick={() => toggleWorkLocation(locId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {loc.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {loc.address || "No address specified"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {loc.radius || 100}m
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={loading || selectedWorkLocations.length === 0}
                    onClick={handleLocationSubmit}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Save Location Assignments ({selectedWorkLocations.length})
                  </button>
                </div>
              </div>
            </div>
          ) : setupType === "salary" ? (
            <div className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-950">
                    Compensation & Payroll Rates
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Configure base gross salary, transport, telephone, and position allowances in ETB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gross Salary (ETB) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.grossSalary}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        grossSalary: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold text-slate-900 bg-white shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Transport Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.transportAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        transportAllowance: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Telephone Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.telephoneAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        telephoneAllowance: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    POS Allowance (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salaryForm.posAllowance}
                    onChange={(e) =>
                      setSalaryForm({
                        ...salaryForm,
                        posAllowance: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-slate-900 bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* Total Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs text-slate-400 font-medium">
                    Total Estimated Monthly Gross:
                  </span>
                  <p className="text-lg font-bold text-emerald-400">
                    {totalMonthlyCompensation.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    ETB
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading || !salaryForm.grossSalary}
                  onClick={handleSalarySubmit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Salary Settings
                </button>
              </div>
            </div>
          ) : (
            /* Documents & Compliance Tab */
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Employee Documents & Verification
                  </h4>
                  <p className="text-xs text-slate-500">
                    Inspect uploaded ID documents, credentials, contracts, and upload compliance files.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showUploadForm ? "Close Form" : "Upload Document"}
                </button>
              </div>

              {/* Upload Document Sub-form */}
              {showUploadForm && (
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-in fade-in slide-in-from-top-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newDocData.category}
                        onChange={(e) =>
                          setNewDocData({ ...newDocData, category: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
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
                        placeholder="e.g. 2026 Contract"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
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
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      ref={uploadDocInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.xls"
                      className="w-full sm:flex-1 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                      onChange={(e) =>
                        setNewDocData({ ...newDocData, file: e.target.files?.[0] || null })
                      }
                    />
                    <button
                      type="button"
                      disabled={!newDocData.file || isUploadingDoc}
                      onClick={handleUploadDocument}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      {isUploadingDoc ? "Uploading..." : "Upload & Attach"}
                    </button>
                  </div>
                </div>
              )}

              {/* Document List */}
              {fetchingDocs ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No documents uploaded for this employee
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload employee identification and contracts using the button above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
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
                        className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-2 hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                            {isPdf ? (
                              <FileText className="w-4 h-4 text-rose-500" />
                            ) : isImage ? (
                              <ImageIcon className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <FileCheck className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {doc.title || doc.originalName || "Document"}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {doc.documentType || doc.type || "Document"} • {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingDoc(doc)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 text-xs font-semibold"
                            title="See in Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/api/documents/${docId}/download`}
                            download={doc.originalName || "document"}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Detail Viewer Modal */}
      {viewingDoc && (
        <DocumentDetailViewerModal
          isOpen={!!viewingDoc}
          document={viewingDoc}
          employeeName={getEmployeeName()}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
