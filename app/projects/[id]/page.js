"use client";

import { useState, useEffect, useRef, use } from "react";
import Layout from "../../components/Layout";
import {
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ArrowUpward as ArrowUpwardIcon,
  AccessTime as AccessTimeIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Task as TaskIcon,
  MonetizationOn as MonetizationOnIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  PhotoCamera as PhotoCameraIcon,
  DeleteOutline as DeleteIcon,
  ZoomIn as ZoomInIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  FolderOpen as FolderIcon,
  Flag as FlagIcon,
} from "@mui/icons-material";
import Link from "next/link";
import {
  format,
  parseISO,
  differenceInDays,
  isAfter,
  isBefore,
} from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  validateBudgetForm,
  hasFormErrors,
  getFirstError,
} from "../../utils/formValidation";
import {
  handleFormSubmission,
  projectToasts,
  showValidationErrors,
  showErrorToast,
  showSuccessToast,
} from "../../utils/sweetAlert";
import { usePermissions } from "../../hooks/usePermissions";

const ProjectDetailPage = ({ params }) => {
  const { id: projectId } = use(params);
  const { hasPermission } = usePermissions();

  // State management
  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [financialData, setFinancialData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Detail view, image, and project edit states
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "details"
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectCategories, setProjectCategories] = useState([]);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    status: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  // Budget editing states
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    totalAmount: "",
    currency: "ETB",
    description: "",
    approvedBy: "",
    approvalDate: "",
  });
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetFormErrors, setBudgetFormErrors] = useState({});

  // Utility functions
  const getBudgetAmount = (budget) => {
    if (typeof budget === "object" && budget?.totalAmount) {
      return budget.totalAmount;
    }
    if (typeof budget === "number") {
      return budget;
    }
    return 0;
  };

  const getTotalExpenses = (expenses) => {
    if (Array.isArray(expenses)) {
      return expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    }
    if (typeof expenses === "number") {
      return expenses;
    }
    return 0;
  };

  const hasBudget = (budget) => {
    return (
      (typeof budget === "object" && budget?.totalAmount) ||
      (typeof budget === "number" && budget > 0)
    );
  };

  const getCategoryName = () => {
    if (!project) return "General";
    if (project.category?.name) return project.category.name;
    if (typeof project.category === "string" && project.category) return project.category;
    const cat = projectCategories.find(
      (c) => c._id === project.categoryId || c._id === project.category
    );
    return cat?.name || "General";
  };

  // Chart data preparation functions
  const prepareTaskStatusChartData = () => {
    return [
      { name: "Completed", value: taskStats.completed || 0, color: "#10B981" },
      {
        name: "In Progress",
        value: taskStats.inProgress || 0,
        color: "#3B82F6",
      },
      { name: "Pending", value: taskStats.pending || 0, color: "#F59E0B" },
      { name: "Blocked", value: taskStats.blocked || 0, color: "#EF4444" },
      { name: "Overdue", value: taskStats.overdue || 0, color: "#DC2626" },
    ].filter((item) => item.value > 0);
  };

  const prepareCategoryProgressData = () => {
    if (!taskStats.categories) return [];

    return Object.entries(taskStats.categories).map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      completed: data.completed || 0,
      total: data.total || 0,
      progress:
        data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  };

  const prepareBudgetChartData = () => {
    const budget = getBudgetAmount(project?.budget);
    const expenses = getTotalExpenses(financialData?.expenses);
    const remaining = budget - expenses;

    return [
      { name: "Used Budget", value: expenses, color: "#EF4444" },
      {
        name: "Remaining Budget",
        value: Math.max(0, remaining),
        color: "#10B981",
      },
    ].filter((item) => item.value > 0);
  };

  const prepareTimelineData = () => {
    if (!project?.startDate || !project?.endDate) return [];

    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();
    const totalDays = differenceInDays(end, start);
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    const remainingDays = Math.max(0, differenceInDays(end, today));

    return [
      { name: "Elapsed", days: elapsedDays, color: "#3B82F6" },
      { name: "Remaining", days: remainingDays, color: "#F59E0B" },
    ];
  };

  // Enhanced data fetching
  useEffect(() => {
    fetchAllProjectData();
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tab") === "details") {
        setActiveTab("details");
      }
    }
    fetch("/api/project-categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProjectCategories(d.categories || []);
      })
      .catch(() => {});
  }, [projectId]);

  const fetchAllProjectData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Fetch core data in parallel for better performance (alerts loaded separately)
      const [projectResponse, teamResponse, tasksResponse, financialResponse, docsResponse] =
        await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/assign-employees`),
          fetch(`/api/tasks?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}/financial-summary`),
          fetch(`/api/projects/${projectId}/documents`),
        ]);

      // Process project data
      const projectData = await projectResponse.json();
      if (projectData.success) {
        setProject(projectData.project);
        if (projectData.project.milestones?.length > 0) {
          setMilestones(projectData.project.milestones);
        } else {
          setMilestones([]);
        }
      } else {
        throw new Error(projectData.error || "Failed to fetch project details");
      }

      // Process team data
      const teamData = await teamResponse.json();
      if (teamData.success) {
        setAssignedEmployees(teamData.assignedEmployees || []);
      }

      // Load alerts without blocking the whole page
      (async () => {
        try {
          setAlertsLoading(true);
          // Generate latest alerts then fetch for this project
          await fetch(`/api/project-alerts?projectId=${projectId}`, {
            method: "PUT",
          });
          const ar = await fetch(
            `/api/project-alerts?projectId=${projectId}&status=active`,
          );
          const ad = await ar.json();
          if (ad.success) {
            setAlerts(ad.alerts || []);
          }
        } catch (e) {
          console.warn("Failed to load alerts", e);
        } finally {
          setAlertsLoading(false);
        }
      })();

      // Process tasks data
      const tasksData = await tasksResponse.json();
      let projectTasks = [];
      if (tasksData.success) {
        projectTasks = tasksData.tasks || [];
        setTasks(projectTasks);

        // Calculate real task statistics
        const stats = calculateTaskStatistics(projectTasks);
        setTaskStats(stats);
      }

      // Process financial data
      const financialData = await financialResponse.json();
      if (financialData.success) {
        setFinancialData(financialData.summary || {});
      }

      // Process documents data
      try {
        const docsData = await docsResponse.json();
        if (docsData.success) {
          setDocuments(docsData.documents || []);
        }
      } catch (docErr) {
        console.warn("Failed to parse project documents:", docErr);
      }

      // Generate activity timeline from real data
      generateActivityTimeline(projectData.project, projectTasks);
      return true;
    } catch (err) {
      console.error("Error fetching project data:", err);
      const message = "Error fetching project data: " + err.message;
      setError(message);
      showErrorToast("Load Failed", err.message || "Failed to load project");
      return false;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const calculateTaskStatistics = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => task.status === "completed",
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === "in_progress",
    ).length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const overdue = tasks.filter(
      (task) =>
        task.dueDate &&
        isAfter(new Date(), new Date(task.dueDate)) &&
        task.status !== "completed",
    ).length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate category breakdown
    const categories = tasks.reduce((acc, task) => {
      const category = task.category || "general";
      if (!acc[category]) {
        acc[category] = { total: 0, completed: 0 };
      }
      acc[category].total++;
      if (task.status === "completed") {
        acc[category].completed++;
      }
      return acc;
    }, {});

    return {
      total,
      completed,
      inProgress,
      pending,
      blocked,
      overdue,
      progress,
      categories,
    };
  };

  const generateActivityTimeline = (project, tasks) => {
    const timeline = [];

    // Project creation
    if (project.createdAt) {
      timeline.push({
        id: "project-created",
        type: "project",
        title: "Project Created",
        description: "Initial project setup completed",
        date: project.createdAt,
        icon: "project",
        color: "green",
      });
    }

    // Team assignment
    if (assignedEmployees.length > 0) {
      timeline.push({
        id: "team-assigned",
        type: "team",
        title: "Team Assigned",
        description: `${assignedEmployees.length} team members assigned`,
        date: project.createdAt || new Date(),
        icon: "team",
        color: "blue",
      });
    }

    // Recent task completions
    const recentCompletions = tasks
      .filter((task) => task.status === "completed" && task.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 3);

    recentCompletions.forEach((task) => {
      timeline.push({
        id: `task-completed-${task._id}`,
        type: "task",
        title: "Task Completed",
        description: task.title,
        date: task.completedAt,
        icon: "task",
        color: "green",
      });
    });

    // Sort by date (most recent first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    setActivityTimeline(timeline.slice(0, 5)); // Show last 5 activities
  };

  const refreshData = async () => {
    setRefreshing(true);
    const ok = await fetchAllProjectData({ silent: true });
    if (ok) {
      showSuccessToast("Refreshed!", "Project data has been updated");
    }
    setRefreshing(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorToast("Invalid File", "Please select an image file (JPEG, PNG, WebP, GIF)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showErrorToast("File Too Large", "Image size must be less than 10MB");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      showLoadingToast("Uploading project image...");
      const res = await fetch(`/api/projects/${projectId}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Success", "Project image uploaded successfully!");
        setProject((prev) => ({
          ...prev,
          imageUrl: data.imageUrl,
        }));
      } else {
        showErrorToast("Upload Failed", data.error || "Failed to upload image");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showErrorToast("Error", "Error uploading image: " + err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async () => {
    try {
      showLoadingToast("Removing project image...");
      const res = await fetch(`/api/projects/${projectId}/photo`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Removed", "Project image removed");
        setProject((prev) => ({
          ...prev,
          imageUrl: null,
        }));
      } else {
        showErrorToast("Error", data.error || "Failed to remove image");
      }
    } catch (err) {
      console.error("Remove image error:", err);
      showErrorToast("Error", "Error removing image");
    }
  };

  const handleOpenEdit = () => {
    if (!project) return;
    setEditForm({
      name: project.name || "",
      description: project.description || "",
      categoryId: project.categoryId ? String(project.categoryId) : "",
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().slice(0, 10)
        : "",
      endDate: project.endDate
        ? new Date(project.endDate).toISOString().slice(0, 10)
        : "",
      status: project.status || "not_started",
    });
    setEditImageFile(null);
    setEditImagePreview(project.imageUrl || null);
    setIsEditingProject(true);
  };

  const handleEditImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      showErrorToast("Missing Name", "Project name is required");
      return;
    }
    setEditLoading(true);
    try {
      showLoadingToast("Updating project...");
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        // Upload image if a new image was chosen
        if (editImageFile) {
          const imgFormData = new FormData();
          imgFormData.append("image", editImageFile);
          await fetch(`/api/projects/${projectId}/photo`, {
            method: "POST",
            body: imgFormData,
          });
        }
        showSuccessToast("Success", "Project updated successfully!");
        setIsEditingProject(false);
        refreshData();
      } else {
        showErrorToast("Update Failed", data.error || "Failed to update project");
      }
    } catch (err) {
      console.error("Update error:", err);
      showErrorToast("Error", "Error updating project: " + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      case "blocked":
        return "error";
      default:
        return "default";
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "warning":
        return <WarningIcon color="warning" />;
      case "success":
        return <CheckCircleIcon color="success" />;
      case "info":
        return <InfoIcon color="info" />;
      case "error":
        return <WarningIcon color="error" />;
      default:
        return <InfoIcon />;
    }
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case "project":
        return <AssignmentIcon />;
      case "team":
        return <GroupIcon />;
      case "task":
        return <TaskIcon />;
      case "milestone":
        return <TimelineIcon />;
      default:
        return <HistoryIcon />;
    }
  };

  // Budget editing functions
  const handleEditBudget = () => {
    setBudgetForm({
      totalAmount: getBudgetAmount(project.budget).toString(),
      currency: "ETB",
      description: project.description || "",
      approvedBy: "",
      approvalDate: new Date().toISOString().split("T")[0],
    });
    setIsEditingBudget(true);
  };

  const handleCancelBudgetEdit = () => {
    setIsEditingBudget(false);
    setBudgetForm({
      totalAmount: "",
      currency: "ETB",
      description: "",
      approvedBy: "",
      approvalDate: "",
    });
  };

  const handleSaveBudget = async () => {
    // Validate form data
    const errors = validateBudgetForm(budgetForm);
    if (hasFormErrors(errors)) {
      setBudgetFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    // Clear any existing errors
    setBudgetFormErrors({});

    const submitFunction = async () => {
      const budgetData = {
        totalAmount: parseFloat(budgetForm.totalAmount) || 0,
        currency: budgetForm.currency,
        description: budgetForm.description,
        approvedBy: budgetForm.approvedBy,
        approvalDate: budgetForm.approvalDate,
        budgetAllocations: [],
      };

      // Check if budget already exists to determine method
      const existingBudget = getBudgetAmount(project.budget);
      const method = existingBudget > 0 ? "PUT" : "PUT";

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(budgetData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save budget");
      }

      return result;
    };

    try {
      const existingBudget = getBudgetAmount(project.budget);
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Saving Budget...",
        loadingText: "Please wait while we save your budget information",
        successTitle: "Budget Saved!",
        successText:
          existingBudget > 0
            ? "Budget has been updated successfully"
            : "Budget has been created successfully",
        errorTitle: "Budget Error",
        errorText: "Failed to save budget. Please try again.",
      });

      // Update local state on success
      setProject((prev) => ({
        ...prev,
        budget: parseFloat(budgetForm.totalAmount) || 0,
      }));
      setIsEditingBudget(false);
      await fetchAllProjectData({ silent: true });
    } catch (error) {
      console.error("Error saving budget:", error);
      // Error handling is done by handleFormSubmission
    }
  };

  const handleBudgetFormChange = (field, value) => {
    setBudgetForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error when user starts typing
    if (budgetFormErrors[field]) {
      setBudgetFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const navItems = [
    {
      href: `/projects/${projectId}/team`,
      label: "Team",
      icon: PeopleIcon,
    },
    {
      href: `/task-management?projectId=${projectId}`,
      label: "Tasks",
      icon: AssignmentIcon,
    },
    ...(hasPermission("project.budget")
      ? [
          {
            href: `/project-budget/${projectId}`,
            label: "Budget",
            icon: AttachMoneyIcon,
          },
        ]
      : []),
    {
      href: `/projects/${projectId}/milestones`,
      label: "Milestones",
      icon: TrendingUpIcon,
    },
    {
      href: `/project-alerts?projectId=${projectId}`,
      label: "Alerts",
      icon: NotificationsIcon,
    },
  ];

  const SkeletonBlock = ({ className = "" }) => (
    <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
  );

  // Loading state — skeleton matching the redesigned layout
  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/40">
          <div className="border-b border-slate-200/80 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="py-4">
                <SkeletonBlock className="h-4 w-48 rounded-md" />
              </div>
              <div className="pb-5">
                <div className="mb-4 flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-72 rounded-lg" />
                  <SkeletonBlock className="h-9 w-9 rounded-xl" />
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                  <SkeletonBlock className="h-6 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="mb-5 h-4 w-full max-w-xl rounded-md" />
                <SkeletonBlock className="mb-4 h-2 w-full rounded-full" />
                <div className="flex gap-2 overflow-hidden pb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonBlock
                      key={i}
                      className="h-10 w-28 shrink-0 rounded-xl"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <SkeletonBlock className="h-10 w-10 rounded-xl" />
                    <SkeletonBlock className="h-3 w-16 rounded-md" />
                  </div>
                  <SkeletonBlock className="mb-2 h-8 w-24 rounded-lg" />
                  <SkeletonBlock className="h-3 w-20 rounded-md" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <SkeletonBlock className="h-14 w-full rounded-none" />
                  <div className="space-y-4 p-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <SkeletonBlock className="h-12 w-12 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-40 rounded-md" />
                          <SkeletonBlock className="h-3 w-28 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <SkeletonBlock className="h-14 w-full rounded-none" />
                  <div className="flex items-center justify-center p-10">
                    <SkeletonBlock className="h-48 w-48 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                  >
                    <SkeletonBlock className="h-14 w-full rounded-none" />
                    <div className="space-y-3 p-5">
                      <SkeletonBlock className="h-20 w-full rounded-xl" />
                      <SkeletonBlock className="h-20 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
              Loading project details…
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout activeSection="projects">
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="mx-4 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <WarningIcon />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800">
              Error Loading Project
            </h2>
            <p className="mb-6 text-sm text-slate-500">{error}</p>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800 disabled:opacity-50 active:scale-[0.98]"
            >
              {refreshing ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Retrying…
                </>
              ) : (
                "Try Again"
              )}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Project not found
  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="mx-4 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AssignmentIcon />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-800">
              Project Not Found
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              The project you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-800"
            >
              <ArrowBackIcon className="!text-lg" />
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const progress = taskStats.progress || 0;
  const statusLabel = project.status
    ? project.status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Active";
  const descriptionText =
    project.description &&
    project.description.trim().toLowerCase() !==
      project.name?.trim().toLowerCase()
      ? project.description
      : null;
  const daysLeft = project.endDate
    ? Math.max(0, differenceInDays(new Date(project.endDate), new Date()))
    : null;

  return (
    <Layout activeSection="projects">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/40">
        {/* Header */}
        <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav className="pt-4 pb-2" aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
                <li>
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-slate-100 hover:text-blue-900"
                  >
                    <ArrowBackIcon className="!text-base" />
                    Projects
                  </Link>
                </li>
                <li className="text-slate-300">/</li>
                <li className="max-w-[240px] truncate px-1.5 py-1 font-medium text-slate-700">
                  {project.name}
                </li>
              </ol>
            </nav>

            <div className="pb-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start min-w-0 flex-1">
                  {/* Project Image Avatar / Cover */}
                  <div className="relative group shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-sm bg-slate-100 flex items-center justify-center">
                    {project.imageUrl ? (
                      <>
                        <img
                          src={project.imageUrl}
                          alt={project.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                          onClick={() => setImagePreviewModal(true)}
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                          <button
                            type="button"
                            onClick={() => setImagePreviewModal(true)}
                            className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-slate-800 shadow-xs"
                            title="View full image"
                          >
                            <ZoomInIcon className="!text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-lg text-white shadow-xs"
                            title="Change image"
                          >
                            <PhotoCameraIcon className="!text-sm" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white shadow-xs"
                            title="Remove image"
                          >
                            <DeleteIcon className="!text-sm" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white cursor-pointer hover:opacity-95 transition-all text-center group/btn"
                        title="Click to upload project photo"
                      >
                        <PhotoCameraIcon className="!text-2xl text-blue-200 group-hover/btn:scale-110 transition-transform mb-1" />
                        <span className="text-[11px] font-semibold text-blue-100">
                          {uploadingImage ? "Uploading…" : "+ Add Image"}
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Title, Badges & Description */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        {project.name}
                      </h1>
                      <button
                        onClick={refreshData}
                        disabled={refreshing}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-900 disabled:cursor-wait disabled:opacity-50 shadow-2xs"
                        title="Refresh data"
                      >
                        <RefreshIcon
                          className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />
                      </button>
                      {hasPermission("project.update") && (
                        <button
                          onClick={handleOpenEdit}
                          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-blue-900 shadow-2xs"
                          title="Edit project details"
                        >
                          <EditIcon className="!text-sm text-slate-500" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                          project.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : project.status === "in_progress"
                              ? "bg-sky-50 text-sky-700 ring-sky-200"
                              : project.status === "on_hold" ||
                                  project.status === "pending"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-slate-100 text-slate-700 ring-slate-200"
                        }`}
                      >
                        {statusLabel}
                      </span>
                      {project.category && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                          {project.category.charAt(0).toUpperCase() +
                            project.category.slice(1)}
                        </span>
                      )}
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 ring-1 ring-blue-100">
                        {progress}% Complete
                      </span>
                      {assignedEmployees.length > 0 && (
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                          {assignedEmployees.length} team member
                          {assignedEmployees.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {descriptionText && (
                      <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
                        {descriptionText}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">Overall progress</span>
                  <span className="font-semibold text-blue-900">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-800 to-blue-600 transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Horizontal nav tabs */}
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
                <nav
                  className="flex gap-1 border-b border-slate-200 pb-0"
                  aria-label="Project sections"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      activeTab === "overview"
                        ? "border-blue-900 bg-blue-50/50 text-blue-900"
                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-blue-900"
                    }`}
                  >
                    <BarChartIcon className={`!text-[18px] ${activeTab === "overview" ? "text-blue-900" : "text-slate-400 group-hover:text-blue-900"}`} />
                    Overview & Analytics
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      activeTab === "details"
                        ? "border-blue-900 bg-blue-50/50 text-blue-900"
                        : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-blue-900"
                    }`}
                  >
                    <DescriptionIcon className={`!text-[18px] ${activeTab === "details" ? "text-blue-900" : "text-slate-400 group-hover:text-blue-900"}`} />
                    Project Details
                  </button>

                  {hasPermission("project.budget") && (
                    <Link
                      href={`/project-budget/${projectId}`}
                      className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                    >
                      <AttachMoneyIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                      Budget & Financials
                    </Link>
                  )}

                  <Link
                    href={`/task-management?projectId=${projectId}`}
                    className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                  >
                    <AssignmentIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                    Tasks
                  </Link>

                  <Link
                    href={`/projects/${projectId}/team`}
                    className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                  >
                    <PeopleIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                    Team
                  </Link>

                  <Link
                    href={`/projects/${projectId}/milestones`}
                    className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                  >
                    <TrendingUpIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                    Milestones
                  </Link>

                  <Link
                    href={`/projects/${projectId}/documents`}
                    className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                  >
                    <FileIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                    Documents
                  </Link>

                  <Link
                    href={`/project-alerts?projectId=${projectId}`}
                    className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                  >
                    <NotificationsIcon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                    Alerts
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {activeTab === "details" ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Hero Banner / Cover Section */}
              <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-200/80 shadow-lg">
                {project.imageUrl ? (
                  <div className="relative h-72 sm:h-96 w-full group overflow-hidden">
                    <img
                      src={project.imageUrl}
                      alt={project.name}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 cursor-pointer"
                      onClick={() => setImagePreviewModal(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    {/* Top Floating Controls */}
                    <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setImagePreviewModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
                      >
                        <ZoomInIcon className="!text-base" />
                        Full Image
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white backdrop-blur-md text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
                      >
                        <PhotoCameraIcon className="!text-base" />
                        {uploadingImage ? "Uploading..." : "Change Image"}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
                      >
                        <DeleteIcon className="!text-base" />
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-semibold shadow-md transition-all hover:scale-105 cursor-pointer"
                      >
                        <EditIcon className="!text-base" />
                        Edit Project
                      </button>
                    </div>

                    {/* Bottom Info on Hero */}
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="rounded-full bg-blue-600/90 text-white px-3 py-1 text-xs font-semibold backdrop-blur-md">
                          {getCategoryName()}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize backdrop-blur-md ${
                            project.status === "completed"
                              ? "bg-emerald-500/90 text-white"
                              : project.status === "in_progress"
                              ? "bg-sky-500/90 text-white"
                              : project.status === "pending"
                              ? "bg-amber-500/90 text-white"
                              : "bg-slate-600/90 text-white"
                          }`}
                        >
                          {project.status ? project.status.replace("_", " ") : "Not Started"}
                        </span>
                        {project.priority && (
                          <span className="rounded-full bg-white/20 text-white px-3 py-1 text-xs font-semibold backdrop-blur-md uppercase">
                            {project.priority} Priority
                          </span>
                        )}
                      </div>
                      <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                        {project.name}
                      </h1>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-200">
                        {project.startDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarIcon className="!text-base text-blue-300" />
                            Started: {format(new Date(project.startDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {project.endDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <ScheduleIcon className="!text-base text-amber-300" />
                            Target: {format(new Date(project.endDate), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                          <TrendingUpIcon className="!text-base text-emerald-400" />
                          {progress}% Completed
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative p-8 sm:p-12 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 px-3 py-0.5 text-xs font-semibold">
                            {getCategoryName()}
                          </span>
                          <span
                            className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${
                              project.status === "completed"
                                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                                : project.status === "in_progress"
                                ? "bg-sky-500/30 text-sky-200 border border-sky-400/30"
                                : "bg-slate-700/60 text-slate-300 border border-slate-600"
                            }`}
                          >
                            {project.status ? project.status.replace("_", " ") : "Not Started"}
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                          {project.name}
                        </h1>
                        <p className="text-sm text-slate-300 line-clamp-2">
                          {descriptionText || "No description provided yet."}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
                        >
                          <PhotoCameraIcon className="!text-lg" />
                          {uploadingImage ? "Uploading..." : "Upload Cover Image"}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenEdit}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition-all hover:scale-105 cursor-pointer"
                        >
                          <EditIcon className="!text-lg" />
                          Edit Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Overall Progress</span>
                    <span className="font-bold text-blue-900">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {taskStats.completed || 0} of {taskStats.total || 0} tasks done
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Tasks</span>
                    <Link
                      href={`/task-management?projectId=${projectId}`}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      View Board →
                    </Link>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{taskStats.total || 0}</p>
                  <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                    {taskStats.completed || 0} completed · {taskStats.inProgress || 0} active
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Budget Allocated</span>
                    {hasPermission("project.budget") && (
                      <Link
                        href={`/project-budget/${projectId}`}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        Financials →
                      </Link>
                    )}
                  </div>
                  <p className="text-xl font-bold text-slate-900 truncate">
                    {new Intl.NumberFormat("en-ET", {
                      style: "currency",
                      currency: "ETB",
                      maximumFractionDigits: 0,
                    }).format(getBudgetAmount(project.budget))}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {getTotalExpenses(financialData?.expenses) > 0
                      ? `${new Intl.NumberFormat("en-ET", {
                          style: "currency",
                          currency: "ETB",
                          maximumFractionDigits: 0,
                        }).format(getTotalExpenses(financialData?.expenses))} spent`
                      : "No expenses recorded"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Team & Milestones</span>
                    <Link
                      href={`/projects/${projectId}/team`}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Team →
                    </Link>
                  </div>
                  <p className="text-xl font-bold text-slate-900">
                    {assignedEmployees.length} members
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {milestones.length} milestones tracked
                  </p>
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Primary Content (2 cols) */}
                <div className="space-y-6 lg:col-span-2">
                  {/* Detailed Description */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <DescriptionIcon className="!text-xl text-blue-900" />
                        <h2 className="text-base font-bold text-slate-900">Project Description & Scope</h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <EditIcon className="!text-sm" />
                        Edit Scope
                      </button>
                    </div>
                    {descriptionText ? (
                      <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {descriptionText}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <p className="text-sm">No detailed description has been added for this project.</p>
                        <button
                          type="button"
                          onClick={handleOpenEdit}
                          className="mt-2 text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                        >
                          + Add Description
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Milestones Roadmap */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUpIcon className="!text-xl text-blue-900" />
                        <h2 className="text-base font-bold text-slate-900">Milestones & Roadmap</h2>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-900">
                          {milestones.length}
                        </span>
                      </div>
                      <Link
                        href={`/projects/${projectId}/milestones`}
                        className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1"
                      >
                        Manage Milestones →
                      </Link>
                    </div>

                    {milestones.length > 0 ? (
                      <div className="space-y-3">
                        {milestones.map((m, idx) => (
                          <div
                            key={m._id || idx}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                  m.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : m.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold text-slate-900 truncate">
                                  {m.title || m.name}
                                </h4>
                                {m.targetDate && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <CalendarIcon className="!text-xs" />
                                    Target: {format(new Date(m.targetDate), "MMM dd, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                m.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : m.status === "in_progress"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {m.status ? m.status.replace("_", " ") : "pending"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <FlagIcon className="!text-3xl mb-1 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No milestones yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Define key milestones to track project phases.</p>
                        <Link
                          href={`/projects/${projectId}/milestones`}
                          className="mt-3 inline-block text-xs font-semibold text-blue-900 hover:underline"
                        >
                          + Create First Milestone
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Tasks Preview */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <AssignmentIcon className="!text-xl text-blue-900" />
                        <h2 className="text-base font-bold text-slate-900">Task Overview</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {tasks.length}
                        </span>
                      </div>
                      <Link
                        href={`/task-management?projectId=${projectId}`}
                        className="text-xs font-semibold text-blue-900 hover:underline"
                      >
                        Open Task Board →
                      </Link>
                    </div>

                    {tasks.length > 0 ? (
                      <div className="space-y-2">
                        {tasks.slice(0, 5).map((t) => (
                          <div
                            key={t._id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {t.title}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                {t.dueDate && (
                                  <span>Due: {format(new Date(t.dueDate), "MMM dd")}</span>
                                )}
                                {t.priority && (
                                  <span className="capitalize">{t.priority} priority</span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 ml-3 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                t.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : t.status === "in_progress"
                                  ? "bg-sky-50 text-sky-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {t.status ? t.status.replace("_", " ") : "todo"}
                            </span>
                          </div>
                        ))}
                        {tasks.length > 5 && (
                          <div className="pt-2 text-center">
                            <Link
                              href={`/task-management?projectId=${projectId}`}
                              className="text-xs font-semibold text-blue-900 hover:underline"
                            >
                              + View all {tasks.length} tasks
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <AssignmentIcon className="!text-3xl mb-1 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No tasks created</p>
                        <Link
                          href={`/task-management?projectId=${projectId}`}
                          className="mt-2 inline-block text-xs font-semibold text-blue-900 hover:underline"
                        >
                          + Create Tasks
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Documents & Files Preview */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <FileIcon className="!text-xl text-blue-900" />
                        <h2 className="text-base font-bold text-slate-900">Project Documents</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {documents.length}
                        </span>
                      </div>
                      <Link
                        href={`/projects/${projectId}/documents`}
                        className="text-xs font-semibold text-blue-900 hover:underline"
                      >
                        All Documents →
                      </Link>
                    </div>

                    {documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.slice(0, 4).map((doc) => (
                          <div
                            key={doc._id}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <FileIcon className="!text-xl text-blue-800 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {doc.title || doc.originalName || "Document"}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {doc.contractorName ? `By ${doc.contractorName}` : "Attachment"}
                                </p>
                              </div>
                            </div>
                            {doc.filePath && (
                              <a
                                href={`/api/projects/${projectId}/documents/${doc._id}/download`}
                                className="shrink-0 ml-2 text-xs font-semibold text-blue-700 hover:underline"
                                download
                              >
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <FolderIcon className="!text-3xl mb-1 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">No project documents</p>
                        <p className="text-xs text-slate-400 mt-0.5">Attach contracts, plans, and files for this project.</p>
                        <Link
                          href={`/projects/${projectId}/documents`}
                          className="mt-2 inline-block text-xs font-semibold text-blue-900 hover:underline"
                        >
                          + Upload Documents
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Sidebar Details (1 col) */}
                <div className="space-y-6 lg:col-span-1">
                  {/* Specifications Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-slate-900">Project Details</h3>
                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>

                    <dl className="space-y-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500 font-medium">Project ID</dt>
                        <dd className="font-mono text-slate-700 font-semibold">
                          #{project._id.slice(-8)}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500 font-medium">Category</dt>
                        <dd className="font-semibold text-slate-800">{getCategoryName()}</dd>
                      </div>

                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500 font-medium">Status</dt>
                        <dd>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                              project.status === "completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : project.status === "in_progress"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {project.status ? project.status.replace("_", " ") : "Not Started"}
                          </span>
                        </dd>
                      </div>

                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500 font-medium">Start Date</dt>
                        <dd className="font-medium text-slate-800">
                          {project.startDate
                            ? format(new Date(project.startDate), "MMM dd, yyyy")
                            : "Not specified"}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between">
                        <dt className="text-slate-500 font-medium">Target End Date</dt>
                        <dd className="font-medium text-slate-800">
                          {project.endDate
                            ? format(new Date(project.endDate), "MMM dd, yyyy")
                            : "Not specified"}
                        </dd>
                      </div>

                      {project.createdAt && (
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500 font-medium">Created On</dt>
                          <dd className="text-slate-600">
                            {format(new Date(project.createdAt), "MMM dd, yyyy")}
                          </dd>
                        </div>
                      )}

                      {project.updatedAt && (
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500 font-medium">Last Modified</dt>
                          <dd className="text-slate-600">
                            {format(new Date(project.updatedAt), "MMM dd, yyyy")}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Team Members Card */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <GroupIcon className="!text-lg text-blue-900" />
                        <h3 className="text-sm font-bold text-slate-900">Assigned Team</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {assignedEmployees.length}
                        </span>
                      </div>
                      <Link
                        href={`/projects/${projectId}/team`}
                        className="text-xs font-semibold text-blue-900 hover:underline"
                      >
                        Manage →
                      </Link>
                    </div>

                    {assignedEmployees.length > 0 ? (
                      <div className="space-y-3">
                        {assignedEmployees.slice(0, 5).map((emp) => (
                          <div
                            key={emp.employeeId || emp._id}
                            className="flex items-center gap-3"
                          >
                            {emp.photo ? (
                              <img
                                src={emp.photo}
                                alt={emp.name}
                                className="h-9 w-9 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                                {(emp.name || "U").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {emp.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {emp.designation || emp.role || "Team Member"}
                              </p>
                            </div>
                          </div>
                        ))}
                        {assignedEmployees.length > 5 && (
                          <div className="pt-1 text-center">
                            <Link
                              href={`/projects/${projectId}/team`}
                              className="text-xs font-semibold text-blue-900 hover:underline"
                            >
                              + {assignedEmployees.length - 5} more members
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400">
                        <p className="text-xs">No team members assigned yet.</p>
                        <Link
                          href={`/projects/${projectId}/team`}
                          className="mt-2 inline-block text-xs font-semibold text-blue-900 hover:underline"
                        >
                          + Assign Team
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Financial Snapshot */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <AttachMoneyIcon className="!text-lg text-emerald-700" />
                        <h3 className="text-sm font-bold text-slate-900">Financial Summary</h3>
                      </div>
                      {hasPermission("project.budget") && (
                        <Link
                          href={`/project-budget/${projectId}`}
                          className="text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          Budget Hub →
                        </Link>
                      )}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Allocated Budget</span>
                        <span className="font-bold text-slate-900">
                          {new Intl.NumberFormat("en-ET", {
                            style: "currency",
                            currency: "ETB",
                            maximumFractionDigits: 0,
                          }).format(getBudgetAmount(project.budget))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Recorded Expenses</span>
                        <span className="font-bold text-red-600">
                          {new Intl.NumberFormat("en-ET", {
                            style: "currency",
                            currency: "ETB",
                            maximumFractionDigits: 0,
                          }).format(getTotalExpenses(financialData?.expenses))}
                        </span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Remaining</span>
                        <span className="font-bold text-emerald-600">
                          {new Intl.NumberFormat("en-ET", {
                            style: "currency",
                            currency: "ETB",
                            maximumFractionDigits: 0,
                          }).format(
                            Math.max(
                              0,
                              getBudgetAmount(project.budget) -
                                getTotalExpenses(financialData?.expenses)
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tasks */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <AssignmentIcon className="!text-[22px]" />
                </div>
                <Link
                  href={`/task-management?projectId=${projectId}`}
                  className="text-xs font-semibold text-blue-900 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  View →
                </Link>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Tasks
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {taskStats.total || 0}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircleIcon className="!text-sm" />
                {taskStats.completed || 0} completed
              </p>
            </div>

            {/* Budget */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <AttachMoneyIcon className="!text-[22px]" />
                </div>
                {hasPermission("project.budget") && (
                  <Link
                    href={`/project-budget/${projectId}`}
                    className="text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    Details →
                  </Link>
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Budget
              </p>
              <p className="mt-1 truncate text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat("en-ET", {
                  style: "currency",
                  currency: "ETB",
                  maximumFractionDigits: 0,
                }).format(getBudgetAmount(project.budget))}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {hasBudget(project.budget) ? "Allocated" : "Not set"}
              </p>
            </div>

            {/* Expenses */}
            <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-rose-200 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                  <AccountBalanceWalletIcon className="!text-[22px]" />
                </div>
                {hasPermission("project.budget") && (
                  <Link
                    href={`/project-budget/${projectId}`}
                    className="text-xs font-semibold text-rose-700 opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    Details →
                  </Link>
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Expenses
              </p>
                  <p className="mt-1 truncate text-2xl font-bold text-slate-900">
                    {new Intl.NumberFormat("en-ET", {
                      style: "currency",
                      currency: "ETB",
                      maximumFractionDigits: 0,
                }).format(
                  financialData.totalExpenses ||
                    getTotalExpenses(project.expenses) ||
                    0,
                )}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {financialData.budgetUtilization
                  ? `${Math.round(financialData.budgetUtilization)}% of budget`
                  : "Tracked spend"}
              </p>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:border-amber-200 hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <CalendarIcon className="!text-[22px]" />
                </div>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Timeline
              </p>
              <p className="mt-1 text-lg font-bold leading-snug text-slate-900">
                {project.startDate && project.endDate
                  ? `${format(parseISO(project.startDate), "MMM dd")} – ${format(
                      parseISO(project.endDate),
                      "MMM dd, yyyy",
                    )}`
                  : "Not specified"}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700">
                <AccessTimeIcon className="!text-sm" />
                {daysLeft !== null ? `${daysLeft} days left` : "No deadline"}
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-6 xl:col-span-2">
              {/* Team Members */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <PeopleIcon className="!text-lg text-white" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Team Members
                    </h2>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/90">
                      {assignedEmployees.length}
                    </span>
                  </div>
                  <Link
                    href={`/projects/${projectId}/team`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white"
                  >
                    Manage
                    <ArrowForwardIcon className="!text-sm" />
                  </Link>
                </div>

                <div className="p-5">
                  {assignedEmployees.length > 0 ? (
                    <div className="space-y-3">
                      {assignedEmployees.slice(0, 4).map((employee) => (
                        <div
                          key={employee._id}
                          className="flex items-center rounded-xl border border-slate-100 p-3.5 transition-colors hover:bg-slate-50"
                        >
                          <div className="mr-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-blue-600 text-base font-semibold text-white">
                            {employee.name
                              ? employee.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">
                              {employee.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {employee.position ||
                                employee.department ||
                                "Team Member"}
                            </p>
                          </div>
                          <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 sm:inline">
                            {employee.department || "Department"}
                          </span>
                        </div>
                      ))}
                      {assignedEmployees.length > 4 && (
                        <div className="pt-2 text-center">
                          <Link
                            href={`/projects/${projectId}/team`}
                            className="text-sm font-medium text-blue-900 hover:underline"
                          >
                            +{assignedEmployees.length - 4} more team members
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-2 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <PeopleIcon className="!text-3xl" />
                      </div>
                      <h3 className="text-base font-medium text-slate-800">
                        No team members yet
                      </h3>
                      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                        Assign people so they can collaborate on this project.
                      </p>
                      <Link
                        href={`/projects/${projectId}/team`}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
                      >
                        <AddIcon className="!text-lg" />
                        Assign Team Members
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <BarChartIcon className="!text-lg text-white" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Task Distribution
                    </h2>
                  </div>
                  <div className="p-5">
                    {prepareTaskStatusChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={prepareTaskStatusChartData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {prepareTaskStatusChartData().map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-52 flex-col items-center justify-center text-slate-400">
                        <BarChartIcon className="mb-2 !text-4xl opacity-40" />
                        <p className="text-sm">No task data available yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget Utilization Chart */}
                {/*} <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <AttachMoneyIcon className="w-5 h-5 text-black" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        Budget Utilization
                      </h2>
                    </div>
                  </div>
                  <div className="p-6">
                    {prepareBudgetChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={prepareBudgetChartData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {prepareBudgetChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              new Intl.NumberFormat("en-ET", {
                                style: "currency",
                                currency: "ETB",
                              }).format(value),
                              "Amount",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <p>No budget data available</p>
                      </div>
                    )}
                  </div>
                </div>
*/}
                {/* Category Progress Bar Chart */}
                {prepareCategoryProgressData().length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                        <BarChartIcon className="!text-lg text-white" />
                      </div>
                      <h2 className="text-base font-semibold text-white">
                        Progress by Category
                      </h2>
                    </div>
                    <div className="p-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prepareCategoryProgressData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => [
                              name === "progress" ? `${value}%` : value,
                              name === "progress"
                                ? "Progress"
                                : name === "completed"
                                  ? "Completed"
                                  : "Total",
                            ]}
                          />
                          <Legend />
                          <Bar
                            dataKey="completed"
                            fill="#10B981"
                            name="Completed Tasks"
                          />
                          <Bar
                            dataKey="total"
                            fill="#E5E7EB"
                            name="Total Tasks"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Project Timeline Chart */}
                {prepareTimelineData().length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2.5 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                        <CalendarIcon className="!text-lg text-white" />
                      </div>
                      <h2 className="text-base font-semibold text-white">
                        Project Timeline
                      </h2>
                    </div>
                    <div className="p-5">
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">
                            Overall Progress
                          </p>
                          <p className="text-xl font-bold text-blue-900">
                            {taskStats.progress || 0}%
                          </p>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-800 to-blue-500 transition-all duration-500"
                            style={{ width: `${taskStats.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={prepareTimelineData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => [`${value} days`, "Duration"]}
                          />
                          <Bar dataKey="days" fill="#6366F1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Milestones */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <TimelineIcon className="!text-lg text-white" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Milestones
                    </h2>
                  </div>
                  <Link
                    href={`/projects/${project._id}/milestones`}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-white"
                  >
                    <AddIcon className="!text-sm" />
                    Add
                  </Link>
                </div>

                <div className="p-5">
                  {milestones && milestones.length > 0 ? (
                    <div className="space-y-3">
                      {milestones.slice(0, 3).map((milestone) => (
                        <div
                          key={milestone._id}
                          className="rounded-xl border border-slate-100 p-3.5 transition-shadow hover:shadow-sm"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {milestone.title}
                            </h3>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                milestone.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : milestone.status === "in_progress"
                                    ? "bg-sky-50 text-sky-700"
                                    : milestone.status === "pending"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {milestone.status}
                            </span>
                          </div>

                          <div className="mb-2.5 flex items-center text-xs text-slate-500">
                            <CalendarIcon className="mr-1.5 !text-sm text-amber-500" />
                            Due{" "}
                            {format(
                              new Date(milestone.dueDate),
                              "MMM dd, yyyy",
                            )}
                          </div>

                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">
                                Progress
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700">
                                {milestone.progress || 0}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  (milestone.progress || 0) < 30
                                    ? "bg-rose-500"
                                    : (milestone.progress || 0) < 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{
                                  width: `${milestone.progress || 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {milestones.length > 3 && (
                        <div className="pt-1 text-center">
                          <Link
                            href={`/projects/${project._id}/milestones`}
                            className="text-sm font-medium text-blue-900 hover:underline"
                          >
                            View {milestones.length - 3} more
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-2 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <TimelineIcon />
                      </div>
                      <h3 className="text-sm font-medium text-slate-800">
                        No milestones
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Define milestones to track project phases.
                      </p>
                      <Link
                        href={`/projects/${project._id}/milestones`}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800"
                      >
                        <AddIcon className="!text-sm" />
                        Add Milestone
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Alerts */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                      <NotificationsIcon className="!text-lg text-white" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      Alerts
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {alertsLoading ? "…" : alerts.length}
                  </span>
                </div>

                <div className="p-5">
                  {alertsLoading ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-sm text-slate-500">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
                        Fetching alerts…
                      </div>
                      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                  ) : alerts.length > 0 ? (
                    <div className="space-y-4">
                      {alerts.slice(0, 3).map((alert) => (
                        <div
                          key={alert._id}
                          className={`p-4 rounded-lg border transition-shadow hover:shadow-sm ${
                            (alert.alertType || alert.type) === "warning"
                              ? "bg-yellow-50 border-yellow-200"
                              : (alert.alertType || alert.type) === "success"
                                ? "bg-green-50 border-green-200"
                                : (alert.alertType || alert.type) === "error"
                                  ? "bg-red-50 border-red-200"
                                  : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className="flex items-start">
                            <div
                              className={`p-2 rounded-lg mr-3 ${
                                (alert.alertType || alert.type) === "warning"
                                  ? "bg-yellow-100"
                                  : (alert.alertType || alert.type) ===
                                      "success"
                                    ? "bg-green-100"
                                    : (alert.alertType || alert.type) ===
                                        "error"
                                      ? "bg-red-100"
                                      : "bg-blue-100"
                              }`}
                            >
                              {getAlertIcon(alert.alertType || alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`text-base font-semibold mb-1 ${
                                  (alert.alertType || alert.type) === "warning"
                                    ? "text-yellow-800"
                                    : (alert.alertType || alert.type) ===
                                        "success"
                                      ? "text-green-800"
                                      : (alert.alertType || alert.type) ===
                                          "error"
                                        ? "text-red-800"
                                        : "text-blue-800"
                                }`}
                              >
                                {(alert.alertType || alert.type)
                                  .charAt(0)
                                  .toUpperCase() +
                                  (alert.alertType || alert.type).slice(1)}{" "}
                                Alert
                              </h3>
                              <p className="text-sm text-gray-700 mb-2">
                                {alert.message}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                  {format(
                                    parseISO(alert.createdAt || alert.date),
                                    "MMM dd, yyyy",
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {alerts.length > 3 && (
                        <div className="pt-2 text-center">
                          <Link
                            href={`/project-alerts?projectId=${projectId}`}
                            className="text-sm font-medium text-blue-900 hover:underline"
                          >
                            View {alerts.length - 3} more alerts
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-2 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <NotificationsOffIcon />
                      </div>
                      <h3 className="text-sm font-medium text-slate-800">
                        No alerts
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        You&apos;ll see important updates here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <HistoryIcon className="!text-lg text-white" />
                  </div>
                  <h2 className="text-base font-semibold text-white">
                    Recent Activity
                  </h2>
                </div>

                <div className="p-5">
                  {activityTimeline.length > 0 ? (
                    <div className="space-y-4">
                      {activityTimeline.map((activity) => (
                        <div key={activity.id} className="flex items-start">
                          <div
                            className={`mr-3 rounded-lg p-2 ${
                              activity.color === "green"
                                ? "bg-emerald-50 text-emerald-700"
                                : activity.color === "blue"
                                  ? "bg-sky-50 text-sky-700"
                                  : activity.color === "orange"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {getTimelineIcon(activity.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {activity.title}
                            </h3>
                            <p className="mb-1 text-xs text-slate-500">
                              {activity.description}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              {format(
                                new Date(activity.date),
                                "MMM dd, yyyy 'at' h:mm a",
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <HistoryIcon />
                      </div>
                      <h3 className="text-sm font-medium text-slate-800">
                        No recent activity
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Activity will show up as the team works.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        {/* Image Preview Lightbox Modal */}
        {imagePreviewModal && project?.imageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setImagePreviewModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                title="Close lightbox"
              >
                <CloseIcon className="!text-2xl" />
              </button>
              <img
                src={project.imageUrl}
                alt={project.name}
                className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="mt-3 flex items-center justify-between w-full px-2 text-white/80 text-sm">
                <span className="font-semibold text-white">{project.name}</span>
                <div className="flex items-center gap-3">
                  <a
                    href={project.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-300 hover:text-blue-200 underline font-medium"
                  >
                    Open Full Size
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreviewModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {isEditingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => !editLoading && setIsEditingProject(false)}
            />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit Project Details</h2>
                  <p className="text-xs text-slate-500">Update project attributes and cover image</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProject(false)}
                  disabled={editLoading}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <CloseIcon className="!text-xl" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Project Cover Photo Upload */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Cover Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-36 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {editImagePreview ? (
                        <img
                          src={editImagePreview}
                          alt="Cover preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PhotoCameraIcon className="!text-3xl text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleEditImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <PhotoCameraIcon className="!text-base text-slate-500" />
                        {editImagePreview ? "Change Photo" : "Upload Photo"}
                      </button>
                      {editImagePreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditImageFile(null);
                            setEditImagePreview(null);
                          }}
                          className="text-xs text-red-600 hover:underline block cursor-pointer"
                        >
                          Remove photo
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400">JPG, PNG, WebP up to 10MB</p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    placeholder="Enter project name..."
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Category
                    </label>
                    <select
                      value={editForm.categoryId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    >
                      <option value="">Select Category</option>
                      {projectCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Target End Date
                    </label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Description & Scope
                  </label>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    placeholder="Enter project scope and description..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingProject(false)}
                    disabled={editLoading}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-sm font-semibold text-white shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProjectDetailPage;
