"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import FinancialDashboard from "./FinancialDashboard";
import EntityManagement from "./EntityManagement";
import {
  validateBudgetForm,
  validateExpenseForm,
  validateAllocationForm,
  validateIncomeForm,
  validateExpectedPaymentForm,
  validateCollectPaymentForm,
  hasFormErrors,
} from "../utils/formValidation";
import {
  projectToasts,
  showValidationErrors,
  showDeleteConfirmDialog,
  showSuccessToast,
  showErrorToast,
} from "../utils/sweetAlert";
import {
  formatCurrency as formatCurrencyUtil,
  currencyTitle,
} from "../utils/currency";
import MetricCard from "./financial/MetricCard";
import AmountCell from "./financial/AmountCell";

const LoadingSpinner = ({ className = "h-4 w-4" }) => (
  <span
    className={`${className} rounded-full border-2 border-white/30 border-t-white animate-spin`}
    aria-hidden="true"
  />
);

const ActionButton = ({
  onClick,
  disabled,
  loading,
  loadingText,
  children,
  className = "",
  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={`relative inline-flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${className}`}
  >
    {loading ? (
      <>
        <LoadingSpinner />
        <span className="animate-pulse">{loadingText || "Saving…"}</span>
      </>
    ) : (
      children
    )}
    {loading && (
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
    )}
  </button>
);

const modalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-2 sm:p-4 animate-[fadeIn_0.2s_ease-out]";
const modalOverlayNestedClass =
  "fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-2 sm:p-4 animate-[fadeIn_0.2s_ease-out]";
const modalPanelClass =
  "bg-white rounded-xl shadow-xl w-full border border-slate-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto";
const modalHeaderClass = "p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white";
const modalBodyClass = "p-4 sm:p-6 space-y-4 sm:space-y-5";
const modalFooterClass =
  "flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50/80";
const cancelBtnClass =
  "w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200 disabled:opacity-50";
const primaryBtnClass =
  "w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all duration-200 disabled:opacity-50";

const fieldInputClass = (hasError = false) =>
  `w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed ${
    hasError
      ? "border-red-500 focus:ring-red-500"
      : "border-slate-300 focus:ring-blue-500 focus:border-blue-500"
  }`;

const fieldLabelClass =
  "block text-xs sm:text-sm font-medium text-slate-700 mb-1.5";
const fieldErrorClass = "text-xs text-red-600 mt-1";

const todayInputValue = () => new Date().toISOString().split("T")[0];

const toDateInputValue = (value) => {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const formatMoneyDisplay = (value, currency = "ETB") => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `0.00 ${currency}`;
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

const BudgetAvailabilityCard = ({
  total,
  allocated,
  remaining,
  currency = "ETB",
  overBudget = false,
}) => {
  const safeTotal = Math.max(0, Number(total) || 0);
  const pct =
    safeTotal > 0
      ? Math.min(100, Math.max(0, ((Number(allocated) || 0) / safeTotal) * 100))
      : 0;

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 space-y-3 ${
        overBudget
          ? "bg-rose-50 border-rose-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Budget availability
          </p>
          <p
            className={`mt-1 text-lg sm:text-xl font-semibold tabular-nums ${
              overBudget ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {formatMoneyDisplay(remaining, currency)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {overBudget ? "Over-allocated — reduce amounts" : "Available to allocate"}
          </p>
        </div>
        <div className="text-right text-xs text-slate-600 space-y-0.5">
          <div>
            Total{" "}
            <span className="font-medium text-slate-800">
              {formatMoneyDisplay(total, currency)}
            </span>
          </div>
          <div>
            Allocated{" "}
            <span className="font-medium text-slate-800">
              {formatMoneyDisplay(allocated, currency)}
            </span>
          </div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            overBudget
              ? "bg-rose-500"
              : pct > 90
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
          style={{ width: `${overBudget ? 100 : pct}%` }}
        />
      </div>
    </div>
  );
};

const ModalChrome = ({
  nested = false,
  maxWidth = "max-w-2xl",
  title,
  subtitle,
  children,
  footer,
  onClose,
  closeDisabled = false,
}) => (
  <div
    className={nested ? modalOverlayNestedClass : modalOverlayClass}
    onMouseDown={(e) => {
      if (e.target === e.currentTarget && onClose && !closeDisabled) onClose();
    }}
  >
    <div
      className={`${modalPanelClass} ${maxWidth}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`${modalHeaderClass} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <h3
            id="modal-title"
            className="text-base sm:text-lg font-semibold text-slate-900"
          >
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-xs sm:text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <span className="block text-xl leading-none">&times;</span>
          </button>
        ) : null}
      </div>
      <div className={modalBodyClass}>{children}</div>
      {footer ? <div className={modalFooterClass}>{footer}</div> : null}
    </div>
  </div>
);

const SectionPanel = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "p-4 sm:p-5",
}) => (
  <div
    className={`bg-white rounded-xl border border-slate-200 shadow-sm min-w-0 overflow-hidden ${className}`}
  >
    {(title || action) && (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <div className="min-w-0">
          {title ? (
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              {title}
            </h3>
          ) : null}
          {subtitle ? (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </div>
);

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-10 sm:py-12 px-4">
    {Icon ? (
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
    ) : null}
    <h3 className="text-sm sm:text-base font-semibold text-slate-900">
      {title}
    </h3>
    {description ? (
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

const ProjectFinancialManagement = ({ projectId, projectName }) => {
  function getStatusColor(status) {
    switch ((status || "").toLowerCase()) {
      case "not_started":
      case "default":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "in_progress":
      case "primary":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "completed":
      case "success":
      case "approved":
      case "paid":
      case "collected":
        return "bg-green-50 text-green-700 border-green-200";
      case "on_hold":
      case "pending":
      case "warning":
      case "partial":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "cancelled":
      case "rejected":
      case "overrun":
      case "overdue":
      case "error":
      case "failed":
      case "unpaid":
        return "bg-red-50 text-red-700 border-red-200";
      case "normal":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  }
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);

  // Data states
  const [budgetData, setBudgetData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);

  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [currentItem, setCurrentItem] = useState(null);
  const [showAllocationEditModal, setShowAllocationEditModal] = useState(false);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    totalAmount: "",
    currency: "ETB",
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
    categoryId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    allocationId: "",
    vendor: "",
    receiptUrl: "",
    status: "pending",
    tags: [],
  });

  // Form validation states
  const [budgetFormErrors, setBudgetFormErrors] = useState({});
  const [expenseFormErrors, setExpenseFormErrors] = useState({});
  const [allocationFormErrors, setAllocationFormErrors] = useState({});
  const [incomeFormErrors, setIncomeFormErrors] = useState({});
  const [expectedPaymentFormErrors, setExpectedPaymentFormErrors] = useState(
    {}
  );

  const [incomeForm, setIncomeForm] = useState({
    title: "",
    description: "",
    amount: "",
    expectedAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentMethod: "bank_transfer",
    clientName: "",
    categoryId: "",
    invoiceNumber: "",
    status: "pending",
    paymentReference: "",
    notes: "",
  });

  // Expected payment (expected-only) form state
  const [expectedPaymentForm, setExpectedPaymentForm] = useState({
    title: "",
    expectedAmount: "",
    clientName: "",
    categoryId: "",
    dueDate: "",
    description: "",
    notes: "",
    status: "pending",
  });

  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showExpectedPaymentModal, setShowExpectedPaymentModal] =
    useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectingIncome, setCollectingIncome] = useState(null);
  const [collectForm, setCollectForm] = useState({
    collectAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    notes: "",
  });
  const [collectFormErrors, setCollectFormErrors] = useState({});

  const [allocationForm, setAllocationForm] = useState({
    name: "",
    category: "general",
    categoryId: "",
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

  // Entity data states
  const [departments, setDepartments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [budgetAllocationCategories, setBudgetAllocationCategories] = useState(
    []
  );
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [milestones, setMilestones] = useState([]);

  // Fetch all financial data
  useEffect(() => {
    if (projectId) {
      fetchFinancialData();
      fetchEntityData();
      fetchCategoryData();
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

  const fetchEntityData = async () => {
    try {
      const [departmentsRes, tasksRes, activitiesRes, milestonesRes] =
        await Promise.all([
          fetch(`/api/departments`), // Fetch all departments (main system)
          fetch(`/api/tasks?projectId=${projectId}`),
          fetch(`/api/activities?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}/milestones`),
        ]);

      const [departmentsData, tasksData, activitiesData, milestonesData] =
        await Promise.all([
          departmentsRes.json(),
          tasksRes.json(),
          activitiesRes.json(),
          milestonesRes.json(),
        ]);

      if (departmentsData.success) {
        setDepartments(departmentsData.departments || []);
      }
      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }
      if (activitiesData.success) {
        setActivities(activitiesData.activities || []);
      }
      if (milestonesData.success) {
        setMilestones(milestonesData.milestones || []);
      }
    } catch (err) {
      console.error("Error fetching entity data:", err);
    }
  };

  const fetchCategoryData = async () => {
    try {
      const [budgetCategoriesRes, incomeCategoriesRes] = await Promise.all([
        fetch("/api/budget-allocation-categories"),
        fetch("/api/income-categories"),
      ]);

      const [budgetCategoriesData, incomeCategoriesData] = await Promise.all([
        budgetCategoriesRes.json(),
        incomeCategoriesRes.json(),
      ]);

      if (budgetCategoriesData.success) {
        setBudgetAllocationCategories(budgetCategoriesData.categories || []);
      }
      if (incomeCategoriesData.success) {
        setIncomeCategories(incomeCategoriesData.categories || []);
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
    }
  };

  const runAction = async (
    key,
    actionFn,
    { successTitle, successText, errorTitle = "Error" } = {}
  ) => {
    if (actionLoading) return null;
    setActionLoading(key);
    setError(null);
    const started = Date.now();
    try {
      const result = await actionFn();
      const elapsed = Date.now() - started;
      if (elapsed < 350) {
        await new Promise((resolve) => setTimeout(resolve, 350 - elapsed));
      }
      if (successTitle) {
        showSuccessToast(successTitle, successText || "");
      }
      return result;
    } catch (err) {
      const msg = err?.message || "Something went wrong. Please try again.";
      setError(msg);
      showErrorToast(errorTitle, msg);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBudget = async () => {
    const errors = validateBudgetForm(budgetForm);
    if (hasFormErrors(errors)) {
      setBudgetFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setBudgetFormErrors({});

    const result = await runAction(
      "budget",
      async () => {
        const response = await fetch(`/api/projects/${projectId}/budget`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(budgetForm),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to create budget");
        }
        return data;
      },
      {
        successTitle: "Budget Created!",
        successText: "Project budget has been created successfully",
        errorTitle: "Budget Error",
      }
    );

    if (result?.success) {
      setShowBudgetModal(false);
      fetchFinancialData();
      resetBudgetForm();
    }
  };

  const handleEditBudget = async () => {
    const errors = validateBudgetForm(budgetForm);
    if (hasFormErrors(errors)) {
      setBudgetFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setBudgetFormErrors({});

    const result = await runAction(
      "budget",
      async () => {
        const response = await fetch(`/api/projects/${projectId}/budget`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(budgetForm),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update budget");
        }
        return data;
      },
      {
        successTitle: "Budget Updated!",
        successText: "Project budget has been updated successfully",
        errorTitle: "Budget Error",
      }
    );

    if (result?.success) {
      setShowEditBudgetModal(false);
      fetchFinancialData();
      resetBudgetForm();
    }
  };

  const handleOpenEditBudget = () => {
    if (budgetData) {
      setBudgetForm({
        totalAmount: budgetData.totalAmount || 0,
        currency: budgetData.currency || "ETB",
        description: budgetData.description || "",
        approvedBy: budgetData.approvedBy || "",
        approvalDate: toDateInputValue(budgetData.approvalDate),
        budgetAllocations: (budgetData.allocations || []).map((alloc) => ({
          ...alloc,
          startDate: toDateInputValue(alloc.startDate),
          endDate: toDateInputValue(alloc.endDate),
        })),
      });
      setBudgetFormErrors({});
      setShowEditBudgetModal(true);
    }
  };

  const handleAddExpense = async () => {
    const errors = validateExpenseForm(expenseForm);
    if (hasFormErrors(errors)) {
      setExpenseFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setExpenseFormErrors({});

    const result = await runAction(
      "expense",
      async () => {
        const response = await fetch(`/api/projects/${projectId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...expenseForm,
            tags: expenseForm.tags.filter((tag) => tag.trim() !== ""),
          }),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to add expense");
        }
        return data;
      },
      {
        successTitle: "Expense Added!",
        successText: "Expense has been added successfully",
        errorTitle: "Expense Error",
      }
    );

    if (result?.success) {
      setShowExpenseModal(false);
      fetchFinancialData();
      resetExpenseForm();
    }
  };

  const handleAddIncome = async () => {
    const errors = validateIncomeForm(incomeForm, { isEdit: false });
    if (hasFormErrors(errors)) {
      setIncomeFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setIncomeFormErrors({});

    const result = await runAction(
      "income",
      async () => {
        const response = await fetch(`/api/projects/${projectId}/income`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incomeForm),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to add income");
        }
        return data;
      },
      {
        successTitle: "Income Added!",
        successText: "Income has been recorded successfully",
        errorTitle: "Income Error",
      }
    );

    if (result?.success) {
      setShowIncomeModal(false);
      fetchFinancialData();
      resetIncomeForm();
    }
  };

  const handleAddExpectedPayment = async () => {
    const errors = validateExpectedPaymentForm(expectedPaymentForm);
    if (hasFormErrors(errors)) {
      setExpectedPaymentFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setExpectedPaymentFormErrors({});

    const result = await runAction(
      "expected",
      async () => {
        const payload = {
          title: expectedPaymentForm.title,
          expectedAmount: expectedPaymentForm.expectedAmount,
          clientName: expectedPaymentForm.clientName,
          categoryId: expectedPaymentForm.categoryId || "",
          dueDate: expectedPaymentForm.dueDate,
          description: expectedPaymentForm.description,
          notes: expectedPaymentForm.notes,
          status: "pending",
        };
        const response = await fetch(`/api/projects/${projectId}/income`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to add expected income");
        }
        return data;
      },
      {
        successTitle: "Expected Income Set!",
        successText:
          "Waiting for collection. Status becomes overdue if the due date passes.",
        errorTitle: "Payment Error",
      }
    );

    if (result?.success) {
      setShowExpectedPaymentModal(false);
      fetchFinancialData();
      setExpectedPaymentForm({
        title: "",
        expectedAmount: "",
        clientName: "",
        categoryId: "",
        dueDate: "",
        description: "",
        notes: "",
        status: "pending",
      });
      setExpectedPaymentFormErrors({});
      setActiveTab("income");
    }
  };

  const openCollectModal = (inc) => {
    const remaining = Math.max(
      0,
      (Number(inc.expectedAmount) || 0) - (Number(inc.amount) || 0)
    );
    setCollectingIncome(inc);
    setCollectForm({
      collectAmount: remaining > 0 ? remaining.toFixed(2) : "",
      receivedDate: new Date().toISOString().split("T")[0],
      invoiceNumber: inc.invoiceNumber || "",
      paymentMethod: inc.paymentMethod || "bank_transfer",
      paymentReference: "",
      notes: "",
    });
    setCollectFormErrors({});
    setShowCollectModal(true);
  };

  const handleCollectPayment = async () => {
    if (!collectingIncome?._id) return;

    const remaining = Math.max(
      0,
      (Number(collectingIncome.expectedAmount) || 0) -
        (Number(collectingIncome.amount) || 0)
    );
    const errors = validateCollectPaymentForm(collectForm, {
      remainingAmount: remaining > 0 ? remaining : Infinity,
    });
    if (hasFormErrors(errors)) {
      setCollectFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setCollectFormErrors({});

    const result = await runAction(
      "collect",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/income/${collectingIncome._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "collect",
              collectAmount: collectForm.collectAmount,
              receivedDate: collectForm.receivedDate,
              invoiceNumber: collectForm.invoiceNumber,
              paymentMethod: collectForm.paymentMethod,
              paymentReference: collectForm.paymentReference,
              notes: collectForm.notes,
            }),
          }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to collect payment");
        }
        return data;
      },
      {
        successTitle:
          Number(collectForm.collectAmount) >= remaining
            ? "Fully Collected!"
            : "Partial Collection Recorded!",
        successText:
          Number(collectForm.collectAmount) >= remaining
            ? "This income is now marked as collected."
            : "Remaining balance is still pending collection.",
        errorTitle: "Collection Error",
      }
    );

    if (result?.success) {
      setShowCollectModal(false);
      setCollectingIncome(null);
      fetchFinancialData();
    }
  };

  const handleOpenEditIncome = (inc) => {
    setIncomeForm({
      title: inc.title || "",
      description: inc.description || "",
      amount: (inc.amount ?? "").toString(),
      expectedAmount: (inc.expectedAmount ?? "").toString(),
      receivedDate: inc.receivedDate
        ? new Date(inc.receivedDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      dueDate: inc.dueDate
        ? new Date(inc.dueDate).toISOString().split("T")[0]
        : "",
      paymentMethod: inc.paymentMethod || "bank_transfer",
      clientName: inc.clientName || "",
      categoryId: inc.categoryId || "",
      invoiceNumber: inc.invoiceNumber || "",
      status: inc.status || "pending",
      paymentReference: inc.paymentReference || "",
      notes: inc.notes || "",
    });
    setEditingIncomeId(inc._id);
    setIncomeFormErrors({});
    setShowIncomeModal(true);
  };

  const handleOpenEditExpense = (expense) => {
    setExpenseForm({
      title: expense.title || "",
      description: expense.description || "",
      amount: expense.amount || "",
      category: expense.category || "general",
      categoryId: expense.categoryId || "",
      expenseDate:
        expense.expenseDate || new Date().toISOString().split("T")[0],
      allocationId: expense.allocationId || "",
      vendor: expense.vendor || "",
      receiptUrl: expense.receiptUrl || "",
      status: expense.status || "pending",
      tags: expense.tags || [],
    });
    setEditingExpenseId(expense._id);
    setShowExpenseModal(true);
  };

  const handleEditIncome = async () => {
    if (!editingIncomeId) return;

    const errors = validateIncomeForm(incomeForm, { isEdit: true });
    if (hasFormErrors(errors)) {
      setIncomeFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setIncomeFormErrors({});

    const result = await runAction(
      "income",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/income/${editingIncomeId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(incomeForm),
          }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update income");
        }
        return data;
      },
      {
        successTitle: "Income Updated!",
        successText: "Income has been updated successfully",
        errorTitle: "Income Error",
      }
    );

    if (result?.success) {
      setShowIncomeModal(false);
      setEditingIncomeId(null);
      fetchFinancialData();
      resetIncomeForm();
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpenseId) return;

    const errors = validateExpenseForm(expenseForm);
    if (hasFormErrors(errors)) {
      setExpenseFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setExpenseFormErrors({});

    const result = await runAction(
      "expense",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/expenses/${editingExpenseId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...expenseForm,
              tags: expenseForm.tags.filter((tag) => tag.trim() !== ""),
            }),
          }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update expense");
        }
        return data;
      },
      {
        successTitle: "Expense Updated!",
        successText: "Expense has been updated successfully",
        errorTitle: "Expense Error",
      }
    );

    if (result?.success) {
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      fetchFinancialData();
      resetExpenseForm();
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await showDeleteConfirmDialog(
      "Delete Expense",
      "Are you sure you want to delete this expense? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed?.isConfirmed) return;

    const result = await runAction(
      "delete-expense",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/expenses/${expenseId}`,
          { method: "DELETE" }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to delete expense");
        }
        return data;
      },
      {
        successTitle: "Expense Deleted!",
        successText: "Expense has been deleted successfully",
        errorTitle: "Delete Error",
      }
    );

    if (result?.success) {
      fetchFinancialData();
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    const confirmed = await showDeleteConfirmDialog(
      "Delete Income",
      "Are you sure you want to delete this income record? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed?.isConfirmed) return;

    const result = await runAction(
      "delete-income",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/income/${incomeId}`,
          { method: "DELETE" }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to delete income");
        }
        return data;
      },
      {
        successTitle: "Income Deleted!",
        successText: "Income has been deleted successfully",
        errorTitle: "Delete Error",
      }
    );

    if (result?.success) {
      fetchFinancialData();
    }
  };

  const getAvailableBudgetForNewAllocation = () => {
    const total = Number(budgetForm.totalAmount) || 0;
    const allocated = (budgetForm.budgetAllocations || []).reduce(
      (sum, alloc) => sum + (Number(alloc.amount) || 0),
      0
    );
    return total - allocated;
  };

  const getAvailableBudgetForEditAllocation = () => {
    const total = Number(budgetData?.totalAmount) || 0;
    const otherAllocated = (budgetData?.allocations || [])
      .filter((alloc) => String(alloc._id) !== String(editingAllocationId))
      .reduce((sum, alloc) => sum + (Number(alloc.amount) || 0), 0);
    return total - otherAllocated;
  };

  const handleAddAllocation = async () => {
    const availableAmount = getAvailableBudgetForNewAllocation();
    const errors = validateAllocationForm(allocationForm, {
      availableAmount,
      currency: budgetForm.currency || "ETB",
    });
    if (hasFormErrors(errors)) {
      setAllocationFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setAllocationFormErrors({});

    if (editingAllocationId) {
      await handleUpdateAllocation();
    } else {
      const selectedCategory = budgetAllocationCategories.find(
        (c) => String(c._id) === String(allocationForm.categoryId)
      );
      const newAllocation = {
        ...allocationForm,
        category:
          selectedCategory?.name || allocationForm.category || "general",
        amount: parseFloat(allocationForm.amount),
        _id: Date.now().toString(),
      };

      setBudgetForm((prev) => ({
        ...prev,
        budgetAllocations: [...prev.budgetAllocations, newAllocation],
      }));

      setShowAllocationModal(false);
      resetAllocationForm();
      projectToasts.allocationAdded();
    }
  };

  const handleUpdateAllocation = async () => {
    const currentAllocation = (budgetData?.allocations || []).find(
      (alloc) => String(alloc._id) === String(editingAllocationId)
    );
    const spentAmount = Number(currentAllocation?.spentAmount) || 0;
    const availableAmount = getAvailableBudgetForEditAllocation();
    const errors = validateAllocationForm(allocationForm, {
      availableAmount,
      minAmount: spentAmount,
      currency: budgetData?.currency || "ETB",
    });
    if (hasFormErrors(errors)) {
      setAllocationFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setAllocationFormErrors({});

    const result = await runAction(
      "allocation",
      async () => {
        const inferredType =
          allocationForm.allocationType ||
          (allocationForm.departmentId
            ? "department"
            : allocationForm.taskId
            ? "task"
            : allocationForm.activityId
            ? "activity"
            : allocationForm.milestoneId
            ? "milestone"
            : "");

        const selectedCategory = budgetAllocationCategories.find(
          (c) => String(c._id) === String(allocationForm.categoryId)
        );

        const body = {
          name: allocationForm.name,
          description: allocationForm.description,
          category:
            selectedCategory?.name || allocationForm.category || "general",
          categoryId: allocationForm.categoryId || "",
          budgetedAmount: parseFloat(allocationForm.amount),
          startDate: allocationForm.startDate || "",
          endDate: allocationForm.endDate || "",
          allocationType: inferredType,
          priority: allocationForm.priority || "medium",
        };

        if (inferredType === "department")
          body.departmentId = allocationForm.departmentId || "";
        if (inferredType === "task") body.taskId = allocationForm.taskId || "";
        if (inferredType === "activity")
          body.activityId = allocationForm.activityId || "";
        if (inferredType === "milestone")
          body.milestoneId = allocationForm.milestoneId || "";

        const response = await fetch(
          `/api/projects/${projectId}/budget/allocations/${editingAllocationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to update allocation");
        }
        return data;
      },
      {
        successTitle: "Allocation Updated!",
        successText: "Budget allocation has been updated successfully",
        errorTitle: "Allocation Error",
      }
    );

    if (result?.success) {
      setShowAllocationModal(false);
      setShowAllocationEditModal(false);
      setEditingAllocationId(null);
      resetAllocationForm();
      fetchFinancialData();
    }
  };

  const handleEditAllocation = async (allocation) => {
    try {
      const matchedCategory = budgetAllocationCategories.find(
        (c) =>
          String(c._id) === String(allocation.categoryId) ||
          c.name === allocation.category
      );

      setAllocationForm({
        name: allocation.name || "",
        description: allocation.description || "",
        category: allocation.category || matchedCategory?.name || "general",
        categoryId: allocation.categoryId || matchedCategory?._id || "",
        amount: (
          allocation.amount ??
          allocation.budgetedAmount ??
          0
        ).toString(),
        departmentId: allocation.departmentId || "",
        taskId: allocation.taskId || "",
        activityId: allocation.activityId || "",
        milestoneId: allocation.milestoneId || "",
        priority: allocation.priority || "medium",
        startDate: toDateInputValue(allocation.startDate),
        endDate: toDateInputValue(allocation.endDate),
        tags: allocation.tags || [],
        allocationType:
          allocation.allocationType ||
          (allocation.departmentId
            ? "department"
            : allocation.taskId
            ? "task"
            : allocation.activityId
            ? "activity"
            : allocation.milestoneId
            ? "milestone"
            : "general"),
      });

      setEditingAllocationId(allocation._id);
      setShowAllocationEditModal(true);
    } catch (err) {
      setError("Failed to edit allocation: " + err.message);
    }
  };

  const handleDeleteAllocation = async (allocationId) => {
    const confirmed = await showDeleteConfirmDialog(
      "Delete Allocation",
      "Are you sure you want to delete this allocation? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed?.isConfirmed) return;

    const result = await runAction(
      "delete-allocation",
      async () => {
        const response = await fetch(
          `/api/projects/${projectId}/budget/allocations/${allocationId}`,
          { method: "DELETE" }
        );
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to delete allocation");
        }
        return data;
      },
      {
        successTitle: "Allocation Deleted!",
        successText: "Budget allocation has been deleted successfully",
        errorTitle: "Delete Error",
      }
    );

    if (result?.success) {
      fetchFinancialData();
    }
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      totalAmount: "",
      currency: "ETB",
      description: "",
      approvedBy: "",
      approvalDate: "",
      budgetAllocations: [],
    });
    setBudgetFormErrors({});
  };

  // Form change handlers that clear validation errors
  const handleBudgetFormChange = (field, value) => {
    setBudgetForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error when user starts typing
    if (budgetFormErrors[field] || budgetFormErrors.budgetAllocations) {
      setBudgetFormErrors((prev) => ({
        ...prev,
        [field]: "",
        ...(field === "totalAmount" ? { budgetAllocations: "" } : {}),
      }));
    }
  };

  const handleExpenseFormChange = (field, value) => {
    setExpenseForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error when user starts typing
    if (expenseFormErrors[field]) {
      setExpenseFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleAllocationFormChange = (field, value) => {
    setAllocationForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific error when user starts typing
    if (allocationFormErrors[field]) {
      setAllocationFormErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      description: "",
      amount: "",
      category: "general",
      categoryId: "",
      expenseDate: new Date().toISOString().split("T")[0],
      allocationId: "",
      vendor: "",
      receiptUrl: "",
      status: "pending",
      tags: [],
    });
    setExpenseFormErrors({});
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
      categoryId: "",
      invoiceNumber: "",
      status: "pending",
      paymentReference: "",
      notes: "",
    });
    setIncomeFormErrors({});
  };

  const handleIncomeFormChange = (field, value) => {
    setIncomeForm((prev) => ({ ...prev, [field]: value }));
    if (incomeFormErrors[field]) {
      setIncomeFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleExpectedPaymentFormChange = (field, value) => {
    setExpectedPaymentForm((prev) => ({ ...prev, [field]: value }));
    if (expectedPaymentFormErrors[field]) {
      setExpectedPaymentFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const resetAllocationForm = () => {
    setAllocationForm({
      name: "",
      category: "general",
      categoryId: "",
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
    setAllocationFormErrors({});
    setEditingAllocationId(null);
  };

  const formatCurrency = (amount, currency = "ETB") =>
    formatCurrencyUtil(amount, currency);

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
        <div className="flex flex-col items-center gap-3">
          <div className="h-11 w-11 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">
            Loading financial data…
          </p>
        </div>
      </div>
    );
  }

  const financeTabs = [
    { id: "overview", name: "Overview", icon: ChartBarIcon },
    { id: "dashboard", name: "Dashboard", icon: ChartBarIcon },
    { id: "entities", name: "Entities", icon: BuildingOfficeIcon },
    { id: "budget", name: "Budget", icon: CurrencyDollarIcon },
    { id: "expenses", name: "Expenses", icon: DocumentTextIcon },
    { id: "income", name: "Income", icon: ArrowTrendingUpIcon },
    { id: "reports", name: "Reports", icon: EyeIcon },
  ];

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Project finances
            </p>
            <p className="mt-1 text-lg sm:text-xl font-semibold text-slate-900 truncate">
              {projectName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!budgetData ? (
              <button
                onClick={() => setShowBudgetModal(true)}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow disabled:opacity-60"
              >
                <PlusIcon className="w-4 h-4" />
                Create Budget
              </button>
            ) : (
              <button
                onClick={handleOpenEditBudget}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow disabled:opacity-60"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Budget
              </button>
            )}
            <button
              onClick={() => {
                resetExpenseForm();
                setEditingExpenseId(null);
                setShowExpenseModal(true);
              }}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow disabled:opacity-60"
            >
              <PlusIcon className="w-4 h-4" />
              Add Expense
            </button>
            <button
              onClick={() => {
                setExpectedPaymentFormErrors({});
                setShowExpectedPaymentModal(true);
              }}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all duration-200 hover:shadow disabled:opacity-60"
            >
              <PlusIcon className="w-4 h-4" />
              Expected Income
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl animate-[fadeIn_0.25s_ease-out]">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm sm:text-base">{error}</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-1">
        <nav className="flex overflow-x-auto gap-1 scrollbar-hide">
          {financeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Expected Payment Modal */}
      {showExpectedPaymentModal && (
        <ModalChrome
          maxWidth="max-w-xl"
          title="Set Expected Income"
          subtitle="Due date is required. Collect later as partial or full payment."
          footer={
            <>
              <button
                onClick={() => {
                  if (actionLoading === "expected") return;
                  setShowExpectedPaymentModal(false);
                  setExpectedPaymentFormErrors({});
                }}
                disabled={actionLoading === "expected"}
                className={cancelBtnClass}
              >
                Cancel
              </button>
              <ActionButton
                onClick={handleAddExpectedPayment}
                loading={actionLoading === "expected"}
                loadingText="Saving…"
                disabled={
                  !expectedPaymentForm.title ||
                  !expectedPaymentForm.expectedAmount ||
                  !expectedPaymentForm.dueDate
                }
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-sm transition-all duration-200 disabled:opacity-50"
              >
                Set Expected Income
              </ActionButton>
            </>
          }
        >
          <div>
            <label className={fieldLabelClass}>Title *</label>
            <input
              type="text"
              value={expectedPaymentForm.title}
              onChange={(e) =>
                handleExpectedPaymentFormChange("title", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass(!!expectedPaymentFormErrors.title)}
              placeholder="e.g., Phase 1 Payment"
            />
            {expectedPaymentFormErrors.title && (
              <p className={fieldErrorClass}>
                {expectedPaymentFormErrors.title}
              </p>
            )}
          </div>
          <div>
            <label className={fieldLabelClass}>Expected Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={expectedPaymentForm.expectedAmount}
              onChange={(e) =>
                handleExpectedPaymentFormChange(
                  "expectedAmount",
                  e.target.value
                )
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass(
                !!expectedPaymentFormErrors.expectedAmount
              )}
              placeholder="0.00"
            />
            {expectedPaymentFormErrors.expectedAmount && (
              <p className={fieldErrorClass}>
                {expectedPaymentFormErrors.expectedAmount}
              </p>
            )}
          </div>
          <div>
            <label className={fieldLabelClass}>Client Name</label>
            <input
              type="text"
              value={expectedPaymentForm.clientName}
              onChange={(e) =>
                handleExpectedPaymentFormChange("clientName", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass()}
              placeholder="Client name"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Category</label>
            <select
              value={expectedPaymentForm.categoryId}
              onChange={(e) =>
                handleExpectedPaymentFormChange("categoryId", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass()}
            >
              <option value="">Select Category</option>
              {incomeCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabelClass}>Due Date *</label>
            <input
              type="date"
              value={expectedPaymentForm.dueDate}
              onChange={(e) =>
                handleExpectedPaymentFormChange("dueDate", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass(!!expectedPaymentFormErrors.dueDate)}
            />
            {expectedPaymentFormErrors.dueDate && (
              <p className={fieldErrorClass}>
                {expectedPaymentFormErrors.dueDate}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Auto-marked overdue if this date passes without full collection.
            </p>
          </div>
          <div>
            <label className={fieldLabelClass}>Description</label>
            <textarea
              rows={2}
              value={expectedPaymentForm.description}
              onChange={(e) =>
                handleExpectedPaymentFormChange("description", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass()}
              placeholder="Describe the payment"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Notes</label>
            <textarea
              rows={2}
              value={expectedPaymentForm.notes}
              onChange={(e) =>
                handleExpectedPaymentFormChange("notes", e.target.value)
              }
              disabled={actionLoading === "expected"}
              className={fieldInputClass()}
              placeholder="Any additional notes"
            />
          </div>
        </ModalChrome>
      )}

      {showCollectModal && collectingIncome && (
        <ModalChrome
          maxWidth="max-w-lg"
          title="Collect Payment"
          subtitle={`${collectingIncome.title} · Remaining ${formatCurrency(
            Math.max(
              0,
              (Number(collectingIncome.expectedAmount) || 0) -
                (Number(collectingIncome.amount) || 0)
            )
          )}`}
          footer={
            <>
              <button
                onClick={() => {
                  if (actionLoading === "collect") return;
                  setShowCollectModal(false);
                  setCollectingIncome(null);
                }}
                disabled={actionLoading === "collect"}
                className={cancelBtnClass}
              >
                Cancel
              </button>
              <ActionButton
                onClick={handleCollectPayment}
                loading={actionLoading === "collect"}
                loadingText="Collecting…"
                disabled={!collectForm.collectAmount}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                Record Collection
              </ActionButton>
            </>
          }
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm text-slate-600 space-y-1">
            <p>
              Expected:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(collectingIncome.expectedAmount)}
              </span>
            </p>
            <p>
              Already received:{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(collectingIncome.amount)}
              </span>
            </p>
            <p>
              Due:{" "}
              <span className="font-semibold text-slate-900">
                {formatDate(collectingIncome.dueDate)}
              </span>
            </p>
          </div>
          <div>
            <label className={fieldLabelClass}>Amount Received Now *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={collectForm.collectAmount}
              onChange={(e) => {
                setCollectForm((p) => ({
                  ...p,
                  collectAmount: e.target.value,
                }));
                if (collectFormErrors.collectAmount) {
                  setCollectFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.collectAmount;
                    return next;
                  });
                }
              }}
              disabled={actionLoading === "collect"}
              className={fieldInputClass(!!collectFormErrors.collectAmount)}
              placeholder="0.00"
            />
            {collectFormErrors.collectAmount && (
              <p className={fieldErrorClass}>
                {collectFormErrors.collectAmount}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Full remaining → Collected. Less than remaining → Partial.
            </p>
          </div>
          <div>
            <label className={fieldLabelClass}>Received Date *</label>
            <input
              type="date"
              value={collectForm.receivedDate}
              onChange={(e) =>
                setCollectForm((p) => ({
                  ...p,
                  receivedDate: e.target.value,
                }))
              }
              disabled={actionLoading === "collect"}
              className={fieldInputClass(!!collectFormErrors.receivedDate)}
            />
            {collectFormErrors.receivedDate && (
              <p className={fieldErrorClass}>
                {collectFormErrors.receivedDate}
              </p>
            )}
          </div>
          <div>
            <label className={fieldLabelClass}>Invoice Number</label>
            <input
              type="text"
              value={collectForm.invoiceNumber}
              onChange={(e) =>
                setCollectForm((p) => ({
                  ...p,
                  invoiceNumber: e.target.value,
                }))
              }
              disabled={actionLoading === "collect"}
              className={fieldInputClass()}
              placeholder="e.g., INV-2026-001"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Payment Type</label>
            <select
              value={collectForm.paymentMethod}
              onChange={(e) =>
                setCollectForm((p) => ({
                  ...p,
                  paymentMethod: e.target.value,
                }))
              }
              disabled={actionLoading === "collect"}
              className={fieldInputClass()}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="wire_transfer">Wire Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={fieldLabelClass}>Payment Reference</label>
            <input
              type="text"
              value={collectForm.paymentReference}
              onChange={(e) =>
                setCollectForm((p) => ({
                  ...p,
                  paymentReference: e.target.value,
                }))
              }
              disabled={actionLoading === "collect"}
              className={fieldInputClass()}
              placeholder="Transaction / receipt ref"
            />
          </div>
          <div>
            <label className={fieldLabelClass}>Notes</label>
            <textarea
              rows={2}
              value={collectForm.notes}
              onChange={(e) =>
                setCollectForm((p) => ({ ...p, notes: e.target.value }))
              }
              disabled={actionLoading === "collect"}
              className={fieldInputClass()}
              placeholder="Optional notes"
            />
          </div>
        </ModalChrome>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <OverviewTab
            budgetData={budgetData}
            expenses={expenses}
            income={income}
            financialReports={financialReports}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
          />
        )}

        {activeTab === "dashboard" && (
          <FinancialDashboard projectId={projectId} projectName={projectName} />
        )}

        {activeTab === "entities" && (
          <EntityManagement projectId={projectId} projectName={projectName} />
        )}

        {activeTab === "budget" && (
          <BudgetTab
            budgetData={budgetData}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onCreateBudget={() => setShowBudgetModal(true)}
            handleEditAllocation={handleEditAllocation}
            handleDeleteAllocation={handleDeleteAllocation}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expenses={expenses}
            budgetData={budgetData}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onEditExpense={handleOpenEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === "income" && (
          <IncomeTab
            projectId={projectId}
            income={income}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onCollectIncome={openCollectModal}
            onEditIncome={handleOpenEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onAddExpected={() => {
              setExpectedPaymentFormErrors({});
              setShowExpectedPaymentModal(true);
            }}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            projectId={projectId}
            financialReports={financialReports}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
          />
        )}
      </div>

      {/* Modals */}
      {showBudgetModal && (
        <BudgetModal
          budgetForm={budgetForm}
          setBudgetForm={setBudgetForm}
          budgetFormErrors={budgetFormErrors}
          handleBudgetFormChange={handleBudgetFormChange}
          allocationForm={allocationForm}
          setAllocationForm={setAllocationForm}
          allocationFormErrors={allocationFormErrors}
          handleAllocationFormChange={handleAllocationFormChange}
          showAllocationModal={showAllocationModal}
          setShowAllocationModal={setShowAllocationModal}
          handleCreateBudget={handleCreateBudget}
          handleAddAllocation={handleAddAllocation}
          setShowBudgetModal={setShowBudgetModal}
          resetAllocationForm={resetAllocationForm}
          milestones={milestones}
          departments={departments}
          tasks={tasks}
          activities={activities}
          budgetAllocationCategories={budgetAllocationCategories}
          isEdit={false}
          actionLoading={actionLoading}
        />
      )}

      {showEditBudgetModal && (
        <BudgetModal
          budgetForm={budgetForm}
          setBudgetForm={setBudgetForm}
          budgetFormErrors={budgetFormErrors}
          handleBudgetFormChange={handleBudgetFormChange}
          allocationForm={allocationForm}
          setAllocationForm={setAllocationForm}
          allocationFormErrors={allocationFormErrors}
          handleAllocationFormChange={handleAllocationFormChange}
          showAllocationModal={showAllocationModal}
          setShowAllocationModal={setShowAllocationModal}
          handleCreateBudget={handleEditBudget}
          handleAddAllocation={handleAddAllocation}
          setShowBudgetModal={setShowEditBudgetModal}
          resetAllocationForm={resetAllocationForm}
          milestones={milestones}
          departments={departments}
          tasks={tasks}
          activities={activities}
          budgetAllocationCategories={budgetAllocationCategories}
          isEdit={true}
          actionLoading={actionLoading}
        />
      )}

      {showExpenseModal && (
        <ExpenseModal
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          expenseFormErrors={expenseFormErrors}
          handleExpenseFormChange={handleExpenseFormChange}
          budgetData={budgetData}
          budgetAllocationCategories={budgetAllocationCategories}
          onSubmit={editingExpenseId ? handleEditExpense : handleAddExpense}
          setShowExpenseModal={setShowExpenseModal}
          setEditingExpenseId={setEditingExpenseId}
          resetExpenseForm={resetExpenseForm}
          isEdit={!!editingExpenseId}
          actionLoading={actionLoading}
        />
      )}

      {showIncomeModal && (
        <IncomeModal
          incomeForm={incomeForm}
          incomeFormErrors={incomeFormErrors}
          handleIncomeFormChange={handleIncomeFormChange}
          onSubmit={editingIncomeId ? handleEditIncome : handleAddIncome}
          onClose={() => {
            if (actionLoading === "income") return;
            setShowIncomeModal(false);
            setEditingIncomeId(null);
            setIncomeFormErrors({});
          }}
          incomeCategories={incomeCategories}
          isEdit={!!editingIncomeId}
          actionLoading={actionLoading}
        />
      )}

      {showAllocationEditModal && (() => {
        const availableAmount = getAvailableBudgetForEditAllocation();
        const currentAllocation = (budgetData?.allocations || []).find(
          (alloc) => String(alloc._id) === String(editingAllocationId)
        );
        const spentAmount = Number(currentAllocation?.spentAmount) || 0;
        const otherAllocated =
          (Number(budgetData?.totalAmount) || 0) - availableAmount;
        const currency = budgetData?.currency || "ETB";
        const isSavingAllocation = actionLoading === "allocation";
        const closeEditAllocation = () => {
          if (isSavingAllocation) return;
          setShowAllocationEditModal(false);
          setEditingAllocationId(null);
          resetAllocationForm();
          setAllocationFormErrors({});
        };

        return (
          <ModalChrome
            nested
            maxWidth="max-w-lg"
            title="Edit Budget Allocation"
            subtitle="Adjust amount, category, and schedule within available budget"
            onClose={closeEditAllocation}
            closeDisabled={isSavingAllocation}
            footer={
              <>
                <button
                  onClick={closeEditAllocation}
                  disabled={isSavingAllocation}
                  className={`${cancelBtnClass} order-2 sm:order-1`}
                >
                  Cancel
                </button>
                <ActionButton
                  onClick={handleUpdateAllocation}
                  loading={isSavingAllocation}
                  loadingText="Saving…"
                  disabled={!allocationForm.name || !allocationForm.amount}
                  className={`${primaryBtnClass} order-1 sm:order-2`}
                >
                  Save Changes
                </ActionButton>
              </>
            }
          >
            <BudgetAvailabilityCard
              total={budgetData?.totalAmount || 0}
              allocated={otherAllocated}
              remaining={availableAmount}
              currency={currency}
              overBudget={availableAmount < -0.001}
            />

            {spentAmount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Already spent: {formatMoneyDisplay(spentAmount, currency)}.
                Amount cannot go below this.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <label className={fieldLabelClass}>Allocation Name *</label>
                <input
                  type="text"
                  value={allocationForm.name}
                  onChange={(e) =>
                    handleAllocationFormChange("name", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.name)}
                  placeholder="e.g., Field Operations"
                />
                {allocationFormErrors.name && (
                  <p className={fieldErrorClass}>{allocationFormErrors.name}</p>
                )}
              </div>

              <div>
                <label className={fieldLabelClass}>Category</label>
                <select
                  value={allocationForm.categoryId || ""}
                  onChange={(e) => {
                    const cat = budgetAllocationCategories.find(
                      (c) => String(c._id) === e.target.value
                    );
                    setAllocationForm((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                      category: cat?.name || prev.category,
                    }));
                    if (allocationFormErrors.category) {
                      setAllocationFormErrors((prev) => ({
                        ...prev,
                        category: "",
                      }));
                    }
                  }}
                  disabled={isSavingAllocation}
                  className={fieldInputClass()}
                >
                  <option value="">Select category</option>
                  {budgetAllocationCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={fieldLabelClass}>Amount *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min={spentAmount > 0 ? spentAmount : 0.01}
                    max={Math.max(availableAmount, spentAmount, 0.01)}
                    value={allocationForm.amount}
                    onChange={(e) =>
                      handleAllocationFormChange("amount", e.target.value)
                    }
                    disabled={isSavingAllocation}
                    className={fieldInputClass(!!allocationFormErrors.amount)}
                    placeholder="0.00"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                    {currency}
                  </span>
                </div>
                {allocationFormErrors.amount ? (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.amount}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Max available: {formatMoneyDisplay(availableAmount, currency)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className={fieldLabelClass}>Description</label>
              <textarea
                value={allocationForm.description}
                onChange={(e) =>
                  handleAllocationFormChange("description", e.target.value)
                }
                disabled={isSavingAllocation}
                className={fieldInputClass(!!allocationFormErrors.description)}
                rows={2}
                placeholder="Optional notes for this allocation"
              />
              {allocationFormErrors.description && (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={fieldLabelClass}>Start Date</label>
                <input
                  type="date"
                  value={allocationForm.startDate || ""}
                  onChange={(e) =>
                    handleAllocationFormChange("startDate", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.startDate)}
                />
                {allocationFormErrors.startDate && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.startDate}
                  </p>
                )}
              </div>
              <div>
                <label className={fieldLabelClass}>End Date</label>
                <input
                  type="date"
                  value={allocationForm.endDate || ""}
                  min={allocationForm.startDate || undefined}
                  onChange={(e) =>
                    handleAllocationFormChange("endDate", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.endDate)}
                />
                {allocationFormErrors.endDate && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={fieldLabelClass}>Allocation Type</label>
                <div className="inline-flex items-center px-2.5 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700 w-full">
                  {(allocationForm.allocationType || "general")
                    .charAt(0)
                    .toUpperCase() +
                    (allocationForm.allocationType || "general").slice(1)}
                </div>
              </div>
              <div>
                <label className={fieldLabelClass}>Priority</label>
                <select
                  value={allocationForm.priority || "medium"}
                  onChange={(e) =>
                    handleAllocationFormChange("priority", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass()}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {allocationForm.allocationType === "department" && (
              <div>
                <label className={fieldLabelClass}>Department</label>
                <select
                  value={allocationForm.departmentId || ""}
                  onChange={(e) =>
                    handleAllocationFormChange("departmentId", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.departmentId)}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name || d.title}
                    </option>
                  ))}
                </select>
                {allocationFormErrors.departmentId && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.departmentId}
                  </p>
                )}
              </div>
            )}

            {allocationForm.allocationType === "task" && (
              <div>
                <label className={fieldLabelClass}>Task</label>
                <select
                  value={allocationForm.taskId || ""}
                  onChange={(e) =>
                    handleAllocationFormChange("taskId", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.taskId)}
                >
                  <option value="">Select task</option>
                  {tasks.map((t) => (
                    <option key={t._id || t.id} value={t._id || t.id}>
                      {t.name || t.title}
                    </option>
                  ))}
                </select>
                {allocationFormErrors.taskId && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.taskId}
                  </p>
                )}
              </div>
            )}

            {allocationForm.allocationType === "activity" && (
              <div>
                <label className={fieldLabelClass}>Activity</label>
                <select
                  value={allocationForm.activityId || ""}
                  onChange={(e) =>
                    handleAllocationFormChange("activityId", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.activityId)}
                >
                  <option value="">Select activity</option>
                  {activities.map((a) => (
                    <option key={a._id || a.id} value={a._id || a.id}>
                      {a.name || a.title}
                    </option>
                  ))}
                </select>
                {allocationFormErrors.activityId && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.activityId}
                  </p>
                )}
              </div>
            )}

            {allocationForm.allocationType === "milestone" && (
              <div>
                <label className={fieldLabelClass}>Milestone</label>
                <select
                  value={allocationForm.milestoneId || ""}
                  onChange={(e) =>
                    handleAllocationFormChange("milestoneId", e.target.value)
                  }
                  disabled={isSavingAllocation}
                  className={fieldInputClass(!!allocationFormErrors.milestoneId)}
                >
                  <option value="">Select milestone</option>
                  {milestones.map((m) => (
                    <option key={m._id || m.id} value={m._id || m.id}>
                      {m.name || m.title}
                    </option>
                  ))}
                </select>
                {allocationFormErrors.milestoneId && (
                  <p className={fieldErrorClass}>
                    {allocationFormErrors.milestoneId}
                  </p>
                )}
              </div>
            )}
          </ModalChrome>
        );
      })()}

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
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
  currencyTitle,
  getStatusColor,
  formatDate,
}) => {
  const summary = financialReports?.financialSummary || {};
  const totalBudget =
    Number(summary.totalBudget ?? budgetData?.totalAmount ?? 0) || 0;
  const totalExpenses = Number(summary.totalExpenses ?? 0) || 0;
  const totalIncome = Number(summary.totalIncome ?? 0) || 0;
  const budgetUtilization =
    Number(
      summary.budgetUtilization ??
        (totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0)
    ) || 0;
  const remaining = Math.max(0, totalBudget - totalExpenses);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Budget"
          value={totalBudget}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
        />
        <MetricCard
          label="Total Expenses"
          value={totalExpenses}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingDownIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
        />
        <MetricCard
          label="Total Income"
          value={totalIncome}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingUpIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
        />
        <MetricCard
          label="Remaining"
          value={remaining}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-slate-50"
          iconColor="text-slate-600"
          subtitle={
            totalBudget > 0
              ? `${budgetUtilization.toFixed(1)}% utilized`
              : "No budget set"
          }
        />
      </div>

      {totalBudget > 0 && (
        <SectionPanel
          title="Budget Utilization"
          action={
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(
                budgetUtilization > 100
                  ? "overrun"
                  : budgetUtilization > 90
                  ? "warning"
                  : "normal"
              )}`}
            >
              {budgetUtilization.toFixed(1)}%
            </span>
          }
        >
          <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                budgetUtilization > 100
                  ? "bg-rose-500"
                  : budgetUtilization > 90
                  ? "bg-amber-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600">
            <p className="min-w-0 truncate" title={currencyTitle(totalExpenses)}>
              Spent:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(totalExpenses)}
              </span>
            </p>
            <p
              className="min-w-0 truncate sm:text-right"
              title={currencyTitle(remaining)}
            >
              Remaining:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(remaining)}
              </span>
            </p>
          </div>

          {budgetUtilization > 100 && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-rose-800">
                    Budget Overrun
                  </p>
                  <p className="text-xs sm:text-sm text-rose-700 mt-0.5">
                    Over by {formatCurrency(totalExpenses - totalBudget)} (
                    {(budgetUtilization - 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionPanel>
      )}

      {budgetData?.alerts?.length > 0 && (
        <SectionPanel title="Budget Alerts" subtitle="Items that need attention">
          <div className="space-y-2">
            {budgetData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl border-l-4 min-w-0 ${
                  alert.severity === "high"
                    ? "bg-rose-50 border-rose-400"
                    : alert.severity === "medium"
                    ? "bg-amber-50 border-amber-400"
                    : "bg-blue-50 border-blue-400"
                }`}
              >
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      alert.severity === "high"
                        ? "text-rose-600"
                        : alert.severity === "medium"
                        ? "text-amber-600"
                        : "text-blue-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {(alert.type || "").replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-slate-800 break-words">
                      {alert.message}
                    </p>
                    {alert.amount != null && (
                      <p className="text-xs mt-1 font-medium tabular-nums text-slate-600">
                        Amount: {formatCurrency(Math.abs(alert.amount))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      {budgetData?.allocations?.length > 0 && (
        <SectionPanel
          title="Budget Allocations"
          subtitle={`${budgetData.allocations.length} allocation${
            budgetData.allocations.length === 1 ? "" : "s"
          }`}
        >
          <div className="space-y-3">
            {budgetData.allocations.map((allocation) => (
              <div
                key={allocation._id}
                className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-xl min-w-0"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-medium text-slate-900 truncate min-w-0">
                    {allocation.name || allocation.category}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-medium border flex-shrink-0 ${getStatusColor(
                      allocation.status
                    )}`}
                  >
                    {(allocation.utilization || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-2">
                  <p className="truncate">
                    Budget:{" "}
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(allocation.budgetedAmount)}
                    </span>
                  </p>
                  <p className="truncate">
                    Spent:{" "}
                    <span className="font-semibold text-rose-600 tabular-nums">
                      {formatCurrency(allocation.spentAmount)}
                    </span>
                  </p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      allocation.utilization > 100
                        ? "bg-rose-500"
                        : allocation.utilization > 90
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(allocation.utilization || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionPanel
          title="Recent Expenses"
          action={
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {expenses.length} total
            </span>
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense._id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-slate-900 truncate">
                    {expense.title}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {expense.category} · {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 max-w-[40%]">
                  <p
                    className="text-sm font-semibold text-rose-600 tabular-nums truncate"
                    title={currencyTitle(expense.amount)}
                  >
                    {formatCurrency(expense.amount)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(
                      expense.status
                    )}`}
                  >
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <EmptyState
                icon={DocumentTextIcon}
                title="No expenses yet"
                description="Add an expense to see it appear here."
              />
            )}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Recent Income"
          action={
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {income.length} total
            </span>
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="space-y-2">
            {income.slice(0, 5).map((inc) => (
              <div
                key={inc._id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-slate-900 truncate">
                    {inc.title}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    {inc.clientName} · {formatDate(inc.receivedDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 max-w-[40%]">
                  <p
                    className="text-sm font-semibold text-emerald-600 tabular-nums truncate"
                    title={currencyTitle(inc.amount)}
                  >
                    {formatCurrency(inc.amount)}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(
                      inc.status
                    )}`}
                  >
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
            {income.length === 0 && (
              <EmptyState
                icon={ArrowTrendingUpIcon}
                title="No income yet"
                description="Record income or expected payments to track cash in."
              />
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
};

// Budget Tab Component
const BudgetTab = ({
  budgetData,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onCreateBudget,
  handleEditAllocation,
  handleDeleteAllocation,
}) => {
  if (!budgetData) {
    return (
      <SectionPanel>
        <EmptyState
          icon={CurrencyDollarIcon}
          title="No budget created"
          description="Create a budget to start managing allocations and tracking spend."
          action={
            <button
              onClick={onCreateBudget}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Create Budget
            </button>
          }
        />
      </SectionPanel>
    );
  }

  const spent =
    budgetData.allocations?.reduce(
      (sum, a) => sum + (Number(a.spentAmount) || 0),
      0
    ) || 0;
  const remaining = Math.max(
    0,
    (Number(budgetData.totalAmount) || 0) - spent
  );

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <SectionPanel
        title="Budget Information"
        subtitle="Totals, spend, and approval details"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Budget"
            value={Number(budgetData.totalAmount) || 0}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={CurrencyDollarIcon}
            valueClassName="text-blue-900"
          />
          <MetricCard
            label="Spent"
            value={spent}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={ArrowTrendingDownIcon}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            valueClassName="text-rose-600"
          />
          <MetricCard
            label="Remaining"
            value={remaining}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={CheckCircleIcon}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueClassName="text-emerald-700"
          />
          <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Approval
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {budgetData.approvedBy || "Not specified"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatDate(budgetData.approvalDate)}
            </p>
          </div>
        </div>
        {budgetData.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Description</p>
            <p className="text-sm text-slate-800 break-words">
              {budgetData.description}
            </p>
          </div>
        )}
      </SectionPanel>

      {budgetData.allocations && budgetData.allocations.length > 0 && (
        <SectionPanel
          title="Budget Allocations"
          subtitle="Track spend against each allocation"
          bodyClassName="p-4 sm:p-5"
        >

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {budgetData.allocations.map((allocation) => (
              <div
                key={allocation._id}
                className="p-3 border border-gray-200 rounded-lg min-w-0"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {allocation.name || "Unnamed"}
                    </p>
                    <span className="inline-flex mt-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {allocation.category}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditAllocation(allocation)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAllocation(allocation._id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div className="min-w-0">
                    <p className="text-gray-500">Budget</p>
                    <p
                      className="font-medium tabular-nums truncate"
                      title={currencyTitle(allocation.budgetedAmount)}
                    >
                      {formatCurrency(allocation.budgetedAmount)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500">Spent</p>
                    <p
                      className="font-medium text-red-600 tabular-nums truncate"
                      title={currencyTitle(allocation.spentAmount)}
                    >
                      {formatCurrency(allocation.spentAmount)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500">Left</p>
                    <p
                      className="font-medium tabular-nums truncate"
                      title={currencyTitle(allocation.remainingAmount)}
                    >
                      {formatCurrency(allocation.remainingAmount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        allocation.utilization > 100
                          ? "bg-red-500"
                          : allocation.utilization > 90
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(allocation.utilization || 0, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-gray-700 w-10 text-right">
                    {(allocation.utilization || 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[18%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Allocation
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="w-[12%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Budget
                  </th>
                  <th className="w-[12%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Spent
                  </th>
                  <th className="w-[12%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Remaining
                  </th>
                  <th className="w-[14%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilization
                  </th>
                  <th className="w-[10%] px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="w-[8%] px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetData.allocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-black truncate">
                        {allocation.name || "Unnamed"}
                      </div>
                      {allocation.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {allocation.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 truncate max-w-full">
                        {allocation.category}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AmountCell
                        amount={allocation.budgetedAmount}
                        formatCurrency={formatCurrency}
                        currencyTitle={currencyTitle}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AmountCell
                        amount={allocation.spentAmount}
                        formatCurrency={formatCurrency}
                        currencyTitle={currencyTitle}
                        className="text-red-600"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AmountCell
                        amount={allocation.remainingAmount}
                        formatCurrency={formatCurrency}
                        currencyTitle={currencyTitle}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-1 max-w-[4rem] bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
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
                          />
                        </div>
                        <span className="text-xs tabular-nums text-black w-10">
                          {(allocation.utilization || 0).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded border ${getStatusColor(
                          allocation.status
                        )}`}
                      >
                        {allocation.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => handleEditAllocation(allocation)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Edit Allocation"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteAllocation(allocation._id)
                          }
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete Allocation"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      )}
    </div>
  );
};

// Expenses Tab Component
const ExpensesTab = ({
  expenses,
  budgetData,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onEditExpense,
  onDeleteExpense,
}) => {
  const total = expenses.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );
  const approved = expenses
    .filter((exp) => exp.status === "approved")
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const pending = expenses
    .filter((exp) => exp.status === "pending")
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Expenses"
          value={total}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingDownIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
        />
        <MetricCard
          label="Approved"
          value={approved}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
        />
        <MetricCard
          label="Pending"
          value={pending}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ClockIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueClassName="text-amber-700"
        />
        <MetricCard
          label="Total Count"
          value={String(expenses.length)}
          icon={DocumentTextIcon}
          iconBg="bg-slate-50"
          iconColor="text-slate-600"
        />
      </div>

      <SectionPanel
        title="All Expenses"
        subtitle="Edit or remove expense records"
        bodyClassName="p-0"
      >
        {expenses.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No expenses recorded"
            description="Add an expense from the actions above to start tracking spend."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Expense",
                    "Amount",
                    "Category",
                    "Date",
                    "Vendor",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm font-medium text-slate-900">
                        {expense.title}
                      </div>
                      {expense.description && (
                        <div className="text-xs text-slate-500 truncate max-w-[14rem]">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                      <AmountCell
                        amount={expense.amount}
                        formatCurrency={formatCurrency}
                        currencyTitle={currencyTitle}
                        className="text-rose-600 font-semibold"
                      />
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-700">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-700">
                      {expense.vendor || "—"}
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs font-semibold rounded-md border ${getStatusColor(
                          expense.status
                        )}`}
                      >
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit Expense"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(expense._id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Expense"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
};

// Income Tab Component — expected → collect (partial/full) → overdue
const IncomeTab = ({
  projectId,
  income,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onCollectIncome,
  onEditIncome,
  onDeleteIncome,
  onAddExpected,
}) => {
  const totalExpected = income.reduce(
    (sum, inc) => sum + (Number(inc.expectedAmount) || 0),
    0
  );
  const totalReceived = income.reduce(
    (sum, inc) => sum + (Number(inc.amount) || 0),
    0
  );
  const overdueUncollected = income
    .filter((inc) => inc.status === "overdue")
    .reduce(
      (sum, inc) =>
        sum +
        Math.max(
          0,
          (Number(inc.expectedAmount) || 0) - (Number(inc.amount) || 0)
        ),
      0
    );
  const pendingExpected = income
    .filter((inc) => inc.status === "pending" || inc.status === "partial")
    .reduce(
      (sum, inc) =>
        sum +
        Math.max(
          0,
          (Number(inc.expectedAmount) || 0) - (Number(inc.amount) || 0)
        ),
      0
    );

  const canCollect = (inc) =>
    inc.status !== "collected" &&
    inc.status !== "cancelled" &&
    (Number(inc.expectedAmount) || 0) > (Number(inc.amount) || 0);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs sm:text-sm text-emerald-900">
        <strong>Flow:</strong> Set expected income with a due date → when money
        arrives use <em>Collect</em> (partial or full) → past due without full
        collection becomes <em>Overdue</em> automatically.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Expected"
          value={totalExpected}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
        />
        <MetricCard
          label="Collected"
          value={totalReceived}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
        />
        <MetricCard
          label="Outstanding"
          value={pendingExpected}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ClockIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueClassName="text-amber-700"
          subtitle="Pending + partial remaining"
        />
        <MetricCard
          label="Overdue"
          value={overdueUncollected}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ExclamationTriangleIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
        />
      </div>

      <SectionPanel
        title="Income Collection"
        subtitle="Expected amounts, collections, and overdue items"
        action={
          onAddExpected ? (
            <button
              onClick={onAddExpected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
            >
              <PlusIcon className="w-4 h-4" />
              Expected Income
            </button>
          ) : null
        }
        bodyClassName="p-0"
      >
        {income.length === 0 ? (
          <EmptyState
            icon={ArrowTrendingUpIcon}
            title="No expected income yet"
            description="Set an expected income with a due date, then collect when payment arrives."
            action={
              onAddExpected ? (
                <button
                  onClick={onAddExpected}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-medium"
                >
                  <PlusIcon className="w-4 h-4" />
                  Set Expected Income
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Income",
                    "Category",
                    "Expected",
                    "Received",
                    "Remaining",
                    "Due",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {income.map((inc) => {
                  const expected = Number(inc.expectedAmount) || 0;
                  const received = Number(inc.amount) || 0;
                  const remaining = Math.max(0, expected - received);
                  return (
                    <tr
                      key={inc._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4">
                        <Link
                          href={`/project-budget/${projectId}/income/${inc._id}`}
                          className="text-xs sm:text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline"
                        >
                          {inc.title}
                        </Link>
                        <div className="text-xs text-slate-500 truncate max-w-[12rem]">
                          {inc.clientName || "No client"}
                          {inc.invoiceNumber
                            ? ` · ${inc.invoiceNumber}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-600">
                        {inc.categoryName || "—"}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={expected}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className="text-slate-800 font-semibold"
                        />
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={received}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className="text-emerald-600 font-semibold"
                        />
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={remaining}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className={
                            remaining > 0
                              ? "text-amber-700 font-semibold"
                              : "text-slate-500"
                          }
                        />
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-700">
                        {formatDate(inc.dueDate)}
                        {inc.daysPastDue > 0 && (
                          <div className="text-xs text-rose-600">
                            {inc.daysPastDue}d past due
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs font-semibold rounded-md border capitalize ${getStatusColor(
                            inc.status
                          )}`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {canCollect(inc) && (
                            <button
                              onClick={() => onCollectIncome(inc)}
                              className="px-2 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                              title="Collect payment"
                            >
                              Collect
                            </button>
                          )}
                          <Link
                            href={`/project-budget/${projectId}/income/${inc._id}`}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => onEditIncome && onEditIncome(inc)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit details"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              onDeleteIncome && onDeleteIncome(inc._id)
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
};

// Reports Tab Component
const ReportsTab = ({
  projectId,
  financialReports,
  formatCurrency,
  currencyTitle,
  getStatusColor,
}) => {
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
    <div className="space-y-4 sm:space-y-5">
      <SectionPanel
        title="Generate Reports"
        subtitle="Choose a report type to refresh financial insights"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          ].map((report) => (
            <button
              key={report.id}
              onClick={() => generateReport(report.id)}
              disabled={loading}
              className={`p-4 text-left border rounded-xl transition-all duration-200 ${
                reportType === report.id
                  ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              } ${loading ? "opacity-50 cursor-wait" : ""}`}
            >
              <div className="font-semibold text-sm sm:text-base">
                {report.name}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1">
                {report.description}
              </div>
            </button>
          ))}
        </div>
      </SectionPanel>

      {loading ? (
        <SectionPanel>
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 animate-pulse">
              Generating report…
            </p>
          </div>
        </SectionPanel>
      ) : reportData ? (
        <SectionPanel
          title={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Print
              </button>
              <button
                onClick={() => generateReport(reportType)}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          }
        >

          {/* Report Content Based on Type */}
          {reportType === "summary" && reportData?.financialSummary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Total Budget"
                  value={reportData.financialSummary.totalBudget}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={CurrencyDollarIcon}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  valueClassName="text-blue-900"
                />
                <MetricCard
                  label="Total Expenses"
                  value={reportData.financialSummary.totalExpenses}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={ArrowTrendingDownIcon}
                  iconBg="bg-red-50"
                  iconColor="text-red-600"
                  valueClassName="text-red-900"
                />
                <MetricCard
                  label="Total Income"
                  value={reportData.financialSummary.totalIncome}
                  formatCurrency={formatCurrency}
                  currencyTitle={currencyTitle}
                  icon={ArrowTrendingUpIcon}
                  iconBg="bg-green-50"
                  iconColor="text-green-600"
                  valueClassName="text-green-900"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">Budget Utilization</p>
                  <p className="text-xl font-bold text-black">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 bg-blue-50 rounded-lg min-w-0">
                  <p className="text-sm text-blue-600">Budget Utilization</p>
                  <p className="text-xl font-bold text-blue-900 tabular-nums">
                    {reportData.summary.budgetUtilization.toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg min-w-0">
                  <p className="text-sm text-green-600">Overall Score</p>
                  <p className="text-xl font-bold text-green-900 tabular-nums">
                    {reportData.performance.overallScore.toFixed(0)}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg min-w-0">
                  <p className="text-sm text-yellow-600">Active Alerts</p>
                  <p className="text-xl font-bold text-yellow-900 tabular-nums">
                    {reportData.alerts.length}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg min-w-0 overflow-hidden">
                  <p className="text-sm text-red-600">Overrun Amount</p>
                  <p
                    className="text-lg sm:text-xl font-bold text-red-900 tabular-nums truncate"
                    title={currencyTitle(reportData.summary.overrunAmount)}
                  >
                    {formatCurrency(reportData.summary.overrunAmount)}
                  </p>
                </div>
              </div>

              {/* Alerts Section */}
              {reportData.alerts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-black mb-4">
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
                <h4 className="text-lg font-semibold text-black mb-4">
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
                            <div className="text-sm font-medium text-black">
                              {allocation.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {allocation.category}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
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
                              <span className="text-sm text-black">
                                {allocation.utilization.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
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
                  <h4 className="text-lg font-semibold text-black mb-4">
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

        </SectionPanel>
      ) : (
        <SectionPanel>
          <EmptyState
            icon={ChartBarIcon}
            title="No report generated"
            description="Select a report type above to generate financial reports."
          />
        </SectionPanel>
      )}
    </div>
  );
};

// Budget Modal Component
const BudgetModal = ({
  budgetForm,
  setBudgetForm,
  budgetFormErrors,
  handleBudgetFormChange,
  allocationForm,
  setAllocationForm,
  allocationFormErrors,
  handleAllocationFormChange,
  showAllocationModal,
  setShowAllocationModal,
  handleCreateBudget,
  handleAddAllocation,
  setShowBudgetModal,
  resetAllocationForm,
  milestones,
  departments,
  tasks,
  activities,
  budgetAllocationCategories,
  isEdit = false,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "budget";
  const currency = budgetForm.currency || "ETB";
  const totalAllocated = budgetForm.budgetAllocations.reduce(
    (sum, alloc) => sum + (Number(alloc.amount) || 0),
    0
  );
  const totalBudget = Number(budgetForm.totalAmount) || 0;
  const remainingBudget = totalBudget - totalAllocated;
  const overBudget = remainingBudget < -0.001;
  const canAddAllocation =
    totalBudget > 0 && remainingBudget > 0.001 && !isSaving;

  const closeBudgetModal = () => {
    if (isSaving) return;
    setShowBudgetModal(false);
  };

  const closeAllocationModal = () => {
    setShowAllocationModal(false);
    resetAllocationForm();
  };

  return (
    <>
      <ModalChrome
        maxWidth="max-w-2xl"
        title={isEdit ? "Edit Project Budget" : "Create Project Budget"}
        subtitle="Set the total amount, approval details, and how the budget is allocated"
        onClose={closeBudgetModal}
        closeDisabled={isSaving}
        footer={
          <>
            <button
              onClick={closeBudgetModal}
              disabled={isSaving}
              className={`${cancelBtnClass} order-2 sm:order-1`}
            >
              Cancel
            </button>
            <ActionButton
              onClick={handleCreateBudget}
              loading={isSaving}
              loadingText={isEdit ? "Updating…" : "Creating…"}
              disabled={!budgetForm.totalAmount || overBudget}
              className={`${primaryBtnClass} order-1 sm:order-2`}
            >
              {isEdit ? "Update Budget" : "Create Budget"}
            </ActionButton>
          </>
        }
      >
        <BudgetAvailabilityCard
          total={totalBudget}
          allocated={totalAllocated}
          remaining={remainingBudget}
          currency={currency}
          overBudget={overBudget}
        />

        {(overBudget || budgetFormErrors.budgetAllocations) && (
          <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {budgetFormErrors.budgetAllocations ||
              `Allocations (${formatMoneyDisplay(
                totalAllocated,
                currency
              )}) exceed total budget (${formatMoneyDisplay(
                totalBudget,
                currency
              )}). Reduce allocations or increase the budget.`}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3 sm:space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Budget details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={fieldLabelClass}>Total Budget Amount *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={budgetForm.totalAmount}
                  onChange={(e) =>
                    handleBudgetFormChange("totalAmount", e.target.value)
                  }
                  disabled={isSaving}
                  className={fieldInputClass(!!budgetFormErrors.totalAmount)}
                  placeholder="0.00"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                  {currency}
                </span>
              </div>
              {budgetFormErrors.totalAmount && (
                <p className={fieldErrorClass}>
                  {budgetFormErrors.totalAmount}
                </p>
              )}
            </div>

            <div>
              <label className={fieldLabelClass}>Currency</label>
              <select
                value={budgetForm.currency}
                onChange={(e) =>
                  handleBudgetFormChange("currency", e.target.value)
                }
                disabled={isSaving}
                className={fieldInputClass(!!budgetFormErrors.currency)}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
              </select>
              {budgetFormErrors.currency && (
                <p className={fieldErrorClass}>{budgetFormErrors.currency}</p>
              )}
            </div>
          </div>

          <div>
            <label className={fieldLabelClass}>Description</label>
            <textarea
              value={budgetForm.description}
              onChange={(e) =>
                handleBudgetFormChange("description", e.target.value)
              }
              rows={2}
              disabled={isSaving}
              className={fieldInputClass(!!budgetFormErrors.description)}
              placeholder="What this budget covers…"
            />
            {budgetFormErrors.description && (
              <p className={fieldErrorClass}>
                {budgetFormErrors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={fieldLabelClass}>Approved By</label>
              <input
                type="text"
                value={budgetForm.approvedBy}
                onChange={(e) =>
                  handleBudgetFormChange("approvedBy", e.target.value)
                }
                disabled={isSaving}
                className={fieldInputClass(!!budgetFormErrors.approvedBy)}
                placeholder="Approver name"
              />
              {budgetFormErrors.approvedBy && (
                <p className={fieldErrorClass}>
                  {budgetFormErrors.approvedBy}
                </p>
              )}
            </div>

            <div>
              <label className={fieldLabelClass}>Approval Date</label>
              <input
                type="date"
                value={budgetForm.approvalDate}
                max={todayInputValue()}
                onChange={(e) =>
                  handleBudgetFormChange("approvalDate", e.target.value)
                }
                disabled={isSaving}
                className={fieldInputClass(!!budgetFormErrors.approvalDate)}
              />
              {budgetFormErrors.approvalDate ? (
                <p className={fieldErrorClass}>
                  {budgetFormErrors.approvalDate}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Cannot be a future date
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Budget Allocations
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Split the budget across categories or teams
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAllocationForm();
                setShowAllocationModal(true);
              }}
              disabled={!canAddAllocation}
              title={
                !totalBudget
                  ? "Enter a total budget first"
                  : remainingBudget <= 0
                  ? "No available budget remaining"
                  : "Add allocation"
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 self-start sm:self-auto transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4" />
              Add Allocation
            </button>
          </div>

          {budgetForm.budgetAllocations.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {budgetForm.budgetAllocations.map((allocation, index) => (
                <div
                  key={allocation._id || index}
                  className="flex items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {allocation.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {allocation.category || "General"}
                      {allocation.startDate || allocation.endDate
                        ? ` · ${
                            toDateInputValue(allocation.startDate) || "…"
                          } → ${toDateInputValue(allocation.endDate) || "…"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-semibold text-sm text-slate-800 tabular-nums">
                      {formatMoneyDisplay(allocation.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetForm((prev) => ({
                          ...prev,
                          budgetAllocations: prev.budgetAllocations.filter(
                            (_, i) => i !== index
                          ),
                        }));
                      }}
                      disabled={isSaving}
                      className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
                      aria-label="Remove allocation"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
              <p className="text-sm text-slate-600">No allocations yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Optional — you can allocate now or later
              </p>
            </div>
          )}
        </div>
      </ModalChrome>

      {showAllocationModal && (
        <ModalChrome
          nested
          maxWidth="max-w-lg"
          title="Add Budget Allocation"
          subtitle="Use only the remaining available budget"
          onClose={closeAllocationModal}
          footer={
            <>
              <button
                onClick={closeAllocationModal}
                className={`${cancelBtnClass} order-2 sm:order-1`}
              >
                Cancel
              </button>
              <ActionButton
                onClick={handleAddAllocation}
                loading={false}
                disabled={
                  !allocationForm.name ||
                  !allocationForm.amount ||
                  remainingBudget <= 0
                }
                className={`${primaryBtnClass} order-1 sm:order-2`}
              >
                Add Allocation
              </ActionButton>
            </>
          }
        >
          <BudgetAvailabilityCard
            total={totalBudget}
            allocated={totalAllocated}
            remaining={remainingBudget}
            currency={currency}
            overBudget={overBudget}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className={fieldLabelClass}>Allocation Name *</label>
              <input
                type="text"
                value={allocationForm.name}
                onChange={(e) =>
                  handleAllocationFormChange("name", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.name)}
                placeholder="e.g., Development Team"
              />
              {allocationFormErrors.name && (
                <p className={fieldErrorClass}>{allocationFormErrors.name}</p>
              )}
            </div>

            <div>
              <label className={fieldLabelClass}>Category</label>
              <select
                value={allocationForm.categoryId}
                onChange={(e) => {
                  const cat = budgetAllocationCategories.find(
                    (c) => String(c._id) === e.target.value
                  );
                  setAllocationForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                    category: cat?.name || prev.category,
                  }));
                }}
                className={fieldInputClass()}
              >
                <option value="">Select Category</option>
                {budgetAllocationCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={fieldLabelClass}>Amount *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Math.max(remainingBudget, 0.01)}
                  value={allocationForm.amount}
                  onChange={(e) =>
                    handleAllocationFormChange("amount", e.target.value)
                  }
                  className={fieldInputClass(!!allocationFormErrors.amount)}
                  placeholder="0.00"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                  {currency}
                </span>
              </div>
              {allocationFormErrors.amount ? (
                <p className={fieldErrorClass}>{allocationFormErrors.amount}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Max:{" "}
                  {formatMoneyDisplay(Math.max(remainingBudget, 0), currency)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={fieldLabelClass}>Allocation Type</label>
              <select
                value={allocationForm.allocationType}
                onChange={(e) =>
                  handleAllocationFormChange("allocationType", e.target.value)
                }
                className={fieldInputClass(
                  !!allocationFormErrors.allocationType
                )}
              >
                <option value="general">General</option>
                <option value="department">Department</option>
                <option value="task">Task</option>
                <option value="activity">Activity</option>
                <option value="milestone">Milestone</option>
              </select>
            </div>

            <div>
              <label className={fieldLabelClass}>Priority</label>
              <select
                value={allocationForm.priority}
                onChange={(e) =>
                  handleAllocationFormChange("priority", e.target.value)
                }
                className={fieldInputClass()}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {allocationForm.allocationType === "department" && (
            <div>
              <label className={fieldLabelClass}>Department *</label>
              <select
                value={allocationForm.departmentId}
                onChange={(e) =>
                  handleAllocationFormChange("departmentId", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.departmentId)}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {allocationFormErrors.departmentId ? (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.departmentId}
                </p>
              ) : departments.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">
                  No departments found. Create departments first.
                </p>
              ) : null}
            </div>
          )}

          {allocationForm.allocationType === "task" && (
            <div>
              <label className={fieldLabelClass}>Task *</label>
              <select
                value={allocationForm.taskId}
                onChange={(e) =>
                  handleAllocationFormChange("taskId", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.taskId)}
              >
                <option value="">Select Task</option>
                {tasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.title || task.name || "Untitled"}
                  </option>
                ))}
              </select>
              {allocationFormErrors.taskId ? (
                <p className={fieldErrorClass}>{allocationFormErrors.taskId}</p>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">
                  No tasks found. Create tasks first.
                </p>
              ) : null}
            </div>
          )}

          {allocationForm.allocationType === "activity" && (
            <div>
              <label className={fieldLabelClass}>Activity *</label>
              <select
                value={allocationForm.activityId}
                onChange={(e) =>
                  handleAllocationFormChange("activityId", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.activityId)}
              >
                <option value="">Select Activity</option>
                {activities.map((activity) => (
                  <option key={activity._id} value={activity._id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              {allocationFormErrors.activityId ? (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.activityId}
                </p>
              ) : activities.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">
                  No activities found. Create activities first.
                </p>
              ) : null}
            </div>
          )}

          {allocationForm.allocationType === "milestone" && (
            <div>
              <label className={fieldLabelClass}>Milestone *</label>
              <select
                value={allocationForm.milestoneId}
                onChange={(e) =>
                  handleAllocationFormChange("milestoneId", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.milestoneId)}
              >
                <option value="">Select Milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone._id} value={milestone._id}>
                    {milestone.title || milestone.name || "Untitled"}
                  </option>
                ))}
              </select>
              {allocationFormErrors.milestoneId ? (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.milestoneId}
                </p>
              ) : milestones.length === 0 ? (
                <p className="text-xs text-slate-500 mt-1">
                  No milestones found. Create milestones first.
                </p>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className={fieldLabelClass}>Start Date</label>
              <input
                type="date"
                value={allocationForm.startDate}
                onChange={(e) =>
                  handleAllocationFormChange("startDate", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.startDate)}
              />
              {allocationFormErrors.startDate && (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className={fieldLabelClass}>End Date</label>
              <input
                type="date"
                value={allocationForm.endDate}
                min={allocationForm.startDate || undefined}
                onChange={(e) =>
                  handleAllocationFormChange("endDate", e.target.value)
                }
                className={fieldInputClass(!!allocationFormErrors.endDate)}
              />
              {allocationFormErrors.endDate ? (
                <p className={fieldErrorClass}>
                  {allocationFormErrors.endDate}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Must be on or after start date
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={fieldLabelClass}>Description</label>
            <textarea
              value={allocationForm.description}
              onChange={(e) =>
                handleAllocationFormChange("description", e.target.value)
              }
              rows={2}
              className={fieldInputClass()}
              placeholder="Allocation description…"
            />
          </div>
        </ModalChrome>
      )}
    </>
  );
};

// Expense Modal Component
const ExpenseModal = ({
  expenseForm,
  setExpenseForm,
  expenseFormErrors,
  handleExpenseFormChange,
  budgetData,
  budgetAllocationCategories,
  onSubmit,
  setShowExpenseModal,
  setEditingExpenseId,
  resetExpenseForm,
  isEdit = false,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "expense";
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
    <ModalChrome
      title={isEdit ? "Edit Expense" : "Add New Expense"}
      subtitle="Enter amount and date carefully — both are validated"
      footer={
        <>
          <button
            onClick={() => {
              if (isSaving) return;
              setShowExpenseModal(false);
              if (isEdit) setEditingExpenseId(null);
            }}
            disabled={isSaving}
            className={`${cancelBtnClass} order-2 sm:order-1`}
          >
            Cancel
          </button>
          <ActionButton
            onClick={onSubmit}
            loading={isSaving}
            loadingText={isEdit ? "Updating…" : "Saving…"}
            disabled={!expenseForm.title || !expenseForm.amount}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2"
          >
            {isEdit ? "Update Expense" : "Add Expense"}
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Expense Title *</label>
          <input
            type="text"
            value={expenseForm.title}
            onChange={(e) => handleExpenseFormChange("title", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!expenseFormErrors.title)}
            placeholder="e.g., Office Supplies"
            required
          />
          {expenseFormErrors.title && (
            <p className={fieldErrorClass}>{expenseFormErrors.title}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={expenseForm.amount}
            onChange={(e) => handleExpenseFormChange("amount", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!expenseFormErrors.amount)}
            placeholder="0.00"
            required
          />
          {expenseFormErrors.amount && (
            <p className={fieldErrorClass}>{expenseFormErrors.amount}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Category</label>
          <select
            value={expenseForm.categoryId}
            onChange={(e) =>
              handleExpenseFormChange("categoryId", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!expenseFormErrors.categoryId)}
          >
            <option value="">Select Category</option>
            {budgetAllocationCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          {expenseFormErrors.category && (
            <p className={fieldErrorClass}>{expenseFormErrors.category}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Expense Date *</label>
          <input
            type="date"
            value={expenseForm.expenseDate}
            onChange={(e) =>
              handleExpenseFormChange("expenseDate", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!expenseFormErrors.expenseDate)}
          />
          {expenseFormErrors.expenseDate && (
            <p className={fieldErrorClass}>{expenseFormErrors.expenseDate}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Budget Allocation</label>
          <select
            value={expenseForm.allocationId}
            onChange={(e) =>
              handleExpenseFormChange("allocationId", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
          >
            <option value="">No specific allocation</option>
            {budgetData?.allocations?.map((allocation) => (
              <option key={allocation._id} value={allocation._id}>
                {allocation.name || allocation.category} (
                {allocation.budgetedAmount} ETB)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>Vendor</label>
          <input
            type="text"
            value={expenseForm.vendor}
            onChange={(e) => handleExpenseFormChange("vendor", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="Vendor name"
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Status</label>
          <select
            value={expenseForm.status}
            onChange={(e) => handleExpenseFormChange("status", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>Receipt URL</label>
          <input
            type="url"
            value={expenseForm.receiptUrl}
            onChange={(e) =>
              handleExpenseFormChange("receiptUrl", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="https://..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Description</label>
          <textarea
            value={expenseForm.description}
            onChange={(e) =>
              handleExpenseFormChange("description", e.target.value)
            }
            rows={3}
            disabled={isSaving}
            className={fieldInputClass(!!expenseFormErrors.description)}
            placeholder="Expense description..."
          />
          {expenseFormErrors.description && (
            <p className={fieldErrorClass}>{expenseFormErrors.description}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
            <label className={fieldLabelClass + " mb-0"}>Tags</label>
            <button
              type="button"
              onClick={addTag}
              disabled={isSaving}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 self-start sm:self-auto disabled:opacity-50"
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
                  disabled={isSaving}
                  className={`flex-1 ${fieldInputClass()}`}
                  placeholder="Tag name"
                />
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  disabled={isSaving}
                  className="px-3 py-2 text-rose-600 hover:text-rose-800 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalChrome>
  );
};

// Income Modal Component
const IncomeModal = ({
  incomeForm,
  incomeFormErrors = {},
  handleIncomeFormChange,
  incomeCategories,
  onSubmit,
  onClose,
  isEdit,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "income";

  return (
    <ModalChrome
      title={isEdit ? "Edit Income/Payment" : "Add New Income/Payment"}
      subtitle="Amounts and dates are validated before saving"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`${cancelBtnClass} order-2 sm:order-1`}
          >
            Cancel
          </button>
          <ActionButton
            onClick={onSubmit}
            loading={isSaving}
            loadingText={isEdit ? "Saving…" : "Adding…"}
            disabled={
              isEdit
                ? !incomeForm.title ||
                  !incomeForm.amount ||
                  !incomeForm.expectedAmount ||
                  !incomeForm.clientName ||
                  !incomeForm.paymentMethod ||
                  !incomeForm.status ||
                  !incomeForm.receivedDate ||
                  !incomeForm.dueDate ||
                  !incomeForm.invoiceNumber ||
                  !incomeForm.paymentReference
                : !incomeForm.title ||
                  (!incomeForm.amount && !incomeForm.expectedAmount)
            }
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2 ${
              isEdit
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isEdit ? "Save Changes" : "Add Income"}
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Income Title *</label>
          <input
            type="text"
            value={incomeForm.title}
            onChange={(e) => handleIncomeFormChange("title", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.title)}
            placeholder="e.g., Project Payment - Phase 1"
            required
          />
          {incomeFormErrors.title && (
            <p className={fieldErrorClass}>{incomeFormErrors.title}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={incomeForm.amount}
            onChange={(e) => handleIncomeFormChange("amount", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.amount)}
            placeholder="0.00"
            required={isEdit}
          />
          {incomeFormErrors.amount && (
            <p className={fieldErrorClass}>{incomeFormErrors.amount}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Category</label>
          <select
            value={incomeForm.categoryId}
            onChange={(e) =>
              handleIncomeFormChange("categoryId", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
          >
            <option value="">Select Category</option>
            {incomeCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>Expected Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={incomeForm.expectedAmount}
            onChange={(e) =>
              handleIncomeFormChange("expectedAmount", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.expectedAmount)}
            placeholder="0.00"
            required={isEdit}
          />
          {incomeFormErrors.expectedAmount && (
            <p className={fieldErrorClass}>
              {incomeFormErrors.expectedAmount}
            </p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Client Name</label>
          <input
            type="text"
            value={incomeForm.clientName}
            onChange={(e) =>
              handleIncomeFormChange("clientName", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.clientName)}
            placeholder="Client name"
            required={isEdit}
          />
          {incomeFormErrors.clientName && (
            <p className={fieldErrorClass}>{incomeFormErrors.clientName}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Payment Method</label>
          <select
            value={incomeForm.paymentMethod}
            onChange={(e) =>
              handleIncomeFormChange("paymentMethod", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            required={isEdit}
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
          <label className={fieldLabelClass}>Status</label>
          <select
            value={incomeForm.status}
            onChange={(e) => handleIncomeFormChange("status", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
          >
            <option value="pending">Pending (auto)</option>
            <option value="partial">Partial (auto)</option>
            <option value="collected">Collected (auto)</option>
            <option value="overdue">Overdue (auto)</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <p className="text-xs text-slate-500 mt-1">
            Status is usually set by Collect. Use Cancelled only to stop tracking.
          </p>
        </div>

        <div>
          <label className={fieldLabelClass}>Received Date</label>
          <input
            type="date"
            value={incomeForm.receivedDate}
            onChange={(e) =>
              handleIncomeFormChange("receivedDate", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.receivedDate)}
            required={isEdit}
          />
          {incomeFormErrors.receivedDate && (
            <p className={fieldErrorClass}>{incomeFormErrors.receivedDate}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Due Date</label>
          <input
            type="date"
            value={incomeForm.dueDate}
            onChange={(e) => handleIncomeFormChange("dueDate", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.dueDate)}
            required={isEdit}
          />
          {incomeFormErrors.dueDate && (
            <p className={fieldErrorClass}>{incomeFormErrors.dueDate}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Invoice Number</label>
          <input
            type="text"
            value={incomeForm.invoiceNumber}
            onChange={(e) =>
              handleIncomeFormChange("invoiceNumber", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="INV-001"
            required={isEdit}
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Payment Reference</label>
          <input
            type="text"
            value={incomeForm.paymentReference}
            onChange={(e) =>
              handleIncomeFormChange("paymentReference", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="Transaction ID or reference"
            required={isEdit}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Description</label>
          <textarea
            value={incomeForm.description}
            onChange={(e) =>
              handleIncomeFormChange("description", e.target.value)
            }
            disabled={isSaving}
            rows={3}
            className={fieldInputClass()}
            placeholder="Income description..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Notes</label>
          <textarea
            value={incomeForm.notes}
            onChange={(e) => handleIncomeFormChange("notes", e.target.value)}
            disabled={isSaving}
            rows={2}
            className={fieldInputClass()}
            placeholder="Additional notes..."
          />
        </div>
      </div>
    </ModalChrome>
  );
};

export default ProjectFinancialManagement;
