"use client";

import { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const ProjectFinancialManagement = ({ projectId, projectName }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [budgetData, setBudgetData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);

  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    totalAmount: "",
    currency: "USD",
    description: "",
    approvedBy: "",
    approvalDate: "",
    budgetAllocations: [],
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    description: "",
    amount: "",
    category: "general",
    expenseDate: new Date().toISOString().split("T")[0],
    allocationId: "",
    vendor: "",
    receiptUrl: "",
    status: "pending",
    tags: [],
  });

  const [incomeForm, setIncomeForm] = useState({
    title: "",
    description: "",
    amount: "",
    expectedAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentMethod: "bank_transfer",
    clientName: "",
    clientEmail: "",
    invoiceNumber: "",
    status: "pending",
    paymentReference: "",
    notes: "",
  });

  const [allocationForm, setAllocationForm] = useState({
    name: "",
    category: "general",
    amount: "",
    description: "",
    allocationType: "general",
    departmentId: "",
    taskId: "",
    activityId: "",
    milestoneId: "",
    priority: "medium",
    startDate: "",
    endDate: "",
    tags: [],
  });

  // Fetch all financial data
  useEffect(() => {
    if (projectId) {
      fetchFinancialData();
    }
  }, [projectId]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const [budgetRes, expensesRes, incomeRes, reportsRes] = await Promise.all(
        [
          fetch(`/api/projects/${projectId}/budget`),
          fetch(`/api/projects/${projectId}/expenses`),
          fetch(`/api/projects/${projectId}/income`),
          fetch(`/api/projects/${projectId}/financial-reports?type=summary`),
        ]
      );

      const [budgetData, expensesData, incomeData, reportsData] =
        await Promise.all([
          budgetRes.json(),
          expensesRes.json(),
          incomeRes.json(),
          reportsRes.json(),
        ]);

      if (budgetData.success) setBudgetData(budgetData.budget);
      if (expensesData.success) setExpenses(expensesData.expenses);
      if (incomeData.success) setIncome(incomeData.income);
      if (reportsData.success) setFinancialReports(reportsData.data);
    } catch (err) {
      setError("Failed to fetch financial data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowBudgetModal(false);
        fetchFinancialData();
        resetBudgetForm();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to create budget: " + err.message);
    }
  };

  const handleAddExpense = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          tags: expenseForm.tags.filter((tag) => tag.trim() !== ""),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowExpenseModal(false);
        fetchFinancialData();
        resetExpenseForm();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to add expense: " + err.message);
    }
  };

  const handleAddIncome = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incomeForm),
      });

      const data = await response.json();
      if (data.success) {
        setShowIncomeModal(false);
        fetchFinancialData();
        resetIncomeForm();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to add income: " + err.message);
    }
  };

  const handleAddAllocation = () => {
    if (allocationForm.name && allocationForm.amount) {
      const newAllocation = {
        ...allocationForm,
        amount: parseFloat(allocationForm.amount),
        _id: Date.now().toString(), // Temporary ID for UI
      };

      setBudgetForm((prev) => ({
        ...prev,
        budgetAllocations: [...prev.budgetAllocations, newAllocation],
      }));

      setShowAllocationModal(false);
      resetAllocationForm();
    }
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      totalAmount: "",
      currency: "USD",
      description: "",
      approvedBy: "",
      approvalDate: "",
      budgetAllocations: [],
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      description: "",
      amount: "",
      category: "general",
      expenseDate: new Date().toISOString().split("T")[0],
      allocationId: "",
      vendor: "",
      receiptUrl: "",
      status: "pending",
      tags: [],
    });
  };

  const resetIncomeForm = () => {
    setIncomeForm({
      title: "",
      description: "",
      amount: "",
      expectedAmount: "",
      receivedDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      paymentMethod: "bank_transfer",
      clientName: "",
      clientEmail: "",
      invoiceNumber: "",
      status: "pending",
      paymentReference: "",
      notes: "",
    });
  };

  const resetAllocationForm = () => {
    setAllocationForm({
      name: "",
      category: "general",
      amount: "",
      description: "",
      allocationType: "general",
      departmentId: "",
      taskId: "",
      activityId: "",
      milestoneId: "",
      priority: "medium",
      startDate: "",
      endDate: "",
      tags: [],
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
      case "collected":
      case "completed":
      case "normal":
        return "text-green-600 bg-green-50 border-green-200";
      case "pending":
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "rejected":
      case "overdue":
      case "cancelled":
      case "overrun":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Financial Management
            </h1>
            <p className="text-gray-600">{projectName}</p>
          </div>

          <div className="flex gap-3">
            {!budgetData && (
              <button
                onClick={() => setShowBudgetModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create Budget
              </button>
            )}

            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Expense
            </button>

            <button
              onClick={() => setShowIncomeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Income
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: "overview", name: "Overview", icon: ChartBarIcon },
            {
              id: "budget",
              name: "Budget & Allocations",
              icon: CurrencyDollarIcon,
            },
            { id: "expenses", name: "Expenses", icon: DocumentTextIcon },
            {
              id: "income",
              name: "Income & Payments",
              icon: ArrowTrendingUpIcon,
            },
            { id: "reports", name: "Reports & Analytics", icon: EyeIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <OverviewTab
            budgetData={budgetData}
            expenses={expenses}
            income={income}
            financialReports={financialReports}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === "budget" && (
          <BudgetTab
            budgetData={budgetData}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expenses={expenses}
            budgetData={budgetData}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === "income" && (
          <IncomeTab
            income={income}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            projectId={projectId}
            financialReports={financialReports}
            formatCurrency={formatCurrency}
          />
        )}
      </div>

      {/* Modals */}
      {showBudgetModal && (
        <BudgetModal
          budgetForm={budgetForm}
          setBudgetForm={setBudgetForm}
          allocationForm={allocationForm}
          setAllocationForm={setAllocationForm}
          showAllocationModal={showAllocationModal}
          setShowAllocationModal={setShowAllocationModal}
          handleCreateBudget={handleCreateBudget}
          handleAddAllocation={handleAddAllocation}
          setShowBudgetModal={setShowBudgetModal}
          resetAllocationForm={resetAllocationForm}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          budgetData={budgetData}
          handleAddExpense={handleAddExpense}
          setShowExpenseModal={setShowExpenseModal}
        />
      )}

      {showIncomeModal && (
        <IncomeModal
          incomeForm={incomeForm}
          setIncomeForm={setIncomeForm}
          handleAddIncome={handleAddIncome}
          setShowIncomeModal={setShowIncomeModal}
        />
      )}
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({
  budgetData,
  expenses,
  income,
  financialReports,
  formatCurrency,
  getStatusColor,
  formatDate,
}) => {
  const summary = financialReports?.financialSummary || {};
  const totalBudget = summary.totalBudget || 0;
  const totalExpenses = summary.totalExpenses || 0;
  const totalIncome = summary.totalIncome || 0;
  const budgetUtilization = summary.budgetUtilization || 0;
  const profitLoss = summary.profitLoss || 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit/Loss</p>
              <p
                className={`text-2xl font-bold ${
                  profitLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(profitLoss)}
              </p>
            </div>
            <div
              className={`p-3 rounded-lg ${
                profitLoss >= 0 ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {profitLoss >= 0 ? (
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Budget Utilization */}
      {totalBudget > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Utilization
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                budgetUtilization > 100
                  ? "overrun"
                  : budgetUtilization > 90
                  ? "warning"
                  : "normal"
              )}`}
            >
              {budgetUtilization.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                budgetUtilization > 100
                  ? "bg-red-500"
                  : budgetUtilization > 90
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Spent: {formatCurrency(totalExpenses)}</span>
            <span>
              Remaining:{" "}
              {formatCurrency(Math.max(0, totalBudget - totalExpenses))}
            </span>
          </div>

          {/* Budget Overrun Warning */}
          {budgetUtilization > 100 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Budget Overrun Alert
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Project is {formatCurrency(totalExpenses - totalBudget)} over
                budget ({(budgetUtilization - 100).toFixed(1)}% overrun)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget Alerts */}
      {budgetData?.alerts && budgetData.alerts.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Budget Alerts & Notifications
          </h3>
          <div className="space-y-3">
            {budgetData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === "high"
                    ? "bg-red-50 border-red-400"
                    : alert.severity === "medium"
                    ? "bg-yellow-50 border-yellow-400"
                    : "bg-blue-50 border-blue-400"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {alert.severity === "high" ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    ) : alert.severity === "medium" ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        alert.severity === "high"
                          ? "text-red-800"
                          : alert.severity === "medium"
                          ? "text-yellow-800"
                          : "text-blue-800"
                      }`}
                    >
                      {alert.type.replace("_", " ").toUpperCase()}
                    </p>
                    <p
                      className={`text-sm ${
                        alert.severity === "high"
                          ? "text-red-700"
                          : alert.severity === "medium"
                          ? "text-yellow-700"
                          : "text-blue-700"
                      }`}
                    >
                      {alert.message}
                    </p>
                    {alert.amount && (
                      <p
                        className={`text-xs mt-1 font-medium ${
                          alert.severity === "high"
                            ? "text-red-600"
                            : alert.severity === "medium"
                            ? "text-yellow-600"
                            : "text-blue-600"
                        }`}
                      >
                        Amount: {formatCurrency(Math.abs(alert.amount))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Allocations Overview */}
      {budgetData?.allocations && budgetData.allocations.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Budget Allocations
          </h3>
          <div className="space-y-4">
            {budgetData.allocations.map((allocation) => (
              <div
                key={allocation._id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {allocation.name || allocation.category}
                  </h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">
                      Budget: {formatCurrency(allocation.budgetedAmount)}
                    </span>
                    <span className="text-sm text-gray-600">
                      Spent: {formatCurrency(allocation.spentAmount)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        allocation.status
                      )}`}
                    >
                      {allocation.utilization?.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      allocation.utilization > 100
                        ? "bg-red-500"
                        : allocation.utilization > 90
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(allocation.utilization || 0, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Expenses
            </h3>
            <span className="text-sm text-gray-500">
              {expenses.length} total
            </span>
          </div>
          <div className="space-y-3">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{expense.title}</h4>
                  <p className="text-sm text-gray-600">
                    {expense.category} • {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      expense.status
                    )}`}
                  >
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Income */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Income
            </h3>
            <span className="text-sm text-gray-500">{income.length} total</span>
          </div>
          <div className="space-y-3">
            {income.slice(0, 5).map((inc) => (
              <div
                key={inc._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{inc.title}</h4>
                  <p className="text-sm text-gray-600">
                    {inc.clientName} • {formatDate(inc.receivedDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {formatCurrency(inc.amount)}
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      inc.status
                    )}`}
                  >
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Budget Tab Component
const BudgetTab = ({
  budgetData,
  formatCurrency,
  getStatusColor,
  formatDate,
}) => {
  if (!budgetData) {
    return (
      <div className="text-center py-12">
        <CurrencyDollarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Budget Created
        </h3>
        <p className="text-gray-600">
          Create a budget to start managing your project finances.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Budget Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Total Budget</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(budgetData.totalAmount, budgetData.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approved By</p>
            <p className="text-lg font-medium text-gray-900">
              {budgetData.approvedBy || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approval Date</p>
            <p className="text-lg font-medium text-gray-900">
              {formatDate(budgetData.approvalDate)}
            </p>
          </div>
        </div>
        {budgetData.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Description</p>
            <p className="text-gray-900">{budgetData.description}</p>
          </div>
        )}
      </div>

      {/* Budget Allocations */}
      {budgetData.allocations && budgetData.allocations.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
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
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
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
                {budgetData.allocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.name || "Unnamed"}
                      </div>
                      {allocation.description && (
                        <div className="text-sm text-gray-500">
                          {allocation.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {allocation.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(allocation.budgetedAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
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
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                allocation.utilization || 0,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">
                          {allocation.utilization?.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
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
      )}
    </div>
  );
};

// Expenses Tab Component
const ExpensesTab = ({
  expenses,
  budgetData,
  formatCurrency,
  getStatusColor,
  formatDate,
}) => {
  return (
    <div className="space-y-6">
      {/* Expenses Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(
              expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(
              expenses
                .filter((exp) => exp.status === "approved")
                .reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-xl font-bold text-yellow-600">
            {formatCurrency(
              expenses
                .filter((exp) => exp.status === "pending")
                .reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Count</p>
          <p className="text-xl font-bold text-gray-900">{expenses.length}</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {expense.title}
                    </div>
                    {expense.description && (
                      <div className="text-sm text-gray-500">
                        {expense.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(expense.expenseDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.vendor || "Not specified"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                        expense.status
                      )}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Income Tab Component
const IncomeTab = ({ income, formatCurrency, getStatusColor, formatDate }) => {
  return (
    <div className="space-y-6">
      {/* Income Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Income</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(
              income.reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Collected</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(
              income
                .filter((inc) => inc.status === "collected")
                .reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-xl font-bold text-yellow-600">
            {formatCurrency(
              income
                .filter((inc) => inc.status === "pending")
                .reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Count</p>
          <p className="text-xl font-bold text-gray-900">{income.length}</p>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Income & Payments
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {income.map((inc) => (
                <tr key={inc._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {inc.title}
                    </div>
                    {inc.invoiceNumber && (
                      <div className="text-sm text-gray-500">
                        Invoice: {inc.invoiceNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(inc.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {inc.clientName || "Not specified"}
                    </div>
                    {inc.clientEmail && (
                      <div className="text-sm text-gray-500">
                        {inc.clientEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {inc.paymentMethod?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(inc.receivedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Reports Tab Component
const ReportsTab = ({ projectId, financialReports, formatCurrency }) => {
  const [reportType, setReportType] = useState("summary");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async (type) => {
    try {
      setLoading(true);
      let response;

      if (type === "utilization") {
        response = await fetch(`/api/projects/${projectId}/utilization-report`);
      } else {
        response = await fetch(
          `/api/projects/${projectId}/financial-reports?type=${type}`
        );
      }

      const data = await response.json();

      if (data.success) {
        if (type === "utilization") {
          setReportData(data.report);
        } else {
          setReportData(data.data);
        }
        setReportType(type);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      generateReport("summary");
    }
  }, [projectId]);

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Generate Reports
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            {
              id: "summary",
              name: "Financial Summary",
              description: "Overview of budget, expenses, and income",
            },
            {
              id: "utilization",
              name: "Utilization Report",
              description: "Detailed budget utilization with overrun alerts",
            },
            {
              id: "detailed",
              name: "Detailed Report",
              description: "Complete financial breakdown with all transactions",
            },
            {
              id: "variance",
              name: "Variance Analysis",
              description: "Budget vs actual spending analysis",
            },
            {
              id: "trends",
              name: "Trend Analysis",
              description: "Monthly financial trends and patterns",
            },
          ].map((report) => (
            <button
              key={report.id}
              onClick={() => generateReport(report.id)}
              disabled={loading}
              className={`p-4 text-left border rounded-lg transition-colors ${
                reportType === report.id
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-gray-200 hover:border-gray-300"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-medium">{report.name}</div>
              <div className="text-sm text-gray-600">{report.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reportData ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Print Report
              </button>
              <button
                onClick={() => generateReport(reportType)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Report Content Based on Type */}
          {reportType === "summary" && reportData?.financialSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Total Budget</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(reportData.financialSummary.totalBudget)}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(reportData.financialSummary.totalExpenses)}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(reportData.financialSummary.totalIncome)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Budget Utilization</p>
                  <p className="text-xl font-bold text-gray-900">
                    {reportData.financialSummary.budgetUtilization?.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        reportData.financialSummary.budgetUtilization > 100
                          ? "bg-red-500"
                          : reportData.financialSummary.budgetUtilization > 90
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          reportData.financialSummary.budgetUtilization || 0,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Profit/Loss</p>
                  <p
                    className={`text-xl font-bold ${
                      reportData.financialSummary.profitLoss >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(reportData.financialSummary.profitLoss)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ROI: {reportData.financialSummary.roi?.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Utilization Report */}
          {reportType === "utilization" && reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">Budget Utilization</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {reportData.summary.budgetUtilization.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Overall Score</p>
                  <p className="text-2xl font-bold text-green-900">
                    {reportData.performance.overallScore.toFixed(0)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {reportData.alerts.length}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">Overrun Amount</p>
                  <p className="text-2xl font-bold text-red-900">
                    {formatCurrency(reportData.summary.overrunAmount)}
                  </p>
                </div>
              </div>

              {/* Alerts Section */}
              {reportData.alerts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Active Alerts
                  </h4>
                  <div className="space-y-3">
                    {reportData.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === "high"
                            ? "bg-red-50 border-red-400"
                            : alert.severity === "medium"
                            ? "bg-yellow-50 border-yellow-400"
                            : "bg-blue-50 border-blue-400"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p
                              className={`font-medium text-sm ${
                                alert.severity === "high"
                                  ? "text-red-800"
                                  : alert.severity === "medium"
                                  ? "text-yellow-800"
                                  : "text-blue-800"
                              }`}
                            >
                              {alert.type.replace(/_/g, " ").toUpperCase()}
                            </p>
                            <p
                              className={`text-sm ${
                                alert.severity === "high"
                                  ? "text-red-700"
                                  : alert.severity === "medium"
                                  ? "text-yellow-700"
                                  : "text-blue-700"
                              }`}
                            >
                              {alert.message}
                            </p>
                          </div>
                          {alert.amount && (
                            <span
                              className={`text-sm font-medium ${
                                alert.severity === "high"
                                  ? "text-red-600"
                                  : alert.severity === "medium"
                                  ? "text-yellow-600"
                                  : "text-blue-600"
                              }`}
                            >
                              {formatCurrency(Math.abs(alert.amount))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allocation Performance */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Budget Allocation Performance
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Allocation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Budget
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Utilization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Efficiency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.allocations.map((allocation) => (
                        <tr key={allocation._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {allocation.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {allocation.category}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(allocation.budgetedAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {formatCurrency(allocation.spentAmount)}
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
                                      : "bg-blue-500"
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
                                {allocation.utilization.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {allocation.efficiency.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
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

              {/* Recommendations */}
              {reportData.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Recommendations
                  </h4>
                  <div className="space-y-3">
                    {reportData.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-blue-800 text-sm">
                              {rec.type.replace(/_/g, " ").toUpperCase()} -{" "}
                              {rec.priority.toUpperCase()} PRIORITY
                            </p>
                            <p className="text-blue-700 text-sm">
                              {rec.message}
                            </p>
                            <p className="text-blue-600 text-xs mt-1">
                              Action: {rec.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add more report type renderings as needed */}
        </div>
      ) : (
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Report Generated
          </h3>
          <p className="text-gray-600">
            Select a report type above to generate financial reports.
          </p>
        </div>
      )}
    </div>
  );
};

// Budget Modal Component
const BudgetModal = ({
  budgetForm,
  setBudgetForm,
  allocationForm,
  setAllocationForm,
  showAllocationModal,
  setShowAllocationModal,
  handleCreateBudget,
  handleAddAllocation,
  setShowBudgetModal,
  resetAllocationForm,
}) => {
  const totalAllocated = budgetForm.budgetAllocations.reduce(
    (sum, alloc) => sum + (alloc.amount || 0),
    0
  );
  const remainingBudget =
    parseFloat(budgetForm.totalAmount || 0) - totalAllocated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Create Project Budget
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Budget Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={budgetForm.totalAmount}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    totalAmount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={budgetForm.currency}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    currency: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={budgetForm.description}
              onChange={(e) =>
                setBudgetForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Budget description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approved By
              </label>
              <input
                type="text"
                value={budgetForm.approvedBy}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    approvedBy: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Approver name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Date
              </label>
              <input
                type="date"
                value={budgetForm.approvalDate}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    approvalDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Budget Allocations */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold text-gray-900">
                Budget Allocations
              </h4>
              <button
                onClick={() => setShowAllocationModal(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Allocation
              </button>
            </div>

            {budgetForm.budgetAllocations.length > 0 && (
              <div className="space-y-2 mb-4">
                {budgetForm.budgetAllocations.map((allocation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{allocation.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({allocation.category})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${allocation.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => {
                          setBudgetForm((prev) => ({
                            ...prev,
                            budgetAllocations: prev.budgetAllocations.filter(
                              (_, i) => i !== index
                            ),
                          }));
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {budgetForm.totalAmount && (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Total Budget:</span>
                  <span className="font-semibold">
                    ${parseFloat(budgetForm.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Allocated:</span>
                  <span className="font-semibold">
                    ${totalAllocated.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span
                    className={`font-semibold ${
                      remainingBudget < 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    ${remainingBudget.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => setShowBudgetModal(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateBudget}
            disabled={!budgetForm.totalAmount}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Budget
          </button>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full m-4">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900">
                Add Budget Allocation
              </h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Name *
                </label>
                <input
                  type="text"
                  value={allocationForm.name}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Development Team"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={allocationForm.category}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="development">Development</option>
                  <option value="design">Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="operations">Operations</option>
                  <option value="equipment">Equipment</option>
                  <option value="travel">Travel</option>
                  <option value="materials">Materials</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={allocationForm.amount}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocation Type
                </label>
                <select
                  value={allocationForm.allocationType}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      allocationType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="department">Department</option>
                  <option value="task">Task</option>
                  <option value="activity">Activity</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={allocationForm.priority}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={allocationForm.startDate}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={allocationForm.endDate}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={allocationForm.description}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Allocation description..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAllocationModal(false);
                  resetAllocationForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAllocation}
                disabled={!allocationForm.name || !allocationForm.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Expense Modal Component
const ExpenseModal = ({
  expenseForm,
  setExpenseForm,
  budgetData,
  handleAddExpense,
  setShowExpenseModal,
}) => {
  const addTag = () => {
    setExpenseForm((prev) => ({
      ...prev,
      tags: [...prev.tags, ""],
    }));
  };

  const updateTag = (index, value) => {
    setExpenseForm((prev) => ({
      ...prev,
      tags: prev.tags.map((tag, i) => (i === index ? value : tag)),
    }));
  };

  const removeTag = (index) => {
    setExpenseForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Expense
          </h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Title *
              </label>
              <input
                type="text"
                value={expenseForm.title}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Office Supplies"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="operations">Operations</option>
                <option value="equipment">Equipment</option>
                <option value="travel">Travel</option>
                <option value="materials">Materials</option>
                <option value="utilities">Utilities</option>
                <option value="software">Software</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    expenseDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Allocation
              </label>
              <select
                value={expenseForm.allocationId}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    allocationId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No specific allocation</option>
                {budgetData?.allocations?.map((allocation) => (
                  <option key={allocation._id} value={allocation._id}>
                    {allocation.name || allocation.category} ($
                    {allocation.budgetedAmount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor
              </label>
              <input
                type="text"
                value={expenseForm.vendor}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    vendor: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Vendor name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={expenseForm.status}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receipt URL
              </label>
              <input
                type="url"
                value={expenseForm.receiptUrl}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    receiptUrl: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Expense description..."
              />
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <button
                  type="button"
                  onClick={addTag}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Tag
                </button>
              </div>
              <div className="space-y-2">
                {expenseForm.tags.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => updateTag(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tag name"
                    />
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => setShowExpenseModal(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleAddExpense}
            disabled={!expenseForm.title || !expenseForm.amount}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Expense
          </button>
        </div>
      </div>
    </div>
  );
};

// Income Modal Component
const IncomeModal = ({
  incomeForm,
  setIncomeForm,
  handleAddIncome,
  setShowIncomeModal,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Add New Income/Payment
          </h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Income Title *
              </label>
              <input
                type="text"
                value={incomeForm.title}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Project Payment - Phase 1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.expectedAmount}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    expectedAmount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={incomeForm.clientName}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    clientName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Email
              </label>
              <input
                type="email"
                value={incomeForm.clientEmail}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    clientEmail: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <select
                value={incomeForm.paymentMethod}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="wire_transfer">Wire Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={incomeForm.status}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="collected">Collected</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Received Date
              </label>
              <input
                type="date"
                value={incomeForm.receivedDate}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    receivedDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={incomeForm.dueDate}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <input
                type="text"
                value={incomeForm.invoiceNumber}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    invoiceNumber: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="INV-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference
              </label>
              <input
                type="text"
                value={incomeForm.paymentReference}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    paymentReference: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Transaction ID or reference"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={incomeForm.description}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Income description..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={incomeForm.notes}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => setShowIncomeModal(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleAddIncome}
            disabled={!incomeForm.title || !incomeForm.amount}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Income
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectFinancialManagement;
