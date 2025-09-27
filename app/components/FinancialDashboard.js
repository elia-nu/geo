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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!financialSummary) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No financial data available</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Financial Dashboard
            </h2>
            <p className="text-gray-600">
              Comprehensive financial overview for {projectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchFinancialData}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Budget Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                budget.status
              )}`}
            >
              {budget.status}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Budget Status
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(budget.totalBudget)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatPercentage(budget.budgetUtilization)} utilized
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  budget.budgetUtilization > 100
                    ? "bg-red-500"
                    : budget.budgetUtilization > 90
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budget.budgetUtilization, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Income Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                income.status
              )}`}
            >
              {income.status}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Income Status
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(income.totalIncome)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatPercentage(income.collectionRate)} collected
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  income.collectionRate >= 95
                    ? "bg-green-500"
                    : income.collectionRate >= 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${income.collectionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`p-2 rounded-lg ${
                profitLoss.isProfitable ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {profitLoss.isProfitable ? (
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                profitLoss.status
              )}`}
            >
              {profitLoss.status}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Profit/Loss
          </h3>
          <p
            className={`text-2xl font-bold ${
              profitLoss.isProfitable ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(profitLoss.profitLoss)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ROI: {formatPercentage(profitLoss.roi)}
          </p>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BanknotesIcon className="w-6 h-6 text-purple-600" />
            </div>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
              {payments.overdue.count} overdue
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Payment Status
          </h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(payments.collected.amount)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {payments.collected.count} collected
          </p>
        </div>
      </div>

      {/* Detailed Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "overview", name: "Overview", icon: ChartBarIcon },
              {
                id: "budget",
                name: "Budget Analysis",
                icon: CurrencyDollarIcon,
              },
              { id: "payments", name: "Payment Tracking", icon: BanknotesIcon },
              {
                id: "reports",
                name: "Financial Reports",
                icon: DocumentTextIcon,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Risk Factors */}
              {analysis.riskFactors.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Budget Efficiency
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(
                        analysis.performanceMetrics.budgetEfficiency
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Revenue Efficiency
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPercentage(
                        analysis.performanceMetrics.revenueEfficiency
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Cost per Revenue
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        analysis.performanceMetrics.costPerDollarRevenue
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Projections */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Projections
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Daily Burn Rate
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(projections.dailyBurnRate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      Projected Variance
                    </h4>
                    <p
                      className={`text-2xl font-bold ${
                        projections.projectedVariance > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(projections.projectedVariance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "budget" && (
            <div className="space-y-6">
              {/* Budget Allocations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                      {allocations.summary.map((allocation) => (
                        <tr key={allocation._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {allocation.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {allocation.category}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(allocation.budgetedAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(allocation.spentAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(allocation.remainingAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                              <span className="text-sm text-gray-900">
                                {formatPercentage(allocation.utilization)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                allocation.status
                              )}`}
                            >
                              {allocation.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payments" && paymentTracking && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-600 mb-2">
                    Collected
                  </h4>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(paymentTracking.summary.totalCollected)}
                  </p>
                  <p className="text-sm text-green-600">
                    {paymentTracking.payments.collected.count} payments
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-600 mb-2">
                    Pending
                  </h4>
                  <p className="text-2xl font-bold text-yellow-700">
                    {formatCurrency(paymentTracking.summary.totalPending)}
                  </p>
                  <p className="text-sm text-yellow-600">
                    {paymentTracking.payments.pending.count} payments
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-600 mb-2">
                    Overdue
                  </h4>
                  <p className="text-2xl font-bold text-red-700">
                    {formatCurrency(paymentTracking.summary.totalOverdue)}
                  </p>
                  <p className="text-sm text-red-600">
                    {paymentTracking.payments.overdue.count} payments
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Uncollected
                  </h4>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatCurrency(paymentTracking.summary.totalUncollected)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Collection Rate:{" "}
                    {formatPercentage(paymentTracking.summary.collectionRate)}
                  </p>
                </div>
              </div>

              {/* Client Performance */}
              {paymentTracking.paymentsByClient &&
                paymentTracking.paymentsByClient.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                          {paymentTracking.paymentsByClient.map(
                            (client, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {client.clientName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {client.clientEmail}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(client.expectedAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(client.totalAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(client.uncollectedAmount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          client.collectionRate >= 95
                                            ? "bg-green-500"
                                            : client.collectionRate >= 80
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                        }`}
                                        style={{
                                          width: `${client.collectionRate}%`,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-900">
                                      {formatPercentage(client.collectionRate)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
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
                    <h3 className="text-lg font-semibold text-gray-900">
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
                      <h4 className="text-md font-semibold text-gray-900 mb-3">
                        Summary
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(financialReports.summary).map(
                          ([key, value]) => (
                            <div key={key}>
                              <p className="text-sm text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </p>
                              <p className="text-lg font-semibold text-gray-900">
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
                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
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
