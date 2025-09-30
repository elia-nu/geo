"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

export default function WorkLocationsManagement() {
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
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

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/work-locations");
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
      const response = await fetch("/api/employee");
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

  const handleDeleteLocation = async (locationId) => {
    if (!confirm("Are you sure you want to delete this work location?")) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/work-locations/${locationId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to delete location", "error");
        return;
      }

      showMessage("Work location deleted successfully!", "success");
      fetchLocations();
    } catch (error) {
      console.error("Error deleting location:", error);
      showMessage("Failed to delete location", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignEmployees = async (e) => {
    e.preventDefault();

    if (!selectedLocation || assignForm.employeeIds.length === 0) {
      showMessage("Please select employees to assign", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/work-locations/${selectedLocation._id}/assign-employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(assignForm),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        showMessage(result.error || "Failed to assign employees", "error");
        return;
      }

      showMessage(result.message, "success");
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
    setSelectedLocation(location);
    setLocationForm({
      name: location.name,
      address: location.address || "",
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: location.radius.toString(),
      description: location.description || "",
    });
    setShowEditModal(true);
  };

  const openAssignModal = (location) => {
    setSelectedLocation(location);
    setAssignForm({ employeeIds: [] });
    setShowAssignModal(true);
  };

  const filteredLocations = locations.filter(
    (location) =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Work Location Management
            </h1>
            <p className="text-gray-600">
              Create and manage work locations, assign employees to multiple
              locations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No work locations found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "No locations match your search criteria."
              : "Get started by creating your first work location."}
          </p>
          {!searchTerm && (
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
            <div key={location._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {location.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openAssignModal(location)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Assign Employees"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(location)}
                    className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                    title="Edit Location"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(location._id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete Location"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                    Created: {new Date(location.createdAt).toLocaleDateString()}
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
            <h2 className="text-xl font-semibold mb-4">Create Work Location</h2>
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              Assign Employees to {selectedLocation.name}
            </h2>
            <form onSubmit={handleAssignEmployees} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Employees
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {employees.map((employee) => (
                    <label
                      key={employee._id}
                      className="flex items-center space-x-2 py-1"
                    >
                      <input
                        type="checkbox"
                        value={employee._id}
                        checked={assignForm.employeeIds.includes(employee._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignForm((prev) => ({
                              ...prev,
                              employeeIds: [...prev.employeeIds, employee._id],
                            }));
                          } else {
                            setAssignForm((prev) => ({
                              ...prev,
                              employeeIds: prev.employeeIds.filter(
                                (id) => id !== employee._id
                              ),
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {employee.personalDetails?.name ||
                          employee.name ||
                          "Unknown"}{" "}
                        -{" "}
                        {employee.personalDetails?.employeeId ||
                          employee.employeeId ||
                          "No ID"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || assignForm.employeeIds.length === 0}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Assign"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
