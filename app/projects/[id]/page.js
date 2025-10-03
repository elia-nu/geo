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

const ProjectDetailPage = ({ params }) => {
  const { id: projectId } = use(params);

  // State management
  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [alerts, setAlerts] = useState([]);
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
    currency: "USD",
    description: "",
    approvedBy: "",
    approvalDate: "",
  });
  const [budgetLoading, setBudgetLoading] = useState(false);

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

  const fetchAllProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel for better performance
      const [
        projectResponse,
        teamResponse,
        alertsResponse,
        tasksResponse,
        financialResponse,
      ] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/assign-employees`),
        fetch(`/api/project-alerts?projectId=${projectId}`),
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/financial-summary`),
      ]);

      // Process project data
      const projectData = await projectResponse.json();
      if (projectData.success) {
        setProject(projectData.project);
        if (projectData.project.milestones?.length > 0) {
          setMilestones(projectData.project.milestones);
        }
      } else {
        throw new Error(projectData.error || "Failed to fetch project details");
      }

      // Process team data
      const teamData = await teamResponse.json();
      if (teamData.success) {
        setAssignedEmployees(teamData.assignedEmployees || []);
      }

      // Process alerts data
      const alertsData = await alertsResponse.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts || []);
      }

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
    } catch (err) {
      console.error("Error fetching project data:", err);
      setError("Error fetching project data: " + err.message);
    } finally {
      setLoading(false);
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
    await fetchAllProjectData();
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
      currency: "USD",
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
      currency: "USD",
      description: "",
      approvedBy: "",
      approvalDate: "",
    });
  };

  const handleSaveBudget = async () => {
    try {
      setBudgetLoading(true);

      const budgetData = {
        totalAmount: parseFloat(budgetForm.totalAmount) || 0,
        currency: budgetForm.currency,
        description: budgetForm.description,
        approvedBy: budgetForm.approvedBy,
        approvalDate: budgetForm.approvalDate,
        budgetAllocations: [],
      };

      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(budgetData),
      });

      const result = await response.json();

      if (result.success) {
        setProject((prev) => ({
          ...prev,
          budget: budgetData.totalAmount,
        }));
        setIsEditingBudget(false);
        await refreshData(); // Refresh all data
      } else {
        console.error("Failed to update budget:", result.error);
      }
    } catch (error) {
      console.error("Error updating budget:", error);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleBudgetFormChange = (field, value) => {
    setBudgetForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="flex flex-col items-center space-y-4 p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-xl text-gray-600 font-medium">
              Loading project details...
            </p>
            <p className="text-sm text-gray-500">
              Please wait while we fetch the latest data
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Error Loading Project
            </h2>
            <p className="text-lg text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={refreshData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Project not found
  if (!project) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Project Not Found
            </h2>
            <p className="text-lg text-gray-600 font-medium mb-4">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Link
              href="/projects"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="py-4">
              <ol className="flex items-center space-x-2 text-sm">
                <li>
                  <Link
                    href="/projects"
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ArrowBackIcon className="mr-1 text-lg" />
                    Projects
                  </Link>
                </li>
                <li className="flex items-center">
                  <svg
                    className="w-4 h-4 text-gray-400 mx-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700 font-medium truncate">
                    {project.name}
                  </span>
                </li>
              </ol>
            </nav>

            {/* Project Header */}
            <div className="pb-6">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
                      {project.name}
                    </h1>
                    <button
                      onClick={refreshData}
                      disabled={refreshing}
                      className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg transition-colors disabled:opacity-50 border border-gray-300"
                      title="Refresh data"
                    >
                      <RefreshIcon
                        className={`w-5 h-5 ${
                          refreshing ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        project.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : project.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : project.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {project.status
                        ? project.status
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")
                        : "Active"}
                    </span>
                    {project.category && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {project.category.charAt(0).toUpperCase() +
                          project.category.slice(1)}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                      {taskStats.progress || 0}% Complete
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-4xl">
                    {project.description}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 lg:flex-col lg:w-auto w-full">
                  <Link
                    href={`/projects/${projectId}/team`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1 lg:flex-none justify-center"
                  >
                    <PeopleIcon className="w-4 h-4" />
                    Team
                  </Link>
                  <Link
                    href={`/task-management?projectId=${projectId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm flex-1 lg:flex-none justify-center"
                  >
                    <AssignmentIcon className="w-4 h-4" />
                    Tasks
                  </Link>
                  <Link
                    href={`/project-budget/${projectId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors text-sm flex-1 lg:flex-none justify-center"
                  >
                    <AttachMoneyIcon className="w-4 h-4" />
                    Budget
                  </Link>
                  <Link
                    href={`/projects/${project._id}/milestones`}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors text-sm flex-1 lg:flex-none justify-center"
                  >
                    <TrendingUpIcon className="w-4 h-4" />
                    Milestones
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Tasks */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <AssignmentIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {taskStats.total || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-600 font-semibold flex items-center">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  {taskStats.completed || 0} completed
                </span>
                <Link
                  href={`/task-management?projectId=${projectId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>

            {/* Budget */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <AttachMoneyIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Budget</p>
                  {!isEditingBudget ? (
                    <p className="text-2xl font-bold text-gray-900">
                      ${getBudgetAmount(project.budget).toLocaleString()}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={budgetForm.totalAmount}
                        onChange={(e) =>
                          handleBudgetFormChange("totalAmount", e.target.value)
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                {!isEditingBudget ? (
                  <>
                    <span className="text-green-600 font-semibold flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      {hasBudget(project.budget) ? "Set" : "Not Set"}
                    </span>
                    <button
                      onClick={handleEditBudget}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <EditIcon className="w-3 h-3" />
                      {hasBudget(project.budget) ? "Edit" : "Add"}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-1 w-full">
                    <button
                      onClick={handleSaveBudget}
                      disabled={budgetLoading || !budgetForm.totalAmount}
                      className="flex-1 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {budgetLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleCancelBudgetEdit}
                      disabled={budgetLoading}
                      className="flex-1 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AccountBalanceWalletIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">
                    $
                    {(
                      financialData.totalExpenses ||
                      getTotalExpenses(project.expenses) ||
                      0
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600 font-semibold flex items-center">
                  <TrendingUpIcon className="w-4 h-4 mr-1" />
                  {financialData.budgetUtilization
                    ? `${Math.round(financialData.budgetUtilization)}%`
                    : "0%"}{" "}
                  used
                </span>
                <Link
                  href={`/project-budget/${projectId}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Details
                </Link>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CalendarIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 font-medium">Timeline</p>
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {project.startDate && project.endDate
                      ? `${format(
                          parseISO(project.startDate),
                          "MMM dd"
                        )} - ${format(parseISO(project.endDate), "MMM dd")}`
                      : "Not specified"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-600 font-semibold flex items-center">
                  <AccessTimeIcon className="w-4 h-4 mr-1" />
                  {project.endDate
                    ? `${Math.max(
                        0,
                        differenceInDays(new Date(project.endDate), new Date())
                      )} days left`
                    : "No deadline"}
                </span>
                <span className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                  Timeline
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Team & Milestones */}
            <div className="xl:col-span-2 space-y-8">
              {/* Team Members Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <PeopleIcon className="w-5 h-5 text-gray-900" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        Team Members
                      </h2>
                    </div>
                    <Link
                      href={`/projects/${projectId}/team`}
                      className="flex items-center gap-2 text-gray-700 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-sm font-medium transition-colors shadow-sm border border-gray-200"
                    >
                      View All
                      <ArrowForwardIcon className="w-4 h-4 text-gray-900" />
                    </Link>
                  </div>
                </div>

                <div className="p-6">
                  {assignedEmployees.length > 0 ? (
                    <div className="space-y-4">
                      {assignedEmployees.slice(0, 4).map((employee) => (
                        <div
                          key={employee._id}
                          className="flex items-center p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg mr-4">
                            {employee.name
                              ? employee.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold text-gray-900 truncate">
                              {employee.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {employee.position ||
                                employee.department ||
                                "Team Member"}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {employee.department || "Department"}
                          </span>
                        </div>
                      ))}
                      {assignedEmployees.length > 4 && (
                        <div className="text-center pt-4">
                          <Link
                            href={`/projects/${projectId}/team`}
                            className="inline-flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            +{assignedEmployees.length - 4} more team members
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <PeopleIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Team Members
                      </h3>
                      <p className="text-gray-500 mb-4">
                        No team members have been assigned to this project yet.
                      </p>
                      <Link
                        href={`/projects/${projectId}/team`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <AddIcon className="w-4 h-4" />
                        Assign Team Members
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Project Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Status Distribution Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <BarChartIcon className="w-5 h-5 text-gray-900" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        Task Distribution
                      </h2>
                    </div>
                  </div>
                  <div className="p-6">
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
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <p>No task data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget Utilization Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <AttachMoneyIcon className="w-5 h-5 text-gray-900" />
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
                              `$${value.toLocaleString()}`,
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

                {/* Category Progress Bar Chart */}
                {prepareCategoryProgressData().length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                          <BarChartIcon className="w-5 h-5 text-gray-900" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                          Progress by Category
                        </h2>
                      </div>
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                          <CalendarIcon className="w-5 h-5 text-gray-900" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                          Project Timeline
                        </h2>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-lg font-semibold text-gray-900">
                            Overall Progress
                          </p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {taskStats.progress || 0}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
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

            {/* Right Column - Milestones & Alerts */}
            <div className="space-y-8">
              {/* Milestones Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <TimelineIcon className="w-5 h-5 text-gray-900" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        Milestones
                      </h2>
                    </div>
                    <Link
                      href={`/projects/${project._id}/milestones`}
                      className="flex items-center gap-2 text-gray-700 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg px-3 py-2 text-sm font-medium transition-colors shadow-sm border border-gray-200"
                    >
                      <AddIcon className="w-4 h-4 text-gray-700" />
                      Add
                    </Link>
                  </div>
                </div>

                <div className="p-6">
                  {milestones && milestones.length > 0 ? (
                    <div className="space-y-4">
                      {milestones.slice(0, 3).map((milestone) => (
                        <div
                          key={milestone._id}
                          className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-base font-semibold text-gray-900 flex-1 pr-2">
                              {milestone.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                                milestone.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : milestone.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : milestone.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {milestone.status}
                            </span>
                          </div>

                          <div className="flex items-center mb-3 text-sm text-gray-600">
                            <CalendarIcon className="w-4 h-4 mr-2 text-orange-500" />
                            <span>
                              Due:{" "}
                              {format(
                                new Date(milestone.dueDate),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">
                                Progress
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  (milestone.progress || 0) < 30
                                    ? "text-red-500"
                                    : (milestone.progress || 0) < 70
                                    ? "text-yellow-500"
                                    : "text-green-500"
                                }`}
                              >
                                {milestone.progress || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  (milestone.progress || 0) < 30
                                    ? "bg-red-500"
                                    : (milestone.progress || 0) < 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${milestone.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {milestones.length > 3 && (
                        <div className="text-center pt-2">
                          <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                            View {milestones.length - 3} more milestones
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <TimelineIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Milestones
                      </h3>
                      <p className="text-gray-500 mb-4">
                        No milestones have been defined for this project yet.
                      </p>
                      <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <AddIcon className="w-4 h-4" />
                        Add Milestone
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Alerts Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                        <NotificationsIcon className="w-5 h-5 text-gray-900" />
                      </div>
                      <h2 className="text-xl font-semibold text-white">
                        Project Alerts
                      </h2>
                    </div>
                    <span className="px-3 py-1 bg-white bg-opacity-90 text-gray-700 text-xs font-semibold rounded-full shadow-sm border border-gray-200">
                      {alerts.length}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {alerts.length > 0 ? (
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
                                <button
                                  className={`text-xs font-medium hover:underline ${
                                    (alert.alertType || alert.type) ===
                                    "warning"
                                      ? "text-yellow-700"
                                      : (alert.alertType || alert.type) ===
                                        "success"
                                      ? "text-green-700"
                                      : (alert.alertType || alert.type) ===
                                        "error"
                                      ? "text-red-700"
                                      : "text-blue-700"
                                  }`}
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {alerts.length > 3 && (
                        <div className="text-center pt-2">
                          <button className="text-sm text-orange-600 hover:text-orange-800 font-medium">
                            View {alerts.length - 3} more alerts
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <NotificationsOffIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Alerts
                      </h3>
                      <p className="text-gray-500">
                        No alerts for this project. You'll be notified here when
                        there are important updates.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg mr-3">
                      <HistoryIcon className="w-5 h-5 text-gray-900" />
                    </div>
                    <h2 className="text-xl font-semibold text-white">
                      Recent Activity
                    </h2>
                  </div>
                </div>

                <div className="p-6">
                  {activityTimeline.length > 0 ? (
                    <div className="space-y-4">
                      {activityTimeline.map((activity, index) => (
                        <div key={activity.id} className="flex items-start">
                          <div
                            className={`p-2 rounded-lg mr-4 ${
                              activity.color === "green"
                                ? "bg-green-100"
                                : activity.color === "blue"
                                ? "bg-blue-100"
                                : activity.color === "orange"
                                ? "bg-orange-100"
                                : "bg-gray-100"
                            }`}
                          >
                            {getTimelineIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900">
                              {activity.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-1">
                              {activity.description}
                            </p>
                            <span className="text-xs text-gray-500">
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
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <HistoryIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Recent Activity
                      </h3>
                      <p className="text-gray-500">
                        Project activity will appear here as team members work
                        on tasks and milestones.
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
