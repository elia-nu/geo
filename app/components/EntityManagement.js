"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const EntityManagement = ({ projectId, projectName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [activities, setActivities] = useState([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    projectId: projectId,
    priority: "medium",
    estimatedHours: "",
    startDate: "",
    endDate: "",
    status: "active",
    activityType: "development",
  });

  useEffect(() => {
    if (projectId) {
      fetchEntityData();
    }
  }, [projectId]);

  const fetchEntityData = async () => {
    try {
      setLoading(true);
      const activitiesRes = await fetch(`/api/activities?projectId=${projectId}`);
      const activitiesData = await activitiesRes.json();

      if (activitiesData.success) {
        setActivities(activitiesData.activities || []);
      }
    } catch (err) {
      setError("Error fetching activities data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        resetForm();
        fetchEntityData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create activity: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      projectId: projectId,
      priority: "medium",
      estimatedHours: "",
      startDate: "",
      endDate: "",
      status: "active",
      activityType: "development",
    });
    setEditingItem(null);
  };

  const getCurrentData = () => {
    return activities;
  };


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
              Activity Management
            </h2>
            <p className="text-sm text-slate-500 mt-1 truncate">
              Manage activities for {projectName}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-60"
          >
            <PlusIcon className="w-4 h-4" />
            Create Activity
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <h3 className="text-sm font-semibold text-slate-900">Activities</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {getCurrentData().length} total
          </p>
        </div>

        {getCurrentData().length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <CogIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              No activities found
            </p>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Create your first activity to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Create Activity
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Name",
                    "Description",
                    "Type",
                    "Priority",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {getCurrentData().map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {item.name || "Untitled"}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="text-sm text-slate-600 max-w-xs truncate">
                        {item.description || "No description"}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-700">
                      {item.activityType || "development"}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md ${
                          item.priority === "high"
                            ? "bg-rose-100 text-rose-800"
                            : item.priority === "medium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-md ${
                          item.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              name: item.name || "",
                              description: item.description || "",
                              projectId: projectId,
                              priority: item.priority || "medium",
                              estimatedHours: item.estimatedHours || "",
                              startDate: item.startDate
                                ? new Date(item.startDate)
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                              endDate: item.endDate
                                ? new Date(item.endDate)
                                    .toISOString()
                                    .split("T")[0]
                                : "",
                              status: item.status || "active",
                              activityType: item.activityType || "development",
                            });
                            setShowCreateModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            console.log("Delete", item._id);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                {editingItem ? "Edit" : "Create"} Activity
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter activity name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter activity description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      estimatedHours: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type
                </label>
                <select
                  value={formData.activityType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      activityType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="design">Design</option>
                  <option value="documentation">Documentation</option>
                  <option value="meeting">Meeting</option>
                  <option value="research">Research</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50/80">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={loading}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name || loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait"
              >
                {loading
                  ? editingItem
                    ? "Updating…"
                    : "Creating…"
                  : editingItem
                  ? "Update"
                  : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <p className="text-rose-700 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default EntityManagement;
