"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import {
  Plus,
  Save,
  ArrowLeft,
  Building,
  Target,
  Users,
  Tag,
  DollarSign,
  X,
  User,
} from "lucide-react";

export default function AddProjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    status: "planning",
    priority: "medium",
    startDate: "",
    endDate: "",
    budget: 0,
    projectManager: "",
    teamMembers: [],
    client: "",
    scope: "",
    deliverables: [],
    risks: [],
    tags: [],
    progress: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState("");
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
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
    } finally {
      setLoadingEmployees(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.category) {
      newErrors.category = "Category is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.startDate) >= new Date(formData.endDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }
    if (!formData.projectManager) {
      newErrors.projectManager = "Project manager is required";
    }
    if (formData.budget < 0) {
      newErrors.budget = "Budget cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await (async () => {
        try {
          return await response.clone().json();
        } catch {
          return { success: false, error: await response.text() };
        }
      })();

      if (result.success) {
        router.push("/project-management");
      } else {
        alert("Failed to create project: " + result.error);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const addTeamMember = (employeeId) => {
    if (!formData.teamMembers.includes(employeeId)) {
      setFormData({
        ...formData,
        teamMembers: [...formData.teamMembers, employeeId],
      });
    }
  };

  const removeTeamMember = (employeeId) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((id) => id !== employeeId),
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp._id === employeeId);
    return employee
      ? employee.personalDetails?.name ||
          `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
          "Unknown Employee"
      : "Unknown Employee";
  };

  const getManagerName = (managerId) => {
    const manager = managers.find((mgr) => mgr._id === managerId);
    return manager
      ? manager.personalDetails?.name ||
          `${manager.firstName || ""} ${manager.lastName || ""}`.trim() ||
          "Unknown Manager"
      : "Unknown Manager";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Create New Project
              </h1>
              <p className="text-gray-600 mt-1">
                Add a new project to your portfolio
              </p>
            </div>
          </div>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Building className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Basic Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700"
                  >
                    Project Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={errors.name ? "border-red-500" : ""}
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-gray-700"
                  >
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger
                      className={errors.category ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="infrastructure">
                        Infrastructure
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="client"
                    className="text-sm font-medium text-gray-700"
                  >
                    Client
                  </Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) =>
                      setFormData({ ...formData, client: e.target.value })
                    }
                    placeholder="Enter client name"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="budget"
                    className="text-sm font-medium text-gray-700"
                  >
                    Budget
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          budget: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="pl-10"
                      placeholder="0"
                    />
                  </div>
                  {errors.budget && (
                    <p className="text-sm text-red-600">{errors.budget}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700"
                >
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className={errors.description ? "border-red-500" : ""}
                  placeholder="Describe the project objectives and goals..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Project Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Project Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="status"
                    className="text-sm font-medium text-gray-700"
                  >
                    Status
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="priority"
                    className="text-sm font-medium text-gray-700"
                  >
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="startDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    Start Date *
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={errors.startDate ? "border-red-500" : ""}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="endDate"
                    className="text-sm font-medium text-gray-700"
                  >
                    End Date *
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className={errors.endDate ? "border-red-500" : ""}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="scope"
                  className="text-sm font-medium text-gray-700"
                >
                  Project Scope
                </Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({ ...formData, scope: e.target.value })
                  }
                  placeholder="Define the project scope and deliverables..."
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Team Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Team Assignment
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="projectManager"
                    className="text-sm font-medium text-gray-700"
                  >
                    Project Manager *
                  </Label>
                  <Select
                    value={formData.projectManager}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectManager: value })
                    }
                    disabled={loadingEmployees}
                  >
                    <SelectTrigger
                      className={errors.projectManager ? "border-red-500" : ""}
                    >
                      <SelectValue
                        placeholder={
                          loadingEmployees
                            ? "Loading managers..."
                            : "Select Project Manager"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {getManagerName(manager._id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.projectManager && (
                    <p className="text-sm text-red-600">
                      {errors.projectManager}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="teamMembers"
                    className="text-sm font-medium text-gray-700"
                  >
                    Team Members
                  </Label>

                  {/* Employee Selection */}
                  <div className="space-y-3">
                    <Select
                      onValueChange={(value) => addTeamMember(value)}
                      disabled={loadingEmployees}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingEmployees
                              ? "Loading employees..."
                              : "Add team member"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(
                            (emp) => !formData.teamMembers.includes(emp._id)
                          )
                          .map((employee) => (
                            <SelectItem key={employee._id} value={employee._id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{getEmployeeName(employee._id)}</span>
                                {employee.designation && (
                                  <span className="text-xs text-gray-500">
                                    ({employee.designation})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {/* Selected Team Members */}
                    {formData.teamMembers.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">
                          Selected Team Members ({formData.teamMembers.length})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.teamMembers.map((memberId) => (
                            <Badge
                              key={memberId}
                              variant="secondary"
                              className="flex items-center gap-1 px-3 py-1"
                            >
                              <User className="h-3 w-3" />
                              {getEmployeeName(memberId)}
                              <button
                                type="button"
                                onClick={() => removeTeamMember(memberId)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Tag className="h-6 w-6 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">Tags</h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
