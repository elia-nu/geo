"use client";

import { useState, useEffect } from "react";
import {
  Building as BuildingOfficeIcon,
  BarChart2 as ChartBarIcon,
  DollarSign as CurrencyDollarIcon,
  AlertTriangle as ExclamationTriangleIcon,
  CheckCircle,
  Clock,
  Banknote as BanknotesIcon,
  FileText as DocumentTextIcon,
  Plus,
  Eye,
  Filter as FunnelIcon,
  Download as ArrowDownTrayIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BudgetManagement() {
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

  const formatCurrency = (amount, currency = "ETB") => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount || 0);
  };

  const formatPercentage = (value) => `${(value || 0).toFixed(1)}%`;

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
        return <Clock className="w-5 h-5" />;
      case "normal":
      case "good":
      case "profitable":
        return <CheckCircle className="w-5 h-5" />;
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
    return sortOrder === "asc"
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
      ? 1
      : -1;
  });

  const totalBudget = Object.values(budgetData).reduce(
    (sum, budget) => sum + (Number(budget?.totalAmount) || 0),
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="mb-8">
        <div className="row row-between row-wrap stack-md">
          <div>
            <h1 className="heading-xl">Budget Management</h1>
            <p className="muted">
              Comprehensive budget, expense, and income tracking for all
              projects
            </p>
          </div>
          <div className="row stack-sm">
            <a href="/hrm?section=projects" className="btn btn-primary">
              <BuildingOfficeIcon className="w-4 h-4" />
              View Projects
            </a>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <div className="card card-elevated">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm muted">Total Projects</p>
              <p className="text-2xl font-bold">{projects.length}</p>
            </div>
          </div>
        </div>

        <div className="card card-elevated">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm muted">Projects with Budget</p>
              <p className="text-2xl font-bold">{projectsWithBudget}</p>
            </div>
          </div>
        </div>

        <div className="card card-elevated">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm muted">Total Budget</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
        </div>

        <div className="card card-elevated">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm muted">Overrun Projects</p>
              <p className="text-2xl font-bold">{overrunProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      {financialSummary && (
        <div className="card card-elevated mb-8">
          <h2 className="heading-lg mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm muted">Total Budget</p>
              <p className="text-xl font-bold">
                {formatCurrency(financialSummary.summary?.totalBudget || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm muted">Total Expenses</p>
              <p className="text-xl font-bold">
                {formatCurrency(financialSummary.summary?.totalExpenses || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm muted">Total Income</p>
              <p className="text-xl font-bold">
                {formatCurrency(financialSummary.summary?.totalIncome || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm muted">Profit/Loss</p>
              <p
                className={`text-xl font-bold ${
                  (financialSummary.summary?.totalProfitLoss || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(financialSummary.summary?.totalProfitLoss || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card card-elevated mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Search Input with Icon */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 pr-24"
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
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost px-3 py-1 flex items-center gap-2 text-sm"
                style={{ minWidth: "unset" }}
                type="button"
                title="Toggle sort order"
              >
                <span>Sort</span>
                <span className="text-lg">
                  {sortOrder === "asc" ? "↑" : "↓"}
                </span>
              </button>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4 flex-wrap items-stretch md:items-end w-full md:w-auto">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select w-full sm:w-auto"
              >
                <option value="all">All Projects</option>
                <option value="with_budget">With Budget</option>
                <option value="without_budget">Without Budget</option>
                <option value="overrun">Overrun</option>
                <option value="warning">Warning</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="select w-full sm:w-auto"
              >
                <option value="name">Name</option>
                <option value="budget">Budget</option>
                <option value="expenses">Expenses</option>
                <option value="utilization">Utilization</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="card card-elevated">
        <div
          className="card-section"
          style={{ borderTop: "none", paddingTop: 0 }}
        >
          <h2 className="heading-lg">
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium">{project.name}</h3>
                        <span
                          className={`badge ${getStatusColor(budgetStatus)}`}
                        >
                          {budgetStatus === "no_budget"
                            ? "No Budget"
                            : budgetStatus}
                        </span>
                        {hasBudget && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <ChartBarIcon className="w-4 h-4" />
                            {formatPercentage(
                              budget.summary?.budgetUtilization || 0
                            )}{" "}
                            utilized
                          </span>
                        )}
                      </div>
                      <p className="muted mb-2 break-words">
                        {project.description || "No description"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
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
                              {formatCurrency(budget.summary?.totalIncome || 0)}
                            </span>
                          </>
                        )}
                      </div>
                      {hasBudget && (
                        <div className="mt-2">
                          <div className="progress">
                            <div
                              className={`progress-bar ${
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
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-0 sm:ml-4 flex-wrap w-full sm:w-auto">
                      {hasBudget ? (
                        <>
                          <a
                            href={`/project-budget/${project._id}`}
                            className="btn btn-primary w-full sm:w-auto"
                          >
                            <Eye className="w-4 h-4" />
                            View Dashboard
                          </a>
                          <a
                            href={`/project-budget/${project._id}`}
                            className="btn w-full sm:w-auto"
                          >
                            <ChartBarIcon className="w-4 h-4" />
                            Manage
                          </a>
                        </>
                      ) : (
                        <a
                          href={`/project-budget/${project._id}?action=create`}
                          className="btn btn-primary w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Create Budget
                        </a>
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
  );
}
