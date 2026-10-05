"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  CreditCard,
  Building,
  Calendar,
  Printer,
  Layers,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import Pagination from "./ui/Pagination";
import { formatCurrency, currencyTitle } from "../utils/currency";

export default function ProjectCostBudgetPerformanceReport() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [projectsList, setProjectsList] = useState([]);
  const [filters, setFilters] = useState({
    projectId: "",
    paymentStatus: "all",
    search: "",
  });
  const [expandedRows, setExpandedRows] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchProjects();
    fetchReport();
  }, []);

  const fetchProjects = async () => {
    try {
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const res = await fetch("/api/projects", {
        headers: { ...(authToken && { Authorization: `Bearer ${authToken}` }) },
      });
      if (res.ok) {
        const p = await res.json();
        setProjectsList(Array.isArray(p) ? p : p.projects || p.data || []);
      }
    } catch (err) {
      console.error("Error loading projects list:", err);
    }
  };

  const fetchReport = async (overrideFilters = null) => {
    setLoading(true);
    setMessage("");
    try {
      const activeFilters = overrideFilters || filters;
      const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : "";
      const params = new URLSearchParams();
      if (activeFilters.projectId) params.set("projectId", activeFilters.projectId);
      if (activeFilters.paymentStatus && activeFilters.paymentStatus !== "all") {
        params.set("paymentStatus", activeFilters.paymentStatus);
      }
      if (activeFilters.search) params.set("search", activeFilters.search.trim());

      const res = await fetch(`/api/reports/projects/cost-budget-performance?${params.toString()}`, {
        headers: { ...(authToken && { Authorization: `Bearer ${authToken}` }) },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }
      const data = await res.json();
      setReportData(data);
      setCurrentPage(1);
      setMessage("Project Payment & Expected Income Report generated successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Report fetch error:", error);
      setMessage(error.message || "Failed to generate report");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (projId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [projId]: !prev[projId],
    }));
  };

  const handleExportCSV = () => {
    if (!reportData?.rows?.length) return;
    const headers = [
      "Project Name",
      "Client",
      "Status",
      "Expected Income (ETB)",
      "Received to Date (ETB)",
      "Outstanding Balance (ETB)",
      "Overdue Balance (ETB)",
      "Collection Rate %",
      "Payment Status",
      "Start Date",
      "End Date",
    ];

    const csvRows = [
      headers,
      ...reportData.rows.map((r) => [
        r.projectName,
        r.clientName,
        r.status,
        r.totalExpectedIncome,
        r.totalReceivedIncome,
        r.totalOutstandingIncome,
        r.totalOverdueIncome,
        r.collectionRate,
        r.paymentStatusLabel,
        r.startDate || "N/A",
        r.endDate || "N/A",
      ]),
    ];

    const csvContent = csvRows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Project_Income_Payment_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {
    totalProjects: 0,
    totalExpectedIncome: 0,
    totalReceivedIncome: 0,
    totalOutstandingIncome: 0,
    totalOverdueIncome: 0,
    overallCollectionRate: 0,
    fullyPaidCount: 0,
    partialCount: 0,
    pendingCount: 0,
    overdueCount: 0,
  };

  const rows = reportData?.rows || [];

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return rows.slice(start, start + itemsPerPage);
  }, [rows, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <Wallet className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">
              Project Payment & Expected Income Report
            </h2>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Track expected contract income, payments received to date, outstanding balances, and collection rates across all company projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchReport()}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
            {loading ? "Generating..." : "Generate Report"}
          </button>
          {reportData && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors shadow-sm"
                title="Print Report"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-blue-600" />
          Filter & Search
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => {
                const next = { ...filters, projectId: e.target.value };
                setFilters(next);
                fetchReport(next);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projectsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name || p.projectName || "Unnamed Project"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Status</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => {
                const next = { ...filters, paymentStatus: e.target.value };
                setFilters(next);
                fetchReport(next);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="pending">Pending Payment</option>
              <option value="overdue">Overdue Balance</option>
              <option value="no_billing">No Billing Set</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Project or Client</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchReport();
                }}
                placeholder="Type name & press Enter..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between ${
            messageType === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : messageType === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-xs font-bold uppercase hover:opacity-75">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      {reportData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Expected Income */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Expected Income
              </span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </span>
            </div>
            <div
              className="mt-3 text-2xl font-bold text-gray-900 cursor-default font-mono"
              title={currencyTitle(summary.totalExpectedIncome)}
            >
              {formatCurrency(summary.totalExpectedIncome)}
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <span>Across {summary.totalProjects} project{summary.totalProjects === 1 ? "" : "s"}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500" />
          </div>

          {/* Card 2: Received Payments */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Payments Received
              </span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
            <div
              className="mt-3 text-2xl font-bold text-emerald-600 cursor-default font-mono"
              title={currencyTitle(summary.totalReceivedIncome)}
            >
              {formatCurrency(summary.totalReceivedIncome)}
            </div>
            <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
              <span>{summary.overallCollectionRate}% collected to date</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
          </div>

          {/* Card 3: Outstanding Receivables */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Outstanding Balance
              </span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </span>
            </div>
            <div
              className="mt-3 text-2xl font-bold text-amber-600 cursor-default font-mono"
              title={currencyTitle(summary.totalOutstandingIncome)}
            >
              {formatCurrency(summary.totalOutstandingIncome)}
            </div>
            <div className="mt-2 text-xs text-amber-700 flex items-center gap-1">
              <span>
                {summary.totalOverdueIncome > 0
                  ? `Overdue: ${formatCurrency(summary.totalOverdueIncome)}`
                  : "Pending collection"}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
          </div>

          {/* Card 4: Collection Rate & Status */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Collection Rate
              </span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold text-indigo-700">
              {summary.overallCollectionRate}%
            </div>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary.overallCollectionRate))}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <span>{summary.fullyPaidCount} Fully Paid</span>
              <span>{summary.partialCount} Partial</span>
              {summary.overdueCount > 0 && <span className="text-red-600 font-semibold">{summary.overdueCount} Overdue</span>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
          </div>
        </div>
      )}

      {/* Main Table */}
      {reportData && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-gray-900">Project Income & Payment Breakdown</h3>
              <p className="text-xs text-gray-500">
                Detailed view of expected income, received amount, and pending balance per project
              </p>
            </div>
            <span className="text-xs font-medium text-gray-500">
              Showing {paginatedRows.length} of {rows.length} projects
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-medium text-gray-700">No project income records found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search criteria or filter options above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Project Details</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Expected Income</th>
                    <th className="px-4 py-3 text-right">Received to Date</th>
                    <th className="px-4 py-3 text-right">Outstanding Balance</th>
                    <th className="px-4 py-3 text-center">Collection %</th>
                    <th className="px-4 py-3 text-center">Payment Status</th>
                    <th className="px-4 py-3 text-center">Milestones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedRows.map((r) => {
                    const isExpanded = !!expandedRows[r.projectId];
                    const hasMilestones = r.incomeBreakdown && r.incomeBreakdown.length > 0;

                    return (
                      <React.Fragment key={r.projectId}>
                        <tr className="hover:bg-slate-50/75 transition-colors">
                          {/* Project Details */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-gray-900">{r.projectName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              {r.startDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {r.startDate} {r.endDate ? `to ${r.endDate}` : ""}
                                </span>
                              )}
                              <span className="capitalize px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                                {r.status}
                              </span>
                            </div>
                          </td>

                          {/* Client */}
                          <td className="px-4 py-3.5">
                            <div className="text-gray-800 font-medium flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{r.clientName}</span>
                            </div>
                          </td>

                          {/* Expected Income */}
                          <td
                            className="px-4 py-3.5 text-right font-mono font-medium text-gray-900 cursor-default"
                            title={currencyTitle(r.totalExpectedIncome)}
                          >
                            {formatCurrency(r.totalExpectedIncome)}
                          </td>

                          {/* Received to Date */}
                          <td
                            className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-600 cursor-default"
                            title={currencyTitle(r.totalReceivedIncome)}
                          >
                            {formatCurrency(r.totalReceivedIncome)}
                          </td>

                          {/* Outstanding Balance */}
                          <td
                            className={`px-4 py-3.5 text-right font-mono font-semibold cursor-default ${
                              r.totalOutstandingIncome > 0 ? "text-amber-600" : "text-gray-400"
                            }`}
                            title={currencyTitle(r.totalOutstandingIncome)}
                          >
                            {formatCurrency(r.totalOutstandingIncome)}
                            {r.totalOverdueIncome > 0 && (
                              <div className="text-[11px] text-red-600 font-sans font-medium mt-0.5">
                                Overdue: {formatCurrency(r.totalOverdueIncome)}
                              </div>
                            )}
                          </td>

                          {/* Collection % Progress Bar */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="inline-block w-24">
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
                                <span>{r.collectionRate}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    r.collectionRate >= 100
                                      ? "bg-emerald-500"
                                      : r.collectionRate > 0
                                      ? "bg-blue-500"
                                      : "bg-gray-300"
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, r.collectionRate))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Payment Status Badge */}
                          <td className="px-4 py-3.5 text-center">
                            {r.paymentStatus === "fully_paid" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                Fully Paid
                              </span>
                            )}
                            {r.paymentStatus === "partial" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3" />
                                Partially Paid
                              </span>
                            )}
                            {r.paymentStatus === "pending" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                            {r.paymentStatus === "overdue" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                            {r.paymentStatus === "no_billing" && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400 bg-gray-50 border border-gray-200">
                                No Billing
                              </span>
                            )}
                          </td>

                          {/* Milestones / Invoices Accordion Toggle */}
                          <td className="px-4 py-3.5 text-center">
                            {hasMilestones ? (
                              <button
                                onClick={() => toggleRow(r.projectId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                {r.incomeBreakdown.length} milestone{r.incomeBreakdown.length === 1 ? "" : "s"}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Accordion Row: Milestone Installment Details */}
                        {isExpanded && hasMilestones && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-6 py-3 border-y border-dashed border-gray-200">
                              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-inner">
                                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                                  Payment Schedule &amp; Installments for {r.projectName}
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-100 text-xs">
                                    <thead>
                                      <tr className="text-gray-500 font-semibold text-left">
                                        <th className="pb-2">Milestone / Title</th>
                                        <th className="pb-2">Invoice #</th>
                                        <th className="pb-2 text-right">Expected Amount</th>
                                        <th className="pb-2 text-right">Received Amount</th>
                                        <th className="pb-2 text-right">Outstanding</th>
                                        <th className="pb-2">Due Date</th>
                                        <th className="pb-2">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                      {r.incomeBreakdown.map((inc) => (
                                        <tr key={inc.id} className="hover:bg-gray-50">
                                          <td className="py-2 font-medium text-gray-900">{inc.title}</td>
                                          <td className="py-2 font-mono text-gray-500">{inc.invoiceNumber}</td>
                                          <td className="py-2 text-right font-mono font-medium">
                                            {formatCurrency(inc.expectedAmount)}
                                          </td>
                                          <td className="py-2 text-right font-mono text-emerald-600 font-semibold">
                                            {formatCurrency(inc.receivedAmount)}
                                          </td>
                                          <td className="py-2 text-right font-mono text-amber-600 font-medium">
                                            {formatCurrency(inc.outstandingAmount)}
                                          </td>
                                          <td className="py-2 text-gray-600">
                                            {inc.dueDate || "Not set"}
                                          </td>
                                          <td className="py-2">
                                            <span
                                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                                                inc.status === "collected"
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : inc.status === "partial"
                                                  ? "bg-blue-100 text-blue-800"
                                                  : inc.status === "overdue"
                                                  ? "bg-red-100 text-red-800 font-semibold"
                                                  : "bg-gray-100 text-gray-700"
                                              }`}
                                            >
                                              {inc.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalItems={rows.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(num) => {
                  setItemsPerPage(num);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
