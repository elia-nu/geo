"use client";

import { useState, useEffect, useMemo } from "react";
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
  PhotoIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import FinancialDashboard from "./FinancialDashboard";
import {
  validateBudgetForm,
  validateExpenseForm,
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
import {
  generateInstallmentSchedule,
  refreshInstallmentStatuses,
  summarizeInstallments,
  deriveInstallmentStatus,
} from "../utils/incomeLifecycle";
import MetricCard from "./financial/MetricCard";
import AmountCell from "./financial/AmountCell";

const PAYMENT_FREQUENCIES = [
  { value: "lump_sum", label: "Lump Sum" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "custom", label: "Custom Schedule" },
];

const formatFrequencyLabel = (freq) => {
  if (freq === "monthly") return "Monthly";
  if (freq === "quarterly") return "Quarterly";
  if (freq === "custom") return "Custom";
  return "Lump Sum";
};

const PAYMENT_METHODS = [
  { value: "advance_payment", label: "Advance Payment" },
  { value: "monthly_payment", label: "Monthly Payment" },
  { value: "milestone_payment", label: "Milestone Payment" },
  { value: "installment", label: "Installment" },
  { value: "lump_sum", label: "Lump Sum" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const formatPaymentMethodLabel = (method) => {
  const found = PAYMENT_METHODS.find((m) => m.value === method);
  if (found) return found.label;
  if (!method) return "Advance / Direct";
  return method
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

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

const ModalChrome = ({
  maxWidth = "max-w-2xl",
  title,
  subtitle,
  children,
  footer,
  onClose,
  closeDisabled = false,
}) => (
  <div
    className={modalOverlayClass}
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
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);
  const [budgetAllocationCategories, setBudgetAllocationCategories] = useState([]);

  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [previewReceiptImage, setPreviewReceiptImage] = useState(null);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    totalAmount: "",
    currency: "ETB",
    description: "",
    approvedBy: "",
    approvalDate: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    reason: "",
    amount: "",
    category: "general",
    categoryId: "",
    expenseDate: new Date().toISOString().split("T")[0],
    vendor: "",
    receiptUrl: "",
    receiptImage: "",
    status: "pending",
    description: "",
    tags: [],
  });

  const [paymentPlanForm, setPaymentPlanForm] = useState({
    clientName: "",
    title: "",
    description: "",
    totalAmount: "",
    frequency: "monthly",
    numberOfInstallments: "12",
    startDate: todayInputValue(),
    firstPaid: false,
    // Lump-sum specific
    lumpSumFirstAmount: "",
    lumpSumFirstPaid: false,
    // Custom schedule specific
    customInstallments: [
      {
        amount: "",
        dueDate: todayInputValue(),
        isPaid: false,
      },
    ],
  });

  // Errors
  const [budgetFormErrors, setBudgetFormErrors] = useState({});
  const [expenseFormErrors, setExpenseFormErrors] = useState({});
  const [paymentPlanFormErrors, setPaymentPlanFormErrors] = useState({});

  useEffect(() => {
    if (projectId) {
      fetchAllData();
    }
  }, [projectId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBudgetData(),
        fetchExpenses(),
        fetchPaymentPlans(),
        fetchCategories(),
        fetchFinancialReports(),
      ]);
    } catch (err) {
      setError("Error loading project finances: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const bRes = await fetch("/api/budget-allocation-categories");
      const bData = await bRes.json();
      if (bData.success) setBudgetAllocationCategories(bData.categories || []);
    } catch (e) {
      console.error("Failed to fetch categories:", e);
    }
  };

  const fetchBudgetData = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`);
      const data = await res.json();
      if (data.success) {
        setBudgetData(data.budget);
      }
    } catch (e) {
      console.error("Failed to fetch budget:", e);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (e) {
      console.error("Failed to fetch expenses:", e);
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/income`);
      const data = await res.json();
      if (data.success) {
        // Refresh installment statuses on the client side
        const plans = (data.income || []).map((plan) => {
          if (Array.isArray(plan.installments) && plan.installments.length > 0) {
            const { installments } = refreshInstallmentStatuses(plan.installments);
            return { ...plan, installments };
          }
          return plan;
        });
        setPaymentPlans(plans);
      }
    } catch (e) {
      console.error("Failed to fetch payment plans:", e);
    }
  };

  const fetchFinancialReports = async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/financial-summary?includeDetails=true`
      );
      const data = await res.json();
      if (data.success) {
        setFinancialReports(data);
      }
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    }
  };

  // Handlers for Budget
  const handleBudgetFormChange = (field, value) => {
    setBudgetForm((prev) => ({ ...prev, [field]: value }));
    if (budgetFormErrors[field]) {
      setBudgetFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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
    setActionLoading("budget");

    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetForm),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Budget created successfully");
        setShowBudgetModal(false);
        fetchBudgetData();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to create budget");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to create budget");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditBudget = () => {
    if (!budgetData) return;
    setBudgetForm({
      totalAmount: budgetData.totalAmount || "",
      currency: budgetData.currency || "ETB",
      description: budgetData.description || "",
      approvedBy: budgetData.approvedBy || "",
      approvalDate: toDateInputValue(budgetData.approvalDate) || "",
    });
    setBudgetFormErrors({});
    setShowEditBudgetModal(true);
  };

  const handleEditBudget = async () => {
    const errors = validateBudgetForm(budgetForm);
    if (hasFormErrors(errors)) {
      setBudgetFormErrors(errors);
      showValidationErrors(errors);
      return;
    }
    setBudgetFormErrors({});
    setActionLoading("budget");

    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(budgetForm),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Budget updated successfully");
        setShowEditBudgetModal(false);
        fetchBudgetData();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to update budget");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to update budget");
    } finally {
      setActionLoading(null);
    }
  };

  // Handlers for Expenses
  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      reason: "",
      amount: "",
      category: "general",
      categoryId: "",
      expenseDate: todayInputValue(),
      vendor: "",
      receiptUrl: "",
      receiptImage: "",
      status: "pending",
      description: "",
      tags: [],
    });
    setExpenseFormErrors({});
  };

  const handleExpenseFormChange = (field, value) => {
    setExpenseForm((prev) => ({ ...prev, [field]: value }));
    if (expenseFormErrors[field]) {
      setExpenseFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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
    setActionLoading("expense");

    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Expense recorded successfully");
        setShowExpenseModal(false);
        resetExpenseForm();
        fetchExpenses();
        fetchBudgetData();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to record expense");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to record expense");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditExpense = (expense) => {
    setEditingExpenseId(expense._id);
    setExpenseForm({
      title: expense.title || "",
      reason: expense.reason || "",
      amount: expense.amount || "",
      category: expense.category || "general",
      categoryId: expense.categoryId || "",
      expenseDate: toDateInputValue(expense.expenseDate) || todayInputValue(),
      vendor: expense.vendor || "",
      receiptUrl: expense.receiptUrl || "",
      receiptImage: expense.receiptUrl || "",
      status: expense.status || "pending",
      description: expense.description || "",
      tags: Array.isArray(expense.tags) ? expense.tags : [],
    });
    setExpenseFormErrors({});
    setShowExpenseModal(true);
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
    setActionLoading("expense");

    try {
      const res = await fetch(
        `/api/projects/${projectId}/expenses/${editingExpenseId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expenseForm),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Expense updated successfully");
        setShowExpenseModal(false);
        setEditingExpenseId(null);
        resetExpenseForm();
        fetchExpenses();
        fetchBudgetData();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to update expense");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to update expense");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await showDeleteConfirmDialog({
      title: "Delete Expense",
      text: "Are you sure you want to delete this expense record?",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/expenses/${expenseId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Expense deleted successfully");
        fetchExpenses();
        fetchBudgetData();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to delete expense");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to delete expense");
    }
  };

  // Handlers for Payment Plans
  const resetPaymentPlanForm = () => {
    setPaymentPlanForm({
      clientName: "",
      title: "",
      description: "",
      totalAmount: "",
      frequency: "monthly",
      numberOfInstallments: "12",
      startDate: todayInputValue(),
      firstPaid: false,
      lumpSumFirstAmount: "",
      lumpSumFirstPaid: false,
      customInstallments: [
        {
          amount: "",
          dueDate: todayInputValue(),
          isPaid: false,
        },
      ],
    });
    setPaymentPlanFormErrors({});
  };

  const handlePaymentPlanFormChange = (field, value) => {
    setPaymentPlanForm((prev) => {
      const next = { ...prev, [field]: value };
      // When changing totalAmount, default lumpSumFirstAmount to totalAmount
      if (field === "totalAmount") {
        if (next.frequency === "lump_sum" || !next.lumpSumFirstAmount) {
          next.lumpSumFirstAmount = value;
        }
        if (
          next.frequency === "custom" &&
          Array.isArray(next.customInstallments) &&
          next.customInstallments.length === 1 &&
          !next.customInstallments[0].amount
        ) {
          next.customInstallments = [
            {
              ...next.customInstallments[0],
              amount: value,
            },
          ];
        }
      }
      // When switching to lump_sum, first payment is the total amount
      if (field === "frequency" && value === "lump_sum") {
        next.lumpSumFirstAmount = next.totalAmount || "";
      }
      // When switching to custom, ensure at least 1 custom installment
      if (field === "frequency" && value === "custom") {
        if (!Array.isArray(next.customInstallments) || next.customInstallments.length === 0) {
          next.customInstallments = [
            {
              amount: next.totalAmount || "",
              dueDate: next.startDate || todayInputValue(),
              isPaid: false,
            },
          ];
        }
      }
      return next;
    });
    if (paymentPlanFormErrors[field]) {
      setPaymentPlanFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddPaymentPlan = async () => {
    const errors = {};
    if (!paymentPlanForm.clientName?.trim()) errors.clientName = "Client name is required";
    if (!paymentPlanForm.title?.trim()) errors.title = "Payment title is required";

    const totalAmt = Number(paymentPlanForm.totalAmount);
    if (!totalAmt || totalAmt <= 0) errors.totalAmount = "Total amount must be greater than 0";

    if (paymentPlanForm.frequency === "custom") {
      const customInsts = paymentPlanForm.customInstallments || [];
      if (!customInsts || customInsts.length === 0) {
        errors.customInstallments = "At least one custom milestone installment is required";
      } else {
        let customSum = 0;
        for (let idx = 0; idx < customInsts.length; idx++) {
          const inst = customInsts[idx];
          const amt = Number(inst.amount);
          if (!amt || amt <= 0) {
            errors[`custom_amount_${idx}`] = `Installment #${idx + 1} amount must be greater than 0`;
          }
          if (!inst.dueDate) {
            errors[`custom_date_${idx}`] = `Installment #${idx + 1} due date is required`;
          }
          customSum += amt || 0;
        }
        if (totalAmt > 0 && customSum > totalAmt + 0.001) {
          errors.customInstallments = `Total scheduled custom milestones (${formatCurrency(customSum)}) cannot exceed the total project amount (${formatCurrency(totalAmt)})`;
        }
      }
    } else if (paymentPlanForm.frequency === "lump_sum") {
      const firstAmt = Number(paymentPlanForm.lumpSumFirstAmount || paymentPlanForm.totalAmount);
      if (!firstAmt || firstAmt <= 0) {
        errors.lumpSumFirstAmount = "First payment amount is required";
      } else if (totalAmt > 0 && firstAmt > totalAmt + 0.001) {
        errors.lumpSumFirstAmount = `First payment amount cannot exceed total project amount (${formatCurrency(totalAmt)})`;
      }
    } else {
      const numInst = parseInt(paymentPlanForm.numberOfInstallments, 10);
      if (!numInst || numInst < 1) errors.numberOfInstallments = "Must have at least 1 installment";
      if (!paymentPlanForm.startDate) errors.startDate = "Start date is required";
    }

    if (hasFormErrors(errors)) {
      setPaymentPlanFormErrors(errors);
      showValidationErrors(errors);
      return;
    }
    setPaymentPlanFormErrors({});
    setActionLoading("payment");

    try {
      let installments = [];

      if (paymentPlanForm.frequency === "lump_sum") {
        // Lump sum: first payment is the total amount (or specified amount)
        const firstAmt = Number(paymentPlanForm.lumpSumFirstAmount || paymentPlanForm.totalAmount) || 0;
        const inst = {
          installmentNumber: 1,
          amount: firstAmt,
          dueDate: paymentPlanForm.startDate || todayInputValue(),
          status: paymentPlanForm.lumpSumFirstPaid ? "paid" : "upcoming",
          paidDate: paymentPlanForm.lumpSumFirstPaid ? todayInputValue() : null,
        };
        if (!paymentPlanForm.lumpSumFirstPaid) {
          inst.status = deriveInstallmentStatus(inst);
        }
        installments.push(inst);
      } else if (paymentPlanForm.frequency === "custom") {
        // Custom: user defined custom installments array
        (paymentPlanForm.customInstallments || []).forEach((item, idx) => {
          const inst = {
            installmentNumber: idx + 1,
            amount: Number(item.amount) || 0,
            dueDate: item.dueDate || todayInputValue(),
            status: item.isPaid ? "paid" : "upcoming",
            paidDate: item.isPaid ? todayInputValue() : null,
          };
          if (!item.isPaid) {
            inst.status = deriveInstallmentStatus(inst);
          }
          installments.push(inst);
        });
      } else {
        // Monthly / Quarterly: auto-generate schedule
        installments = generateInstallmentSchedule({
          totalAmount: totalAmt,
          numberOfInstallments: parseInt(paymentPlanForm.numberOfInstallments, 10),
          startDate: paymentPlanForm.startDate,
          frequency: paymentPlanForm.frequency,
          firstPaid: paymentPlanForm.firstPaid,
        });
      }

      const payload = {
        title: paymentPlanForm.title,
        clientName: paymentPlanForm.clientName,
        description: paymentPlanForm.description || "",
        projectName: projectName,
        totalProjectAmount: totalAmt,
        expectedAmount: totalAmt,
        frequency: paymentPlanForm.frequency,
        startDate: paymentPlanForm.startDate,
        installments,
        amount: installments.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.amount) || 0), 0),
        totalPaid: installments.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.amount) || 0), 0),
        status: "pending",
      };

      const res = await fetch(`/api/projects/${projectId}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Payment plan created successfully");
        setShowPaymentPlanModal(false);
        resetPaymentPlanForm();
        fetchPaymentPlans();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to create payment plan");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to create payment plan");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkInstallmentPaid = async (planId, installmentNumber) => {
    // Instant optimistic update on UI
    setPaymentPlans((prev) =>
      prev.map((plan) => {
        if (plan._id !== planId) return plan;
        const installments = Array.isArray(plan.installments)
          ? plan.installments.map((inst, idx) => {
              const num = inst.installmentNumber || idx + 1;
              if (num === installmentNumber) {
                return {
                  ...inst,
                  status: "paid",
                  paidDate: todayInputValue(),
                };
              }
              return inst;
            })
          : [];
        return { ...plan, installments };
      })
    );

    try {
      setActionLoading(`mark_${planId}_${installmentNumber}`);
      const res = await fetch(
        `/api/projects/${projectId}/income/${planId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_paid",
            installmentNumber,
            paidDate: todayInputValue(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast(`Payment #${installmentNumber} marked as paid`);
      } else {
        showErrorToast(data.error || "Failed to mark payment as paid");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to mark payment as paid");
    } finally {
      await fetchPaymentPlans();
      await fetchFinancialReports();
      setActionLoading(null);
    }
  };

  const handleAddLumpSumInstallment = async (planId, amount, dueDate) => {
    try {
      setActionLoading(`add_inst_${planId}`);
      const res = await fetch(
        `/api/projects/${projectId}/income/${planId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add_installment",
            amount: Number(amount),
            dueDate,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Expected payment milestone added");
      } else {
        showErrorToast(data.error || "Failed to add expected payment");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to add expected payment");
    } finally {
      await fetchPaymentPlans();
      await fetchFinancialReports();
      setActionLoading(null);
    }
  };

  const handleDeletePaymentPlan = async (planId) => {
    const confirmed = await showDeleteConfirmDialog({
      title: "Delete Payment Plan",
      text: "Are you sure you want to delete this payment plan and all its installments?",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/income/${planId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Payment plan deleted");
        fetchPaymentPlans();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to delete payment plan");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to delete payment plan");
    }
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
    { id: "dashboard", name: "Dashboard", icon: BanknotesIcon },
    { id: "budget", name: "Budget", icon: CurrencyDollarIcon },
    { id: "expenses", name: "Expenses", icon: DocumentTextIcon, count: expenses.length },
    { id: "payments", name: "Payments", icon: CreditCardIcon, count: paymentPlans.length },
    { id: "reports", name: "Reports", icon: EyeIcon },
  ];

  const topTotalBudget = Number(budgetData?.totalAmount || 0);
  const topTotalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const topTotalIncome = paymentPlans.reduce((sum, plan) => {
    if (Array.isArray(plan.installments) && plan.installments.length > 0) {
      return (
        sum +
        plan.installments
          .filter((i) => i.status === "paid")
          .reduce((s, i) => s + (Number(i.amount) || 0), 0)
      );
    }
    return sum + (Number(plan.totalPaid || plan.amount) || 0);
  }, 0);
  const topNetCash = topTotalIncome - topTotalExpenses;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {/* Top Banner with Quick Financial Status Strip */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Project Financial Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {projectName}
            </h1>
            {/* 4 Financial Quick Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/10">
                Budget: <strong className="text-white">{formatCurrency(topTotalBudget)}</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/10">
                Spent: <strong className="text-rose-300">{formatCurrency(topTotalExpenses)}</strong>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/10">
                Collected: <strong className="text-emerald-300">{formatCurrency(topTotalIncome)}</strong>
              </div>
              <div
                className={`px-2.5 py-1 rounded-lg border font-semibold ${
                  topNetCash >= 0
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                Net Margin: {topNetCash >= 0 ? "+" : ""}
                {formatCurrency(topNetCash)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {!budgetData ? (
              <button
                onClick={() => {
                  setBudgetForm({
                    totalAmount: "",
                    currency: "ETB",
                    description: "",
                    approvedBy: "",
                    approvalDate: "",
                  });
                  setBudgetFormErrors({});
                  setShowBudgetModal(true);
                }}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                <PlusIcon className="w-4 h-4" />
                Create Budget
              </button>
            ) : (
              <button
                onClick={handleOpenEditBudget}
                disabled={!!actionLoading}
                className="inline-flex items-center gap-1.5 bg-slate-700/80 hover:bg-slate-700 text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                <PencilIcon className="w-4 h-4 text-slate-300" />
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
              className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
            >
              <PlusIcon className="w-4 h-4" />
              Add Expense
            </button>
            <button
              onClick={() => {
                resetPaymentPlanForm();
                setShowPaymentPlanModal(true);
              }}
              disabled={!!actionLoading}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
            >
              <PlusIcon className="w-4 h-4" />
              Add Payment Plan
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-2xl animate-[fadeIn_0.25s_ease-out]">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-700 text-sm sm:text-base font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Modern Tabs Bar */}
      <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-1">
        <nav className="flex overflow-x-auto gap-1 scrollbar-hide">
          {financeTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3.5 rounded-xl font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <tab.icon
                  className={`w-4 h-4 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <OverviewTab
            projectId={projectId}
            budgetData={budgetData}
            expenses={expenses}
            paymentPlans={paymentPlans}
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

        {activeTab === "budget" && (
          <BudgetTab
            budgetData={budgetData}
            expenses={expenses}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onCreateBudget={() => {
              setBudgetForm({
                totalAmount: "",
                currency: "ETB",
                description: "",
                approvedBy: "",
                approvalDate: "",
              });
              setBudgetFormErrors({});
              setShowBudgetModal(true);
            }}
            onEditBudget={handleOpenEditBudget}
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
            onPreviewReceipt={(url) => setPreviewReceiptImage(url)}
          />
        )}

        {activeTab === "payments" && (
          <PaymentsTab
            projectId={projectId}
            paymentPlans={paymentPlans}
            projectName={projectName}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            actionLoading={actionLoading}
            onMarkPaid={handleMarkInstallmentPaid}
            onAddLumpSumInstallment={handleAddLumpSumInstallment}
            onDeletePlan={handleDeletePaymentPlan}
            onAddPlan={() => {
              resetPaymentPlanForm();
              setShowPaymentPlanModal(true);
            }}
            onRefresh={fetchPaymentPlans}
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

      {/* ----------------- MODALS ----------------- */}

      {/* Budget Modal (Create or Edit) */}
      {(showBudgetModal || showEditBudgetModal) && (
        <BudgetModal
          budgetForm={budgetForm}
          setBudgetForm={setBudgetForm}
          budgetFormErrors={budgetFormErrors}
          handleBudgetFormChange={handleBudgetFormChange}
          onSubmit={showEditBudgetModal ? handleEditBudget : handleCreateBudget}
          onClose={() => {
            if (actionLoading === "budget") return;
            setShowBudgetModal(false);
            setShowEditBudgetModal(false);
          }}
          isEdit={showEditBudgetModal}
          actionLoading={actionLoading}
        />
      )}

      {/* Expense Modal (Create or Edit) */}
      {showExpenseModal && (
        <ExpenseModal
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          expenseFormErrors={expenseFormErrors}
          handleExpenseFormChange={handleExpenseFormChange}
          budgetAllocationCategories={budgetAllocationCategories}
          onSubmit={editingExpenseId ? handleEditExpense : handleAddExpense}
          onClose={() => {
            if (actionLoading === "expense") return;
            setShowExpenseModal(false);
            setEditingExpenseId(null);
            resetExpenseForm();
          }}
          isEdit={!!editingExpenseId}
          actionLoading={actionLoading}
        />
      )}

      {/* Payment Plan Modal */}
      {showPaymentPlanModal && (
        <PaymentPlanModal
          paymentPlanForm={paymentPlanForm}
          paymentPlanFormErrors={paymentPlanFormErrors}
          handlePaymentPlanFormChange={handlePaymentPlanFormChange}
          projectName={projectName}
          onSubmit={handleAddPaymentPlan}
          onClose={() => {
            if (actionLoading === "payment") return;
            setShowPaymentPlanModal(false);
            resetPaymentPlanForm();
          }}
          actionLoading={actionLoading}
        />
      )}

      {/* Receipt Image Lightbox Preview Modal */}
      {previewReceiptImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setPreviewReceiptImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <PhotoIcon className="w-4 h-4 text-blue-600" />
                Receipt Image Preview
              </h4>
              <button
                onClick={() => setPreviewReceiptImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center items-center max-h-[75vh] overflow-auto rounded-lg bg-slate-50">
              <img
                src={previewReceiptImage}
                alt="Receipt Document"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------- TAB COMPONENTS -----------------

const OverviewTab = ({
  projectId,
  budgetData,
  expenses = [],
  paymentPlans = [],
  financialReports,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
}) => {
  const summary = financialReports?.financialSummary || {};
  const totalBudget = Number(summary.totalBudget ?? budgetData?.totalAmount ?? 0) || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  // Calculate total income (paid) and total contract amount (expected) from payment plans
  const totalIncome = paymentPlans.reduce((sum, plan) => {
    if (Array.isArray(plan.installments) && plan.installments.length > 0) {
      const paidSum = plan.installments
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
      return sum + paidSum;
    }
    return sum + (Number(plan.totalPaid || plan.amount) || 0);
  }, 0);

  const totalExpectedIncome = paymentPlans.reduce((sum, plan) => {
    return sum + (Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0);
  }, 0);

  const remainingBudget = Math.max(0, totalBudget - totalExpenses);
  const budgetUtilization = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
  const netCashFlow = totalIncome - totalExpenses;
  const collectionRate = totalExpectedIncome > 0 ? (totalIncome / totalExpectedIncome) * 100 : 0;

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* 4 Core Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Approved Budget"
          value={totalBudget}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
          subtitle={totalBudget > 0 ? "Project budget baseline" : "No budget configured"}
        />
        <MetricCard
          label="Total Expenses Spent"
          value={totalExpenses}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingDownIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
          subtitle={`${expenses.length} recorded expense transactions`}
        />
        <MetricCard
          label="Total Income Collected"
          value={totalIncome}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingUpIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
          subtitle={
            totalExpectedIncome > 0
              ? `${collectionRate.toFixed(0)}% of ETB ${formatCurrency(totalExpectedIncome)} collected`
              : "No payment plans set"
          }
        />
        <MetricCard
          label="Net Cash Position / Profit"
          value={netCashFlow}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg={netCashFlow >= 0 ? "bg-emerald-50" : "bg-rose-50"}
          iconColor={netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}
          valueClassName={netCashFlow >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}
          subtitle={netCashFlow >= 0 ? "Positive cash position" : "Expenses exceed revenue"}
        />
      </div>

      {/* Dual Progress Bars Panel (Budget Utilization vs Revenue Collection) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Budget Utilization Card */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-bold text-slate-800">Budget Utilization</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(
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
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                budgetUtilization > 100
                  ? "bg-rose-500"
                  : budgetUtilization > 90
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Spent: <strong className="text-slate-900">{formatCurrency(totalExpenses)}</strong></span>
            <span>Available: <strong className="text-emerald-700">{formatCurrency(remainingBudget)}</strong></span>
          </div>
        </div>

        {/* Revenue Collection Progress Card */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-bold text-slate-800">Contract Collection Rate</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {collectionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 pt-1">
            <span>Collected: <strong className="text-emerald-700">{formatCurrency(totalIncome)}</strong></span>
            <span>Expected: <strong className="text-slate-900">{formatCurrency(totalExpectedIncome)}</strong></span>
          </div>
        </div>
      </div>

      {/* 2-Column Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Expenses List */}
        <SectionPanel
          title="Recent Expenses"
          action={
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {expenses.length} total
            </span>
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="space-y-2.5">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense._id}
                className="flex items-start justify-between gap-3 p-3 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {expense.title}
                  </h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {expense.reason ? `${expense.reason} · ` : ""}
                    {expense.vendor ? `${expense.vendor} · ` : ""}
                    {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-rose-600 tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusColor(
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
                title="No expenses recorded"
                description="Add an expense above to start tracking project costs."
              />
            )}
          </div>
        </SectionPanel>

        {/* Recent Payment Plans */}
        <SectionPanel
          title="Project Payment Plans"
          action={
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {paymentPlans.length} total
            </span>
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="space-y-2.5">
            {paymentPlans.slice(0, 5).map((plan) => {
              const summary = Array.isArray(plan.installments) && plan.installments.length > 0
                ? summarizeInstallments(plan.installments)
                : {
                    totalAmount: Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0,
                    paidAmount: Number(plan.totalPaid || plan.amount) || 0,
                    outstanding: Math.max(0, (Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0) - (Number(plan.totalPaid || plan.amount) || 0)),
                    percentPaid: 0,
                    overallStatus: plan.status || "in_progress",
                  };

              return (
                <div
                  key={plan._id}
                  className="flex items-start justify-between gap-3 p-3 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {plan.title || "Payment Plan"}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {plan.clientName ? `${plan.clientName} · ` : ""}
                      <span className="font-semibold text-blue-700 capitalize">
                        {formatFrequencyLabel(plan.frequency)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
                      {formatCurrency(summary.paidAmount)}
                      <span className="text-xs font-normal text-slate-400">
                        {" "}/ {formatCurrency(summary.totalAmount)}
                      </span>
                    </p>
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border capitalize ${
                          summary.overallStatus === "fully_paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : summary.overallStatus === "overdue"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : summary.overallStatus === "due_today"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {summary.overallStatus === "fully_paid"
                          ? "Fully Paid"
                          : summary.overallStatus === "overdue"
                          ? "Overdue"
                          : summary.overallStatus === "due_today"
                          ? "Due Today"
                          : "In Progress"}
                      </span>
                      {projectId && (
                        <Link
                          href={`/project-budget/${projectId}/income/${plan._id}`}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                          title="Open Detail Hub"
                        >
                          →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {paymentPlans.length === 0 && (
              <EmptyState
                icon={CreditCardIcon}
                title="No payment plans set"
                description="Add a payment plan to auto-generate installments and track client collections."
              />
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
};

const BudgetTab = ({
  budgetData,
  expenses = [],
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onCreateBudget,
  onEditBudget,
}) => {
  if (!budgetData) {
    return (
      <SectionPanel>
        <EmptyState
          icon={CurrencyDollarIcon}
          title="No project budget set"
          description="Create a project budget to set spending limits and monitor cost utilization."
          action={
            <button
              onClick={onCreateBudget}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Create Budget
            </button>
          }
        />
      </SectionPanel>
    );
  }

  const totalBudget = Number(budgetData.totalAmount) || 0;
  const spent = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remaining = Math.max(0, totalBudget - spent);
  const utilization = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <SectionPanel
        title="Project Budget Overview"
        subtitle="Total allocated baseline budget, direct project expenses, and remaining funds"
        action={
          <button
            onClick={onEditBudget}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Budget
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Project Budget"
            value={totalBudget}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={CurrencyDollarIcon}
            valueClassName="text-blue-900"
            subtitle="Approved ceiling"
          />
          <MetricCard
            label="Total Spent (Expenses)"
            value={spent}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={ArrowTrendingDownIcon}
            iconBg="bg-rose-50"
            iconColor="text-rose-600"
            valueClassName="text-rose-600"
            subtitle={`${expenses.length} expense items`}
          />
          <MetricCard
            label="Available Remaining"
            value={remaining}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={CheckCircleIcon}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            valueClassName="text-emerald-700"
            subtitle={`${(100 - Math.min(utilization, 100)).toFixed(0)}% available`}
          />
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 min-w-0 space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approval Authority
            </p>
            <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {budgetData.approvedBy || "Direct Project Budget"}
            </p>
            <p className="text-xs text-slate-500">
              {budgetData.approvalDate ? formatDate(budgetData.approvalDate) : "Approved"}
            </p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Budget Utilization Meter
            </span>
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(
                utilization > 100
                  ? "overrun"
                  : utilization > 90
                  ? "warning"
                  : "normal"
              )}`}
            >
              {utilization.toFixed(1)}% ({utilization > 100 ? "Overrun" : utilization > 90 ? "Near Limit" : "Normal"})
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                utilization > 100
                  ? "bg-rose-500"
                  : utilization > 90
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
        </div>

        {budgetData.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Budget Scope & Description
            </p>
            <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {budgetData.description}
            </p>
          </div>
        )}
      </SectionPanel>
    </div>
  );
};

const ExpensesTab = ({
  expenses = [],
  budgetData,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onEditExpense,
  onDeleteExpense,
  onPreviewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const total = expenses.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );
  const approved = expenses
    .filter((exp) => exp.status === "approved" || exp.status === "paid")
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const pending = expenses
    .filter((exp) => exp.status === "pending")
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      !searchTerm ||
      (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.vendor && exp.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.reason && exp.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || (exp.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Expenses"
          value={total}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingDownIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
          subtitle="All recorded costs"
        />
        <MetricCard
          label="Approved / Paid"
          value={approved}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
          subtitle="Confirmed expenses"
        />
        <MetricCard
          label="Pending Approval"
          value={pending}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ClockIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueClassName="text-amber-700"
          subtitle="Awaiting sign-off"
        />
        <MetricCard
          label="Total Transactions"
          value={String(expenses.length)}
          icon={DocumentTextIcon}
          iconBg="bg-slate-50"
          iconColor="text-slate-600"
          subtitle="Expense entries"
        />
      </div>

      <SectionPanel
        title="Project Expenses"
        subtitle="Manage expense records with title, reason, vendor, receipt images, and dates"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses…"
              className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        }
        bodyClassName="p-0"
      >
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title={searchTerm ? "No matching expenses" : "No expenses recorded"}
            description={searchTerm ? "Try searching for a different title or vendor." : "Click 'Add Expense' above to record an expense."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                    Title & Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">
                        {expense.title}
                      </div>
                      {expense.reason && (
                        <div className="text-xs text-blue-700 font-semibold mt-0.5">
                          {expense.reason}
                        </div>
                      )}
                      {expense.description && (
                        <div className="text-xs text-slate-500 truncate max-w-[14rem] mt-0.5">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-rose-600 tabular-nums">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                      {expense.vendor || "—"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {expense.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => onPreviewReceipt(expense.receiptUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          title="View Receipt"
                        >
                          <PhotoIcon className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No receipt</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border capitalize ${getStatusColor(
                          expense.status
                        )}`}
                      >
                        {expense.status || "approved"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Expense"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(expense._id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

// ----------------- PAYMENTS TAB (Project-based Installment Tracking) -----------------

const PaymentPlanCard = ({
  projectId,
  plan,
  formatCurrency,
  currencyTitle,
  formatDate,
  actionLoading,
  onMarkPaid,
  onAddLumpSumInstallment,
  onDeletePlan,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddInstallmentForm, setShowAddInstallmentForm] = useState(false);
  const [nextAmount, setNextAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState(todayInputValue());

  // Calculate summary metrics from installments or plan fields
  const installments = Array.isArray(plan.installments) && plan.installments.length > 0
    ? plan.installments
    : [];

  const summary = installments.length > 0
    ? summarizeInstallments(installments)
    : {
        totalAmount: Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0,
        paidAmount: Number(plan.totalPaid || plan.amount) || 0,
        outstanding: Math.max(0, (Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0) - (Number(plan.totalPaid || plan.amount) || 0)),
        paidCount: 0,
        totalCount: 0,
        percentPaid: 0,
        overallStatus: plan.status || "in_progress",
        nextDue: null,
      };

  const isLumpSum = plan.frequency === "lump_sum";
  const remainingToCover = Math.max(0, summary.totalAmount - summary.paidAmount);
  const isFullyPaid = summary.overallStatus === "fully_paid";

  // Check if last installment in lump sum is paid so user can chain next
  const lastInstallment = installments[installments.length - 1];
  const canChainNext = isLumpSum && !isFullyPaid && (!lastInstallment || lastInstallment.status === "paid");

  const handleCreateNextInstallment = (e) => {
    e.preventDefault();
    const amt = Number(nextAmount) || remainingToCover;
    if (!amt || amt <= 0) {
      showErrorToast("Invalid Amount", "Please enter a valid installment amount");
      return;
    }
    if (remainingToCover > 0 && amt > remainingToCover + 0.001) {
      showErrorToast(
        "Amount Exceeds Balance",
        `Installment amount (${formatCurrency(amt)}) cannot exceed the remaining contract balance (${formatCurrency(remainingToCover)})`
      );
      return;
    }
    onAddLumpSumInstallment(plan._id, amt, nextDueDate);
    setShowAddInstallmentForm(false);
    setNextAmount("");
  };

  const getOverallBadgeStyle = (status) => {
    switch (status) {
      case "fully_paid":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
          label: "Fully Paid",
        };
      case "overdue":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500 animate-pulse",
          label: "Overdue",
        };
      case "due_today":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500 animate-pulse",
          label: "Due Today",
        };
      default:
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
          label: "In Progress",
        };
    }
  };

  const badge = getOverallBadgeStyle(summary.overallStatus);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {formatFrequencyLabel(plan.frequency)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {plan.title || "Payment Plan"}
            </h3>
            {plan.clientName && (
              <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                Client: <span className="font-medium text-slate-700">{plan.clientName}</span>
              </p>
            )}
            {plan.description && (
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                {plan.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {projectId && (
              <Link
                href={`/project-budget/${projectId}/income/${plan._id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                title="Open Dedicated Detail Page"
              >
                <span>Full Details</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              onClick={() => onDeletePlan(plan._id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Payment Plan"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card Body - Stats & Progress Bar */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 bg-slate-50/70 border border-slate-100 rounded-xl text-center">
          <div className="p-1">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Amount
            </p>
            <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 tabular-nums" title={currencyTitle(summary.totalAmount)}>
              {formatCurrency(summary.totalAmount)}
            </p>
          </div>
          <div className="p-1 border-x border-slate-200/80">
            <p className="text-[11px] sm:text-xs font-medium text-emerald-600 uppercase tracking-wide">
              Paid
            </p>
            <p className="text-sm sm:text-base font-bold text-emerald-600 mt-0.5 tabular-nums" title={currencyTitle(summary.paidAmount)}>
              {formatCurrency(summary.paidAmount)}
            </p>
          </div>
          <div className="p-1">
            <p className="text-[11px] sm:text-xs font-medium text-amber-600 uppercase tracking-wide">
              Outstanding
            </p>
            <p className="text-sm sm:text-base font-bold text-amber-700 mt-0.5 tabular-nums" title={currencyTitle(summary.outstanding)}>
              {formatCurrency(summary.outstanding)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-medium text-slate-600">Payment Progress</span>
            <span className="font-bold text-slate-900 tabular-nums">
              {summary.percentPaid}% ({summary.paidCount} of {summary.totalCount || installments.length} installments paid)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                isFullyPaid
                  ? "bg-emerald-500"
                  : summary.overallStatus === "overdue"
                  ? "bg-rose-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, summary.percentPaid))}%` }}
            />
          </div>
        </div>

        {/* Next Payment Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <CalendarIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {isFullyPaid ? (
              <span className="font-semibold text-emerald-700">
                ✓ All installments fully paid!
              </span>
            ) : summary.nextDue ? (
              <span>
                Next payment:{" "}
                <strong className="text-slate-900">
                  {formatCurrency(summary.nextDue.amount)}
                </strong>{" "}
                due{" "}
                <strong className={
                  summary.nextDue.status === "overdue"
                    ? "text-rose-600"
                    : summary.nextDue.status === "due_today"
                    ? "text-amber-600"
                    : "text-slate-900"
                }>
                  {formatDate(summary.nextDue.dueDate)}
                </strong>{" "}
                ({summary.nextDue.status === "overdue"
                  ? "Overdue"
                  : summary.nextDue.status === "due_today"
                  ? "Due Today"
                  : "Upcoming"})
              </span>
            ) : (
              <span className="text-slate-400">No scheduled upcoming installments</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {projectId && (
              <Link
                href={`/project-budget/${projectId}/income/${plan._id}`}
                className="text-xs font-semibold text-slate-600 hover:text-blue-600 py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Detail Hub →
              </Link>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Hide Schedule</span>
                  <ChevronUpIcon className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>View Schedule ({installments.length})</span>
                  <ChevronDownIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Installments Schedule */}
        {isExpanded && (
          <div className="pt-3 border-t border-slate-200/80 space-y-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Installment Schedule
              </h4>
              {projectId && (
                <Link
                  href={`/project-budget/${projectId}/income/${plan._id}`}
                  className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Open Full Detail Page</span>
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </Link>
              )}
            </div>

            {installments.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No installment schedule records found.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Paid Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {installments.map((inst, index) => {
                      const isPaid = inst.status === "paid";
                      const isOverdue = inst.status === "overdue";
                      const isDueToday = inst.status === "due_today";
                      const isMarking = actionLoading === `mark_${plan._id}_${inst.installmentNumber || index + 1}`;

                      return (
                        <tr
                          key={index}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isPaid
                              ? "bg-emerald-50/20"
                              : isOverdue
                              ? "bg-rose-50/20"
                              : isDueToday
                              ? "bg-amber-50/20"
                              : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {inst.installmentNumber || index + 1}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {formatDate(inst.dueDate)}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatCurrency(inst.amount)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
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
                                  <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                                  <span>Paid</span>
                                </>
                              ) : isOverdue ? (
                                <>
                                  <ExclamationTriangleIcon className="w-3 h-3 text-rose-600" />
                                  <span>Overdue</span>
                                </>
                              ) : isDueToday ? (
                                <>
                                  <ClockIcon className="w-3 h-3 text-amber-600" />
                                  <span>Due Today</span>
                                </>
                              ) : (
                                <span>Upcoming</span>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {inst.paidDate ? formatDate(inst.paidDate) : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {isPaid ? (
                              <span className="text-emerald-600 font-medium inline-flex items-center gap-1 text-[11px]">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Received
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  onMarkPaid(
                                    plan._id,
                                    inst.installmentNumber || index + 1
                                  )
                                }
                                disabled={!!actionLoading}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs hover:shadow transition-all duration-150 disabled:opacity-50 text-xs"
                              >
                                {isMarking ? (
                                  <ArrowPathIcon className="w-3 h-3 text-white animate-spin" />
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

            {/* Lump sum chaining: "+ Add expected next payment" */}
            {canChainNext && !showAddInstallmentForm && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setNextAmount(remainingToCover > 0 ? remainingToCover.toString() : "");
                    setShowAddInstallmentForm(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  + Add expected next payment
                </button>
              </div>
            )}

            {/* Inline Add Next Installment Form */}
            {showAddInstallmentForm && (
              <form
                onSubmit={handleCreateNextInstallment}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-[fadeIn_0.2s_ease-out]"
              >
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800">
                    Add Next Expected Installment
                  </h5>
                  <button
                    type="button"
                    onClick={() => setShowAddInstallmentForm(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabelClass}>Amount (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remainingToCover > 0 ? remainingToCover : undefined}
                      value={nextAmount}
                      onChange={(e) => setNextAmount(e.target.value)}
                      placeholder={remainingToCover.toFixed(2)}
                      className={fieldInputClass()}
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Remaining contract balance: {formatCurrency(remainingToCover)}
                    </p>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Expected Due Date *</label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className={fieldInputClass()}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddInstallmentForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading === `add_inst_${plan._id}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    {actionLoading === `add_inst_${plan._id}` ? "Adding…" : "Save Installment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const getPlanStatusKey = (plan) => {
  if (Array.isArray(plan.installments) && plan.installments.length > 0) {
    const total = plan.installments.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const paidSum = plan.installments
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const hasOverdue = plan.installments.some(
      (i) => i.status === "overdue" || i.status === "due_today"
    );
    if (paidSum >= total && total > 0) return "paid";
    if (hasOverdue || plan.isOverdue) return "overdue";
    return "partial";
  }

  const total = Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount || 0);
  const paid = Number(plan.totalPaid || (plan.status === "collected" ? total : 0));
  if (total > 0 && paid >= total) return "paid";
  if (plan.isOverdue || plan.status === "overdue") return "overdue";
  return "partial";
};

const getPlanFrequencyKey = (plan) => {
  const f = (plan.frequency || "").toLowerCase();
  if (f === "monthly" || plan.paymentMethod === "monthly_payment") return "monthly";
  if (f === "quarterly") return "quarterly";
  if (f === "custom") return "custom";
  return "lump_sum";
};

const PaymentsTab = ({
  projectId,
  paymentPlans = [],
  projectName,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  actionLoading,
  onMarkPaid,
  onAddLumpSumInstallment,
  onDeletePlan,
  onAddPlan,
  onRefresh,
}) => {
  const [searchTitle, setSearchTitle] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // 'all' | 'paid' | 'partial' | 'overdue'
  const [frequencyTab, setFrequencyTab] = useState("all"); // 'all' | 'lump_sum' | 'monthly' | 'quarterly' | 'custom'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Compute global summary metrics across all plans
  const totalContractAmount = paymentPlans.reduce((sum, plan) => {
    return sum + (Number(plan.totalProjectAmount || plan.expectedAmount || plan.amount) || 0);
  }, 0);

  const totalCollected = paymentPlans.reduce((sum, plan) => {
    if (Array.isArray(plan.installments) && plan.installments.length > 0) {
      const paidSum = plan.installments
        .filter((i) => i.status === "paid")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
      return sum + paidSum;
    }
    return sum + (Number(plan.totalPaid || plan.amount) || 0);
  }, 0);

  const totalOutstanding = Math.max(0, totalContractAmount - totalCollected);

  const overdueAmount = paymentPlans.reduce((sum, plan) => {
    if (Array.isArray(plan.installments)) {
      const overdueSum = plan.installments
        .filter((i) => i.status === "overdue")
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
      return sum + overdueSum;
    }
    return sum;
  }, 0);

  // Status Tab Counts
  const statusCounts = useMemo(() => {
    let all = 0;
    let paid = 0;
    let partial = 0;
    let overdue = 0;

    paymentPlans.forEach((plan) => {
      const freqMatch = frequencyTab === "all" || getPlanFrequencyKey(plan) === frequencyTab;
      if (freqMatch) {
        all++;
        const st = getPlanStatusKey(plan);
        if (st === "paid") paid++;
        else if (st === "overdue") overdue++;
        else partial++;
      }
    });

    return { all, paid, partial, overdue };
  }, [paymentPlans, frequencyTab]);

  // Frequency Tab Counts
  const frequencyCounts = useMemo(() => {
    let all = 0;
    let lump_sum = 0;
    let monthly = 0;
    let quarterly = 0;
    let custom = 0;

    paymentPlans.forEach((plan) => {
      const statusMatch = statusTab === "all" || getPlanStatusKey(plan) === statusTab;
      if (statusMatch) {
        all++;
        const fr = getPlanFrequencyKey(plan);
        if (fr === "monthly") monthly++;
        else if (fr === "quarterly") quarterly++;
        else if (fr === "custom") custom++;
        else lump_sum++;
      }
    });

    return { all, lump_sum, monthly, quarterly, custom };
  }, [paymentPlans, statusTab]);

  // Filtered payment plans
  const filteredPlans = useMemo(() => {
    return paymentPlans.filter((plan) => {
      // 1. Search by payment title, client or description
      if (searchTitle.trim()) {
        const query = searchTitle.trim().toLowerCase();
        const matchesTitle = (plan.title || "").toLowerCase().includes(query);
        const matchesClient = (plan.clientName || "").toLowerCase().includes(query);
        const matchesDesc = (plan.description || "").toLowerCase().includes(query);
        const matchesInv = (plan.invoiceNumber || "").toLowerCase().includes(query);
        if (!matchesTitle && !matchesClient && !matchesDesc && !matchesInv) {
          return false;
        }
      }

      // 2. Status Tab Filter
      if (statusTab !== "all") {
        const planStatus = getPlanStatusKey(plan);
        if (planStatus !== statusTab) return false;
      }

      // 3. Frequency Tab Filter
      if (frequencyTab !== "all") {
        const planFreq = getPlanFrequencyKey(plan);
        if (planFreq !== frequencyTab) return false;
      }

      return true;
    });
  }, [paymentPlans, searchTitle, statusTab, frequencyTab]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTitle, statusTab, frequencyTab]);

  // Pagination calculation (5 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
  const paginatedPlans = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredPlans.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredPlans, currentPage]);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* Informative top helper alert */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs sm:text-sm text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <strong>Automated Payment Schedule:</strong> Track installments with automatic status flips (<strong>Upcoming → Due Today → Overdue</strong>) based on dates. Tap <strong>Mark Paid</strong> when money is received.
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all whitespace-nowrap"
              title="Refresh payments data"
            >
              <ArrowPathIcon className="w-4 h-4 text-slate-500" />
              <span>Refresh</span>
            </button>
          )}
          <button
            onClick={onAddPlan}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" />
            Add Payment Plan
          </button>
        </div>
      </div>

      {/* High-level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Contract Value"
          value={totalContractAmount}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
          subtitle="All payment plans"
        />
        <MetricCard
          label="Total Collected"
          value={totalCollected}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
          subtitle={
            totalContractAmount > 0
              ? `${((totalCollected / totalContractAmount) * 100).toFixed(0)}% collection rate`
              : "0% collected"
          }
        />
        <MetricCard
          label="Total Outstanding"
          value={totalOutstanding}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ClockIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueClassName="text-amber-700"
          subtitle="Remaining balance"
        />
        <MetricCard
          label="Overdue Uncollected"
          value={overdueAmount}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ExclamationTriangleIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName={overdueAmount > 0 ? "text-rose-600 font-bold" : "text-slate-600"}
          subtitle={overdueAmount > 0 ? "Needs immediate follow-up" : "All payments on track"}
        />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3.5">
        {/* Top row: Search input + Clear Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by payment title, client, or invoice..."
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
            />
            {searchTitle && (
              <button
                onClick={() => setSearchTitle("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {(searchTitle || statusTab !== "all" || frequencyTab !== "all") && (
            <button
              onClick={() => {
                setSearchTitle("");
                setStatusTab("all");
                setFrequencyTab("all");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 self-start sm:self-center"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Paid, Partial, Overdue) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">
            Status:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All Statuses", count: statusCounts.all, activeColor: "bg-slate-900 text-white" },
              { id: "paid", label: "Paid", count: statusCounts.paid, activeColor: "bg-emerald-600 text-white" },
              { id: "partial", label: "Partial / In Progress", count: statusCounts.partial, activeColor: "bg-blue-600 text-white" },
              { id: "overdue", label: "Overdue / Due Today", count: statusCounts.overdue, activeColor: "bg-rose-600 text-white" },
            ].map((tab) => {
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? `${tab.activeColor} shadow-sm`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency Filter Tabs (Lump Sum, Monthly, Quarterly, Custom) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider min-w-[70px]">
            Schedule:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "all", label: "All Types", count: frequencyCounts.all },
              { id: "lump_sum", label: "Lump Sum", count: frequencyCounts.lump_sum },
              { id: "monthly", label: "Monthly", count: frequencyCounts.monthly },
              { id: "quarterly", label: "Quarterly", count: frequencyCounts.quarterly },
              { id: "custom", label: "Custom Schedule", count: frequencyCounts.custom },
            ].map((tab) => {
              const isActive = frequencyTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFrequencyTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-600 text-white shadow-sm font-bold"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Project Cards List (Paginated to 5 per page) */}
      <div className="space-y-4">
        {paginatedPlans.map((plan) => (
          <PaymentPlanCard
            key={plan._id}
            projectId={projectId}
            plan={plan}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            formatDate={formatDate}
            actionLoading={actionLoading}
            onMarkPaid={onMarkPaid}
            onAddLumpSumInstallment={onAddLumpSumInstallment}
            onDeletePlan={onDeletePlan}
          />
        ))}

        {filteredPlans.length === 0 && (
          <EmptyState
            icon={CreditCardIcon}
            title={paymentPlans.length === 0 ? "No payment plans configured" : "No matching payment plans"}
            description={
              paymentPlans.length === 0
                ? "Create a project payment plan with Monthly, Quarterly, or Lump Sum installments."
                : "No payment plans found matching your search and filter criteria."
            }
            action={
              paymentPlans.length === 0 ? (
                <button
                  onClick={onAddPlan}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Payment Plan
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchTitle("");
                    setStatusTab("all");
                    setFrequencyTab("all");
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )
            }
          />
        )}
      </div>

      {/* Pagination Footer (5 items per page) */}
      {filteredPlans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredPlans.length)}</strong> of{" "}
            <strong className="text-slate-800">{filteredPlans.length}</strong> payment plans (5 per page)
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Next</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
        title="Generate Financial Reports"
        subtitle="Export and review project budget summaries and financial health"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: "summary",
              name: "Financial Summary",
              description: "High-level overview of budget, expenses, and income collection",
            },
            {
              id: "utilization",
              name: "Utilization & Overrun Report",
              description: "Budget utilization breakdown and expense variance analysis",
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
          {reportType === "summary" && reportData?.financialSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Total Budget"
                  value={reportData.financialSummary.totalBudget}
                  formatCurrency={formatCurrency}
                />
                <MetricCard
                  label="Total Expenses"
                  value={reportData.financialSummary.totalExpenses}
                  formatCurrency={formatCurrency}
                />
                <MetricCard
                  label="Total Income"
                  value={reportData.financialSummary.totalIncome}
                  formatCurrency={formatCurrency}
                />
              </div>
            </div>
          )}
        </SectionPanel>
      ) : (
        <SectionPanel>
          <EmptyState
            icon={ChartBarIcon}
            title="No report generated"
            description="Select a report type above to view report details."
          />
        </SectionPanel>
      )}
    </div>
  );
};

// Budget Modal
const BudgetModal = ({
  budgetForm,
  budgetFormErrors,
  handleBudgetFormChange,
  onSubmit,
  onClose,
  isEdit = false,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "budget";
  const currency = budgetForm.currency || "ETB";

  return (
    <ModalChrome
      maxWidth="max-w-xl"
      title={isEdit ? "Edit Project Budget" : "Create Project Budget"}
      subtitle="Set the total project budget amount, currency, and approval details"
      onClose={onClose}
      closeDisabled={isSaving}
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
            loadingText={isEdit ? "Updating…" : "Creating…"}
            disabled={!budgetForm.totalAmount}
            className={`${primaryBtnClass} order-1 sm:order-2`}
          >
            {isEdit ? "Update Budget" : "Save Budget"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
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
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                {currency}
              </span>
            </div>
            {budgetFormErrors.totalAmount && (
              <p className={fieldErrorClass}>{budgetFormErrors.totalAmount}</p>
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
              <option value="USD">USD - US Dollar</option>
            </select>
          </div>
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
              placeholder="e.g., Executive Committee"
            />
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
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>Budget Description / Scope</label>
          <textarea
            value={budgetForm.description}
            onChange={(e) =>
              handleBudgetFormChange("description", e.target.value)
            }
            rows={3}
            disabled={isSaving}
            className={fieldInputClass(!!budgetFormErrors.description)}
            placeholder="Explain what this budget covers for the project…"
          />
        </div>
      </div>
    </ModalChrome>
  );
};

// Expense Modal Component
const ExpenseModal = ({
  expenseForm,
  setExpenseForm,
  expenseFormErrors,
  handleExpenseFormChange,
  budgetAllocationCategories = [],
  onSubmit,
  onClose,
  isEdit = false,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "expense";

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showErrorToast("Receipt image must be under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        handleExpenseFormChange("receiptUrl", reader.result);
        handleExpenseFormChange("receiptImage", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <ModalChrome
      title={isEdit ? "Edit Expense" : "Record New Expense"}
      subtitle="Enter amount, reason, vendor, date, and upload receipt image"
      onClose={onClose}
      closeDisabled={isSaving}
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
            placeholder="e.g., Drone Survey Fuel & Equipment"
            required
          />
          {expenseFormErrors.title && (
            <p className={fieldErrorClass}>{expenseFormErrors.title}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Amount (ETB) *</label>
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
          <label className={fieldLabelClass}>Expense Date *</label>
          <input
            type="date"
            value={expenseForm.expenseDate}
            max={todayInputValue()}
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
          <label className={fieldLabelClass}>Reason for Expense</label>
          <input
            type="text"
            value={expenseForm.reason}
            onChange={(e) => handleExpenseFormChange("reason", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="e.g., Field site travel & lodging"
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Vendor / Supplier</label>
          <input
            type="text"
            value={expenseForm.vendor}
            onChange={(e) => handleExpenseFormChange("vendor", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="e.g., Total Ethiopia / Tech Supplier"
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Category</label>
          <select
            value={expenseForm.categoryId || ""}
            onChange={(e) => {
              const cat = budgetAllocationCategories.find(
                (c) => String(c._id) === e.target.value
              );
              handleExpenseFormChange("categoryId", e.target.value);
              handleExpenseFormChange("category", cat?.name || "general");
            }}
            disabled={isSaving}
            className={fieldInputClass()}
          >
            <option value="">Select Category</option>
            {budgetAllocationCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
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

        {/* Receipt Image Upload with Preview */}
        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Receipt Image Upload</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-700 transition-colors">
              <PhotoIcon className="w-4 h-4 text-slate-600" />
              <span>Choose Image (PNG/JPG)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={isSaving}
              />
            </label>
            {expenseForm.receiptUrl && (
              <div className="relative inline-flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <img
                  src={expenseForm.receiptUrl}
                  alt="Receipt thumbnail"
                  className="h-10 w-10 object-cover rounded"
                />
                <span className="text-xs text-emerald-700 font-medium">
                  Receipt attached
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleExpenseFormChange("receiptUrl", "");
                    handleExpenseFormChange("receiptImage", "");
                  }}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                  title="Remove receipt"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Description</label>
          <textarea
            value={expenseForm.description}
            onChange={(e) =>
              handleExpenseFormChange("description", e.target.value)
            }
            rows={2}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="Additional notes for this expense…"
          />
        </div>
      </div>
    </ModalChrome>
  );
};

// ----------------- PAYMENT PLAN MODAL -----------------

const PaymentPlanModal = ({
  paymentPlanForm,
  paymentPlanFormErrors = {},
  handlePaymentPlanFormChange,
  projectName,
  onSubmit,
  onClose,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "payment";
  const frequency = paymentPlanForm.frequency || "monthly";
  const totalAmount = Number(paymentPlanForm.totalAmount) || 0;
  const numInstallments = parseInt(paymentPlanForm.numberOfInstallments, 10) || (frequency === "quarterly" ? 4 : 12);

  // Live schedule preview calculation for monthly/quarterly
  const perInstallmentAmount =
    totalAmount > 0 && numInstallments > 0
      ? (totalAmount / numInstallments).toFixed(2)
      : "0.00";

  // Custom installments calculation
  const customInstallments = paymentPlanForm.customInstallments || [];
  const customAllocatedSum = customInstallments.reduce(
    (sum, inst) => sum + (Number(inst.amount) || 0),
    0
  );
  const customRemaining = Math.max(0, totalAmount - customAllocatedSum);
  const isOverAllocated = totalAmount > 0 && customAllocatedSum > totalAmount + 0.001;

  const handleCustomRowChange = (index, field, value) => {
    const updated = customInstallments.map((row, i) => {
      if (i === index) {
        return { ...row, [field]: value };
      }
      return row;
    });
    handlePaymentPlanFormChange("customInstallments", updated);
  };

  const handleAddCustomRow = () => {
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + customInstallments.length);
    const dateStr = nextDate.toISOString().split("T")[0];
    const newRow = {
      amount: customRemaining > 0 ? customRemaining.toFixed(2) : "",
      dueDate: dateStr,
      isPaid: false,
    };
    handlePaymentPlanFormChange("customInstallments", [...customInstallments, newRow]);
  };

  const handleRemoveCustomRow = (index) => {
    if (customInstallments.length <= 1) return;
    const updated = customInstallments.filter((_, i) => i !== index);
    handlePaymentPlanFormChange("customInstallments", updated);
  };

  return (
    <ModalChrome
      maxWidth="max-w-3xl"
      title="Create Project Payment Plan"
      subtitle="Configure installment schedules (Monthly, Quarterly, Custom) or Lump Sum milestones"
      onClose={onClose}
      closeDisabled={isSaving}
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
            loadingText="Creating Plan…"
            disabled={
              !paymentPlanForm.clientName ||
              !paymentPlanForm.totalAmount ||
              isOverAllocated
            }
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2"
          >
            Create Payment Schedule
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className={fieldLabelClass}>Client Name *</label>
            <input
              type="text"
              value={paymentPlanForm.clientName}
              onChange={(e) =>
                handlePaymentPlanFormChange("clientName", e.target.value)
              }
              disabled={isSaving}
              className={fieldInputClass(!!paymentPlanFormErrors.clientName)}
              placeholder="e.g., Ethiopian Forestry Commission"
              required
            />
            {paymentPlanFormErrors.clientName && (
              <p className={fieldErrorClass}>
                {paymentPlanFormErrors.clientName}
              </p>
            )}
          </div>

          <div>
            <label className={fieldLabelClass}>Payment Title *</label>
            <input
              type="text"
              value={paymentPlanForm.title || ""}
              onChange={(e) =>
                handlePaymentPlanFormChange("title", e.target.value)
              }
              disabled={isSaving}
              className={fieldInputClass(!!paymentPlanFormErrors.title)}
              placeholder="e.g., Phase 1 Deliverables & Advance Payment"
              required
            />
            {paymentPlanFormErrors.title && (
              <p className={fieldErrorClass}>{paymentPlanFormErrors.title}</p>
            )}
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>
            Total Project / Contract Amount (ETB) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={paymentPlanForm.totalAmount}
            onChange={(e) =>
              handlePaymentPlanFormChange("totalAmount", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!paymentPlanFormErrors.totalAmount)}
            placeholder="0.00"
            required
          />
          {paymentPlanFormErrors.totalAmount && (
            <p className={fieldErrorClass}>
              {paymentPlanFormErrors.totalAmount}
            </p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>
            Description / Scope Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={paymentPlanForm.description || ""}
            onChange={(e) =>
              handlePaymentPlanFormChange("description", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="e.g., Phase 1 deliverables, payment milestones, retainer terms…"
          />
        </div>

        {/* Payment Method Selector */}
        <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-4">
          <label className="text-xs sm:text-sm font-bold text-slate-900 block">
            Payment Method *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { value: "monthly", label: "Monthly", desc: "Even monthly splits" },
              { value: "quarterly", label: "Quarterly", desc: "Every 3 months" },
              { value: "lump_sum", label: "Lump Sum", desc: "First payment is total" },
              { value: "custom", label: "Custom", desc: "Custom dates & amounts" },
            ].map((method) => {
              const isSelected = frequency === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() =>
                    handlePaymentPlanFormChange("frequency", method.value)
                  }
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <p className="font-bold text-xs sm:text-sm">{method.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{method.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Monthly or Quarterly Config */}
          {(frequency === "monthly" || frequency === "quarterly") && (
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabelClass}>
                    Number of Installments *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={paymentPlanForm.numberOfInstallments}
                    onChange={(e) =>
                      handlePaymentPlanFormChange(
                        "numberOfInstallments",
                        e.target.value
                      )
                    }
                    disabled={isSaving}
                    className={fieldInputClass(
                      !!paymentPlanFormErrors.numberOfInstallments
                    )}
                    placeholder={frequency === "monthly" ? "12" : "4"}
                    required
                  />
                  {paymentPlanFormErrors.numberOfInstallments && (
                    <p className={fieldErrorClass}>
                      {paymentPlanFormErrors.numberOfInstallments}
                    </p>
                  )}
                </div>

                <div>
                  <label className={fieldLabelClass}>Start Date *</label>
                  <input
                    type="date"
                    value={paymentPlanForm.startDate}
                    onChange={(e) =>
                      handlePaymentPlanFormChange("startDate", e.target.value)
                    }
                    disabled={isSaving}
                    className={fieldInputClass(
                      !!paymentPlanFormErrors.startDate
                    )}
                    required
                  />
                  {paymentPlanFormErrors.startDate && (
                    <p className={fieldErrorClass}>
                      {paymentPlanFormErrors.startDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Checkbox: Payment 1 already paid */}
              <label className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={paymentPlanForm.firstPaid}
                  onChange={(e) =>
                    handlePaymentPlanFormChange("firstPaid", e.target.checked)
                  }
                  disabled={isSaving}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-slate-800">
                    Payment 1 was already received
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Will mark installment #1 as Paid today and future installments as Upcoming.
                  </p>
                </div>
              </label>

              {/* Schedule Summary Preview */}
              {totalAmount > 0 && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <p className="font-bold text-emerald-950">
                    Schedule Preview:
                  </p>
                  <p>
                    • {numInstallments} installments of approximately <strong>ETB {perInstallmentAmount}</strong> every {frequency === "monthly" ? "month" : "quarter"}.
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    • Full schedule will be auto-generated. The final installment absorbs any rounding. Future installments automatically flip to Due Today / Overdue when their due dates arrive.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Lump Sum Config */}
          {frequency === "lump_sum" && (
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabelClass}>
                    First Payment Amount (ETB) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalAmount > 0 ? totalAmount : undefined}
                    value={paymentPlanForm.lumpSumFirstAmount || (totalAmount > 0 ? totalAmount : "")}
                    onChange={(e) =>
                      handlePaymentPlanFormChange(
                        "lumpSumFirstAmount",
                        e.target.value
                      )
                    }
                    disabled={isSaving}
                    className={fieldInputClass(
                      !!paymentPlanFormErrors.lumpSumFirstAmount
                    )}
                    placeholder={totalAmount > 0 ? totalAmount.toFixed(2) : "0.00"}
                    required
                  />
                  {paymentPlanFormErrors.lumpSumFirstAmount && (
                    <p className={fieldErrorClass}>
                      {paymentPlanFormErrors.lumpSumFirstAmount}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    First payment is the full total contract amount by default.
                  </p>
                </div>

                <div>
                  <label className={fieldLabelClass}>
                    First Payment Due Date *
                  </label>
                  <input
                    type="date"
                    value={paymentPlanForm.startDate}
                    onChange={(e) =>
                      handlePaymentPlanFormChange("startDate", e.target.value)
                    }
                    disabled={isSaving}
                    className={fieldInputClass()}
                    required
                  />
                </div>
              </div>

              {/* Checkbox: First payment already paid */}
              <label className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={paymentPlanForm.lumpSumFirstPaid}
                  onChange={(e) =>
                    handlePaymentPlanFormChange(
                      "lumpSumFirstPaid",
                      e.target.checked
                    )
                  }
                  disabled={isSaving}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-slate-800">
                    First payment was already received
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Mark payment 1 as paid now.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-semibold">
                  Lump Sum Milestones:
                </p>
                <p className="text-[11px] text-blue-700">
                  The initial milestone represents the contract payment. If partial, you can adjust the amount, and click <strong>"+ Add expected next payment"</strong> on the project card to chain future milestones until the total of ETB {totalAmount > 0 ? totalAmount.toLocaleString() : "0"} is covered.
                </p>
              </div>
            </div>
          )}

          {/* Custom Schedule Builder */}
          {frequency === "custom" && (
            <div className="pt-3 border-t border-slate-200/80 space-y-3.5">
              {/* Allocation Summary Bar */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Total Contract: </span>
                    <strong className="text-slate-900">
                      ETB {totalAmount.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Scheduled Sum: </span>
                    <strong className={isOverAllocated ? "text-rose-600" : "text-emerald-700"}>
                      ETB {customAllocatedSum.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Remaining: </span>
                    <strong className={customRemaining > 0 ? "text-amber-600" : "text-emerald-600"}>
                      ETB {customRemaining.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverAllocated
                        ? "bg-rose-500"
                        : customRemaining === 0 && totalAmount > 0
                        ? "bg-emerald-500"
                        : "bg-blue-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        totalAmount > 0 ? (customAllocatedSum / totalAmount) * 100 : 0
                      )}%`,
                    }}
                  />
                </div>

                {isOverAllocated && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>
                      Milestones total (ETB {customAllocatedSum.toFixed(2)}) exceeds contract amount (ETB {totalAmount.toFixed(2)}) by ETB {(customAllocatedSum - totalAmount).toFixed(2)}
                    </span>
                  </div>
                )}

                {paymentPlanFormErrors.customInstallments && (
                  <p className={fieldErrorClass}>
                    {paymentPlanFormErrors.customInstallments}
                  </p>
                )}
              </div>

              {/* Installment Milestone Rows */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {customInstallments.map((inst, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 animate-[fadeIn_0.15s_ease-out]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Milestone #{idx + 1}
                      </span>
                      {customInstallments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Milestone"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-0.5">
                          Amount (ETB) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={inst.amount}
                          onChange={(e) =>
                            handleCustomRowChange(idx, "amount", e.target.value)
                          }
                          disabled={isSaving}
                          className={fieldInputClass(
                            !!paymentPlanFormErrors[`custom_amount_${idx}`]
                          )}
                          placeholder="0.00"
                          required
                        />
                        {paymentPlanFormErrors[`custom_amount_${idx}`] && (
                          <p className={fieldErrorClass}>
                            {paymentPlanFormErrors[`custom_amount_${idx}`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-0.5">
                          Due Date *
                        </label>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) =>
                            handleCustomRowChange(idx, "dueDate", e.target.value)
                          }
                          disabled={isSaving}
                          className={fieldInputClass(
                            !!paymentPlanFormErrors[`custom_date_${idx}`]
                          )}
                          required
                        />
                        {paymentPlanFormErrors[`custom_date_${idx}`] && (
                          <p className={fieldErrorClass}>
                            {paymentPlanFormErrors[`custom_date_${idx}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inst.isPaid}
                        onChange={(e) =>
                          handleCustomRowChange(idx, "isPaid", e.target.checked)
                        }
                        disabled={isSaving}
                        className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                      />
                      <span className="text-xs text-slate-700 font-medium">
                        Already received / paid
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Add Milestone & Auto-fill Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddCustomRow}
                  disabled={isSaving || customRemaining <= 0 && customInstallments.length > 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Add Milestone</span>
                </button>

                {customRemaining > 0 && customInstallments.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Remaining unallocated:{" "}
                    <strong className="text-amber-700">
                      ETB {customRemaining.toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalChrome>
  );
};

export default ProjectFinancialManagement;
