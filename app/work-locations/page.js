"use client";

import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { usePermissions } from "../hooks/usePermissions";
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
  Radio,
} from "lucide-react";

export default function WorkLocationsPage() {
  const { hasPermission } = usePermissions();
  const canRead = hasPermission("location.read") || hasPermission("location.manage");
  const canCreate = hasPermission("location.create") || hasPermission("location.manage");
  const canUpdate = hasPermission("location.update") || hasPermission("location.manage");
  const canDelete = hasPermission("location.delete") || hasPermission("location.manage");
  const canAssign = hasPermission("location.assign") || hasPermission("location.manage");

  const [activeSection, setActiveSection] = useState("work-locations");

  const handleSectionChange = (section) => {
    // For standalone pages, we need to handle navigation to HRM dashboard sections
    if (section === "dashboard") {
      window.location.href = "/hrm";
    } else if (section === "employees" || section === "employee-database") {
      window.location.href = "/hrm?section=employee-database";
    } else if (section === "employee-add") {
      window.location.href = "/hrm?section=employee-add";
    } else if (section === "documents" || section === "document-list") {
      window.location.href = "/hrm?section=document-list";
    } else if (section === "notifications") {
      window.location.href = "/hrm?section=notifications";
    } else if (section === "calendar") {
      window.location.href = "/hrm?section=calendar";
    } else if (section === "settings") {
      window.location.href = "/hrm?section=settings";
    } else {
      // For other sections, navigate to HRM dashboard
      window.location.href = "/hrm";
    }
  };

  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
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
  const [forceDelete, setForceDelete] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "500",
    description: "",
  });

  const [assignForm, setAssignForm] = useState({
    employeeIds: [],
  });

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
        radius: "500",
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
    setForceDelete(false);
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete?._id) return;

    setDeleteLoading(true);

    try {
      const url = `/api/work-locations/${locationToDelete._id}${
        forceDelete ? "?force=true" : ""
      }`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
        },
      });

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

  const openAssignModal = (location) => {
    setSelectedLocation(location);
    const existingIds = (location.assignedEmployees || [])
      .map((emp) =>
        typeof emp === "object" && emp !== null
          ? String(emp._id || emp.id)
          : String(emp)
      )
      .filter(Boolean);
    setAssignForm({ employeeIds: existingIds });
    setAssignSearchTerm("");
    setShowAssignModal(true);
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

  return (
    <Layout activeSection={activeSection} onSectionChange={handleSectionChange}>
      {!canRead ? (
        <div className="bg-white rounded-lg shadow p-12 text-center max-w-lg mx-auto my-12">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-black mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4 text-sm">
            You do not have permission to view work locations. Contact your administrator to request{" "}
            <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
              location.read
            </code>{" "}
            permission.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black mb-2">
                  Work Location Management
                </h1>
                <p className="text-gray-600">
                  Create and manage work locations, assign employees to multiple
                  locations
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Location</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-lg flex items-center space-x-2 ${
                messageType === "success"
                  ? "bg-green-100 text-green-700"
                  : messageType === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {messageType === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={fetchLocations}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Locations Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">
                No work locations found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No locations match your search criteria."
                  : "Get started by creating your first work location."}
              </p>
              {!searchTerm && canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create First Location
                </button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.map((location) => (
                <div
                  key={location._id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-black">
                        {location.name || location.siteName || "Unnamed Location"}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canAssign && (
                        <button
                          onClick={() => openAssignModal(location)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Assign Employees"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() => openEditModal(location)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          title="Edit Location"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => openDeleteModal(location)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete Location"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {location.address && (
                    <p>
                      <strong>Address:</strong> {location.address}
                    </p>
                  )}
                  <p>
                    <strong>Coordinates:</strong>{" "}
                    {typeof location.latitude === "number"
                      ? location.latitude.toFixed(6)
                      : String(location.latitude || "N/A")}
                    ,{" "}
                    {typeof location.longitude === "number"
                      ? location.longitude.toFixed(6)
                      : String(location.longitude || "N/A")}
                  </p>
                  <p>
                    <strong>Radius:</strong>{" "}
                    {typeof location.radius === "number"
                      ? `${location.radius}m`
                      : String(location.radius || "N/A")}
                  </p>
                  <p>
                    <strong>Employees:</strong> {location.employeeCount || 0}{" "}
                    assigned
                  </p>
                  {location.description && (
                    <p>
                      <strong>Description:</strong> {location.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Created:{" "}
                      {new Date(location.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        location.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {location.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Location Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            style={{ zIndex: 9999 }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                Create Work Location
              </h2>
              <form onSubmit={handleCreateLocation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Main Office"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 40.7128"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., -74.0060"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description"
                    rows="3"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Create"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Location Modal */}
        {showEditModal && selectedLocation && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            style={{ zIndex: 9999 }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Edit Work Location</h2>
              <form onSubmit={handleEditLocation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Update"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Employees Modal */}
        {showAssignModal && selectedLocation && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
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
                        Select employees to assign to {selectedLocation.name || selectedLocation.siteName}
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
                            String(e._id)
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
                            filteredAssignEmployees.map((e) => String(e._id))
                          );
                          setAssignForm((prev) => ({
                            ...prev,
                            employeeIds: prev.employeeIds.filter(
                              (id) => !filteredIdsSet.has(String(id))
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
                        const empIdStr = String(employee._id);
                        const isChecked = assignForm.employeeIds.includes(empIdStr);
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
                              value={empIdStr}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAssignForm((prev) => ({
                                    ...prev,
                                    employeeIds: [
                                      ...prev.employeeIds,
                                      empIdStr,
                                    ],
                                  }));
                                } else {
                                  setAssignForm((prev) => ({
                                    ...prev,
                                    employeeIds: prev.employeeIds.filter(
                                      (id) => String(id) !== empIdStr
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
                {locationToDelete.employeeCount > 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Assigned Personnel Detected</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      This location currently has{" "}
                      <strong>{locationToDelete.employeeCount}</strong>{" "}
                      assigned employee(s). You can manage them below or force unassign all employees to proceed with deletion.
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const loc = locationToDelete;
                          closeDeleteModal();
                          openAssignModal(loc);
                        }}
                        className="text-xs font-bold text-amber-900 underline hover:text-amber-950 inline-flex items-center gap-1"
                      >
                        <Users className="w-3.5 h-3.5" /> Reassign Employees
                      </button>
                    </div>
                    <label className="flex items-start gap-2 pt-2 border-t border-amber-200/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forceDelete}
                        onChange={(e) => setForceDelete(e.target.checked)}
                        className="mt-0.5 rounded border-amber-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-[11px] font-medium text-amber-950">
                        Automatically unassign all employees and delete this location
                      </span>
                    </label>
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
                      (locationToDelete.employeeCount > 0 && !forceDelete)
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
      )}
    </Layout>
  );
}
