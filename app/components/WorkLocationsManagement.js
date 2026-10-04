"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  X,
  RefreshCw,
  Radio,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { toast } from "./ui/toast";
import { usePermissions } from "../hooks/usePermissions";

export default function WorkLocationsManagement() {
  const { hasPermission } = usePermissions();
  const canRead = hasPermission("location.read") || hasPermission("location.manage");
  const canCreate = hasPermission("location.create") || hasPermission("location.manage");
  const canUpdate = hasPermission("location.update") || hasPermission("location.manage");
  const canDelete = hasPermission("location.delete") || hasPermission("location.manage");
  const canAssign = hasPermission("location.assign") || hasPermission("location.manage");

  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "100",
    description: "",
  });

  const [assignForm, setAssignForm] = useState({
    employeeIds: [],
  });

  // Normalize potentially varying ID shapes to a comparable string
  const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value.$oid) return String(value.$oid);
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
      if (typeof value.toString === "function") return String(value.toString());
    }
    return String(value);
  };

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? (localStorage.getItem("authToken") || localStorage.getItem("employeeToken")) : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (canRead) {
      fetchLocations();
      fetchEmployees();
    }
  }, [canRead]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/work-locations", {
        headers: { ...getAuthHeaders() },
      });
      const result = await response.json();

      if (result.success) {
        setLocations(result.locations || []);
      } else {
        showMessage(result.error || "Failed to load locations", "error");
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      showMessage("Failed to load locations", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee", {
        headers: { ...getAuthHeaders() },
      });
      const result = await response.json();

      if (result.success) {
        setEmployees(result.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const showMessage = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    if (type === "success") toast.success(msg);
    else if (type === "error") toast.error(msg);
    else if (type === "warning") toast.warning(msg);
    else toast.info(msg);
    setTimeout(() => {
      setMessage("");
    }, 5000);
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();

    if (
      !locationForm.name ||
      !locationForm.latitude ||
      !locationForm.longitude
    ) {
      showMessage("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/work-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(locationForm),
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to create location", "error");
        return;
      }

      showMessage("Work location created successfully!", "success");
      setShowCreateModal(false);
      setLocationForm({
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        radius: "100",
        description: "",
      });
      fetchLocations();
    } catch (error) {
      console.error("Error creating location:", error);
      showMessage("Failed to create location", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();

    if (!selectedLocation) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${selectedLocation._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(locationForm),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to update location", "error");
        return;
      }

      showMessage("Work location updated successfully!", "success");
      setShowEditModal(false);
      setSelectedLocation(null);
      fetchLocations();
    } catch (error) {
      console.error("Error updating location:", error);
      showMessage("Failed to update location", "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (location) => {
    setLocationToDelete(location);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setLocationToDelete(null);
    setDeleteLoading(false);
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete?._id) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${locationToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to delete location", "error");
        return;
      }

      showMessage("Work location deleted successfully!", "success");
      closeDeleteModal();
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      showMessage("Failed to delete location", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignEmployees = async (e) => {
    e.preventDefault();

    if (!selectedLocation) {
      showMessage("Please select a location", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${selectedLocation._id}/assign-employees`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(assignForm),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to assign employees", "error");
        return;
      }

      showMessage(
        result.message || "Work location assignments updated successfully!",
        "success"
      );
      setShowAssignModal(false);
      setSelectedLocation(null);
      setAssignForm({ employeeIds: [] });
      fetchLocations();
    } catch (error) {
      console.error("Error assigning employees:", error);
      showMessage("Failed to assign employees", "error");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (location) => {
    if (!location) return;
    setSelectedLocation(location);
    setLocationForm({
      name: location.name || location.siteName || "",
      address: location.address || "",
      latitude: location.latitude != null ? location.latitude.toString() : "",
      longitude: location.longitude != null ? location.longitude.toString() : "",
      radius: location.radius != null ? location.radius.toString() : "500",
      description: location.description || "",
    });
    setShowEditModal(true);
  };

  const openAssignModal = async (location) => {
    setSelectedLocation(location);
    setAssignForm({ employeeIds: [] });
    setAssignSearchTerm("");
    setShowAssignModal(true);

    // Preselect employees assigned to this location
    try {
      let preselectedIds = [];

      // Try to fetch freshest location with assigned employees
      try {
        const res = await fetch(
          `/api/work-locations/${normalizeId(location._id)}`,
          {
            headers: { ...getAuthHeaders() },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const loc = data?.location || data;
          if (loc && Array.isArray(loc.assignedEmployees)) {
            // assignedEmployees may be employee docs (from $lookup) or raw ids
            preselectedIds = loc.assignedEmployees.map((item) => {
              if (item && typeof item === "object") {
                return normalizeId(item._id || item.id || item.$oid || item);
              }
              return normalizeId(item);
            });
          }
        }
      } catch {}

      // Fallback: infer from employee.workLocations
      if (preselectedIds.length === 0) {
        const locationId = normalizeId(location._id);
        preselectedIds = employees
          .filter((emp) => {
            const raw = emp.workLocations || emp.workLocation || [];
            const list = Array.isArray(raw) ? raw : [raw];
            return list.some((locId) => normalizeId(locId) === locationId);
          })
          .map((emp) => normalizeId(emp._id));
      }

      setAssignForm({
        employeeIds: Array.from(new Set(preselectedIds.filter(Boolean))).map(
          String
        ),
      });
    } catch {
      // Ignore errors, keep empty selection
    }
  };

  const filteredAssignEmployees = useMemo(() => {
    if (!assignSearchTerm.trim()) return employees;
    const term = assignSearchTerm.toLowerCase().trim();
    return employees.filter((emp) => {
      const name = String(
        emp.personalDetails?.name || emp.name || emp.personalDetails?.fullName || ""
      ).toLowerCase();
      const empId = String(
        emp.personalDetails?.employeeId || emp.employeeId || ""
      ).toLowerCase();
      const email = String(
        emp.personalDetails?.email || emp.email || ""
      ).toLowerCase();
      const dept = String(
        emp.department || emp.personalDetails?.department || ""
      ).toLowerCase();
      return (
        name.includes(term) ||
        empId.includes(term) ||
        email.includes(term) ||
        dept.includes(term)
      );
    });
  }, [employees, assignSearchTerm]);

  const filteredLocations = locations.filter((location) => {
    if (!location) return false;
    const name = String(location.name || location.siteName || "").toLowerCase();
    const address = String(location.address || "").toLowerCase();
    const term = String(searchTerm || "").toLowerCase().trim();
    if (!term) return true;
    return name.includes(term) || address.includes(term);
  });

  const totalPages = Math.ceil((filteredLocations.length || 0) / itemsPerPage) || 1;
  const paginatedLocations = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLocations.slice(start, start + itemsPerPage);
  }, [filteredLocations, currentPage, itemsPerPage]);

  if (!canRead) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
        <p className="text-sm text-slate-500 mb-4">
          You do not have permission to view work locations. Contact your administrator to request{" "}
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
            location.read
          </code>{" "}
          permission.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-xl text-white">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-purple-500/10 rounded-full blur-xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-indigo-300" />
              </div>
              <h2 className="text-2xl font-bold text-white">Work Location Management</h2>
            </div>
            <p className="text-indigo-100/80 text-sm">
              Define geofenced job sites, configure GPS boundaries, and assign personnel.
            </p>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap gap-2.5 mt-4">
              <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                {locations.length} Total Locations
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                {locations.filter((l) => (l.status || "active") === "active").length} Active Sites
              </div>
              {filteredLocations.length !== locations.length && (
                <div className="px-3 py-1.5 bg-white/10 rounded-xl text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  {filteredLocations.length} Matching Search
                </div>
              )}
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 self-start lg:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Work Location</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Feedback */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm border shadow-sm ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {messageType === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{message}</span>
          </div>
          <button
            onClick={() => setMessage("")}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 bg-white rounded-lg border border-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by site name, landmark, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            onClick={fetchLocations}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-400 text-sm">Loading work locations...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            {searchTerm ? "No matching work locations" : "No work locations configured"}
          </h3>
          <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
            {searchTerm
              ? "Try adjusting your search keywords."
              : "Get started by registering your company's primary office or construction sites."}
          </p>
          {!searchTerm && canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Create First Location
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedLocations.map((location) => (
              <div
                key={location._id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon + Name + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">
                          {location.name || location.siteName || "Unnamed Location"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            (location.status || "active") === "active"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              (location.status || "active") === "active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {(location.status || "active").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canAssign && (
                        <button
                          onClick={() => openAssignModal(location)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Assign Employees"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() => openEditModal(location)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Location"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => openDeleteModal(location)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 py-3 border-y border-slate-50 text-xs text-slate-600">
                    {location.address && (
                      <p className="line-clamp-2">
                        <strong className="text-slate-800">Address:</strong> {location.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">GPS Coordinates:</span>
                      <span className="font-mono text-slate-800 font-medium bg-slate-50 px-2 py-0.5 rounded-md text-[11px]">
                        {typeof location.latitude === "number"
                          ? location.latitude.toFixed(4)
                          : String(location.latitude || "N/A")}
                        ,{" "}
                        {typeof location.longitude === "number"
                          ? location.longitude.toFixed(4)
                          : String(location.longitude || "N/A")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Geofence Radius:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                        <Radio className="w-3 h-3" />
                        {typeof location.radius === "number"
                          ? `${location.radius}m`
                          : String(location.radius || "100m")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{location.employeeCount || (location.assignedEmployees?.length || 0)} Assigned</span>
                  </span>
                  {canAssign && (
                    <button
                      onClick={() => openAssignModal(location)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Manage Team →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLocations.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(sz) => {
                setItemsPerPage(sz);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                    <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Create Work Location</h3>
                    <p className="text-blue-100 text-sm">
                      Define a geofence and optional details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all ring-1 ring-white/30"
                >
                  <X className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              </div>
            </div>
            <form
              onSubmit={handleCreateLocation}
              className="p-6 overflow-y-auto flex-1 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  placeholder="e.g., Main Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  placeholder="Full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.latitude}
                    onChange={(e) =>
                      setLocationForm((prev) => ({
                        ...prev,
                        latitude: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                    placeholder="e.g., 40.7128"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.longitude}
                    onChange={(e) =>
                      setLocationForm((prev) => ({
                        ...prev,
                        longitude: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                    placeholder="e.g., -74.0060"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  value={locationForm.radius}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      radius: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Description
                </label>
                <textarea
                  value={locationForm.description}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  placeholder="Optional description"
                  rows="3"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-100 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && selectedLocation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                    <MapPin className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Edit Work Location</h3>
                    <p className="text-blue-100 text-sm">
                      Update details or geofence settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all ring-1 ring-white/30"
                >
                  <X className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              </div>
            </div>
            <form
              onSubmit={handleEditLocation}
              className="p-6 overflow-y-auto flex-1 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.latitude}
                    onChange={(e) =>
                      setLocationForm((prev) => ({
                        ...prev,
                        latitude: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={locationForm.longitude}
                    onChange={(e) =>
                      setLocationForm((prev) => ({
                        ...prev,
                        longitude: e.target.value,
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  value={locationForm.radius}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      radius: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Description
                </label>
                <textarea
                  value={locationForm.description}
                  onChange={(e) =>
                    setLocationForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black placeholder-gray-500"
                  rows="3"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-100 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-medium shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {showAssignModal && selectedLocation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                    <Users className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Assign Employees</h3>
                    <p className="text-blue-100 text-sm">
                      Select employees to assign to {selectedLocation.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all ring-1 ring-white/30"
                >
                  <X className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              </div>
            </div>
            <form
              onSubmit={handleAssignEmployees}
              className="p-6 overflow-y-auto flex-1 space-y-4"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Select Employees
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {assignForm.employeeIds.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = filteredAssignEmployees.map((e) =>
                          normalizeId(e._id)
                        );
                        setAssignForm((prev) => ({
                          ...prev,
                          employeeIds: Array.from(
                            new Set([...prev.employeeIds, ...filteredIds])
                          ),
                        }));
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIdsSet = new Set(
                          filteredAssignEmployees.map((e) => normalizeId(e._id))
                        );
                        setAssignForm((prev) => ({
                          ...prev,
                          employeeIds: prev.employeeIds.filter(
                            (id) => !filteredIdsSet.has(id)
                          ),
                        }));
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={assignSearchTerm}
                    onChange={(e) => setAssignSearchTerm(e.target.value)}
                    placeholder="Search employees by name, ID, department, or email..."
                    className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {assignSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setAssignSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Employee List */}
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl p-2 space-y-1.5 bg-slate-50/50">
                  {filteredAssignEmployees.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        No employees found
                      </p>
                      {assignSearchTerm && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No results matching "{assignSearchTerm}"
                        </p>
                      )}
                    </div>
                  ) : (
                    filteredAssignEmployees.map((employee) => {
                      const empIdNorm = normalizeId(employee._id);
                      const isChecked = assignForm.employeeIds.includes(empIdNorm);
                      const empName =
                        employee.personalDetails?.name ||
                        employee.name ||
                        employee.personalDetails?.fullName ||
                        "Unknown";
                      const empCode =
                        employee.personalDetails?.employeeId ||
                        employee.employeeId;
                      const empDept =
                        employee.department ||
                        employee.personalDetails?.department;
                      const empEmail =
                        employee.personalDetails?.email || employee.email;

                      return (
                        <label
                          key={employee._id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-indigo-50/80 border-indigo-200 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={empIdNorm}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAssignForm((prev) => ({
                                  ...prev,
                                  employeeIds: [
                                    ...prev.employeeIds,
                                    empIdNorm,
                                  ],
                                }));
                              } else {
                                setAssignForm((prev) => ({
                                  ...prev,
                                  employeeIds: prev.employeeIds.filter(
                                    (id) => id !== empIdNorm
                                  ),
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />

                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {empName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {empName}
                              </span>
                              {empCode && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  {empCode}
                                </span>
                              )}
                              {empDept && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded">
                                  {empDept}
                                </span>
                              )}
                            </div>
                            {empEmail && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {empEmail}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-100 transition-all font-medium text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all font-semibold shadow-lg text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    `Save Assignments (${assignForm.employeeIds.length})`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Work Station / Location Modal */}
      {showDeleteModal && locationToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) closeDeleteModal();
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 animate-scaleUp">
            {/* Red Accent Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-sm border border-rose-200">
                  <Trash2 className="w-6 h-6" />
                </div>
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all border border-slate-200 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete Work Station / Location
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to permanently delete this work location?
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Location Card Snapshot */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
                    {locationToDelete.name || locationToDelete.siteName || "Unnamed Location"}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    {locationToDelete.radius || 100}m radius
                  </span>
                </div>
                {locationToDelete.address && (
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{locationToDelete.address}</span>
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                  <span>GPS Coordinates:</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {typeof locationToDelete.latitude === "number"
                      ? locationToDelete.latitude.toFixed(4)
                      : locationToDelete.latitude || "N/A"}
                    ,{" "}
                    {typeof locationToDelete.longitude === "number"
                      ? locationToDelete.longitude.toFixed(4)
                      : locationToDelete.longitude || "N/A"}
                  </span>
                </div>
              </div>

              {/* Assigned Employees Check */}
              {(locationToDelete.employeeCount > 0 ||
                (locationToDelete.assignedEmployees && locationToDelete.assignedEmployees.length > 0)) ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Assigned Personnel Detected</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    This location currently has{" "}
                    <strong>
                      {locationToDelete.employeeCount ||
                        locationToDelete.assignedEmployees.length}
                    </strong>{" "}
                    assigned employee(s). The system requires reassigning or removing employees before this location can be deleted.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const loc = locationToDelete;
                      closeDeleteModal();
                      openAssignModal(loc);
                    }}
                    className="mt-1 text-xs font-bold text-amber-900 underline hover:text-amber-950 inline-flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Manage & Reassign Employees
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No active employees assigned. Ready for deletion.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteLocation}
                  disabled={
                    deleteLoading ||
                    locationToDelete.employeeCount > 0 ||
                    (locationToDelete.assignedEmployees &&
                      locationToDelete.assignedEmployees.length > 0)
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Location
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
