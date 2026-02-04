"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Users,
  Flag,
} from "lucide-react";

export default function EmployeeMilestones({ employeeId }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, in_progress, completed, overdue

  useEffect(() => {
    if (employeeId) {
      fetchMilestones();
    }
  }, [employeeId, filter]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // First get projects assigned to the employee
      const projectsResponse = await fetch(
        `/api/projects?employeeId=${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projectsData = await projectsResponse.json();
      if (!projectsData.success) {
        throw new Error(projectsData.error || "Failed to load projects");
      }

      // Extract milestones from all projects
      const allMilestones = [];
      projectsData.projects.forEach((project) => {
        if (project.milestones && project.milestones.length > 0) {
          project.milestones.forEach((milestone) => {
            allMilestones.push({
              ...milestone,
              projectId: project._id,
              projectName: project.name,
              projectStatus: project.status,
              projectProgress: project.progress || 0,
            });
          });
        }
      });

      setMilestones(allMilestones);
    } catch (err) {
      console.error("Error fetching milestones:", err);
      setError("Failed to load milestones");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "not_started":
        return "bg-gray-100 text-gray-800";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <TrendingUp className="w-4 h-4" />;
      case "not_started":
        return <Target className="w-4 h-4" />;
      case "on_hold":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const isOverdue = (dueDate, status) => {
    if (status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredMilestones = milestones.filter((milestone) => {
    if (filter === "overdue") {
      return isOverdue(milestone.dueDate, milestone.status);
    }
    if (filter === "all") return true;
    return milestone.status === filter;
  });

  // Sort milestones by due date
  const sortedMilestones = filteredMilestones.sort((a, b) => {
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">My Milestones</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">My Milestones</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">My Milestones</h2>
          <p className="text-gray-600 mt-1">
            Track project milestones you're involved in
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {sortedMilestones.length} milestone
          {sortedMilestones.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Milestones" },
          { key: "not_started", label: "Not Started" },
          { key: "in_progress", label: "In Progress" },
          { key: "completed", label: "Completed" },
          { key: "overdue", label: "Overdue" },
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterOption.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Milestones List */}
      {sortedMilestones.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">
            No milestones found
          </h3>
          <p className="text-gray-500">
            {filter === "all"
              ? "You don't have any milestones in your assigned projects."
              : `No ${filter} milestones found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMilestones.map((milestone) => (
            <div
              key={milestone._id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-1">
                    {milestone.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {milestone.description || "No description available"}
                  </p>
                  <div className="flex items-center text-sm text-blue-600">
                    <Target className="w-4 h-4 mr-1" />
                    <span className="font-medium">{milestone.projectName}</span>
                  </div>
                </div>
                <div
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    milestone.status
                  )}`}
                >
                  {getStatusIcon(milestone.status)}
                  <span className="ml-1 capitalize">
                    {milestone.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Milestone Progress</span>
                  <span>{milestone.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${milestone.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Project Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Project Progress</span>
                  <span>{milestone.projectProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${milestone.projectProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Milestone Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Due: {formatDate(milestone.dueDate)}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Created: {formatDateTime(milestone.createdAt)}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <Flag className="w-4 h-4 mr-2" />
                  <span className="capitalize">
                    Project: {milestone.projectStatus.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Overdue Warning */}
              {isOverdue(milestone.dueDate, milestone.status) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700 font-medium">
                      This milestone is overdue
                    </span>
                  </div>
                </div>
              )}

              {/* Upcoming Milestone */}
              {milestone.status === "not_started" &&
                new Date(milestone.dueDate) > new Date() &&
                new Date(milestone.dueDate) <=
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 text-blue-500 mr-2" />
                      <span className="text-sm text-blue-700 font-medium">
                        This milestone is due within 7 days
                      </span>
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
