"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  Download,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  PieChart,
  ListFilter,
  Check,
  Printer,
  Sparkles,
  TrendingUp,
  Wallet,
  Receipt,
  Layers,
} from "lucide-react";

export default function ProjectBudgetPaymentReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Filter States
  const [filters, setFilters] = useState({
    projectId: "",
    clientName: "",
    paymentStatus: "all",
    budgetStatus: "all",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Projects list for dropdown selector
  const [projectsList, setProjectsList] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [viewMode, setViewMode] = useState("projects"); // 'projects' | 'installments' | 'analytics'

  useEffect(() => {
    fetchProjectsList();
    handleGenerateReport();
  }, []);

  const showToast = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchProjectsList = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.projects || data.data || [];
        setProjectsList(list);
      }
    } catch (err) {
      console.error("Error fetching projects list:", err);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const params = new URLSearchParams({
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.clientName && { clientName: filters.clientName.trim() }),
        ...(filters.paymentStatus !== "all" && { paymentStatus: filters.paymentStatus }),
        ...(filters.budgetStatus !== "all" && { budgetStatus: filters.budgetStatus }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search.trim() }),
      });

      const res = await fetch(`/api/reports/projects/budget-payment?${params.toString()}`, {
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }

      const data = await res.json();
      setReportData(data);
      showToast("Project Budget & Payment Report generated successfully.", "success");
    } catch (error) {
      console.error("Report generation error:", error);
      showToast(error.message || "Failed to generate report", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectExpand = (projId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const formatCurrency = (val, currency = "ETB") => {
    const num = Number(val) || 0;
    return `${currency} ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export CSV: Projects Summary
  const handleExportProjectsCSV = () => {
    if (!reportData?.projects?.length) {
      showToast("No project data to export", "error");
      return;
    }

    const headers = [
      "Project Name",
      "Client",
      "Category",
      "Status",
      "Currency",
      "Total Allocated Budget",
      "Total Expenses Disbursed",
      "Budget Remaining",
      "Budget Utilization %",
      "Budget Health",
      "Expected Inflow (Contract Value)",
      "Collected Inflow (Received)",
      "Uncollected Balance",
      "Overdue Balance",
      "Collection Rate %",
      "Payment Health",
      "Net Operating Cash Flow",
      "Start Date",
      "End Date",
    ];

    const rows = reportData.projects.map((p) => [
      `"${p.projectName || ""}"`,
      `"${p.clientName || ""}"`,
      `"${p.category || ""}"`,
      `"${p.status || ""}"`,
      `"${p.currency || "ETB"}"`,
      p.totalBudget || 0,
      p.totalExpenses || 0,
      p.budgetRemaining || 0,
      `${p.budgetUtilization || 0}%`,
      `"${p.budgetHealth || ""}"`,
      p.totalExpectedIncome || 0,
      p.totalCollectedIncome || 0,
      p.totalUncollectedIncome || 0,
      p.totalOverdueIncome || 0,
      `${p.collectionRate || 0}%`,
      `"${p.paymentHealth || ""}"`,
      p.netCashFlow || 0,
      `"${p.startDate || ""}"`,
      `"${p.endDate || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `project_budget_payment_summary_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV: Detailed Installments & Milestone Schedule
  const handleExportInstallmentsCSV = () => {
    if (!reportData?.installmentsLedger?.length) {
      showToast("No installment schedule records to export", "error");
      return;
    }

    const headers = [
      "Project Name",
      "Client",
      "Payment Plan / Title",
      "Installment #",
      "Due Date",
      "Scheduled Amount",
      "Collected Amount",
      "Remaining Amount",
      "Status",
      "Paid Date",
      "Payment Method",
      "Currency",
    ];

    const rows = reportData.installmentsLedger.map((inst) => [
      `"${inst.projectName || ""}"`,
      `"${inst.clientName || ""}"`,
      `"${inst.incomeTitle || ""}"`,
      inst.installmentNumber || 1,
      `"${inst.dueDate || ""}"`,
      inst.amount || 0,
      inst.collectedAmount || 0,
      inst.remainingAmount || 0,
      `"${inst.status || ""}"`,
      `"${inst.paidDate || ""}"`,
      `"${inst.paymentMethod || ""}"`,
      `"${inst.currency || "ETB"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `project_payment_installments_schedule_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportData?.summary || {};
  const projects = reportData?.projects || [];
  const installmentsLedger = reportData?.installmentsLedger || [];

  return (
    <div className="space-y-6">
      {/* Toast Alert Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm transition-all ${
            messageType === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-rose-50 border border-rose-200 text-rose-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {messageType === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage("")} className="text-xs opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Project Budget &amp; Payment Detailed Report
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Comprehensive budget allocation, payment schedule tracking, receivable aging &amp; cash flow reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Refresh Report"}
          </button>
          <button
            onClick={handleExportProjectsCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Summary CSV
          </button>
          <button
            onClick={handleExportInstallmentsCSV}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export Schedules CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Total Budget */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Allocated Budget</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(summary.totalBudget || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Utilization:</span>
            <span className={`font-bold ${summary.overallBudgetUtilization > 100 ? "text-rose-600" : summary.overallBudgetUtilization > 85 ? "text-amber-600" : "text-emerald-600"}`}>
              {summary.overallBudgetUtilization || 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.overallBudgetUtilization > 100
                  ? "bg-rose-500"
                  : summary.overallBudgetUtilization > 85
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, summary.overallBudgetUtilization || 0)}%` }}
            />
          </div>
        </div>

        {/* Expected Contract Value */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Expected Inflow</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-blue-900 mt-1">
            {formatCurrency(summary.totalExpectedIncome || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across <span className="font-bold text-slate-700">{summary.totalProjects || 0}</span> projects
          </div>
        </div>

        {/* Collected Payments */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Collected Revenue</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">
            {formatCurrency(summary.totalCollectedIncome || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Collected Rate:</span>
            <span className="font-bold text-emerald-700">{summary.overallCollectionRate || 0}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.overallCollectionRate || 0)}%` }}
            />
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Outstanding Inflow</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-900 mt-1">
            {formatCurrency(summary.totalUncollectedIncome || 0)}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center justify-between">
            <span>Overdue Due:</span>
            <span>{formatCurrency(summary.totalOverdueIncome || 0)}</span>
          </div>
        </div>

        {/* Total Expenses Disbursed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Incurred Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-rose-700 mt-1">
            {formatCurrency(summary.totalExpenses || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Project Disbursements
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className={`rounded-2xl p-4 border shadow-sm ${
          (summary.netCashFlow || 0) >= 0
            ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
            : "bg-rose-50/50 border-rose-200 text-rose-950"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Operating Cash</span>
            <Wallet className="w-4 h-4 text-slate-500" />
          </div>
          <div className={`text-xl font-extrabold mt-1 ${
            (summary.netCashFlow || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}>
            {formatCurrency(summary.netCashFlow || 0)}
          </div>
          <div className="text-[11px] opacity-75 mt-1">
            Collected vs Expenses
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Filter Budget &amp; Payment Data</h3>
              <p className="text-xs text-slate-500">Filter by project, client, payment health, budget status, or dates</p>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
                setFilters((p) => ({ ...p, startDate: start, endDate: end }));
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
                const end = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
                setFilters((p) => ({ ...p, startDate: start, endDate: end }));
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
            >
              This Year
            </button>
            <button
              onClick={() =>
                setFilters({
                  projectId: "",
                  clientName: "",
                  paymentStatus: "all",
                  budgetStatus: "all",
                  startDate: "",
                  endDate: "",
                  search: "",
                })
              }
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Universal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search project, client, invoice..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Project Selector */}
          <div>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters((p) => ({ ...p, projectId: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            >
              <option value="">All Projects ({projectsList.length})</option>
              {projectsList.map((proj) => (
                <option key={proj._id} value={proj._id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Health Status */}
          <div>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters((p) => ({ ...p, paymentStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            >
              <option value="all">All Payment Statuses</option>
              <option value="collected">🟢 Fully Collected</option>
              <option value="partial">🟡 Partially Collected</option>
              <option value="overdue">🔴 Payment Overdue</option>
              <option value="pending">⚪ Pending Collection</option>
            </select>
          </div>

          {/* Budget Health Status */}
          <div>
            <select
              value={filters.budgetStatus}
              onChange={(e) => setFilters((p) => ({ ...p, budgetStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            >
              <option value="all">All Budget Statuses</option>
              <option value="within">🟢 Within Budget (&lt; 85%)</option>
              <option value="near_limit">🟡 Near Limit (85% - 100%)</option>
              <option value="over_budget">🔴 Over Budget (&gt; 100%)</option>
            </select>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
              className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
              className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800"
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area with View Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* View Switcher Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {viewMode === "projects"
                ? "Project Budget & Payment Breakdown (Master View)"
                : viewMode === "installments"
                ? "Installment & Milestone Payment Schedule Ledger"
                : "Budget vs Disbursement & Cash Flow Summary"}
            </h3>
            <p className="text-xs text-slate-500">
              {viewMode === "projects"
                ? "Detailed project-level financials with expandable income streams and installment plans"
                : viewMode === "installments"
                ? "Itemized schedule of all payment milestones, due dates, paid status, and aging"
                : "Comparative analysis of budget allocations versus expense disbursements and gross margin"}
            </p>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode("projects")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === "projects"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Projects Breakdown
            </button>
            <button
              onClick={() => setViewMode("installments")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === "installments"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Installments Ledger
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Generating project budget &amp; payment report...</p>
          </div>
        ) : viewMode === "projects" ? (
          /* VIEW 1: PROJECTS BREAKDOWN TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Project &amp; Client</th>
                  <th className="p-3.5 text-right">Allocated Budget</th>
                  <th className="p-3.5 text-right">Expenses</th>
                  <th className="p-3.5 text-center">Budget Util %</th>
                  <th className="p-3.5 text-right">Expected Inflow</th>
                  <th className="p-3.5 text-right">Collected Inflow</th>
                  <th className="p-3.5 text-right">Outstanding Balance</th>
                  <th className="p-3.5 text-right">Net Cash Flow</th>
                  <th className="p-3.5 text-center">Payment Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length > 0 ? (
                  projects.map((proj) => {
                    const isExpanded = !!expandedProjects[proj.projectId];
                    const isOverBudget = proj.totalExpenses > proj.totalBudget && proj.totalBudget > 0;
                    const hasOverdue = proj.totalOverdueIncome > 0;

                    return (
                      <React.Fragment key={proj.projectId}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          {/* Project Name & Client */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-xs">
                              {proj.projectName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-medium text-slate-600">{proj.clientName}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                                {proj.category}
                              </span>
                            </div>
                          </td>

                          {/* Allocated Budget */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 text-xs">
                              {formatCurrency(proj.totalBudget, proj.currency)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              Rem: {formatCurrency(proj.budgetRemaining, proj.currency)}
                            </div>
                          </td>

                          {/* Expenses */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-rose-700 text-xs">
                              {formatCurrency(proj.totalExpenses, proj.currency)}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {proj.expensesCount} transactions
                            </div>
                          </td>

                          {/* Budget Utilization */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold ${
                                isOverBudget
                                  ? "bg-rose-100 text-rose-800"
                                  : proj.budgetUtilization >= 85
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {proj.budgetUtilization}%
                            </span>
                          </td>

                          {/* Expected Inflow (Contract Value) */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-blue-900 text-xs">
                              {formatCurrency(proj.totalExpectedIncome, proj.currency)}
                            </span>
                          </td>

                          {/* Collected Inflow */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-emerald-700 text-xs">
                              {formatCurrency(proj.totalCollectedIncome, proj.currency)}
                            </span>
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              {proj.collectionRate}% collected
                            </div>
                          </td>

                          {/* Outstanding Balance */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-bold text-amber-900 text-xs">
                              {formatCurrency(proj.totalUncollectedIncome, proj.currency)}
                            </span>
                            {hasOverdue && (
                              <div className="text-[10px] text-rose-600 font-bold">
                                {formatCurrency(proj.totalOverdueIncome, proj.currency)} overdue
                              </div>
                            )}
                          </td>

                          {/* Net Cash Flow */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span
                              className={`font-extrabold text-xs ${
                                proj.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {formatCurrency(proj.netCashFlow, proj.currency)}
                            </span>
                          </td>

                          {/* Payment Health Status */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {proj.paymentHealth === "Fully Collected" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Fully Paid
                              </span>
                            ) : proj.paymentHealth === "Payment Overdue" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Overdue
                              </span>
                            ) : proj.paymentHealth === "Partially Collected" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Partial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                Pending
                              </span>
                            )}
                          </td>

                          {/* Expand Details Button */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => toggleProjectExpand(proj.projectId)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all inline-flex items-center gap-1 border border-blue-200"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> Details
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDED ROW: Detailed Payment Streams & Installments Schedule */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200">
                            <td colSpan={10} className="p-4 sm:p-6 space-y-4">
                              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-amber-600" />
                                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                                      Income Sources &amp; Installment Schedules for {proj.projectName}
                                    </h4>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {proj.incomeRecords.length} registered payment source(s)
                                  </span>
                                </div>

                                {proj.incomeRecords.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    No income or payment records logged yet for this project.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {proj.incomeRecords.map((inc, iIdx) => (
                                      <div
                                        key={inc._id || iIdx}
                                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                          <div className="font-bold text-slate-900 flex items-center gap-2">
                                            <span>{inc.title}</span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium">
                                              {inc.paymentMethod}
                                            </span>
                                            {inc.invoiceNumber && (
                                              <span className="text-[10px] font-mono text-slate-500">
                                                Inv: {inc.invoiceNumber}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-[11px]">
                                            <span>
                                              Expected: <strong className="text-slate-900">{formatCurrency(inc.expectedAmount, proj.currency)}</strong>
                                            </span>
                                            <span>
                                              Collected: <strong className="text-emerald-700">{formatCurrency(inc.collectedAmount, proj.currency)}</strong>
                                            </span>
                                            <span>
                                              Outstanding: <strong className="text-amber-800">{formatCurrency(inc.uncollectedAmount, proj.currency)}</strong>
                                            </span>
                                          </div>
                                        </div>

                                        {/* Sub-table for Installments Schedule if available */}
                                        {inc.installments && inc.installments.length > 0 && (
                                          <div className="overflow-x-auto mt-2 border rounded-lg bg-white">
                                            <table className="w-full text-left text-xs">
                                              <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                                <tr>
                                                  <th className="p-2">#</th>
                                                  <th className="p-2">Due Date</th>
                                                  <th className="p-2 text-right">Scheduled Amount</th>
                                                  <th className="p-2 text-right">Paid Amount</th>
                                                  <th className="p-2 text-right">Balance</th>
                                                  <th className="p-2 text-center">Status</th>
                                                  <th className="p-2">Paid Date</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100">
                                                {inc.installments.map((inst, sIdx) => (
                                                  <tr key={sIdx} className="hover:bg-slate-50">
                                                    <td className="p-2 font-bold text-slate-700">
                                                      Inst #{inst.installmentNumber || sIdx + 1}
                                                    </td>
                                                    <td className="p-2 whitespace-nowrap font-mono text-slate-800">
                                                      {inst.dueDate || "—"}
                                                    </td>
                                                    <td className="p-2 text-right font-semibold text-slate-900">
                                                      {formatCurrency(inst.amount, proj.currency)}
                                                    </td>
                                                    <td className="p-2 text-right font-bold text-emerald-700">
                                                      {formatCurrency(inst.collectedAmount, proj.currency)}
                                                    </td>
                                                    <td className="p-2 text-right font-semibold text-amber-800">
                                                      {formatCurrency(inst.remainingAmount, proj.currency)}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                      {inst.status === "paid" ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                          Paid
                                                        </span>
                                                      ) : inst.status === "overdue" ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                                          Overdue
                                                        </span>
                                                      ) : inst.status === "due_today" ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                          Due Today
                                                        </span>
                                                      ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                                          Upcoming
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="p-2 text-slate-500 font-mono text-[11px]">
                                                      {inst.paidDate || "—"}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 text-xs">
                      No project budget and payment data found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* VIEW 2: COMPREHENSIVE INSTALLMENTS & MILESTONE SCHEDULE LEDGER */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Project</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Installment / Title</th>
                  <th className="p-3.5 text-right">Scheduled Amount</th>
                  <th className="p-3.5 text-right">Collected</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5">Paid Date</th>
                  <th className="p-3.5">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installmentsLedger.length > 0 ? (
                  installmentsLedger.map((inst, index) => {
                    const isPaid = inst.status === "paid";
                    const isOverdue = inst.status === "overdue";
                    const isDueToday = inst.status === "due_today";

                    return (
                      <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                        {/* Due Date */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold font-mono text-slate-900 text-xs">
                            {inst.dueDate || "—"}
                          </div>
                        </td>

                        {/* Project Name */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-xs">{inst.projectName}</span>
                        </td>

                        {/* Client */}
                        <td className="p-3.5 whitespace-nowrap text-xs text-slate-600">
                          {inst.clientName}
                        </td>

                        {/* Installment / Title */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 text-xs">
                            {inst.incomeTitle} (#{inst.installmentNumber})
                          </span>
                        </td>

                        {/* Scheduled Amount */}
                        <td className="p-3.5 text-right whitespace-nowrap font-bold text-slate-900 text-xs">
                          {formatCurrency(inst.amount, inst.currency)}
                        </td>

                        {/* Collected Amount */}
                        <td className="p-3.5 text-right whitespace-nowrap font-bold text-emerald-700 text-xs">
                          {formatCurrency(inst.collectedAmount, inst.currency)}
                        </td>

                        {/* Remaining Balance */}
                        <td className="p-3.5 text-right whitespace-nowrap font-bold text-amber-900 text-xs">
                          {formatCurrency(inst.remainingAmount, inst.currency)}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          ) : isDueToday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Due Today
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Upcoming
                            </span>
                          )}
                        </td>

                        {/* Paid Date */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-xs text-slate-500">
                          {inst.paidDate || "—"}
                        </td>

                        {/* Payment Method */}
                        <td className="p-3.5 whitespace-nowrap text-xs text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {inst.paymentMethod || "Direct"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400 text-xs">
                      No payment installment schedules found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
