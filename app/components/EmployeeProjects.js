"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
} from "lucide-react";

export default function EmployeeProjects({ employeeId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, active, completed, overdue

  useEffect(() => {
    if (employeeId) {
      fetchProjects();
    }
  }, [employeeId, filter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("employeeToken");
      if (!token) {
        setError("Authentication required");
        return;
      }

      let url = `/api/projects?employeeId=${employeeId}`;
      if (filter !== "all") {
        url += `&status=${filter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      if (data.success) {
        setProjects(data.projects || []);
      } else {
        setError(data.error || "Failed to load projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
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
      case "on_hold":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const isOverdue = (endDate, status) => {
    if (status === "completed") return false;
    return new Date(endDate) < new Date();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredProjects = projects.filter((project) => {
    if (filter === "overdue") {
      return isOverdue(project.endDate, project.status);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">My Projects</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
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
          <h2 className="text-xl font-semibold text-black">My Projects</h2>
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
          <h2 className="text-2xl font-bold text-black">My Projects</h2>
          <p className="text-gray-600 mt-1">
            View and track your assigned projects
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredProjects.length} project
          {filteredProjects.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Projects" },
          { key: "in_progress", label: "Active" },
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

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">
            No projects found
          </h3>
          <p className="text-gray-500">
            {filter === "all"
              ? "You haven't been assigned to any projects yet."
              : `No ${filter} projects found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {project.description || "No description available"}
                  </p>
                </div>
                <div
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {getStatusIcon(project.status)}
                  <span className="ml-1 capitalize">
                    {project.status.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {formatDate(project.startDate)} -{" "}
                    {formatDate(project.endDate)}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>
                    {project.assignedEmployeeDetails?.length || 0} team member
                    {(project.assignedEmployeeDetails?.length || 0) !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Target className="w-4 h-4 mr-2" />
                  <span>
                    {project.milestones?.length || 0} milestone
                    {(project.milestones?.length || 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                {project.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    <span className="capitalize">{project.category}</span>
                  </div>
                )}
              </div>

              {/* Overdue Warning */}
              {isOverdue(project.endDate, project.status) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700 font-medium">
                      Project is overdue
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
