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
  PhotoIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import FinancialDashboard from "./FinancialDashboard";
import {
  validateBudgetForm,
  validateExpenseForm,
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

const PAYMENT_FREQUENCIES = [
  { value: "lump_sum", label: "Lump Sum (One-time / Direct)" },
  { value: "monthly", label: "Monthly Recurring" },
  { value: "quarterly", label: "Quarterly Recurring" },
];

const formatFrequencyLabel = (freq) => {
  if (freq === "monthly") return "Monthly";
  if (freq === "quarterly") return "Quarterly";
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
  const [income, setIncome] = useState([]);
  const [financialReports, setFinancialReports] = useState(null);
  const [budgetAllocationCategories, setBudgetAllocationCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);

  // Modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [showExpectedPaymentModal, setShowExpectedPaymentModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectTargetIncome, setCollectTargetIncome] = useState(null);
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

  const [incomeForm, setIncomeForm] = useState({
    title: "",
    clientName: "",
    projectName: projectName || "",
    totalProjectAmount: "",
    expectedAmount: "",
    amount: "",
    totalPaid: "",
    frequency: "lump_sum",
    recurringDay: "15",
    durationMonths: "12",
    startDate: todayInputValue(),
    installmentAmount: "",
    paymentMethod: "advance_payment",
    receivedDate: todayInputValue(),
    dueDate: "",
    nextPaymentDate: "",
    nextPaymentAmount: "",
    categoryId: "",
    invoiceNumber: "",
    status: "pending",
    paymentReference: "",
    description: "",
    notes: "",
  });

  const [expectedPaymentForm, setExpectedPaymentForm] = useState({
    title: "",
    clientName: "",
    totalProjectAmount: "",
    expectedAmount: "",
    amount: "",
    frequency: "lump_sum",
    recurringDay: "15",
    durationMonths: "12",
    startDate: todayInputValue(),
    installmentAmount: "",
    paymentMethod: "advance_payment",
    dueDate: "",
    nextPaymentDate: "",
    nextPaymentAmount: "",
    categoryId: "",
    invoiceNumber: "",
    description: "",
    notes: "",
  });

  const [collectForm, setCollectForm] = useState({
    collectAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    invoiceNumber: "",
    paymentReference: "",
    nextPaymentDate: "",
    nextPaymentAmount: "",
    notes: "",
  });

  // Errors
  const [budgetFormErrors, setBudgetFormErrors] = useState({});
  const [expenseFormErrors, setExpenseFormErrors] = useState({});
  const [incomeFormErrors, setIncomeFormErrors] = useState({});
  const [expectedPaymentFormErrors, setExpectedPaymentFormErrors] = useState({});
  const [collectFormErrors, setCollectFormErrors] = useState({});

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
        fetchIncome(),
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
      const [bRes, iRes] = await Promise.all([
        fetch("/api/budget-allocation-categories"),
        fetch("/api/income-categories"),
      ]);
      const bData = await bRes.json();
      const iData = await iRes.json();
      if (bData.success) setBudgetAllocationCategories(bData.categories || []);
      if (iData.success) setIncomeCategories(iData.categories || []);
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

  const fetchIncome = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/income`);
      const data = await res.json();
      if (data.success) {
        setIncome(data.income || []);
      }
    } catch (e) {
      console.error("Failed to fetch income:", e);
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

  // Handlers for Income
  const resetIncomeForm = () => {
    setIncomeForm({
      title: "",
      clientName: "",
      projectName: projectName || "",
      totalProjectAmount: "",
      expectedAmount: "",
      amount: "",
      totalPaid: "",
      frequency: "lump_sum",
      recurringDay: "15",
      durationMonths: "12",
      startDate: todayInputValue(),
      installmentAmount: "",
      paymentMethod: "advance_payment",
      receivedDate: todayInputValue(),
      dueDate: "",
      nextPaymentDate: "",
      nextPaymentAmount: "",
      categoryId: "",
      invoiceNumber: "",
      status: "pending",
      paymentReference: "",
      description: "",
      notes: "",
    });
    setIncomeFormErrors({});
  };

  const handleIncomeFormChange = (field, value) => {
    setIncomeForm((prev) => {
      const next = { ...prev, [field]: value };
      // If total amount or duration or frequency changes, recalculate installment amount
      if (field === "totalProjectAmount" || field === "durationMonths" || field === "frequency") {
        const total = Number(field === "totalProjectAmount" ? value : next.totalProjectAmount) || 0;
        const dur = parseInt(field === "durationMonths" ? value : next.durationMonths, 10) || 12;
        const freq = field === "frequency" ? value : next.frequency;
        if (freq === "monthly" && dur > 0) {
          next.installmentAmount = (total / dur).toFixed(2);
          next.nextPaymentAmount = (total / dur).toFixed(2);
        } else if (freq === "quarterly" && dur > 0) {
          const quarters = Math.max(1, Math.round(dur / 3));
          next.installmentAmount = (total / quarters).toFixed(2);
          next.nextPaymentAmount = (total / quarters).toFixed(2);
        } else {
          next.installmentAmount = total ? total.toFixed(2) : "";
        }
      }
      return next;
    });

    if (incomeFormErrors[field]) {
      setIncomeFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
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
    setActionLoading("income");

    try {
      const payload = {
        ...incomeForm,
        expectedAmount: incomeForm.totalProjectAmount || incomeForm.expectedAmount,
        totalProjectAmount: incomeForm.totalProjectAmount || incomeForm.expectedAmount,
        amount: incomeForm.totalPaid || incomeForm.amount || 0,
        totalPaid: incomeForm.totalPaid || incomeForm.amount || 0,
      };

      const res = await fetch(`/api/projects/${projectId}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Income record saved successfully");
        setShowIncomeModal(false);
        resetIncomeForm();
        fetchIncome();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to save income");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to save income");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditIncome = (inc) => {
    setEditingIncomeId(inc._id);
    const totalProjectAmt = inc.totalProjectAmount || inc.expectedAmount || inc.amount || "";
    const paidAmt = inc.totalPaid !== undefined ? inc.totalPaid : inc.amount || "";

    setIncomeForm({
      title: inc.title || "",
      clientName: inc.clientName || "",
      projectName: inc.projectName || projectName || "",
      totalProjectAmount: totalProjectAmt,
      expectedAmount: totalProjectAmt,
      amount: paidAmt,
      totalPaid: paidAmt,
      frequency: inc.frequency || "lump_sum",
      recurringDay: inc.recurringDay ? String(inc.recurringDay) : "15",
      durationMonths: inc.durationMonths ? String(inc.durationMonths) : "12",
      startDate: toDateInputValue(inc.startDate) || todayInputValue(),
      installmentAmount: inc.installmentAmount || "",
      paymentMethod: inc.paymentMethod || "advance_payment",
      receivedDate: toDateInputValue(inc.receivedDate) || todayInputValue(),
      dueDate: toDateInputValue(inc.dueDate) || "",
      nextPaymentDate: toDateInputValue(inc.nextPaymentDate) || "",
      nextPaymentAmount: inc.nextPaymentAmount || "",
      categoryId: inc.categoryId || "",
      invoiceNumber: inc.invoiceNumber || "",
      status: inc.status || "pending",
      paymentReference: inc.paymentReference || "",
      description: inc.description || "",
      notes: inc.notes || "",
    });
    setIncomeFormErrors({});
    setShowIncomeModal(true);
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
    setActionLoading("income");

    try {
      const payload = {
        ...incomeForm,
        expectedAmount: incomeForm.totalProjectAmount || incomeForm.expectedAmount,
        totalProjectAmount: incomeForm.totalProjectAmount || incomeForm.expectedAmount,
        amount: incomeForm.totalPaid || incomeForm.amount || 0,
        totalPaid: incomeForm.totalPaid || incomeForm.amount || 0,
      };

      const res = await fetch(
        `/api/projects/${projectId}/income/${editingIncomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Income record updated successfully");
        setShowIncomeModal(false);
        setEditingIncomeId(null);
        resetIncomeForm();
        fetchIncome();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to update income");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to update income");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    const confirmed = await showDeleteConfirmDialog({
      title: "Delete Income Record",
      text: "Are you sure you want to delete this income record?",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Income deleted successfully");
        fetchIncome();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to delete income");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to delete income");
    }
  };

  // Expected Income Modal & Handlers
  const handleAddExpectedIncome = async () => {
    const errors = validateExpectedPaymentForm(expectedPaymentForm);
    if (hasFormErrors(errors)) {
      setExpectedPaymentFormErrors(errors);
      showValidationErrors(errors);
      return;
    }
    setExpectedPaymentFormErrors({});
    setActionLoading("expected");

    try {
      const payload = {
        title: expectedPaymentForm.title,
        clientName: expectedPaymentForm.clientName,
        projectName: projectName,
        totalProjectAmount: expectedPaymentForm.totalProjectAmount || expectedPaymentForm.expectedAmount,
        expectedAmount: expectedPaymentForm.totalProjectAmount || expectedPaymentForm.expectedAmount,
        amount: expectedPaymentForm.amount || 0,
        totalPaid: expectedPaymentForm.amount || 0,
        frequency: expectedPaymentForm.frequency || "lump_sum",
        recurringDay: expectedPaymentForm.recurringDay || 15,
        durationMonths: expectedPaymentForm.durationMonths || 12,
        startDate: expectedPaymentForm.startDate || todayInputValue(),
        installmentAmount: expectedPaymentForm.installmentAmount || 0,
        paymentMethod: expectedPaymentForm.paymentMethod || "advance_payment",
        dueDate: expectedPaymentForm.dueDate || null,
        nextPaymentDate: expectedPaymentForm.nextPaymentDate || null,
        nextPaymentAmount: expectedPaymentForm.nextPaymentAmount || 0,
        categoryId: expectedPaymentForm.categoryId || "",
        invoiceNumber: expectedPaymentForm.invoiceNumber || "",
        description: expectedPaymentForm.description || "",
        notes: expectedPaymentForm.notes || "",
        status: "pending",
      };

      const res = await fetch(`/api/projects/${projectId}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Expected income scheduled successfully");
        setShowExpectedPaymentModal(false);
        setExpectedPaymentForm({
          title: "",
          clientName: "",
          totalProjectAmount: "",
          expectedAmount: "",
          amount: "",
          frequency: "lump_sum",
          recurringDay: "15",
          durationMonths: "12",
          startDate: todayInputValue(),
          installmentAmount: "",
          paymentMethod: "advance_payment",
          dueDate: "",
          nextPaymentDate: "",
          nextPaymentAmount: "",
          categoryId: "",
          invoiceNumber: "",
          description: "",
          notes: "",
        });
        fetchIncome();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to schedule expected income");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to schedule expected income");
    } finally {
      setActionLoading(null);
    }
  };

  // Collect Payment
  const openCollectModal = (inc) => {
    setCollectTargetIncome(inc);
    const totalAmt = Number(inc.totalProjectAmount || inc.expectedAmount || inc.amount || 0);
    const paidAmt = Number(inc.totalPaid || inc.amount || 0);
    const remaining = Math.max(0, totalAmt - paidAmt);
    const installment = Number(inc.installmentAmount) || remaining;
    const defaultCollect = inc.frequency !== "lump_sum" && installment > 0 ? Math.min(remaining, installment) : remaining;

    // Calculate next payment date for recurring
    let nextDate = "";
    if (inc.frequency === "monthly" || inc.frequency === "quarterly") {
      const baseDate = inc.nextPaymentDate ? new Date(inc.nextPaymentDate) : new Date();
      const step = inc.frequency === "quarterly" ? 3 : 1;
      const target = new Date(baseDate);
      target.setMonth(target.getMonth() + step);
      const day = parseInt(inc.recurringDay, 10) || target.getDate();
      const maxDays = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      target.setDate(Math.min(day, maxDays));
      nextDate = target.toISOString().split("T")[0];
    }

    setCollectForm({
      collectAmount: defaultCollect > 0 ? defaultCollect.toFixed(2) : "",
      receivedDate: todayInputValue(),
      paymentMethod: inc.paymentMethod || "bank_transfer",
      invoiceNumber: inc.invoiceNumber || "",
      paymentReference: "",
      nextPaymentDate: nextDate,
      nextPaymentAmount: inc.installmentAmount || "",
      notes: "",
    });
    setCollectFormErrors({});
    setShowCollectModal(true);
  };

  const handleCollectPayment = async () => {
    if (!collectTargetIncome) return;
    const totalAmt = Number(collectTargetIncome.totalProjectAmount || collectTargetIncome.expectedAmount || 0);
    const paidAmt = Number(collectTargetIncome.totalPaid || collectTargetIncome.amount || 0);
    const remaining = Math.max(0, totalAmt - paidAmt);

    const errors = validateCollectPaymentForm(collectForm, {
      remainingAmount: remaining > 0 ? remaining : Infinity,
    });
    if (hasFormErrors(errors)) {
      setCollectFormErrors(errors);
      showValidationErrors(errors);
      return;
    }
    setCollectFormErrors({});
    setActionLoading("collect");

    try {
      const res = await fetch(
        `/api/projects/${projectId}/income/${collectTargetIncome._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "collect",
            ...collectForm,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        showSuccessToast("Payment collected and recorded successfully");
        setShowCollectModal(false);
        setCollectTargetIncome(null);
        fetchIncome();
        fetchFinancialReports();
      } else {
        showErrorToast(data.error || "Failed to record collection");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to record collection");
    } finally {
      setActionLoading(null);
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
    { id: "expenses", name: "Expenses", icon: DocumentTextIcon },
    { id: "income", name: "Income", icon: ArrowTrendingUpIcon },
    { id: "reports", name: "Reports", icon: EyeIcon },
  ];

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {/* Top Banner */}
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

      {/* Tabs */}
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

      {/* Tab Contents */}
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

        {activeTab === "income" && (
          <IncomeTab
            projectId={projectId}
            income={income}
            projectName={projectName}
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

      {/* Income Modal (Full Create or Edit with Lump Sum / Monthly / Quarterly options) */}
      {showIncomeModal && (
        <IncomeModal
          incomeForm={incomeForm}
          incomeFormErrors={incomeFormErrors}
          handleIncomeFormChange={handleIncomeFormChange}
          projectName={projectName}
          incomeCategories={incomeCategories}
          onSubmit={editingIncomeId ? handleEditIncome : handleAddIncome}
          onClose={() => {
            if (actionLoading === "income") return;
            setShowIncomeModal(false);
            setEditingIncomeId(null);
            setIncomeFormErrors({});
          }}
          isEdit={!!editingIncomeId}
          actionLoading={actionLoading}
        />
      )}

      {/* Expected Payment Modal with Lump Sum / Monthly / Quarterly */}
      {showExpectedPaymentModal && (
        <ExpectedIncomeModal
          expectedPaymentForm={expectedPaymentForm}
          setExpectedPaymentForm={setExpectedPaymentForm}
          expectedPaymentFormErrors={expectedPaymentFormErrors}
          projectName={projectName}
          incomeCategories={incomeCategories}
          onSubmit={handleAddExpectedIncome}
          onClose={() => {
            if (actionLoading === "expected") return;
            setShowExpectedPaymentModal(false);
            setExpectedPaymentFormErrors({});
          }}
          actionLoading={actionLoading}
        />
      )}

      {/* Collect Payment Modal */}
      {showCollectModal && collectTargetIncome && (
        <ModalChrome
          maxWidth="max-w-lg"
          title="Collect Payment"
          subtitle={`Record incoming collection for: ${collectTargetIncome.title || "Income"}`}
          onClose={() => {
            if (actionLoading === "collect") return;
            setShowCollectModal(false);
            setCollectTargetIncome(null);
          }}
          closeDisabled={actionLoading === "collect"}
          footer={
            <>
              <button
                onClick={() => {
                  if (actionLoading === "collect") return;
                  setShowCollectModal(false);
                  setCollectTargetIncome(null);
                }}
                disabled={actionLoading === "collect"}
                className={`${cancelBtnClass} order-2 sm:order-1`}
              >
                Cancel
              </button>
              <ActionButton
                onClick={handleCollectPayment}
                loading={actionLoading === "collect"}
                loadingText="Recording…"
                disabled={!collectForm.collectAmount}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2"
              >
                Confirm Collection
              </ActionButton>
            </>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                <span className="font-semibold text-slate-800">
                  {collectTargetIncome.clientName || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Frequency:</span>
                <span className="font-semibold text-blue-700 capitalize">
                  {formatFrequencyLabel(collectTargetIncome.frequency)}
                  {collectTargetIncome.recurringDay ? ` (Day ${collectTargetIncome.recurringDay})` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Project Amount:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    collectTargetIncome.totalProjectAmount ||
                      collectTargetIncome.expectedAmount ||
                      0
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Collected:</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(
                    collectTargetIncome.totalPaid ||
                      collectTargetIncome.amount ||
                      0
                  )}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Unpaid Remaining:</span>
                <span className="font-bold text-amber-700">
                  {formatCurrency(
                    Math.max(
                      0,
                      (Number(
                        collectTargetIncome.totalProjectAmount ||
                          collectTargetIncome.expectedAmount ||
                          0
                      ) || 0) -
                        (Number(
                          collectTargetIncome.totalPaid ||
                            collectTargetIncome.amount ||
                            0
                        ) || 0)
                    )
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className={fieldLabelClass}>Amount Collected *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={collectForm.collectAmount}
                onChange={(e) =>
                  setCollectForm((p) => ({ ...p, collectAmount: e.target.value }))
                }
                disabled={actionLoading === "collect"}
                className={fieldInputClass(!!collectFormErrors.collectAmount)}
                placeholder="0.00"
                required
              />
              {collectFormErrors.collectAmount && (
                <p className={fieldErrorClass}>
                  {collectFormErrors.collectAmount}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelClass}>Received Date *</label>
                <input
                  type="date"
                  value={collectForm.receivedDate}
                  max={todayInputValue()}
                  onChange={(e) =>
                    setCollectForm((p) => ({ ...p, receivedDate: e.target.value }))
                  }
                  disabled={actionLoading === "collect"}
                  className={fieldInputClass(!!collectFormErrors.receivedDate)}
                />
              </div>
              <div>
                <label className={fieldLabelClass}>Payment Method</label>
                <select
                  value={collectForm.paymentMethod}
                  onChange={(e) =>
                    setCollectForm((p) => ({ ...p, paymentMethod: e.target.value }))
                  }
                  disabled={actionLoading === "collect"}
                  className={fieldInputClass()}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={fieldLabelClass}>Next Payment Date</label>
                <input
                  type="date"
                  value={collectForm.nextPaymentDate}
                  onChange={(e) =>
                    setCollectForm((p) => ({ ...p, nextPaymentDate: e.target.value }))
                  }
                  disabled={actionLoading === "collect"}
                  className={fieldInputClass()}
                />
              </div>
              <div>
                <label className={fieldLabelClass}>Next Payment Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={collectForm.nextPaymentAmount}
                  onChange={(e) =>
                    setCollectForm((p) => ({ ...p, nextPaymentAmount: e.target.value }))
                  }
                  disabled={actionLoading === "collect"}
                  className={fieldInputClass()}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  placeholder="Ref / Transaction ID"
                />
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
                  placeholder="e.g. INV-2026-001"
                />
              </div>
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
                placeholder="Optional notes regarding this payment receipt"
              />
            </div>
          </div>
        </ModalChrome>
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
  const totalBudget = Number(summary.totalBudget ?? budgetData?.totalAmount ?? 0) || 0;
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = income.reduce(
    (sum, inc) => sum + (Number(inc.amount || inc.totalPaid) || 0),
    0
  );
  const totalExpectedIncome = income.reduce(
    (sum, inc) => sum + (Number(inc.expectedAmount || inc.totalProjectAmount || inc.amount) || 0),
    0
  );
  const remainingBudget = Math.max(0, totalBudget - totalExpenses);
  const budgetUtilization =
    totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

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
          subtitle={`${expenses.length} expense records`}
        />
        <MetricCard
          label="Total Income (Paid)"
          value={totalIncome}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ArrowTrendingUpIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
          subtitle={
            totalExpectedIncome > 0
              ? `${((totalIncome / totalExpectedIncome) * 100).toFixed(0)}% of expected collected`
              : "No income scheduled"
          }
        />
        <MetricCard
          label="Remaining Budget"
          value={remainingBudget}
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
              Total Spent:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(totalExpenses)}
              </span>
            </p>
            <p
              className="min-w-0 truncate sm:text-right"
              title={currencyTitle(remainingBudget)}
            >
              Remaining Available:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(remainingBudget)}
              </span>
            </p>
          </div>
        </SectionPanel>
      )}

      {/* Recent Activity */}
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
                    {expense.reason ? `${expense.reason} · ` : ""}
                    {expense.vendor ? `${expense.vendor} · ` : ""}
                    {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-rose-600 tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusColor(
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
                description="Add an expense above to start tracking costs."
              />
            )}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Recent Income & Expected Payments"
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
                    {inc.clientName ? `${inc.clientName} · ` : ""}
                    <span className="font-semibold text-blue-700">
                      {formatFrequencyLabel(inc.frequency)}
                    </span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                    {formatCurrency(inc.totalPaid || inc.amount || 0)}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium border capitalize ${getStatusColor(
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
                title="No income scheduled"
                description="Add expected income to track receipts and client payment dates."
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
          description="Create a project budget to track expenses and utilization directly."
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

  const totalBudget = Number(budgetData.totalAmount) || 0;
  const spent = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remaining = Math.max(0, totalBudget - spent);
  const utilization = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-5 min-w-0">
      <SectionPanel
        title="Project Budget"
        subtitle="Total allocated budget, total direct expenses, and available funds"
        action={
          <button
            onClick={onEditBudget}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Budget
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Project Budget"
            value={totalBudget}
            formatCurrency={formatCurrency}
            currencyTitle={currencyTitle}
            icon={CurrencyDollarIcon}
            valueClassName="text-blue-900"
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
          />
          <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Approval Info
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {budgetData.approvedBy || "Admin / Approved"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {budgetData.approvalDate ? formatDate(budgetData.approvalDate) : "Direct Project Budget"}
            </p>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Budget Utilization
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusColor(
                utilization > 100
                  ? "overrun"
                  : utilization > 90
                  ? "warning"
                  : "normal"
              )}`}
            >
              {utilization.toFixed(1)}%
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
            <p className="text-xs text-slate-500 mb-1">Budget Description / Scope</p>
            <p className="text-sm text-slate-800 break-words">
              {budgetData.description}
            </p>
          </div>
        )}
      </SectionPanel>
    </div>
  );
};

const ExpensesTab = ({
  expenses,
  budgetData,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onEditExpense,
  onDeleteExpense,
  onPreviewReceipt,
}) => {
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
          label="Approved / Paid"
          value={approved}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
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
        title="Project Expenses"
        subtitle="Manage and view expense records with title, reason, vendor, receipt images, and dates"
        bodyClassName="p-0"
      >
        {expenses.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No expenses recorded"
            description="Click 'Add Expense' above to record an expense."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Title & Reason
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-xs sm:text-sm">
                {expenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-3 sm:py-4">
                      <div className="font-semibold text-slate-900">
                        {expense.title}
                      </div>
                      {expense.reason && (
                        <div className="text-xs text-blue-700 font-medium mt-0.5">
                          Reason: {expense.reason}
                        </div>
                      )}
                      {expense.description && (
                        <div className="text-xs text-slate-500 truncate max-w-[14rem] mt-0.5">
                          {expense.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                      <AmountCell
                        amount={expense.amount}
                        formatCurrency={formatCurrency}
                        currencyTitle={currencyTitle}
                        className="text-rose-600 font-bold"
                      />
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-slate-700">
                      {expense.vendor || "—"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-slate-700">
                      {formatDate(expense.expenseDate)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 text-center whitespace-nowrap">
                      {expense.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => onPreviewReceipt(expense.receiptUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          title="View Receipt"
                        >
                          <PhotoIcon className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No receipt</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-md border capitalize ${getStatusColor(
                          expense.status
                        )}`}
                      >
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
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

// Income Tab Component (Lump Sum, Monthly, Quarterly, Paid vs Pending Schedule, Overdue)
const IncomeTab = ({
  projectId,
  income,
  projectName,
  formatCurrency,
  currencyTitle,
  getStatusColor,
  formatDate,
  onCollectIncome,
  onEditIncome,
  onDeleteIncome,
  onAddExpected,
}) => {
  const totalProjectIncomeAmount = income.reduce(
    (sum, inc) =>
      sum +
      (Number(inc.totalProjectAmount || inc.expectedAmount || inc.amount) || 0),
    0
  );
  const totalReceived = income.reduce(
    (sum, inc) => sum + (Number(inc.totalPaid || inc.amount) || 0),
    0
  );
  const totalOutstanding = Math.max(0, totalProjectIncomeAmount - totalReceived);
  const overdueUncollected = income
    .filter((inc) => inc.status === "overdue" || inc.isOverdue)
    .reduce(
      (sum, inc) =>
        sum +
        Math.max(
          0,
          (Number(inc.totalProjectAmount || inc.expectedAmount || inc.amount) || 0) -
            (Number(inc.totalPaid || inc.amount) || 0)
        ),
      0
    );

  const canCollect = (inc) =>
    inc.status !== "collected" &&
    inc.status !== "cancelled" &&
    (Number(inc.totalProjectAmount || inc.expectedAmount || 0) >
      (Number(inc.totalPaid || inc.amount) || 0) ||
      (Number(inc.totalPaid || inc.amount) || 0) === 0);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs sm:text-sm text-emerald-900">
        <strong>Income & Payment Flow:</strong> Flexible schedule options for <strong>Lump Sum</strong>, <strong>Monthly</strong>, and <strong>Quarterly</strong> payments. Shows date paid when collected, upcoming due date when pending, and alerts automatically if overdue.
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Project Income"
          value={totalProjectIncomeAmount}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CurrencyDollarIcon}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          valueClassName="text-blue-900"
          subtitle="Total contract value"
        />
        <MetricCard
          label="Total Paid / Collected"
          value={totalReceived}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={CheckCircleIcon}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          valueClassName="text-emerald-600"
          subtitle={`${
            totalProjectIncomeAmount > 0
              ? ((totalReceived / totalProjectIncomeAmount) * 100).toFixed(0)
              : 0
          }% collected`}
        />
        <MetricCard
          label="Outstanding / Unpaid"
          value={totalOutstanding}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ClockIcon}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          valueClassName="text-amber-700"
          subtitle="Remaining to collect"
        />
        <MetricCard
          label="Overdue Balance"
          value={overdueUncollected}
          formatCurrency={formatCurrency}
          currencyTitle={currencyTitle}
          icon={ExclamationTriangleIcon}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          valueClassName="text-rose-600"
          subtitle="Requires attention"
        />
      </div>

      <SectionPanel
        title="Income & Payment Management"
        subtitle="Track payment schedules (Lump sum, Monthly, Quarterly), date paid, expected due dates, and overdue cycles"
        action={
          onAddExpected ? (
            <button
              onClick={onAddExpected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Schedule Income
            </button>
          ) : null
        }
        bodyClassName="p-0"
      >
        {income.length === 0 ? (
          <EmptyState
            icon={ArrowTrendingUpIcon}
            title="No project income records yet"
            description="Add project income to track client collections, unpaid balances, and next payment dates."
            action={
              onAddExpected ? (
                <button
                  onClick={onAddExpected}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-medium shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Schedule Income
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Client & Title
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payment Plan
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Paid / Collected
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Paid / Expected Date
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-xs sm:text-sm">
                {income.map((inc) => {
                  const totalAmt = Number(
                    inc.totalProjectAmount || inc.expectedAmount || inc.amount || 0
                  );
                  const paidAmt = Number(inc.totalPaid !== undefined ? inc.totalPaid : inc.amount || 0);
                  const unpaidAmt = Math.max(0, totalAmt - paidAmt);
                  const rate = totalAmt > 0 ? (paidAmt / totalAmt) * 100 : 0;
                  const isFullyPaid = paidAmt >= totalAmt && totalAmt > 0;
                  const isOverdue = inc.status === "overdue" || inc.isOverdue;

                  return (
                    <tr
                      key={inc._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-3 sm:px-4 py-3 sm:py-4">
                        <Link
                          href={`/project-budget/${projectId}/income/${inc._id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline block"
                        >
                          {inc.clientName ? inc.clientName : inc.title}
                        </Link>
                        <div className="text-xs text-slate-500 truncate max-w-[12rem] mt-0.5">
                          {inc.title} {inc.invoiceNumber ? `· ${inc.invoiceNumber}` : ""}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                            {formatFrequencyLabel(inc.frequency)}
                          </span>
                          {inc.frequency !== "lump_sum" && (
                            <span className="text-[11px] text-slate-500">
                              {inc.recurringDay ? `Day ${inc.recurringDay} of cycle` : ""}
                              {inc.durationMonths ? ` · ${inc.durationMonths} mos` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={totalAmt}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className="text-slate-900 font-semibold"
                        />
                        {inc.installmentAmount > 0 && inc.frequency !== "lump_sum" && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            {formatCurrency(inc.installmentAmount)}/{inc.frequency === "monthly" ? "mo" : "qtr"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={paidAmt}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className="text-emerald-600 font-bold"
                        />
                        <div className="text-[11px] text-slate-400 font-normal">
                          {rate.toFixed(0)}% paid
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                        <AmountCell
                          amount={unpaidAmt}
                          formatCurrency={formatCurrency}
                          currencyTitle={currencyTitle}
                          className={
                            unpaidAmt > 0
                              ? "text-amber-700 font-bold"
                              : "text-slate-400"
                          }
                        />
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        {isFullyPaid && inc.receivedDate ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Paid: {formatDate(inc.receivedDate)}
                            </span>
                          </div>
                        ) : inc.nextPaymentDate ? (
                          <div>
                            <div className={`font-medium flex items-center gap-1 text-xs ${isOverdue ? "text-rose-600 font-bold" : "text-slate-800"}`}>
                              <CalendarIcon className={`w-3.5 h-3.5 ${isOverdue ? "text-rose-500" : "text-blue-500"}`} />
                              Due: {formatDate(inc.nextPaymentDate)}
                            </div>
                            {Number(inc.nextPaymentAmount) > 0 && (
                              <div className="text-xs text-blue-600 font-semibold mt-0.5">
                                {formatCurrency(inc.nextPaymentAmount)}
                              </div>
                            )}
                            {isOverdue && inc.daysPastDue > 0 && (
                              <span className="text-[11px] text-rose-600 font-semibold block">
                                {inc.daysPastDue}d overdue
                              </span>
                            )}
                          </div>
                        ) : inc.dueDate ? (
                          <div className="text-xs text-slate-700">
                            Due: {formatDate(inc.dueDate)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not set</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-md border capitalize ${getStatusColor(
                            inc.status
                          )}`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          {canCollect(inc) && (
                            <button
                              onClick={() => onCollectIncome(inc)}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
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

// Full Income Modal (Supports Lump Sum, Monthly, Quarterly with Day & Duration)
const IncomeModal = ({
  incomeForm,
  incomeFormErrors = {},
  handleIncomeFormChange,
  projectName,
  incomeCategories = [],
  onSubmit,
  onClose,
  isEdit,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "income";
  const frequency = incomeForm.frequency || "lump_sum";
  const totalAmt = Number(incomeForm.totalProjectAmount || incomeForm.expectedAmount) || 0;
  const paidAmt = Number(incomeForm.totalPaid !== undefined ? incomeForm.totalPaid : incomeForm.amount) || 0;
  const isPaid = paidAmt >= totalAmt && totalAmt > 0;

  return (
    <ModalChrome
      maxWidth="max-w-2xl"
      title={isEdit ? "Edit Project Income" : "Add Project Income"}
      subtitle="Configure payment schedule: Lump Sum, Monthly, or Quarterly with automated recurring days & duration"
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
            loadingText={isEdit ? "Saving…" : "Adding…"}
            disabled={!incomeForm.title}
            className={`w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2 ${
              isEdit
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isEdit ? "Save Changes" : "Record Income"}
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className={fieldLabelClass}>Client Name</label>
          <input
            type="text"
            value={incomeForm.clientName}
            onChange={(e) => handleIncomeFormChange("clientName", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.clientName)}
            placeholder="e.g., Ethiopian Forestry Commission"
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Project Name</label>
          <input
            type="text"
            value={projectName || incomeForm.projectName || ""}
            disabled
            className="w-full px-3 py-2.5 border border-slate-200 bg-slate-100 rounded-lg text-sm text-slate-600 cursor-not-allowed"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Income Title / Milestone *</label>
          <input
            type="text"
            value={incomeForm.title}
            onChange={(e) => handleIncomeFormChange("title", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.title)}
            placeholder="e.g., GIS Mapping Phase 1"
            required
          />
          {incomeFormErrors.title && (
            <p className={fieldErrorClass}>{incomeFormErrors.title}</p>
          )}
        </div>

        {/* Schedule Type / Frequency */}
        <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Payment Plan / Schedule Type *
              </label>
              <p className="text-xs text-slate-500">
                Select whether payment will be collected as a lump sum or recurring monthly/quarterly installments
              </p>
            </div>
            <select
              value={incomeForm.frequency || "lump_sum"}
              onChange={(e) => handleIncomeFormChange("frequency", e.target.value)}
              disabled={isSaving}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* If Monthly or Quarterly: Show Day of Month and Duration in Months */}
          {frequency !== "lump_sum" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <label className={fieldLabelClass}>
                  {frequency === "monthly" ? "Day of the Month (1-31)" : "Day of Quarter"} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={incomeForm.recurringDay || "15"}
                  onChange={(e) => handleIncomeFormChange("recurringDay", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                  placeholder="e.g., 15"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Payment expected on day {incomeForm.recurringDay || 15}
                </p>
              </div>

              <div>
                <label className={fieldLabelClass}>Duration (Months) *</label>
                <select
                  value={incomeForm.durationMonths || "12"}
                  onChange={(e) => handleIncomeFormChange("durationMonths", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                >
                  <option value="3">3 Months (1 Quarter)</option>
                  <option value="6">6 Months (Half Year)</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Length of expected payments
                </p>
              </div>

              <div>
                <label className={fieldLabelClass}>Amount per {frequency === "monthly" ? "Month" : "Quarter"}</label>
                <input
                  type="number"
                  step="0.01"
                  value={incomeForm.installmentAmount || ""}
                  onChange={(e) => handleIncomeFormChange("installmentAmount", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                  placeholder="0.00"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ETB per installment cycle
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Total Project / Contract Amount (ETB) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={incomeForm.totalProjectAmount || incomeForm.expectedAmount}
            onChange={(e) => {
              handleIncomeFormChange("totalProjectAmount", e.target.value);
              handleIncomeFormChange("expectedAmount", e.target.value);
            }}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.expectedAmount)}
            placeholder="0.00"
            required
          />
          {incomeFormErrors.expectedAmount && (
            <p className={fieldErrorClass}>{incomeFormErrors.expectedAmount}</p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>Total Amount Paid so far (ETB)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={incomeForm.totalPaid !== undefined ? incomeForm.totalPaid : incomeForm.amount}
            onChange={(e) => {
              handleIncomeFormChange("totalPaid", e.target.value);
              handleIncomeFormChange("amount", e.target.value);
            }}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.amount)}
            placeholder="0.00"
          />
          {isPaid && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              ✓ Fully paid
            </p>
          )}
        </div>

        <div>
          <label className={fieldLabelClass}>
            {isPaid ? "Date Paid *" : "Received Date (if partially paid)"}
          </label>
          <input
            type="date"
            value={incomeForm.receivedDate}
            max={todayInputValue()}
            onChange={(e) =>
              handleIncomeFormChange("receivedDate", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.receivedDate)}
          />
        </div>

        <div>
          <label className={fieldLabelClass}>
            {frequency !== "lump_sum"
              ? "Next Expected Installment Date"
              : "Due / Expected Arrival Date *"}
          </label>
          <input
            type="date"
            value={incomeForm.nextPaymentDate || incomeForm.dueDate}
            onChange={(e) => {
              handleIncomeFormChange("nextPaymentDate", e.target.value);
              handleIncomeFormChange("dueDate", e.target.value);
            }}
            disabled={isSaving}
            className={fieldInputClass(!!incomeFormErrors.nextPaymentDate)}
          />
          <p className="text-[11px] text-slate-400 mt-0.5">
            Will automatically show as Pending, and turn Overdue when date passes
          </p>
        </div>

        <div>
          <label className={fieldLabelClass}>Collection Method</label>
          <select
            value={incomeForm.paymentMethod}
            onChange={(e) =>
              handleIncomeFormChange("paymentMethod", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>Invoice / Contract Number</label>
          <input
            type="text"
            value={incomeForm.invoiceNumber}
            onChange={(e) =>
              handleIncomeFormChange("invoiceNumber", e.target.value)
            }
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="INV-001"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={fieldLabelClass}>Notes / Payment Terms</label>
          <textarea
            value={incomeForm.notes}
            onChange={(e) => handleIncomeFormChange("notes", e.target.value)}
            disabled={isSaving}
            rows={2}
            className={fieldInputClass()}
            placeholder="e.g., Monthly installment of ETB 25,000 paid by the 15th of each month."
          />
        </div>
      </div>
    </ModalChrome>
  );
};

// Expected Income Quick Modal with Lump Sum / Monthly / Quarterly options
const ExpectedIncomeModal = ({
  expectedPaymentForm,
  setExpectedPaymentForm,
  expectedPaymentFormErrors = {},
  projectName,
  incomeCategories = [],
  onSubmit,
  onClose,
  actionLoading = null,
}) => {
  const isSaving = actionLoading === "expected";
  const frequency = expectedPaymentForm.frequency || "lump_sum";

  const handleExpectedChange = (field, value) => {
    setExpectedPaymentForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "totalProjectAmount" || field === "durationMonths" || field === "frequency") {
        const total = Number(field === "totalProjectAmount" ? value : next.totalProjectAmount) || 0;
        const dur = parseInt(field === "durationMonths" ? value : next.durationMonths, 10) || 12;
        const freq = field === "frequency" ? value : next.frequency;
        if (freq === "monthly" && dur > 0) {
          next.installmentAmount = (total / dur).toFixed(2);
          next.nextPaymentAmount = (total / dur).toFixed(2);
        } else if (freq === "quarterly" && dur > 0) {
          const quarters = Math.max(1, Math.round(dur / 3));
          next.installmentAmount = (total / quarters).toFixed(2);
          next.nextPaymentAmount = (total / quarters).toFixed(2);
        } else {
          next.installmentAmount = total ? total.toFixed(2) : "";
        }
      }
      return next;
    });
  };

  return (
    <ModalChrome
      maxWidth="max-w-xl"
      title="Schedule Expected Income"
      subtitle="Set Lump Sum, Monthly, or Quarterly payment schedule with arrival day and duration"
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
            loadingText="Scheduling…"
            disabled={
              !expectedPaymentForm.title ||
              !(expectedPaymentForm.totalProjectAmount || expectedPaymentForm.expectedAmount)
            }
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-sm transition-all duration-200 disabled:opacity-50 order-1 sm:order-2"
          >
            Schedule Income
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={fieldLabelClass}>Client Name</label>
          <input
            type="text"
            value={expectedPaymentForm.clientName}
            onChange={(e) => handleExpectedChange("clientName", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="Client or Organization Name"
          />
        </div>

        <div>
          <label className={fieldLabelClass}>Income Title / Milestone *</label>
          <input
            type="text"
            value={expectedPaymentForm.title}
            onChange={(e) => handleExpectedChange("title", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass(!!expectedPaymentFormErrors.title)}
            placeholder="e.g., Monthly Retainer or Milestone Deliverable"
            required
          />
          {expectedPaymentFormErrors.title && (
            <p className={fieldErrorClass}>
              {expectedPaymentFormErrors.title}
            </p>
          )}
        </div>

        {/* Schedule / Frequency */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-800">
                Payment Plan *
              </label>
              <p className="text-xs text-slate-500">
                Lump Sum, Monthly, or Quarterly
              </p>
            </div>
            <select
              value={expectedPaymentForm.frequency || "lump_sum"}
              onChange={(e) => handleExpectedChange("frequency", e.target.value)}
              disabled={isSaving}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {frequency !== "lump_sum" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
              <div>
                <label className={fieldLabelClass}>
                  {frequency === "monthly" ? "Day of Month" : "Day of Quarter"} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={expectedPaymentForm.recurringDay || "15"}
                  onChange={(e) => handleExpectedChange("recurringDay", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                  placeholder="15"
                />
              </div>

              <div>
                <label className={fieldLabelClass}>Duration (Months)</label>
                <select
                  value={expectedPaymentForm.durationMonths || "12"}
                  onChange={(e) => handleExpectedChange("durationMonths", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                </select>
              </div>

              <div>
                <label className={fieldLabelClass}>Per {frequency === "monthly" ? "Month" : "Quarter"}</label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedPaymentForm.installmentAmount || ""}
                  onChange={(e) => handleExpectedChange("installmentAmount", e.target.value)}
                  disabled={isSaving}
                  className={fieldInputClass()}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabelClass}>Total Project Amount (ETB) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={
                expectedPaymentForm.totalProjectAmount ||
                expectedPaymentForm.expectedAmount
              }
              onChange={(e) => {
                handleExpectedChange("totalProjectAmount", e.target.value);
                handleExpectedChange("expectedAmount", e.target.value);
              }}
              disabled={isSaving}
              className={fieldInputClass(
                !!expectedPaymentFormErrors.expectedAmount
              )}
              placeholder="0.00"
              required
            />
            {expectedPaymentFormErrors.expectedAmount && (
              <p className={fieldErrorClass}>
                {expectedPaymentFormErrors.expectedAmount}
              </p>
            )}
          </div>

          <div>
            <label className={fieldLabelClass}>First Payment / Due Date *</label>
            <input
              type="date"
              value={expectedPaymentForm.nextPaymentDate || expectedPaymentForm.dueDate}
              onChange={(e) => {
                handleExpectedChange("nextPaymentDate", e.target.value);
                handleExpectedChange("dueDate", e.target.value);
              }}
              disabled={isSaving}
              className={fieldInputClass()}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>Description / Milestone Details</label>
          <textarea
            rows={2}
            value={expectedPaymentForm.description}
            onChange={(e) => handleExpectedChange("description", e.target.value)}
            disabled={isSaving}
            className={fieldInputClass()}
            placeholder="Details about scheduled payments and milestone criteria…"
          />
        </div>
      </div>
    </ModalChrome>
  );
};

export default ProjectFinancialManagement;
