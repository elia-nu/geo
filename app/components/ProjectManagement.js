"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Progress } from "./ui/progress";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
  FileText,
  Tag,
  User,
  TrendingUp,
  Activity,
  Save,
  X,
  MessageSquare,
  MoreVertical,
  Copy,
  Archive,
  Play,
  Pause,
} from "lucide-react";

export default function ProjectManagement() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category", categoryFilter);
      if (priorityFilter) params.append("priority", priorityFilter);

      const response = await fetch(`/api/projects?${params}`);
      const result = await (async () => {
        try {
          return await response.clone().json();
        } catch {
          return { success: false, error: await response.text() };
        }
      })();

      if (result.success) {
        setProjects(result.data);
        setTotalPages(result.pagination.pages);
      } else {
        console.error("Failed to fetch projects:", result.error);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employee");
      const result = await response.json();

      if (result.success) {
        const employeeList = result.employees || [];
        setEmployees(employeeList);

        // Filter managers (employees with manager role or designation)
        const managerList = employeeList.filter(
          (emp) =>
            emp.designation?.toLowerCase().includes("manager") ||
            emp.designation?.toLowerCase().includes("lead") ||
            emp.designation?.toLowerCase().includes("director") ||
            emp.role === "manager"
        );
        setManagers(managerList);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        fetchProjects();
      } else {
        alert("Failed to delete project: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      "on-hold": "bg-yellow-100 text-yellow-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Project Management
          </h1>
          <p className="text-gray-600 mt-1">
            Create, manage, and track your projects
          </p>
        </div>
        <Button onClick={() => router.push("/project-add")}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split("-");
              setSortBy(field);
              setSortOrder(order);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="endDate-asc">End Date (Earliest)</SelectItem>
              <SelectItem value="endDate-desc">End Date (Latest)</SelectItem>
              <SelectItem value="progress-desc">
                Progress (High to Low)
              </SelectItem>
              <SelectItem value="progress-asc">
                Progress (Low to High)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const daysRemaining = calculateDaysRemaining(project.endDate);
          const isOverdue = daysRemaining < 0 && project.status !== "completed";

          return (
            <Card
              key={project._id}
              className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 hover:border-l-blue-600"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {project.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setShowViewDialog(true);
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/project-edit/${project._id}`)
                      }
                      className="h-8 w-8 p-0 hover:bg-green-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProject(project._id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Status and Priority */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getStatusColor(
                        project.status
                      )} font-medium`}
                    >
                      {project.status}
                    </Badge>
                    <Badge
                      className={`${getPriorityColor(
                        project.priority
                      )} font-medium`}
                    >
                      {project.priority}
                    </Badge>
                  </div>
                  {isOverdue && (
                    <Badge className="bg-red-100 text-red-800 animate-pulse">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {Math.abs(daysRemaining)} days overdue
                    </Badge>
                  )}
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Progress</span>
                    <span className="font-semibold text-gray-900">
                      {project.progress}%
                    </span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                {/* Project Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="truncate">
                      {project.projectManager
                        ? getManagerName(project.projectManager, managers)
                        : "Not assigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span>Due: {formatDate(project.endDate)}</span>
                    <span className="text-xs text-gray-400">
                      (
                      {daysRemaining > 0
                        ? `${daysRemaining} days left`
                        : daysRemaining === 0
                        ? "Due today"
                        : `${Math.abs(daysRemaining)} days overdue`}
                      )
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                    <span>
                      Budget: ${project.budget?.toLocaleString() || "0"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="h-4 w-4 text-purple-500" />
                    <span>Category: {project.category}</span>
                  </div>
                </div>

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs bg-gray-50"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        +{project.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* View Project Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Project Details
            </DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <ProjectDetails
              project={selectedProject}
              employees={employees}
              managers={managers}
              onUpdate={fetchProjects}
              onClose={() => setShowViewDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions to get names from IDs
function getManagerName(managerId, managers = []) {
  const manager = managers.find((mgr) => mgr._id === managerId);
  return manager
    ? manager.personalDetails?.name ||
        `${manager.firstName || ""} ${manager.lastName || ""}`.trim() ||
        "Unknown Manager"
    : managerId;
}

function getEmployeeName(employeeId, employees = []) {
  const employee = employees.find((emp) => emp._id === employeeId);
  return employee
    ? employee.personalDetails?.name ||
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
        "Unknown Employee"
    : employeeId;
}

// Project Details Component
function ProjectDetails({
  project,
  employees = [],
  managers = [],
  onUpdate,
  onClose,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    progress: project.progress,
    budget: project.budget,
    endDate: project.endDate,
    scope: project.scope || "",
    client: project.client || "",
  });
  const [newTeamMember, setNewTeamMember] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState(project.notes || []);
  const [loading, setLoading] = useState(false);

  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining(project.endDate);
  const isOverdue = daysRemaining < 0 && project.status !== "completed";
  const isDueToday = daysRemaining === 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        onUpdate?.();
      } else {
        alert("Failed to update project: " + result.error);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!newTeamMember) return;

    setLoading(true);
    try {
      const updatedTeamMembers = [
        ...(project.teamMembers || []),
        newTeamMember,
      ];
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMembers: updatedTeamMembers }),
      });

      const result = await response.json();
      if (result.success) {
        setNewTeamMember("");
        onUpdate?.();
      } else {
        alert("Failed to add team member: " + result.error);
      }
    } catch (error) {
      console.error("Error adding team member:", error);
      alert("Failed to add team member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    setLoading(true);
    try {
      const updatedTeamMembers = (project.teamMembers || []).filter(
        (id) => id !== memberId
      );
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamMembers: updatedTeamMembers }),
      });

      const result = await response.json();
      if (result.success) {
        onUpdate?.();
      } else {
        alert("Failed to remove team member: " + result.error);
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      alert("Failed to remove team member");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      author: "Current User", // Replace with actual user
      timestamp: new Date().toISOString(),
    };

    setLoading(true);
    try {
      const updatedNotes = [...notes, note];
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      });

      const result = await response.json();
      if (result.success) {
        setNotes(updatedNotes);
        setNewNote("");
        onUpdate?.();
      } else {
        alert("Failed to add note: " + result.error);
      }
    } catch (error) {
      console.error("Error adding note:", error);
      alert("Failed to add note");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        onClose?.();
        onUpdate?.();
      } else {
        alert("Failed to delete project: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Building className="h-6 w-6 text-blue-600" />
              {isEditing ? (
                <Input
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="text-2xl font-bold border-0 bg-transparent p-0"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">
                  {project.name}
                </h2>
              )}
            </div>

            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                className="text-gray-600 text-lg leading-relaxed mb-4 border-0 bg-transparent p-0 resize-none"
                rows={3}
              />
            ) : (
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              {isEditing ? (
                <>
                  <Select
                    value={editData.status}
                    onValueChange={(value) =>
                      setEditData({ ...editData, status: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={editData.priority}
                    onValueChange={(value) =>
                      setEditData({ ...editData, priority: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <Badge
                    className={`${getStatusColor(
                      project.status
                    )} text-sm font-medium px-3 py-1`}
                  >
                    {project.status}
                  </Badge>
                  <Badge
                    className={`${getPriorityColor(
                      project.priority
                    )} text-sm font-medium px-3 py-1`}
                  >
                    {project.priority} priority
                  </Badge>
                </>
              )}

              <Badge className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1">
                {project.category}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {Math.abs(daysRemaining)} days overdue
                </Badge>
              )}
              {isDueToday && (
                <Badge className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Due today
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={handleDeleteProject}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Project Progress
            </h3>
          </div>
          {isEditing && (
            <Button
              onClick={() => {
                const newProgress = prompt(
                  "Enter new progress (0-100):",
                  project.progress
                );
                if (
                  newProgress !== null &&
                  !isNaN(newProgress) &&
                  newProgress >= 0 &&
                  newProgress <= 100
                ) {
                  setEditData({ ...editData, progress: parseInt(newProgress) });
                }
              }}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-1" />
              Update Progress
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Overall Progress
            </span>
            <span className="text-lg font-bold text-gray-900">
              {isEditing ? editData.progress : project.progress}%
            </span>
          </div>
          <Progress
            value={isEditing ? editData.progress : project.progress}
            className="h-3"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold text-gray-900">
                {formatDate(project.startDate)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">End Date</p>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.endDate}
                  onChange={(e) =>
                    setEditData({ ...editData, endDate: e.target.value })
                  }
                  className="text-center"
                />
              ) : (
                <p className="font-semibold text-gray-900">
                  {formatDate(project.endDate)}
                </p>
              )}
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Budget</p>
              {isEditing ? (
                <Input
                  type="number"
                  value={editData.budget}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="text-center"
                />
              ) : (
                <p className="font-semibold text-gray-900">
                  ${project.budget?.toLocaleString() || "0"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Team Management
            </h3>
          </div>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-1" />
              Manage Team
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">
                Project Manager
              </span>
            </div>
            {isEditing ? (
              <Select
                value={editData.projectManager || project.projectManager}
                onValueChange={(value) =>
                  setEditData({ ...editData, projectManager: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project Manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager._id} value={manager._id}>
                      {getManagerName(manager._id, managers)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-gray-900 font-medium">
                {project.projectManager
                  ? getManagerName(project.projectManager, managers)
                  : "Not assigned"}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-600">
                Team Members ({project.teamMembers?.length || 0})
              </span>
            </div>

            {/* Add Team Member */}
            {isEditing && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <Select
                    value={newTeamMember}
                    onValueChange={setNewTeamMember}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(
                          (emp) =>
                            !(project.teamMembers || []).includes(emp._id)
                        )
                        .map((employee) => (
                          <SelectItem key={employee._id} value={employee._id}>
                            {getEmployeeName(employee._id, employees)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddTeamMember}
                    disabled={!newTeamMember || loading}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Team Members List */}
            {project.teamMembers && project.teamMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.teamMembers.map((member, index) => (
                  <Badge
                    key={index}
                    className="bg-blue-100 text-blue-800 font-medium flex items-center gap-1"
                  >
                    <User className="h-3 w-3" />
                    {getEmployeeName(member, employees)}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTeamMember(member)}
                        className="ml-1 hover:text-red-600"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No team members assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.scope && (
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Project Scope
              </h3>
            </div>
            <p className="text-gray-700 leading-relaxed">{project.scope}</p>
          </div>
        )}

        {project.client && (
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center gap-2 mb-4">
              <Building className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Client Information
              </h3>
            </div>
            <p className="text-gray-700 font-medium">{project.client}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-pink-600" />
            <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="bg-gray-50 text-gray-700 font-medium"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes and Comments Section */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Notes & Comments
          </h3>
        </div>

        {/* Add Note */}
        <div className="mb-6">
          <div className="flex gap-2">
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note or comment..."
              onKeyPress={(e) => e.key === "Enter" && handleAddNote()}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-3">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-900 mb-2">{note.text}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{note.author}</span>
                      <span>•</span>
                      <span>{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              No notes yet. Add the first note above.
            </p>
          )}
        </div>
      </div>

      {/* Project Statistics */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Project Statistics
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {isEditing ? editData.progress : project.progress}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {project.teamMembers ? project.teamMembers.length : 0}
            </div>
            <div className="text-sm text-gray-600">Team Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.abs(daysRemaining)}
            </div>
            <div className="text-sm text-gray-600">
              {daysRemaining > 0
                ? "Days Left"
                : daysRemaining === 0
                ? "Due Today"
                : "Days Overdue"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              $
              {(isEditing
                ? editData.budget
                : project.budget
              )?.toLocaleString() || "0"}
            </div>
            <div className="text-sm text-gray-600">Budget</div>
          </div>
        </div>
      </div>
    </div>
  );
}
