"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Layout from "../../../../components/Layout";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  XMarkIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { formatCurrency, currencyTitle } from "../../../../utils/currency";
import {
  showErrorToast,
  showSuccessToast,
  showDeleteConfirmDialog,
} from "../../../../utils/sweetAlert";
import {
  refreshInstallmentStatuses,
  summarizeInstallments,
} from "../../../../utils/incomeLifecycle";

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatFrequencyLabel = (freq) => {
  switch (freq) {
    case "monthly":
      return "Monthly Schedule";
    case "quarterly":
      return "Quarterly Schedule";
    case "custom":
      return "Custom Schedule";
    case "lump_sum":
      return "Lump Sum / Milestones";
    default:
      return freq || "Payment Plan";
  }
};

const IncomeDetailPage = ({ params }) => {
  const { id: projectId, incomeId } = use(params);
  const [projectName, setProjectName] = useState("");
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Tab filter for installments
  const [filterTab, setFilterTab] = useState("all");

  // Lump sum next installment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [nextAmount, setNextAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchIncomeData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [incomeRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/income/${incomeId}`),
        fetch(`/api/projects/${projectId}`),
      ]);
      const incomeData = await incomeRes.json();
      const projectData = await projectRes.json();

      if (!incomeData.success) {
        setError(incomeData.error || "Failed to load payment plan");
        setIncome(null);
        return;
      }

      // Refresh installment statuses on the client
      let loadedPlan = incomeData.income;
      if (
        Array.isArray(loadedPlan.installments) &&
        loadedPlan.installments.length > 0
      ) {
        const { installments } = refreshInstallmentStatuses(
          loadedPlan.installments
        );
        loadedPlan = { ...loadedPlan, installments };
      }

      setIncome(loadedPlan);
      if (projectData.success) {
        setProjectName(projectData.project?.name || "");
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load payment plan");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeData();
  }, [projectId, incomeId]);

  // Derived metrics
  const installments = useMemo(() => {
    if (!income || !Array.isArray(income.installments)) return [];
    return income.installments;
  }, [income]);

  const summary = useMemo(() => {
    if (installments.length > 0) {
      return summarizeInstallments(installments);
    }
    const tot =
      Number(
        income?.totalProjectAmount ||
          income?.expectedAmount ||
          income?.amount ||
          0
      ) || 0;
    const paid = Number(income?.totalPaid || income?.amount || 0) || 0;
    return {
      totalAmount: tot,
      paidAmount: paid,
      outstanding: Math.max(0, tot - paid),
      paidCount: 0,
      totalCount: 0,
      percentPaid: tot > 0 ? Math.round((paid / tot) * 100) : 0,
      overallStatus: income?.status || "in_progress",
      nextDue: null,
    };
  }, [installments, income]);

  const filteredInstallments = useMemo(() => {
    if (filterTab === "paid") {
      return installments.filter((i) => i.status === "paid");
    }
    if (filterTab === "due") {
      return installments.filter(
        (i) => i.status === "due_today" || i.status === "overdue"
      );
    }
    if (filterTab === "upcoming") {
      return installments.filter((i) => i.status === "upcoming");
    }
    return installments;
  }, [installments, filterTab]);

  const handleMarkPaid = async (installmentNumber) => {
    try {
      setActionLoading(`mark_${installmentNumber}`);
      const res = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_paid",
            installmentNumber,
            paidDate: new Date().toISOString().split("T")[0],
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast(`Payment #${installmentNumber} marked as paid`);
        await fetchIncomeData(true); // Instant refresh
      } else {
        showErrorToast(data.error || "Failed to mark payment as paid");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to mark payment as paid");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    const amt = Number(nextAmount);
    if (!amt || amt <= 0) {
      showErrorToast("Invalid Amount", "Please enter a valid payment amount");
      return;
    }
    if (remainingToCover > 0 && amt > remainingToCover + 0.001) {
      showErrorToast(
        "Amount Exceeds Balance",
        `Installment amount (${formatCurrency(amt)}) cannot exceed the remaining contract balance (${formatCurrency(remainingToCover)})`
      );
      return;
    }
    try {
      setActionLoading("add_inst");
      const res = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_installment",
            amount: amt,
            dueDate: nextDueDate,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Next installment scheduled successfully");
        setShowAddModal(false);
        setNextAmount("");
        await fetchIncomeData(true); // Instant refresh
      } else {
        showErrorToast(data.error || "Failed to add installment");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to add installment");
    } finally {
      setActionLoading(null);
    }
  };

  const getBadgeStyle = (status) => {
    switch (status) {
      case "fully_paid":
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "overdue":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "due_today":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  if (loading) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-11 w-11 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500 animate-pulse font-medium">
              Loading payment plan details…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !income) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh] px-4">
          <div className="text-center max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-red-800">
              Payment Plan Not Found
            </h3>
            <p className="mt-1 text-sm text-red-600">
              {error || "Could not retrieve the payment plan details."}
            </p>
            <Link
              href={`/project-budget/${projectId}`}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Project Budget
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const isLumpSum = income.frequency === "lump_sum";
  const remainingToCover = Math.max(
    0,
    summary.totalAmount - summary.paidAmount
  );
  const isFullyPaid = summary.overallStatus === "fully_paid";
  const lastInstallment = installments[installments.length - 1];
  const canChainNext =
    isLumpSum &&
    !isFullyPaid &&
    (!lastInstallment || lastInstallment.status === "paid");

  return (
    <Layout activeSection="budget-management">
      <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen min-w-0 space-y-6">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 flex-wrap">
            <Link
              href="/projects"
              className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
            >
              Projects
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <Link
              href={`/project-budget/${projectId}`}
              className="text-slate-600 hover:text-blue-600 transition-colors font-medium truncate max-w-[12rem] sm:max-w-xs"
            >
              {projectName || "Project Budget"}
            </Link>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 truncate">
              {income.title || "Payment Plan Details"}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchIncomeData(false)}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
              title="Refresh latest status"
            >
              <ArrowPathIcon
                className={`w-3.5 h-3.5 ${
                  actionLoading ? "animate-spin text-emerald-600" : ""
                }`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href={`/project-budget/${projectId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              <span>Back to Budget</span>
            </Link>
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {formatFrequencyLabel(income.frequency)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                    summary.overallStatus
                  )}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      summary.overallStatus === "fully_paid"
                        ? "bg-emerald-500"
                        : summary.overallStatus === "overdue"
                        ? "bg-rose-500 animate-pulse"
                        : summary.overallStatus === "due_today"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-blue-500"
                    }`}
                  />
                  {summary.overallStatus === "fully_paid"
                    ? "Fully Paid"
                    : summary.overallStatus === "overdue"
                    ? "Overdue"
                    : summary.overallStatus === "due_today"
                    ? "Due Today"
                    : "In Progress"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {income.title || "Project Payment Plan"}
              </h1>
              {income.description && (
                <p className="text-xs sm:text-sm text-slate-600 pt-0.5 break-words">
                  {income.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-500 pt-0.5">
                {income.clientName && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    Client:{" "}
                    <strong className="text-slate-700 font-semibold">
                      {income.clientName}
                    </strong>
                  </span>
                )}
                {projectName && (
                  <span className="flex items-center gap-1">
                    <BuildingOfficeIcon className="w-4 h-4 text-slate-400" />
                    Project:{" "}
                    <strong className="text-slate-700 font-semibold">
                      {projectName}
                    </strong>
                  </span>
                )}
                {income.startDate && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    Started:{" "}
                    <strong className="text-slate-700 font-semibold">
                      {formatDate(income.startDate)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick action button for lump sum chaining */}
            {canChainNext && (
              <button
                onClick={() => {
                  setNextAmount(
                    remainingToCover > 0 ? remainingToCover.toString() : ""
                  );
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all self-start lg:self-center"
              >
                <PlusIcon className="w-4 h-4" />
                + Add Next Milestone Payment
              </button>
            )}
          </div>
        </div>

        {/* KPI Metrics Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Contract
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CurrencyDollarIcon className="w-4 h-4" />
              </div>
            </div>
            <p
              className="text-lg sm:text-2xl font-bold text-slate-900 tabular-nums"
              title={currencyTitle(summary.totalAmount)}
            >
              {formatCurrency(summary.totalAmount)}
            </p>
            <p className="text-xs text-slate-400">Total agreed plan amount</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Total Collected
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
            </div>
            <p
              className="text-lg sm:text-2xl font-bold text-emerald-700 tabular-nums"
              title={currencyTitle(summary.paidAmount)}
            >
              {formatCurrency(summary.paidAmount)}
            </p>
            <p className="text-xs text-emerald-600 font-medium">
              {summary.percentPaid}% collected to date
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-amber-100 bg-amber-50/40 shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Outstanding
              </span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <ClockIcon className="w-4 h-4" />
              </div>
            </div>
            <p
              className="text-lg sm:text-2xl font-bold text-amber-800 tabular-nums"
              title={currencyTitle(summary.outstanding)}
            >
              {formatCurrency(summary.outstanding)}
            </p>
            <p className="text-xs text-amber-700">Remaining to be collected</p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Next Payment
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            {isFullyPaid ? (
              <p className="text-base sm:text-lg font-bold text-emerald-600 pt-1">
                ✓ Fully Collected
              </p>
            ) : summary.nextDue ? (
              <>
                <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.nextDue.amount)}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    summary.nextDue.status === "overdue"
                      ? "text-rose-600"
                      : summary.nextDue.status === "due_today"
                      ? "text-amber-600"
                      : "text-slate-600"
                  }`}
                >
                  Due {formatDate(summary.nextDue.dueDate)} (
                  {summary.nextDue.status === "overdue"
                    ? "Overdue"
                    : summary.nextDue.status === "due_today"
                    ? "Due Today"
                    : "Upcoming"}
                  )
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 pt-2">
                No scheduled milestones
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-bold text-slate-800">
              Contract Completion Progress
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {summary.percentPaid}% ({summary.paidCount} of{" "}
              {summary.totalCount || installments.length} installments paid)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isFullyPaid
                  ? "bg-emerald-500"
                  : summary.overallStatus === "overdue"
                  ? "bg-rose-500"
                  : "bg-blue-600"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, summary.percentPaid))}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
            <span>Collected: {formatCurrency(summary.paidAmount)}</span>
            <span>Balance: {formatCurrency(summary.outstanding)}</span>
          </div>
        </div>

        {/* Installments Schedule Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-0">
          {/* Header & Filter Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Installment Schedule & Milestones
              </h3>
              <p className="text-xs text-slate-500">
                Auto-computed status based on current date. Tap Mark Paid when
                money lands.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              {[
                { id: "all", label: `All (${installments.length})` },
                {
                  id: "due",
                  label: `Due / Overdue (${
                    installments.filter(
                      (i) => i.status === "due_today" || i.status === "overdue"
                    ).length
                  })`,
                },
                {
                  id: "upcoming",
                  label: `Upcoming (${
                    installments.filter((i) => i.status === "upcoming").length
                  })`,
                },
                {
                  id: "paid",
                  label: `Paid (${
                    installments.filter((i) => i.status === "paid").length
                  })`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filteredInstallments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No installments matching this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Installment Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Paid Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInstallments.map((inst, index) => {
                    const isPaid = inst.status === "paid";
                    const isOverdue = inst.status === "overdue";
                    const isDueToday = inst.status === "due_today";
                    const isMarking =
                      actionLoading ===
                      `mark_${inst.installmentNumber || index + 1}`;

                    return (
                      <tr
                        key={index}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isPaid
                            ? "bg-emerald-50/20"
                            : isOverdue
                            ? "bg-rose-50/20"
                            : isDueToday
                            ? "bg-amber-50/20"
                            : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          #{inst.installmentNumber || index + 1}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                          {formatDate(inst.dueDate)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatCurrency(inst.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isOverdue
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isDueToday
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Paid</span>
                              </>
                            ) : isOverdue ? (
                              <>
                                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-600" />
                                <span>Overdue</span>
                              </>
                            ) : isDueToday ? (
                              <>
                                <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
                                <span>Due Today</span>
                              </>
                            ) : (
                              <span>Upcoming</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {inst.paidDate ? formatDate(inst.paidDate) : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isPaid ? (
                            <span className="text-emerald-600 font-semibold inline-flex items-center gap-1 text-xs">
                              <CheckCircleIcon className="w-4 h-4" />
                              Received
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                handleMarkPaid(
                                  inst.installmentNumber || index + 1
                                )
                              }
                              disabled={!!actionLoading}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs hover:shadow transition-all duration-150 disabled:opacity-50 text-xs"
                            >
                              {isMarking ? (
                                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                              )}
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lump Sum Chaining Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-900">
                  Add Next Milestone Payment
                </h4>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddInstallment} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                    Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={remainingToCover > 0 ? remainingToCover : undefined}
                    value={nextAmount}
                    onChange={(e) => setNextAmount(e.target.value)}
                    placeholder={remainingToCover.toFixed(2)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Remaining contract balance:{" "}
                    <strong>{formatCurrency(remainingToCover)}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                    Expected Due Date *
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === "add_inst"}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    {actionLoading === "add_inst"
                      ? "Saving…"
                      : "Add Payment Milestone"}
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

export default IncomeDetailPage;
