"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  Search,
  X,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  PieChart,
  Calendar,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BudgetManagement() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [budgetData, setBudgetData] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("utilization");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
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
        setProjects(data.projects || []);
        await fetchBudgetData(data.projects || []);
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
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => `${(value || 0).toFixed(1)}%`;

  // Calculated Portfolio Metrics
  const metrics = useMemo(() => {
    const totalBudget = Object.values(budgetData).reduce(
      (sum, b) => sum + (Number(b?.totalAmount) || 0),
      0
    );
    const totalExpenses = Object.values(budgetData).reduce(
      (sum, b) => sum + (Number(b?.summary?.totalExpenses) || 0),
      0
    );
    const totalIncome = Object.values(budgetData).reduce(
      (sum, b) => sum + (Number(b?.summary?.totalIncome) || 0),
      0
    );
    const netProfitLoss =
      financialSummary?.summary?.totalProfitLoss != null
        ? financialSummary.summary.totalProfitLoss
        : totalIncome - totalExpenses;

    const budgetedCount = projects.filter((p) => budgetData[p._id]).length;
    const overrunCount = Object.values(budgetData).filter(
      (b) => (b?.summary?.budgetUtilization || 0) > 100 || b?.summary?.status === "overrun"
    ).length;
    const warningCount = Object.values(budgetData).filter(
      (b) =>
        (b?.summary?.budgetUtilization || 0) >= 80 &&
        (b?.summary?.budgetUtilization || 0) <= 100
    ).length;

    const overallUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalExpenses,
      totalIncome,
      netProfitLoss,
      budgetedCount,
      overrunCount,
      warningCount,
      overallUtilization,
    };
  }, [projects, budgetData, financialSummary]);

  // Filtering & Sorting
  const filteredAndSortedProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        project.name.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        project.category?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const budget = budgetData[project._id];
      const hasBudget = !!budget;
      const util = budget?.summary?.budgetUtilization || 0;

      if (filterStatus === "all") return true;
      if (filterStatus === "with_budget") return hasBudget;
      if (filterStatus === "without_budget") return !hasBudget;
      if (filterStatus === "overrun") return hasBudget && (util > 100 || budget.summary?.status === "overrun");
      if (filterStatus === "warning") return hasBudget && util >= 80 && util <= 100;
      if (filterStatus === "normal") return hasBudget && util < 80;

      return true;
    });

    return filtered.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "budget":
          aVal = Number(budgetData[a._id]?.totalAmount) || 0;
          bVal = Number(budgetData[b._id]?.totalAmount) || 0;
          break;
        case "expenses":
          aVal = Number(budgetData[a._id]?.summary?.totalExpenses) || 0;
          bVal = Number(budgetData[b._id]?.summary?.totalExpenses) || 0;
          break;
        case "income":
          aVal = Number(budgetData[a._id]?.summary?.totalIncome) || 0;
          bVal = Number(budgetData[b._id]?.summary?.totalIncome) || 0;
          break;
        case "utilization":
          aVal = Number(budgetData[a._id]?.summary?.budgetUtilization) || 0;
          bVal = Number(budgetData[b._id]?.summary?.budgetUtilization) || 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [projects, budgetData, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleNavigate = (path) => {
    if (router?.push) {
      router.push(path);
    } else {
      window.location.href = path;
    }
  };

  const getStatusBadge = (budget) => {
    if (!budget) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Unbudgeted
        </span>
      );
    }
    const util = budget.summary?.budgetUtilization || 0;
    if (util > 100 || budget.summary?.status === "overrun") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-500" /> Overrun ({formatPercentage(util)})
        </span>
      );
    }
    if (util >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 text-amber-500" /> Warning ({formatPercentage(util)})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> On Track ({formatPercentage(util)})
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">
          Loading comprehensive financial portfolio...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-16">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 p-6 sm:p-8 text-white border border-slate-800 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-72 -bottom-20 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-semibold text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Executive Financial Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              Budget & Expense Management
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Track project allocations, monitor live expenditures against budget ceilings, and assess company profitability across all active contracts.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleNavigate("/projects")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold backdrop-blur transition-all hover:scale-[1.02]"
            >
              <Building2 className="w-4 h-4 text-slate-300" />
              Projects Hub
            </button>
            <button
              onClick={() => handleNavigate("/hrm?section=projects")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              New Budget
            </button>
          </div>
        </div>

        {/* Overrun Risk Notice if any */}
        {metrics.overrunCount > 0 && (
          <div className="relative z-10 mt-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 backdrop-blur flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Attention:</strong> {metrics.overrunCount} project(s) have exceeded their approved budget ceiling.
              </span>
            </div>
            <button
              onClick={() => setFilterStatus("overrun")}
              className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shrink-0"
            >
              Filter Overrun Projects
            </button>
          </div>
        )}
      </div>

      {/* Portfolio Financial Overview KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Budget */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Budget
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(metrics.totalBudget)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{metrics.budgetedCount} of {projects.length} budgeted</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {Math.round((metrics.budgetedCount / (projects.length || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Spent
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(metrics.totalExpenses)}
            </div>
            {/* Overall burn rate progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Burn Rate</span>
                <span
                  className={`font-bold ${
                    metrics.overallUtilization > 100
                      ? "text-rose-600"
                      : metrics.overallUtilization > 80
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {formatPercentage(metrics.overallUtilization)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    metrics.overallUtilization > 100
                      ? "bg-rose-500"
                      : metrics.overallUtilization > 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(metrics.overallUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Revenue / Inflow
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(metrics.totalIncome)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recorded milestone payments & receivables
            </p>
          </div>
        </div>

        {/* Net Profit/Loss */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all card-hover-elevate">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Net Profitability
            </span>
            <div
              className={`p-2.5 rounded-xl ${
                metrics.netProfitLoss >= 0
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
              }`}
            >
              {metrics.netProfitLoss >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                metrics.netProfitLoss >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatCurrency(metrics.netProfitLoss)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  metrics.netProfitLoss >= 0 ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span>{metrics.netProfitLoss >= 0 ? "Profitable Margin" : "Net Deficit"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Status Filters, Sorting & View Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by name, category, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls Right Side: Sort & View Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Field Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 py-1.5 px-2.5 focus:outline-none cursor-pointer"
              >
                <option value="utilization">Sort: Utilization %</option>
                <option value="budget">Sort: Budget Size</option>
                <option value="expenses">Sort: Total Expenses</option>
                <option value="income">Sort: Total Income</option>
                <option value="name">Sort: Project Name</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Executive Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin text-xs">
          {[
            { id: "all", label: `All Projects (${projects.length})` },
            { id: "with_budget", label: `Budgeted (${metrics.budgetedCount})` },
            { id: "normal", label: "On Track (<80%)" },
            { id: "warning", label: `Warning (${metrics.warningCount})` },
            { id: "overrun", label: `Overrun (${metrics.overrunCount})` },
            { id: "without_budget", label: "No Budget" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Display: Grid Cards vs Table View */}
      {filteredAndSortedProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No projects match the current filter
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing search keywords, or selecting a different status filter.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterStatus("all");
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map((project) => {
            const budget = budgetData[project._id];
            const hasBudget = !!budget;
            const utilization = budget?.summary?.budgetUtilization || 0;
            const remaining = (budget?.totalAmount || 0) - (budget?.summary?.totalExpenses || 0);

            return (
              <div
                key={project._id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between card-hover-elevate"
              >
                <div>
                  {/* Top Bar: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {project.category || "General"}
                    </span>
                    {getStatusBadge(budget)}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                    {project.description || "No description provided for this project."}
                  </p>

                  {/* Financial Metrics */}
                  {hasBudget ? (
                    <div className="mt-4 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {/* Budget vs Expenses Numbers */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Total Budget
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {formatCurrency(budget.totalAmount, budget.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                            Committed Spent
                          </span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                            {formatCurrency(budget.summary?.totalExpenses || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Utilization Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Utilization</span>
                          <span
                            className={`font-bold ${
                              utilization > 100
                                ? "text-rose-600"
                                : utilization > 80
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {formatPercentage(utilization)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              utilization > 100
                                ? "bg-rose-500"
                                : utilization > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Remaining / Revenue row */}
                      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                        <span>
                          Income: <strong className="text-emerald-600">{formatCurrency(budget.summary?.totalIncome || 0)}</strong>
                        </span>
                        <span>
                          Bal:{" "}
                          <strong
                            className={remaining < 0 ? "text-rose-600 font-bold" : "text-slate-800 dark:text-slate-200"}
                          >
                            {formatCurrency(remaining)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center py-4 bg-slate-50/60 dark:bg-slate-800/30 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">
                        No financial budget defined yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {hasBudget ? (
                    <>
                      <button
                        onClick={() => handleNavigate(`/project-budget/${project._id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Dashboard
                      </button>
                      <button
                        onClick={() => handleNavigate(`/project-budget/${project._id}`)}
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                        title="Manage line items"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleNavigate(`/project-budget/${project._id}?action=create`)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Budget
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Project</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Budget</th>
                  <th className="py-3.5 px-4 text-right">Expenses</th>
                  <th className="py-3.5 px-4 text-right">Income</th>
                  <th className="py-3.5 px-4">Utilization</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredAndSortedProjects.map((project) => {
                  const budget = budgetData[project._id];
                  const hasBudget = !!budget;
                  const util = budget?.summary?.budgetUtilization || 0;

                  return (
                    <tr
                      key={project._id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{project.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {project.category || "General"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(budget)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {hasBudget ? formatCurrency(budget.totalAmount, budget.currency) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {hasBudget ? formatCurrency(budget.summary?.totalExpenses || 0) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {hasBudget ? formatCurrency(budget.summary?.totalIncome || 0) : "—"}
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        {hasBudget ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{formatPercentage(util)}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  util > 100 ? "bg-rose-500" : util > 80 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(util, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {hasBudget ? (
                          <button
                            onClick={() => handleNavigate(`/project-budget/${project._id}`)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        ) : (
                          <button
                            onClick={() => handleNavigate(`/project-budget/${project._id}?action=create`)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" /> Setup
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
