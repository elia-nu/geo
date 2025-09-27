"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/navigation";
import {
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";

const BudgetManagementPage = () => {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetData, setBudgetData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [financialSummary, setFinancialSummary] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchFinancialSummary();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
        // Fetch budget data for each project
        await fetchBudgetData(data.projects);
      } else {
        setError(data.error || "Failed to fetch projects");
      }
    } catch (err) {
      setError("Error fetching projects: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetData = async (projectList) => {
    const budgetPromises = projectList.map(async (project) => {
      try {
        const response = await fetch(`/api/projects/${project._id}/budget`);
        const data = await response.json();
        return { projectId: project._id, budget: data.budget };
      } catch (err) {
        return { projectId: project._id, budget: null };
      }
    });

    const budgetResults = await Promise.all(budgetPromises);
    const budgetMap = {};
    budgetResults.forEach(({ projectId, budget }) => {
      budgetMap[projectId] = budget;
    });
    setBudgetData(budgetMap);
  };

  const fetchFinancialSummary = async () => {
    try {
      const response = await fetch(
        "/api/projects/financial-reports?type=overview"
      );
      const data = await response.json();
      if (data.success) {
        setFinancialSummary(data);
      }
    } catch (err) {
      console.error("Error fetching financial summary:", err);
    }
  };

  const handleCreateBudget = (projectId) => {
    router.push(`/project-budget/${projectId}?action=create`);
  };

  const handleViewBudget = (projectId) => {
    router.push(`/project-budget/${projectId}`);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "overrun":
      case "high_risk":
      case "loss":
        return "text-red-600 bg-red-100";
      case "warning":
      case "medium_risk":
        return "text-yellow-600 bg-yellow-100";
      case "normal":
      case "good":
      case "profitable":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "overrun":
      case "high_risk":
      case "loss":
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case "warning":
      case "medium_risk":
        return <ClockIcon className="w-5 h-5" />;
      case "normal":
      case "good":
      case "profitable":
        return <CheckCircleIcon className="w-5 h-5" />;
      default:
        return <ChartBarIcon className="w-5 h-5" />;
    }
  };

  // Filter and sort projects
  let filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;

    const budget = budgetData[project._id];
    const hasBudget = !!budget;

    if (filterStatus === "with_budget") return matchesSearch && hasBudget;
    if (filterStatus === "without_budget") return matchesSearch && !hasBudget;
    if (filterStatus === "overrun")
      return matchesSearch && hasBudget && budget.summary?.status === "overrun";
    if (filterStatus === "warning")
      return matchesSearch && hasBudget && budget.summary?.status === "warning";
    if (filterStatus === "normal")
      return matchesSearch && hasBudget && budget.summary?.status === "normal";

    return matchesSearch;
  });

  // Sort projects
  filteredProjects.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "budget":
        aValue = budgetData[a._id]?.totalAmount || 0;
        bValue = budgetData[b._id]?.totalAmount || 0;
        break;
      case "expenses":
        aValue = budgetData[a._id]?.summary?.totalExpenses || 0;
        bValue = budgetData[b._id]?.summary?.totalExpenses || 0;
        break;
      case "utilization":
        aValue = budgetData[a._id]?.summary?.budgetUtilization || 0;
        bValue = budgetData[b._id]?.summary?.budgetUtilization || 0;
        break;
      case "status":
        aValue = budgetData[a._id]?.summary?.status || "no_budget";
        bValue = budgetData[b._id]?.summary?.status || "no_budget";
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalBudget = Object.values(budgetData).reduce(
    (sum, budget) => sum + (budget?.totalAmount || 0),
    0
  );

  const totalExpenses = Object.values(budgetData).reduce(
    (sum, budget) => sum + (budget?.summary?.totalExpenses || 0),
    0
  );

  const totalIncome = Object.values(budgetData).reduce(
    (sum, budget) => sum + (budget?.summary?.totalIncome || 0),
    0
  );

  const projectsWithBudget = filteredProjects.filter(
    (project) => budgetData[project._id]
  ).length;

  const overrunProjects = Object.values(budgetData).filter(
    (budget) => budget?.summary?.status === "overrun"
  ).length;

  const warningProjects = Object.values(budgetData).filter(
    (budget) => budget?.summary?.status === "warning"
  ).length;

  if (loading) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="budget-management">
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Budget Management
              </h1>
              <p className="text-gray-600">
                Comprehensive budget, expense, and income tracking for all
                projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/projects")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                View Projects
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Projects with Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {projectsWithBudget}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Overrun Projects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overrunProjects}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        {financialSummary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Financial Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(financialSummary.summary?.totalBudget || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(financialSummary.summary?.totalExpenses || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(financialSummary.summary?.totalIncome || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Profit/Loss</p>
                <p
                  className={`text-xl font-bold ${
                    (financialSummary.summary?.totalProfitLoss || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    financialSummary.summary?.totalProfitLoss || 0
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Projects</option>
                <option value="with_budget">With Budget</option>
                <option value="without_budget">Without Budget</option>
                <option value="overrun">Overrun</option>
                <option value="warning">Warning</option>
                <option value="normal">Normal</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="budget">Sort by Budget</option>
                <option value="expenses">Sort by Expenses</option>
                <option value="utilization">Sort by Utilization</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Budgets ({filteredProjects.length})
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center">
                <BuildingOfficeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No projects found</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const budget = budgetData[project._id];
                const hasBudget = !!budget;
                const budgetStatus = budget?.summary?.status || "no_budget";

                return (
                  <div key={project._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {project.name}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              budgetStatus
                            )}`}
                          >
                            {budgetStatus === "no_budget"
                              ? "No Budget"
                              : budgetStatus}
                          </span>
                          {hasBudget && (
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              {getStatusIcon(budgetStatus)}
                              {formatPercentage(
                                budget.summary?.budgetUtilization || 0
                              )}{" "}
                              utilized
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">
                          {project.description || "No description"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Category: {project.category || "General"}</span>
                          {project.startDate && (
                            <span>
                              Start:{" "}
                              {format(
                                parseISO(project.startDate),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          )}
                          {hasBudget && (
                            <>
                              <span className="font-medium text-green-600">
                                Budget:{" "}
                                {formatCurrency(
                                  budget.totalAmount,
                                  budget.currency
                                )}
                              </span>
                              <span className="font-medium text-blue-600">
                                Expenses:{" "}
                                {formatCurrency(
                                  budget.summary?.totalExpenses || 0
                                )}
                              </span>
                              <span className="font-medium text-purple-600">
                                Income:{" "}
                                {formatCurrency(
                                  budget.summary?.totalIncome || 0
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {hasBudget && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  (budget.summary?.budgetUtilization || 0) > 100
                                    ? "bg-red-500"
                                    : (budget.summary?.budgetUtilization || 0) >
                                      90
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    budget.summary?.budgetUtilization || 0,
                                    100
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {hasBudget ? (
                          <>
                            <button
                              onClick={() => handleViewBudget(project._id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <EyeIcon className="w-4 h-4" />
                              View Dashboard
                            </button>
                            <button
                              onClick={() => handleViewBudget(project._id)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                              Manage
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleCreateBudget(project._id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Create Budget
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BudgetManagementPage;
