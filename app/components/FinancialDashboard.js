"use client";

import { useState, useEffect } from "react";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CreditCardIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  TagIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  formatCurrency as formatCurrencyUtil,
  currencyTitle,
} from "../utils/currency";
import MetricCard from "./financial/MetricCard";

const FinancialDashboard = ({ projectId, projectName }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [paymentTracking, setPaymentTracking] = useState(null);
  const [financialReports, setFinancialReports] = useState(null);
  const [selectedReportType, setSelectedReportType] = useState("overview");
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

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

  const fetchFinancialReports = async (reportType) => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        projectId: projectId,
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
      });

      const response = await fetch(`/api/projects/financial-reports?${params}`);
      const data = await response.json();

      if (data.success) {
        setFinancialReports(data);
      }
    } catch (err) {
      console.error("Error fetching financial reports:", err);
    }
  };

  const formatCurrency = (amount, currency = "ETB") =>
    formatCurrencyUtil(amount, currency);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-11 w-11 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <p className="text-rose-700 text-sm">{error}</p>
      </div>
    );
  }

  if (!financialSummary) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <ChartBarIcon className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-900">
          No financial data available
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Create a budget to unlock the dashboard.
        </p>
      </div>
    );
  }

  const {
    budget,
    income,
    profitLoss,
    payments,
    allocations,
    analysis,
    projections,
  } = financialSummary;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">
              Financial Dashboard
            </h2>
            <p className="text-sm text-slate-500 truncate">
              Deep dive for {projectName}
            </p>
          </div>
          <button
            onClick={fetchFinancialData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          label="Budget Status"
          value={Number(budget?.totalBudget) || 0}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
          subtitle={`${formatPercentage(budget?.budgetUtilization || 0)} utilized`}
          footer={
            <div className="mt-2">
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    (budget?.budgetUtilization || 0) > 100
                      ? "bg-rose-500"
                      : (budget?.budgetUtilization || 0) > 90
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(budget?.budgetUtilization || 0, 100)}%`,
                  }}
                />
              </div>
              <span
                className={`mt-2 inline-block px-2 py-0.5 text-xs font-medium rounded-md ${getStatusColor(
                  budget?.status || "normal"
                )}`}
              >
                {budget?.status || "N/A"}
              </span>
            </div>
          }
        />
        <MetricCard
          label="Income Status"
          value={Number(income?.totalIncome) || 0}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingUpIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-700"
          subtitle={`${formatPercentage(income?.collectionRate || 0)} collected`}
          footer={
            <div className="mt-2">
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    (income?.collectionRate || 0) >= 90
                      ? "bg-emerald-500"
                      : (income?.collectionRate || 0) >= 70
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{
                    width: `${Math.min(income?.collectionRate || 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          }
        />
        <MetricCard
          label="Payment Collected"
          value={Number(payments?.collected?.amount) || 0}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={BanknotesIcon}
          iconBg="bg-slate-100"
          iconColor="text-slate-700"
          subtitle={`${payments?.collected?.count || 0} collected · ${
            payments?.overdue?.count || 0
          } overdue`}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto bg-slate-50/50">
          <nav className="flex gap-1 p-1.5 min-w-0">
            {[
              { id: "overview", name: "Overview", icon: ChartBarIcon },
              {
                id: "budget",
                name: "Budget Analysis",
                icon: CurrencyDollarIcon,
              },
              { id: "payments", name: "Payment Tracking", icon: BanknotesIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-2.5 px-3 rounded-lg font-medium text-sm whitespace-nowrap flex-shrink-0 transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Risk Factors */}
              {analysis?.riskFactors?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-black mb-4">
                    Risk Factors
                  </h3>
                  <div className="space-y-3">
                    {analysis.riskFactors.map((risk, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        {getStatusIcon(risk.severity)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">
                            {risk.message}
                          </p>
                          <p className="text-xs text-red-600">
                            Amount: {formatCurrency(risk.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {/*
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Budget Efficiency
                    </h4>
                    <p className="text-2xl font-bold text-black">
                      {formatPercentage(
                        analysis?.performanceMetrics?.budgetEfficiency || 0
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Revenue Efficiency
                    </h4>
                    <p className="text-2xl font-bold text-black">
                      {formatPercentage(
                        analysis?.performanceMetrics?.revenueEfficiency || 0
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Cost per Revenue
                    </h4>
                    <p className="text-2xl font-bold text-black">
                      {formatCurrency(
                        analysis?.performanceMetrics?.costPerDollarRevenue || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>
          
            
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">
                  Projections
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Daily Burn Rate
                    </h4>
                    <p className="text-2xl font-bold text-black">
                      {formatCurrency(projections?.dailyBurnRate || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Projected Variance
                    </h4>
                    <p
                      className={`text-2xl font-bold ${
                        (projections?.projectedVariance || 0) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(projections?.projectedVariance || 0)}
                    </p>
                  </div>
                </div>
              </div>
              */}
            </div>
          )}

          {activeTab === "budget" && (
            <div className="space-y-6">
              {/* Budget Allocations */}
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">
                  Budget Allocations
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Allocation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Budgeted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remaining
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(allocations?.summary || allocations || []).map(
                        (allocation) => (
                          <tr key={allocation._id}>
                            <td className="px-6 py-4 whitespace-normal break-words">
                              <div>
                                <div className="text-sm font-medium text-black">
                                  {allocation.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {allocation.category}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                              {formatCurrency(allocation.budgetedAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                              {formatCurrency(allocation.spentAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                              {formatCurrency(allocation.remainingAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-normal break-words">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      allocation.utilization > 100
                                        ? "bg-red-500"
                                        : allocation.utilization > 90
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(
                                        allocation.utilization,
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm text-black">
                                  {formatPercentage(allocation.utilization)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-normal break-words">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  allocation.status
                                )}`}
                              >
                                {allocation.status}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payments" && paymentTracking && (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs sm:text-sm text-emerald-900">
                Expected income → Collect (partial or full) → Auto overdue after
                due date. Manage collections from the Income tab.
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Expected"
                  value={paymentTracking?.summary?.totalExpected || 0}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={CurrencyDollarIcon}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  valueClassName="text-blue-900"
                />
                <MetricCard
                  label="Collected"
                  value={paymentTracking?.summary?.totalCollected || 0}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={CheckCircleIcon}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  valueClassName="text-emerald-700"
                  subtitle={`${
                    paymentTracking?.summary?.collectedCount || 0
                  } fully collected`}
                />
                <MetricCard
                  label="Outstanding"
                  value={
                    (paymentTracking?.summary?.totalPending || 0) +
                    (paymentTracking?.summary?.totalPartial || 0)
                  }
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={ClockIcon}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  valueClassName="text-amber-700"
                  subtitle={`${
                    (paymentTracking?.summary?.pendingCount || 0) +
                    (paymentTracking?.summary?.partialCount || 0)
                  } pending/partial`}
                />
                <MetricCard
                  label="Overdue"
                  value={paymentTracking?.summary?.totalOverdue || 0}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={ExclamationTriangleIcon}
                  iconBg="bg-rose-50"
                  iconColor="text-rose-600"
                  valueClassName="text-rose-700"
                  subtitle={`${
                    paymentTracking?.summary?.overdueCount || 0
                  } past due · ${formatPercentage(
                    paymentTracking?.summary?.collectionRate || 0
                  )} collected`}
                />
              </div>

              {/* Client Performance */}
              {paymentTracking?.paymentsByClient &&
                paymentTracking?.paymentsByClient?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-4">
                      Client Performance
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expected
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Collected
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Uncollected
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Collection Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentTracking?.paymentsByClient?.map(
                            (client, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-normal break-words">
                                  <div>
                                    <div className="text-sm font-medium text-black">
                                      {client.clientName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {client.clientEmail}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                                  {formatCurrency(client.expectedAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                                  {formatCurrency(client.totalAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-normal break-words text-sm text-black">
                                  {formatCurrency(client.uncollectedAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-normal break-words">
                                  <div className="flex flex-col items-center justify-center space-y-2">
                                    <div className="w-full max-w-32 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                                      <div
                                        className={`h-2 rounded-full ${
                                          client.collectionRate >= 95
                                            ? "bg-green-500"
                                            : client.collectionRate >= 80
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            client.collectionRate
                                          )}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-black font-medium text-center">
                                      {formatPercentage(client.collectionRate)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-normal break-words">
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                      client.status
                                    )}`}
                                  >
                                    {client.status}
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-6">
              {/* Report Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="overview">Overview Report</option>
                  <option value="budget-utilization">Budget Utilization</option>
                  <option value="expense-analysis">Expense Analysis</option>
                  <option value="income-tracking">Income Tracking</option>
                  <option value="payment-status">Payment Status</option>
                  <option value="profit-loss">Profit & Loss</option>
                </select>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="End Date"
                />
                <button
                  onClick={() => fetchFinancialReports(selectedReportType)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FunnelIcon className="w-4 h-4" />
                  Generate Report
                </button>
              </div>

              {/* Report Results */}
              {financialReports && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-black">
                      {financialReports.reportType
                        .replace("-", " ")
                        .toUpperCase()}{" "}
                      Report
                    </h3>
                    <button className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Export
                    </button>
                  </div>

                  {/* Summary */}
                  {financialReports.summary && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-black mb-3">
                        Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(financialReports.summary).map(
                          ([key, value]) => (
                            <div key={key}>
                              <p className="text-sm text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-lg font-semibold text-black">
                                {typeof value === "number"
                                  ? key.includes("Rate") ||
                                    key.includes("Percent")
                                    ? formatPercentage(value)
                                    : formatCurrency(value)
                                  : value}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Report Data */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {financialReports.data.length > 0 &&
                              Object.keys(financialReports.data[0]).map(
                                (key) => (
                                  <th
                                    key={key}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                  >
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </th>
                                )
                              )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {financialReports.data
                            .slice(0, 10)
                            .map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="px-6 py-4 whitespace-normal break-words text-sm text-black"
                                  >
                                    {typeof value === "number"
                                      ? Object.keys(row)[cellIndex].includes(
                                          "Rate"
                                        ) ||
                                        Object.keys(row)[cellIndex].includes(
                                          "Percent"
                                        )
                                        ? formatPercentage(value)
                                        : formatCurrency(value)
                                      : String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {financialReports.data.length > 10 && (
                      <div className="px-6 py-3 bg-gray-50 text-center">
                        <p className="text-sm text-gray-600">
                          Showing 10 of {financialReports.totalRecords} records
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
