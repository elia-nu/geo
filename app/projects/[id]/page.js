"use client";

import { useState, useEffect } from "react";
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

} from "@mui/icons-material";
import Link from "next/link";
import { format, parseISO } from "date-fns";

const ProjectDetailPage = ({ params }) => {
  const { id: projectId } = params;

  // Utility functions to handle budget and expense data
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

  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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


  // Fetch project data on component mount
  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);

        // Set milestones from project data if available
        if (
          projectData.project.milestones &&
          projectData.project.milestones.length > 0
        ) {
          setMilestones(projectData.project.milestones);
        }

        // Fetch assigned employees
        const teamResponse = await fetch(
          `/api/projects/${projectId}/assign-employees`
        );
        const teamData = await teamResponse.json();

        if (teamData.success) {
          setAssignedEmployees(teamData.assignedEmployees || []);
        }

        // Fetch project alerts
        try {
          const alertsResponse = await fetch(
            `/api/project-alerts?projectId=${projectId}`
          );
          const alertsData = await alertsResponse.json();

          if (alertsData.success) {
            setAlerts(alertsData.alerts || []);
          }
        } catch (alertErr) {
          console.error("Error fetching project alerts:", alertErr);
        }
      } else {
        setError(projectData.error || "Failed to fetch project details");
      }
    } catch (err) {
      setError("Error fetching project data: " + err.message);
    } finally {
      setLoading(false);
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
      default:
        return <InfoIcon />;
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
        // Update project state with new budget
        setProject((prev) => ({
          ...prev,
          budget: budgetData.totalAmount,
        }));
        setIsEditingBudget(false);
        // Optionally show success message
        console.log("Budget updated successfully");
      } else {
        console.error("Failed to update budget:", result.error);
        // Optionally show error message
      }
    } catch (error) {
      console.error("Error updating budget:", error);
      // Optionally show error message
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


  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-lg text-gray-600">Loading project details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-lg text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <p className="text-lg text-gray-600 font-medium">
              Project not found
            </p>
            <Link
              href="/projects"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors"
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
      <div className="p-6 bg-white min-h-screen">
        {/* Breadcrumbs */}
        <nav className="mb-4">
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
              <span className="text-gray-700 font-medium">{project.name}</span>
            </li>
          </ol>
        </nav>

        {/* Project Header */}
        <div className="bg-blue-900 text-white p-4 sm:p-6 mb-6 rounded-md shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4 md:gap-0">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 break-words">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white bg-opacity-20 text-blue-900 text-xs font-medium rounded-md">
                  {project.status
                    ? project.status
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")
                    : "Active"}
                </span>
                {project.category && (
                  <span className="px-3 py-1 bg-white bg-opacity-20 text-blue-900 text-xs font-medium rounded-md">
                    {project.category.charAt(0).toUpperCase() +
                      project.category.slice(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/projects/${projectId}/team`}
                className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 text-blue-900 font-medium rounded-md hover:bg-opacity-30 transition-all text-xs"
              >
                <PeopleIcon className="text-lg" />
                Manage Team
              </Link>
              <Link
                href={`/projects/${projectId}/milestones`}
                className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 text-blue-900 font-medium rounded-md hover:bg-opacity-30 transition-all text-xs"
              >
                <TimelineIcon className="text-lg" />
                Milestones
              </Link>
              <Link
                href={`/project-budget/${projectId}`}
                className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 text-blue-900 font-medium rounded-md hover:bg-opacity-30 transition-all text-xs"
              >
                <AttachMoneyIcon className="text-lg" />
                Budget Details
              </Link>

              <Link
                href={`/task-management?projectId=${projectId}`}
                className="flex items-center gap-2 px-3 py-2 bg-white bg-opacity-20 text-blue-900 font-medium rounded-md hover:bg-opacity-30 transition-all text-xs"
              >
                <AssignmentIcon className="text-lg" />
                Tasks
              </Link>

            </div>
          </div>

          {/* Project Description */}
          <p className="text-white text-opacity-90 max-w-full md:max-w-4xl leading-relaxed text-sm sm:text-base break-words">
            {project.description}
          </p>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-md shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-md mb-3">
              <AssignmentIcon className="text-blue-600 text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Total Tasks
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 truncate">
              {project.taskIds?.length || 0}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-green-600 text-xs font-semibold flex items-center">
                <ArrowUpwardIcon className="text-sm mr-1" />3 new
              </span>
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                View All
              </span>
            </div>
          </div>
          <div className="bg-white rounded-md shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <AttachMoneyIcon className="text-green-600 text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Budget</p>

            {!isEditingBudget ? (
              <>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 truncate">
                  ${getBudgetAmount(project.budget).toLocaleString()}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 text-xs font-semibold flex items-center">
                    <CheckCircleIcon className="text-sm mr-1" />
                    {hasBudget(project.budget) ? "Set" : "Not Set"}
                  </span>
                  <button
                    onClick={handleEditBudget}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-900 text-xs font-semibold rounded shadow-sm hover:bg-blue-200 transition-colors"
                  >
                    <EditIcon className="text-sm" />
                    {hasBudget(project.budget) ? "Edit" : "Add"}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Budget Amount"
                  value={budgetForm.totalAmount}
                  onChange={(e) =>
                    handleBudgetFormChange("totalAmount", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Approved By"
                  value={budgetForm.approvedBy}
                  onChange={(e) =>
                    handleBudgetFormChange("approvedBy", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveBudget}
                    disabled={budgetLoading || !budgetForm.totalAmount}
                    className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SaveIcon className="text-sm" />
                    {budgetLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancelBudgetEdit}
                    disabled={budgetLoading}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-500 text-white text-xs font-semibold rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    <CancelIcon className="text-sm" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
          <div className="bg-white rounded-md shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <AccountBalanceWalletIcon className="text-red-600 text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Total Expenses
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 truncate">
              ${getTotalExpenses(project.expenses).toLocaleString()}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-red-600 text-xs font-semibold flex items-center">
                <ArrowUpwardIcon className="text-sm mr-1" />
                30% used
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-900 text-xs font-semibold rounded shadow-sm">
                Details
              </span>
            </div>
          </div>
          <div className="bg-white rounded-md shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
              <CalendarIcon className="text-orange-600 text-2xl" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">Timeline</p>
            <h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-3 leading-tight">
              {project.startDate && project.endDate
                ? `${format(
                    parseISO(project.startDate),
                    "MMM dd, yyyy"
                  )} - ${format(parseISO(project.endDate), "MMM dd, yyyy")}`
                : "Not specified"}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-orange-600 text-xs font-semibold flex items-center">
                <AccessTimeIcon className="text-sm mr-1" />
                {project.endDate
                  ? `${Math.ceil(
                      (new Date(project.endDate) - new Date()) /
                        (1000 * 60 * 60 * 24)
                    )} days left`
                  : "Not set"}
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-900 text-xs font-semibold rounded shadow-sm">
                Timeline
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team Members Section */}
          <div className="h-full">
            <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden h-full">
              <div className="flex justify-between items-center p-4 pb-3 bg-blue-900 text-white">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 w-8 h-8 rounded-md flex items-center justify-center mr-3">
                    <PeopleIcon className="text-blue-500" />
                  </div>
                  <h2 className="text-xl font-semibold">Team Members</h2>
                </div>
                <Link
                  href={`/projects/${projectId}/team`}
                  className="flex items-center gap-2 text-blue-900 bg-white bg-opacity-20 hover:bg-opacity-35 rounded-md px-3 py-1.5 text-xs font-medium transition-colors shadow-sm"
                >
                  View All
                  <ArrowForwardIcon className="w-4 h-4" />
                </Link>
              </div>

              <div className="p-4 sm:p-6 pt-3 sm:pt-4">
                {assignedEmployees.length > 0 ? (
                  <div className="space-y-0">
                    {assignedEmployees.slice(0, 3).map((employee) => (
                      <div
                        key={employee._id}
                        className="flex items-center px-3 py-2 rounded-md mb-2 hover:bg-gray-50 transition-colors"
                      >
                        <div className="mr-4">
                          <div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center text-white font-medium">
                            {employee.name ? employee.name.charAt(0) : "U"}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {employee.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.position || employee.department || ""}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 shadow-sm truncate max-w-full">
                          {employee.department || "Department"}
                        </span>
                      </div>
                    ))}
                    {assignedEmployees.length > 3 && (
                      <div className="flex justify-center mt-4">
                        <Link
                          href={`/projects/${projectId}/team`}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-xs bg-gray-50 hover:bg-blue-50 transition-colors"
                        >
                          +{assignedEmployees.length - 3} more team members
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 flex flex-col items-center justify-center">
                    <div className="bg-gray-50 w-12 h-12 rounded-md flex items-center justify-center mb-3">
                      <PeopleIcon className="text-blue-900 text-3xl" />
                    </div>
                    <p className="text-gray-500 mb-4">
                      No team members assigned to this project.
                    </p>
                    <Link
                      href={`/projects/${projectId}/team`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50 transition-colors"
                    >
                      <AddIcon className="w-4 h-4" />
                      Assign Team Members
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="h-full">
            <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden h-full">
              <div className="flex justify-between items-center p-4 pb-3 bg-blue-900 text-white">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 w-8 h-8 rounded-md flex items-center justify-center mr-3">
                    <TimelineIcon className="text-blue-900" />
                  </div>
                  <h2 className="text-xl font-semibold">Milestones</h2>
                </div>
                <button className="flex items-center gap-2 text-blue-900 bg-white bg-opacity-20 hover:bg-opacity-35 rounded-lg px-4 py-2 text-sm font-medium transition-colors shadow-sm">
                  <AddIcon className="w-4 h-4" />
                  Add
                </button>
              </div>

              <div className="p-4 sm:p-6 pt-3 sm:pt-4">
                {milestones && milestones.length > 0 ? (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone._id}
                        className="p-3 border border-gray-200 rounded-md hover:shadow-sm transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-base font-semibold text-[#1a3e72] break-words">
                            {milestone.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                              getStatusColor(milestone.status) === "success"
                                ? "bg-green-100 text-green-900 shadow-sm"
                                : getStatusColor(milestone.status) === "warning"
                                ? "bg-orange-100 text-orange-900 shadow-sm"
                                : getStatusColor(milestone.status) === "error"
                                ? "bg-red-100 text-red-900 shadow-sm"
                                : "bg-blue-100 text-blue-900 shadow-sm"
                            }`}
                          >
                            {milestone.status}
                          </span>
                        </div>
                        <div className="flex items-center mb-3">
                          <div className="bg-orange-100 w-5 h-5 rounded-md flex items-center justify-center mr-2">
                            <CalendarIcon className="text-orange-500 text-sm" />
                          </div>
                          <p className="text-sm text-gray-600 font-medium truncate">
                            Due:{" "}
                            {format(
                              new Date(milestone.dueDate),
                              "MMM dd, yyyy"
                            )}
                          </p>
                        </div>
                        <div className="w-full">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-gray-600">
                              Progress
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                (milestone.progress || 0) < 30
                                  ? "text-red-500"
                                  : (milestone.progress || 0) < 70
                                  ? "text-orange-500"
                                  : "text-green-500"
                              }`}
                            >
                              {milestone.progress || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-md h-1.5">
                            <div
                              className={`h-1.5 rounded-md ${
                                (milestone.progress || 0) < 30
                                  ? "bg-red-500"
                                  : (milestone.progress || 0) < 70
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${milestone.progress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 flex flex-col items-center justify-center">
                    <div className="bg-gray-50 w-12 h-12 rounded-md flex items-center justify-center mb-3">
                      <TimelineIcon className="text-gray-400 text-3xl" />
                    </div>
                    <p className="text-gray-500 mb-4">
                      No milestones defined for this project.
                    </p>
                    <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50 transition-colors">
                      <AddIcon className="w-4 h-4" />
                      Add Milestone
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Progress Chart */}
          <div className="col-span-12 md:col-span-6">
            <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
              <div className="flex justify-between items-center p-3 pb-2 bg-blue-900 text-white">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center mr-2">
                    <BarChartIcon className="text-blue-900" />
                  </div>
                  <h2 className="text-xl font-semibold">Project Progress</h2>
                </div>
              </div>

              <div className="p-3">
                {/* Simple Bar Chart Visualization */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <p className="text-sm font-semibold">Tasks Completion</p>
                    <p className="text-sm text-blue-800 font-bold">
                      {project.progress || 65}%
                    </p>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-md relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-600 rounded-md"
                      style={{ width: `${project.progress || 65}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-1.5 bg-gray-50 rounded-md text-center">
                    <span className="text-xs text-gray-600 block">
                      Completed Tasks
                    </span>
                    <span className="text-lg font-bold text-green-500">
                      {project.completedTasks || 8}
                    </span>
                  </div>
                  <div className="p-1.5 bg-gray-50 rounded-md text-center">
                    <span className="text-xs text-gray-600 block">
                      Pending Tasks
                    </span>
                    <span className="text-lg font-bold text-orange-500">
                      {project.pendingTasks || 4}
                    </span>
                  </div>
                </div>

                {/* Task Progress Bars */}
                <h3 className="text-sm font-semibold mb-1.5">
                  Task Categories
                </h3>
                <div className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-gray-600">Development</span>
                    <span className="text-xs font-semibold">80%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-md mb-1.5">
                    <div
                      className="h-full bg-blue-500 rounded-md"
                      style={{ width: "80%" }}
                    ></div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-gray-600">Design</span>
                    <span className="text-xs font-semibold">60%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-md mb-1.5">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: "60%" }}
                    ></div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-gray-600">Testing</span>
                    <span className="text-xs font-semibold">45%</span>
                  </div>
                  <div className="h-1.5 bg-gray-300 rounded-full">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: "45%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="col-span-12 md:col-span-6">
            <div className="bg-white rounded-lg shadow-sm h-full overflow-hidden">
              <div className="flex justify-between items-center p-3 pb-2 bg-blue-900 text-white">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center mr-2">
                    <NotificationsIcon className="text-blue-900" />
                  </div>
                  <h2 className="text-xl font-semibold">Project Alerts</h2>
                </div>
                <span className="px-2 py-1 bg-white bg-opacity-20 text-blue-900 text-xs font-semibold rounded shadow-sm">
                  {alerts.length} alerts
                </span>
              </div>

              <div className="p-2 sm:p-3 pt-1.5 sm:pt-2">
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert._id}
                        className={`p-2 rounded-md border border-gray-200 transition-shadow hover:shadow-sm ${
                          (alert.alertType || alert.type) === "warning"
                            ? "bg-yellow-100"
                            : (alert.alertType || alert.type) === "success"
                            ? "bg-green-100"
                            : (alert.alertType || alert.type) === "error"
                            ? "bg-red-100"
                            : "bg-blue-100"
                        }`}
                      >
                        <div className="flex items-start">
                          <div
                            className={`mr-2 w-8 h-8 rounded-md flex items-center justify-center ${
                              (alert.alertType || alert.type) === "warning"
                                ? "bg-orange-300"
                                : (alert.alertType || alert.type) === "success"
                                ? "bg-green-300"
                                : (alert.alertType || alert.type) === "error"
                                ? "bg-red-300"
                                : "bg-blue-300"
                            }`}
                          >
                            {getAlertIcon(alert.alertType || alert.type)}
                          </div>
                          <div className="flex-grow">
                            <h3
                              className={`text-base font-semibold mb-0.5 ${
                                (alert.alertType || alert.type) === "warning"
                                  ? "text-orange-800"
                                  : (alert.alertType || alert.type) ===
                                    "success"
                                  ? "text-green-800"
                                  : (alert.alertType || alert.type) === "error"
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
                            <p className="text-sm mb-1 break-words">
                              {alert.message}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600 font-medium">
                                {format(
                                  parseISO(alert.createdAt || alert.date),
                                  "MMM dd, yyyy"
                                )}
                              </span>
                              <button
                                className={`text-xs ${
                                  (alert.alertType || alert.type) === "warning"
                                    ? "text-orange-700"
                                    : (alert.alertType || alert.type) ===
                                      "success"
                                    ? "text-green-700"
                                    : (alert.alertType || alert.type) ===
                                      "error"
                                    ? "text-red-700"
                                    : "text-blue-700"
                                } hover:underline`}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 flex flex-col items-center justify-center">
                    <div className="bg-gray-50 w-12 h-12 rounded-md flex items-center justify-center mb-3">
                      <NotificationsOffIcon className="text-gray-400 text-3xl" />
                    </div>
                    <p className="text-gray-500 mb-4">
                      No alerts for this project.
                    </p>
                    <p className="text-sm text-gray-400">
                      You'll be notified here when there are important updates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Timeline Section */}
          <div className="col-span-1 md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center p-4 pb-3 bg-blue-900 text-white">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 w-8 h-8 rounded-md flex items-center justify-center mr-3">
                    <HistoryIcon className="text-blue-900" />
                  </div>
                  <h2 className="text-xl font-semibold">Activity Timeline</h2>
                </div>
              </div>

              <div className="p-4 sm:p-6 pt-3 sm:pt-4">
                {/* Timeline Component */}
                <div className="flex flex-col relative">
                  {/* Timeline Line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></div>

                  {/* Timeline Items */}
                  <div className="flex mb-6 relative z-10">
                    <div className="w-8 h-8 rounded-md bg-green-500 flex items-center justify-center mr-3">
                      <CheckCircleIcon className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 break-words">
                        Project Created
                      </h3>
                      <p className="text-sm text-gray-600 mb-1 break-words">
                        Initial project setup completed
                      </p>
                      <span className="text-xs text-gray-500">
                        {project.startDate
                          ? format(parseISO(project.startDate), "MMM dd, yyyy")
                          : "Jan 15, 2025"}
                      </span>
                    </div>
                  </div>

                  <div className="flex mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md mr-4">
                      <PeopleIcon className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 break-words">
                        Team Assigned
                      </h3>
                      <p className="text-sm text-gray-600 mb-1 break-words">
                        {assignedEmployees.length} team members were assigned to
                        the project
                      </p>
                      <span className="text-xs text-gray-500">
                        {project.startDate
                          ? format(parseISO(project.startDate), "MMM dd, yyyy")
                          : "Jan 16, 2025"}
                      </span>
                    </div>
                  </div>

                  <div className="flex relative z-10">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md mr-4">
                      <TimelineIcon className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 break-words">
                        Milestones Created
                      </h3>
                      <p className="text-sm text-gray-600 mb-1 break-words">
                        {milestones.length} milestones were defined for the
                        project
                      </p>
                      <span className="text-xs text-gray-500">
                        {project.startDate
                          ? format(parseISO(project.startDate), "MMM dd, yyyy")
                          : "Jan 18, 2025"}
                      </span>
                    </div>
                  </div>
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
