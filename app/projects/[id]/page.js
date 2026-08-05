"use client";

import { useState, useEffect, use } from "react";
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

const ProjectDetailPage = ({ params }) => {
  const { id: projectId } = use(params);

  // State management
  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [financialData, setFinancialData] = useState({});
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
  }, [projectId]);

  const fetchAllProjectData = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Fetch core data in parallel for better performance (alerts loaded separately)
      const [projectResponse, teamResponse, tasksResponse, financialResponse] =
        await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/assign-employees`),
          fetch(`/api/tasks?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}/financial-summary`),
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
            `/api/project-alerts?projectId=${projectId}&status=active`
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
      (task) => task.status === "completed"
    ).length;
    const inProgress = tasks.filter(
      (task) => task.status === "in_progress"
    ).length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const overdue = tasks.filter(
      (task) =>
        task.dueDate &&
        isAfter(new Date(), new Date(task.dueDate)) &&
        task.status !== "completed"
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
    {
      href: `/project-budget/${projectId}`,
      label: "Budget",
      icon: AttachMoneyIcon,
    },
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
    project.description.trim().toLowerCase() !== project.name?.trim().toLowerCase()
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                      {project.name}
                    </h1>
                    <button
                      onClick={refreshData}
                      disabled={refreshing}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-900 disabled:cursor-wait disabled:opacity-50"
                      title="Refresh data"
                    >
                      <RefreshIcon
                        className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
                      />
                    </button>
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
                    <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">
                      {descriptionText}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">Overall progress</span>
                  <span className="font-semibold text-blue-900">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-800 to-blue-600 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>

              {/* Horizontal nav tabs */}
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
                <nav
                  className="flex gap-1 border-b border-slate-200 pb-0"
                  aria-label="Project sections"
                >
                  {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      className="group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-900"
                    >
                      <Icon className="!text-[18px] text-slate-400 transition-colors group-hover:text-blue-900" />
                      {label}
                      <span className="absolute inset-x-2 bottom-0 h-0.5 scale-x-0 rounded-full bg-blue-900 transition-transform group-hover:scale-x-100" />
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                <Link
                  href={`/project-budget/${projectId}`}
                  className="text-xs font-semibold text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Details →
                </Link>
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
                <Link
                  href={`/project-budget/${projectId}`}
                  className="text-xs font-semibold text-rose-700 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Details →
                </Link>
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
                    0
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
                      "MMM dd, yyyy"
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
                              )
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
                              "MMM dd, yyyy"
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
                                  : (alert.alertType || alert.type) === "error"
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
                                    "MMM dd, yyyy"
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
                                "MMM dd, yyyy 'at' h:mm a"
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
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetailPage;
