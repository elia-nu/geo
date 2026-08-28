"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  formatCurrency as formatCurrencyUtil,
  currencyTitle,
} from "../utils/currency";
import MetricCard from "./financial/MetricCard";

const PAYMENT_METHOD_LABELS = {
  advance_payment: "Advance Payment",
  monthly_payment: "Monthly Schedule",
  milestone_payment: "Milestone Payment",
  installment: "Installments",
  lump_sum: "Lump Sum",
  monthly: "Monthly Schedule",
  quarterly: "Quarterly Schedule",
  custom: "Custom Schedule",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  check: "Check",
  wire_transfer: "Wire Transfer",
  credit_card: "Credit Card",
  other: "Other",
};

const formatPaymentMethod = (method) => {
  if (!method) return "Payment Plan";
  return (
    PAYMENT_METHOD_LABELS[method] ||
    method
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const FinancialDashboard = ({ projectId, projectName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [paymentTracking, setPaymentTracking] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (projectId) {
      fetchFinancialData();
    }
  }, [projectId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [summaryResponse, paymentResponse] = await Promise.all([
        fetch(
          `/api/projects/${projectId}/financial-summary?includeDetails=true`
        ),
        fetch(`/api/projects/${projectId}/payment-tracking`),
      ]);

      const summaryData = await summaryResponse.json();
      const paymentData = await paymentResponse.json();

      if (summaryData.success) {
        setFinancialSummary(summaryData.financialSummary);
      }
      if (paymentData.success) {
        setPaymentTracking(paymentData);
      }
    } catch (err) {
      setError("Error fetching financial data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = "ETB") =>
    formatCurrencyUtil(amount, currency);

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "collected":
      case "paid":
      case "fully_paid":
      case "good":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partial":
      case "in_progress":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "pending":
      case "upcoming":
      case "medium_risk":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "overdue":
      case "high_risk":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "due_today":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "cancelled":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium animate-pulse">
            Loading financial dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
        <p className="text-rose-700 text-sm font-medium">{error}</p>
      </div>
    );
  }

  const income = financialSummary?.income || {};
  const payments = financialSummary?.payments || {};
  const rawPaymentsList = paymentTracking?.payments || financialSummary?.income?.recentIncome || [];

  const filteredPayments = rawPaymentsList.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      (p.clientName && p.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || (p.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalExpectedAmount = paymentTracking?.summary?.totalExpected || income?.totalIncome || 0;
  const totalCollectedAmount = paymentTracking?.summary?.totalCollected || payments?.collected?.amount || 0;
  const totalOutstandingAmount =
    (paymentTracking?.summary?.totalPending || 0) +
    (paymentTracking?.summary?.totalPartial || 0) +
    (paymentTracking?.summary?.totalOverdue || 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Quick Action */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Financial Health & Cash Flow
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              Real-time payment tracking, collection rates, and receivables for {projectName}
            </p>
          </div>
          <button
            onClick={fetchFinancialData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 text-slate-500" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Top 2 Primary Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          label="Contract Income Expected"
          value={Number(totalExpectedAmount) || 0}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingUpIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-700"
          subtitle={`${formatPercentage(
            totalExpectedAmount > 0
              ? (totalCollectedAmount / totalExpectedAmount) * 100
              : 0
          )} of expected income collected`}
          footer={
            <div className="mt-3 space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    totalExpectedAmount > 0 &&
                    (totalCollectedAmount / totalExpectedAmount) * 100 >= 90
                      ? "bg-emerald-500"
                      : (totalCollectedAmount / (totalExpectedAmount || 1)) * 100 >= 50
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      totalExpectedAmount > 0
                        ? (totalCollectedAmount / totalExpectedAmount) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <span>
                  Collected:{" "}
                  <strong className="text-slate-800 font-semibold">
                    {formatCurrency(totalCollectedAmount)}
                  </strong>
                </span>
                <span>
                  Outstanding:{" "}
                  <strong className="text-amber-700 font-semibold">
                    {formatCurrency(totalOutstandingAmount)}
                  </strong>
                </span>
              </div>
            </div>
          }
        />

        <MetricCard
          label="Total Collected Received"
          value={Number(totalCollectedAmount) || 0}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={BanknotesIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
          subtitle={`${
            paymentTracking?.summary?.collectedCount || payments?.collected?.count || 0
          } fully settled · ${
            paymentTracking?.summary?.partialCount || 0
          } partial · ${
            paymentTracking?.summary?.overdueCount || payments?.overdue?.count || 0
          } overdue`}
          footer={
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                {paymentTracking?.summary?.collectedCount || 0} Paid
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
                {paymentTracking?.summary?.pendingCount || 0} Pending
              </span>
              {(paymentTracking?.summary?.overdueCount || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-600" />
                  {paymentTracking?.summary?.overdueCount} Overdue
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Payment Tracking Detailed Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Payment Plans & Receivables Tracker
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitor client milestones, installment status, and collected balances
              </p>
            </div>
            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search client or title…"
                  className="pl-8 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="collected">Collected</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4-KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50/40 border-b border-slate-100">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Expected
            </p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-1 tabular-nums">
              {formatCurrency(totalExpectedAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Total project amount</p>
          </div>
          <div className="p-3.5 bg-white border border-emerald-100 rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Total Collected
            </p>
            <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">
              {formatCurrency(totalCollectedAmount)}
            </p>
            <p className="text-xs text-emerald-600/80 mt-0.5">
              {formatPercentage(
                totalExpectedAmount > 0
                  ? (totalCollectedAmount / totalExpectedAmount) * 100
                  : 0
              )}{" "}
              collected
            </p>
          </div>
          <div className="p-3.5 bg-white border border-amber-100 rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Outstanding / Unpaid
            </p>
            <p className="text-base sm:text-lg font-bold text-amber-700 mt-1 tabular-nums">
              {formatCurrency(totalOutstandingAmount)}
            </p>
            <p className="text-xs text-amber-600/80 mt-0.5">Pending & partial</p>
          </div>
          <div className="p-3.5 bg-white border border-rose-100 rounded-xl shadow-xs">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Overdue Amount
            </p>
            <p className="text-base sm:text-lg font-bold text-rose-600 mt-1 tabular-nums">
              {formatCurrency(paymentTracking?.summary?.totalOverdue || 0)}
            </p>
            <p className="text-xs text-rose-600/80 mt-0.5">
              {paymentTracking?.summary?.overdueCount || 0} overdue milestones
            </p>
          </div>
        </div>

        {/* Detailed Payment Tracking Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                  Client & Title
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                  Total Contract
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                  Outstanding
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                  Next Milestone / Paid
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredPayments.map((item, idx) => {
                const totalAmt = Number(item.totalProjectAmount || item.expectedAmount || item.amount || 0);
                const paidAmt = Number(item.totalPaid || item.amount || 0);
                const unpaidAmt = Math.max(0, totalAmt - paidAmt);
                const collectionRate = totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0;
                const isFullyPaid = paidAmt >= totalAmt && totalAmt > 0;
                const isOverdue = item.status === "overdue" || item.isOverdue;

                const freqLabel = formatPaymentMethod(item.frequency || item.paymentMethod);

                return (
                  <tr key={item._id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        {item.clientName || "Client"}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[14rem]">
                        {item.title} {item.invoiceNumber ? `· ${item.invoiceNumber}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {freqLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrency(totalAmt)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-600 tabular-nums">
                      {formatCurrency(paidAmt)}
                      <div className="text-[11px] text-slate-400 font-normal">
                        {collectionRate.toFixed(0)}% paid
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                      <span className={unpaidAmt > 0 ? "text-amber-700" : "text-slate-400"}>
                        {formatCurrency(unpaidAmt)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isFullyPaid && item.receivedDate ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          <span>Paid: {formatDate(item.receivedDate)}</span>
                        </div>
                      ) : item.nextPaymentDate ? (
                        <div>
                          <div className={`font-semibold flex items-center gap-1 text-xs ${isOverdue ? "text-rose-600" : "text-slate-800"}`}>
                            <CalendarIcon className={`w-3.5 h-3.5 ${isOverdue ? "text-rose-500" : "text-blue-500"}`} />
                            <span>Due: {formatDate(item.nextPaymentDate)}</span>
                          </div>
                          {isOverdue && (
                            <span className="text-[11px] text-rose-600 font-semibold block">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Scheduled</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border capitalize ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status || "In Progress"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {projectId && item._id && (
                        <Link
                          href={`/project-budget/${projectId}/income/${item._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                          <span>Details</span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    <BanknotesIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Create a payment plan in the Payments tab to track installments and cash flow.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
