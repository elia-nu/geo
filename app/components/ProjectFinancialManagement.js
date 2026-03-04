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
import FinancialDashboard from "./FinancialDashboard";
import EntityManagement from "./EntityManagement";
import {
  validateBudgetForm,
  validateExpenseForm,
  validateAllocationForm,
  hasFormErrors,
} from "../utils/formValidation";
import {
  handleFormSubmission,
  projectToasts,
  showValidationErrors,
  showDeleteConfirmDialog,
  showWarningToast,
  showLoadingToast,
  closeDialog,
} from "../utils/sweetAlert";

const ProjectFinancialManagement = ({ projectId, projectName, project: projectProp }) => {
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
        return "bg-green-50 text-green-700 border-green-200";
      case "on_hold":
      case "pending":
      case "warning":
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
  const [budgetSectionLoading, setBudgetSectionLoading] = useState(false);
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
    dueDate: "",
    categoryId: "",
    description: "",
    notes: "",
    status: "pending",
  });

  const [editingIncomeId, setEditingIncomeId] = useState(null);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showExpectedPaymentModal, setShowExpectedPaymentModal] =
    useState(false);
  const [paymentDetailsIncome, setPaymentDetailsIncome] = useState(null);

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

  // Check allocation start/end dates against project dates; show warning toast if outside range
  const checkAllocationDatesAgainstProject = (allocationForm) => {
    const project = projectProp;
    if (!project?.startDate && !project?.endDate) return;
    const projectStart = project.startDate ? new Date(project.startDate) : null;
    const projectEnd = project.endDate ? new Date(project.endDate) : null;
    const allocStart = allocationForm.startDate ? new Date(allocationForm.startDate) : null;
    const allocEnd = allocationForm.endDate ? new Date(allocationForm.endDate) : null;
    if (!allocStart && !allocEnd) return;
    if (projectStart && allocStart && allocStart < projectStart) {
      showWarningToast(
        "Allocation date outside project",
        "Allocation start date is before project start date."
      );
    }
    if (projectEnd && allocEnd && allocEnd > projectEnd) {
      showWarningToast(
        "Allocation date outside project",
        "Allocation end date is after project end date."
      );
    }
    if (projectStart && allocEnd && allocEnd < projectStart) {
      showWarningToast(
        "Allocation date outside project",
        "Allocation end date is before project start date."
      );
    }
    if (projectEnd && allocStart && allocStart > projectEnd) {
      showWarningToast(
        "Allocation date outside project",
        "Allocation start date is after project end date."
      );
    }
  };

  const handleCreateBudget = async () => {
    // Validate form data
    const errors = validateBudgetForm(budgetForm);
    if (hasFormErrors(errors)) {
      setBudgetFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    // Clear any existing errors
    setBudgetFormErrors({});

    const submitFunction = async () => {
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
    };

    try {
      setBudgetSectionLoading(true);
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Creating Budget...",
        loadingText: "Please wait while we create your project budget",
        successTitle: "Budget Created!",
        successText: "Project budget has been created successfully",
        errorTitle: "Budget Error",
        errorText: "Failed to create budget. Please try again.",
      });

      // Update UI on success
      setShowBudgetModal(false);
      fetchFinancialData();
      resetBudgetForm();
    } catch (error) {
      console.error("Error creating budget:", error);
      // Error handling is done by handleFormSubmission
    } finally {
      setBudgetSectionLoading(false);
    }
  };

  const handleEditBudget = async () => {
    const submitFunction = async () => {
      const { approvedBy: _a, approvalDate: _b, ...rest } = budgetForm;
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update budget");
      }
      return data;
    };
    try {
      setBudgetSectionLoading(true);
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Updating budget...",
        loadingText: "Please wait while we update the budget",
        successTitle: "Budget updated",
        successText: "Project budget has been updated successfully",
        errorTitle: "Budget error",
        errorText: "Failed to update budget. Please try again.",
      });
      setShowEditBudgetModal(false);
      fetchFinancialData();
      resetBudgetForm();
    } catch (err) {
      // Error already shown by handleFormSubmission
    } finally {
      setBudgetSectionLoading(false);
    }
  };

  const handleOpenEditBudget = () => {
    if (budgetData) {
      setBudgetForm({
        totalAmount: budgetData.totalAmount || 0,
        currency: budgetData.currency || "ETB",
        description: budgetData.description || "",
        approvedBy: budgetData.approvedBy || "",
        approvalDate: budgetData.approvalDate
          ? budgetData.approvalDate.split("T")[0]
          : "",
        budgetAllocations: budgetData.allocations || [],
      });
      setShowEditBudgetModal(true);
    }
  };

  const handleAddExpense = async () => {
    // Validate form data
    const errors = validateExpenseForm(expenseForm);
    if (hasFormErrors(errors)) {
      setExpenseFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    // Clear any existing errors
    setExpenseFormErrors({});

    const submitFunction = async () => {
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
    };

    try {
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Adding Expense...",
        loadingText: "Please wait while we add your expense",
        successTitle: "Expense Added!",
        successText: "Expense has been added successfully",
        errorTitle: "Expense Error",
        errorText: "Failed to add expense. Please try again.",
      });

      // Update UI on success
      setShowExpenseModal(false);
      fetchFinancialData();
      resetExpenseForm();
    } catch (error) {
      console.error("Error adding expense:", error);
      // Error handling is done by handleFormSubmission
    }
  };

  const handleAddIncome = async () => {
    const submitFunction = async () => {
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
    };
    try {
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Adding income...",
        loadingText: "Please wait.",
        successTitle: "Income added",
        successText: "Income has been added successfully",
        errorTitle: "Error",
        errorText: "Failed to add income. Please try again.",
      });
      setShowIncomeModal(false);
      fetchFinancialData();
      resetIncomeForm();
    } catch (err) {
      // Error shown by handleFormSubmission
    }
  };

  const handleAddExpectedPayment = async () => {
    const payload = {
      title: expectedPaymentForm.title,
      expectedAmount: expectedPaymentForm.expectedAmount,
      clientName: expectedPaymentForm.clientName,
      dueDate: expectedPaymentForm.dueDate,
      categoryId: expectedPaymentForm.categoryId || undefined,
      description: expectedPaymentForm.description,
      notes: expectedPaymentForm.notes,
      status: expectedPaymentForm.status || "pending",
    };
    const submitFunction = async () => {
      const response = await fetch(`/api/projects/${projectId}/income`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to add expected payment");
      }
      return data;
    };
    try {
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Adding expected payment...",
        loadingText: "Please wait.",
        successTitle: "Expected payment added",
        successText: "Expected payment has been added successfully",
        errorTitle: "Error",
        errorText: "Failed to add expected payment. Please try again.",
      });
      setShowExpectedPaymentModal(false);
      fetchFinancialData();
      setExpectedPaymentForm({
        title: "",
        expectedAmount: "",
        clientName: "",
        dueDate: "",
        categoryId: "",
        description: "",
        notes: "",
        status: "pending",
      });
    } catch (err) {
      // Error shown by handleFormSubmission
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
    setShowIncomeModal(true);
  };

  const handleOpenPaymentDetails = (inc) => {
    setPaymentDetailsIncome(inc);
    setPaymentDetailsPopup(null);
  };

  const handleUpdateIncomeField = async (incomeId, field, value) => {
    if (!incomeId || !projectId) return;
    try {
      const payload = { [field]: value };
      const response = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (data.success) {
        setPaymentDetailsPopup(null);
        setPaymentDetailsIncome((prev) =>
          prev && prev._id === incomeId ? { ...prev, [field]: value } : prev
        );
        fetchFinancialData();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to update: " + err.message);
    }
  };

  const handleUpdateIncomeDetails = async (incomeId, details) => {
    if (!incomeId || !projectId) return;
    try {
      const response = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        }
      );
      const data = await response.json();
      if (data.success) {
        setPaymentDetailsIncome((prev) =>
          prev && prev._id === incomeId ? { ...prev, ...details } : prev
        );
        fetchFinancialData();
      } else {
        setError(data.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to update: " + err.message);
    }
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
    try {
      const response = await fetch(
        `/api/projects/${projectId}/income/${editingIncomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incomeForm),
        }
      );

      const data = await response.json();
      if (data.success) {
        setShowIncomeModal(false);
        setEditingIncomeId(null);
        fetchFinancialData();
        resetIncomeForm();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to update income: " + err.message);
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpenseId) return;

    // Validate form data
    const errors = validateExpenseForm(expenseForm);
    if (hasFormErrors(errors)) {
      setExpenseFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    // Clear any existing errors
    setExpenseFormErrors({});

    const submitFunction = async () => {
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
    };

    try {
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Updating Expense...",
        loadingText: "Please wait while we update your expense",
        successTitle: "Expense Updated!",
        successText: "Expense has been updated successfully",
        errorTitle: "Expense Error",
        errorText: "Failed to update expense. Please try again.",
      });

      // Update UI on success
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      fetchFinancialData();
      resetExpenseForm();
    } catch (error) {
      console.error("Error updating expense:", error);
      // Error handling is done by handleFormSubmission
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    const confirmed = await showDeleteConfirmDialog(
      "Delete Expense",
      "Are you sure you want to delete this expense? This action cannot be undone.",
      "Delete",
      "Cancel"
    );

    if (!confirmed) return;

    const submitFunction = async () => {
      const response = await fetch(
        `/api/projects/${projectId}/expenses/${expenseId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete expense");
      }

      return data;
    };

    try {
      await handleFormSubmission(submitFunction, {
        loadingTitle: "Deleting Expense...",
        loadingText: "Please wait while we delete the expense",
        successTitle: "Expense Deleted!",
        successText: "Expense has been deleted successfully",
        errorTitle: "Delete Error",
        errorText: "Failed to delete expense. Please try again.",
      });

      // Update UI on success
      fetchFinancialData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      // Error handling is done by handleFormSubmission
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (data.success) {
        fetchFinancialData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete income: " + err.message);
    }
  };

  const handleAddAllocation = async () => {
    // Validate form data
    const errors = validateAllocationForm(allocationForm);
    if (hasFormErrors(errors)) {
      setAllocationFormErrors(errors);
      showValidationErrors(errors);
      return;
    }

    // Clear any existing errors
    setAllocationFormErrors({});

    // Warn if allocation dates are outside project date range
    checkAllocationDatesAgainstProject(allocationForm);

    if (editingAllocationId) {
      // Update existing allocation
      await handleUpdateAllocation();
    } else {
      // Add new allocation (existing logic for budget creation)
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
      projectToasts.allocationAdded();
    }
  };

  const handleUpdateAllocation = async () => {
    // Warn if allocation dates are outside project date range
    checkAllocationDatesAgainstProject(allocationForm);

    try {
      setBudgetSectionLoading(true);
      showLoadingToast("Updating allocation...", "Please wait.");
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

      const body = {
        name: allocationForm.name,
        description: allocationForm.description,
        category: allocationForm.category,
        budgetedAmount: parseFloat(allocationForm.amount),
        startDate: allocationForm.startDate || "",
        endDate: allocationForm.endDate || "",
        allocationType: inferredType,
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
      closeDialog();
      if (data.success) {
        setShowAllocationModal(false);
        setShowAllocationEditModal(false);
        setEditingAllocationId(null);
        resetAllocationForm();
        fetchFinancialData(); // Refresh the budget data
        projectToasts.allocationUpdated();
      } else {
        projectToasts.allocationError(data.error);
      }
    } catch (err) {
      closeDialog();
      projectToasts.allocationError(err.message);
      setError("Failed to update allocation: " + err.message);
    } finally {
      setBudgetSectionLoading(false);
    }
  };

  const handleEditAllocation = async (allocation) => {
    try {
      // Set the allocation form with current allocation data
      setAllocationForm({
        name: allocation.name || "",
        description: allocation.description || "",
        category: allocation.category || "",
        amount: (
          allocation.amount ??
          allocation.budgetedAmount ??
          0
        ).toString(),
        departmentId: allocation.departmentId || "",
        taskId: allocation.taskId || "",
        activityId: allocation.activityId || "",
        milestoneId: allocation.milestoneId || "",
        startDate: allocation.startDate
          ? new Date(allocation.startDate).toISOString().split("T")[0]
          : "",
        endDate: allocation.endDate
          ? new Date(allocation.endDate).toISOString().split("T")[0]
          : "",
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

      // Store the allocation ID for updating
      setEditingAllocationId(allocation._id);
      setShowAllocationEditModal(true);
    } catch (err) {
      setError("Failed to edit allocation: " + err.message);
    }
  };

  const handleDeleteAllocation = async (allocationId) => {
    const result = await showDeleteConfirmDialog(
      "Delete allocation",
      "Are you sure you want to delete this allocation? This action cannot be undone.",
      "Yes, delete it"
    );
    if (!result.isConfirmed) return;

    try {
      setBudgetSectionLoading(true);
      showLoadingToast("Deleting allocation...", "Please wait.");
      const response = await fetch(
        `/api/projects/${projectId}/budget/allocations/${allocationId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      closeDialog();
      if (data.success) {
        fetchFinancialData(); // Refresh the budget data
        projectToasts.allocationDeleted();
      } else {
        projectToasts.allocationError(data.error);
      }
    } catch (err) {
      closeDialog();
      projectToasts.allocationError(err.message);
      setError("Failed to delete allocation: " + err.message);
    } finally {
      setBudgetSectionLoading(false);
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
    if (budgetFormErrors[field]) {
      setBudgetFormErrors((prev) => ({
        ...prev,
        [field]: "",
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

  const formatCurrency = (amount, currency = "ETB") => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
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
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
              Financial Management
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">{projectName}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {!budgetData ? (
              <button
                onClick={() => setShowBudgetModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Create Budget</span>
                <span className="xs:hidden">Budget</span>
              </button>
            ) : (
              <button
                onClick={handleOpenEditBudget}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Edit Budget</span>
                <span className="xs:hidden">Budget</span>
              </button>
            )}

            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Add Expense</span>
              <span className="xs:hidden">Expense</span>
            </button>
            {/*}
            <button
              onClick={() => setShowIncomeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Add Income</span>
              <span className="xs:hidden">Income</span>
            </button>*/}

            <button
              onClick={() => setShowExpectedPaymentModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Add Expected Payment</span>
              <span className="xs:hidden">Expected Payment</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 text-sm sm:text-base">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="flex overflow-x-auto scrollbar-hide space-x-2 sm:space-x-8 pb-2 sm:pb-0">
          {[
            { id: "overview", name: "Overview", icon: ChartBarIcon },
            {
              id: "dashboard",
              name: "Financial Dashboard",
              shortName: "Dashboard",
              icon: ChartBarIcon,
            },
            {
              id: "entities",
              name: "Entity Management",
              shortName: "Entities",
              icon: BuildingOfficeIcon,
            },
            {
              id: "budget",
              name: "Budget & Allocations",
              shortName: "Budget",
              icon: CurrencyDollarIcon,
            },
            { id: "expenses", name: "Expenses", icon: DocumentTextIcon },
            {
              id: "income",
              name: "Income & Payments",
              shortName: "Income",
              icon: ArrowTrendingUpIcon,
            },
            {
              id: "reports",
              name: "Reports & Analytics",
              shortName: "Reports",
              icon: EyeIcon,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors whitespace-normal break-words flex-shrink-0 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.shortName || tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Expected Payment Modal */}
      {showExpectedPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Expected Payment
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={expectedPaymentForm.title}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Phase 1 Payment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expectedPaymentForm.expectedAmount}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, expectedAmount: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={expectedPaymentForm.categoryId}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, categoryId: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {incomeCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client name
                </label>
                <input
                  type="text"
                  value={expectedPaymentForm.clientName}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, clientName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due date
                </label>
                <input
                  type="date"
                  value={expectedPaymentForm.dueDate}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={expectedPaymentForm.description}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the payment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={expectedPaymentForm.notes}
                  onChange={(e) =>
                    setExpectedPaymentForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowExpectedPaymentModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddExpectedPayment}
                disabled={
                  !expectedPaymentForm.title || !expectedPaymentForm.expectedAmount
                }
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Expected Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income Payment Details Modal (set when paid, payment method, status, etc.) */}
      {paymentDetailsIncome && (
        <IncomePaymentDetailsModal
          income={paymentDetailsIncome}
          incomeCategories={incomeCategories}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onClose={() => setPaymentDetailsIncome(null)}
          onSave={handleUpdateIncomeDetails}
        />
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
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onCreateBudget={() => setShowBudgetModal(true)}
            handleEditAllocation={handleEditAllocation}
            handleDeleteAllocation={handleDeleteAllocation}
            budgetSectionLoading={budgetSectionLoading}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expenses={expenses}
            budgetData={budgetData}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onEditExpense={handleOpenEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {activeTab === "income" && (
          <IncomeTab
            income={income}
            incomeCategories={incomeCategories}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
            formatDate={formatDate}
            onEditIncome={handleOpenEditIncome}
            onDeleteIncome={handleDeleteIncome}
            onOpenPaymentDetails={handleOpenPaymentDetails}
          />
        )}

        {activeTab === "reports" && (
          <ReportsTab
            projectId={projectId}
            financialReports={financialReports}
            formatCurrency={formatCurrency}
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
        />
      )}

      {showIncomeModal && (
        <IncomeModal
          incomeForm={incomeForm}
          setIncomeForm={setIncomeForm}
          onSubmit={editingIncomeId ? handleEditIncome : handleAddIncome}
          onClose={() => {
            setShowIncomeModal(false);
            setEditingIncomeId(null);
          }}
          incomeCategories={incomeCategories}
          isEdit={!!editingIncomeId}
        />
      )}

      {showAllocationEditModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h4 className="text-base sm:text-lg font-semibold text-black">
                Edit Budget Allocation
              </h4>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={allocationForm.category}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="general"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={allocationForm.startDate || ""}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={allocationForm.endDate || ""}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Allocation type display and targeted selector */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Allocation Type
                </label>
                <div className="inline-flex items-center px-2 py-1 rounded border text-xs bg-gray-50 text-gray-700">
                  {allocationForm.allocationType?.charAt(0).toUpperCase() +
                    allocationForm.allocationType?.slice(1)}
                </div>
              </div>

              {allocationForm.allocationType === "department" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  {Array.isArray(departments) && departments.length > 0 ? (
                    <select
                      value={allocationForm.departmentId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          departmentId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          {d.name || d.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={allocationForm.departmentId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          departmentId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  )}
                </div>
              )}

              {allocationForm.allocationType === "task" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Task
                  </label>
                  {Array.isArray(tasks) && tasks.length > 0 ? (
                    <select
                      value={allocationForm.taskId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          taskId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="">Select task</option>
                      {tasks.map((t) => (
                        <option key={t._id || t.id} value={t._id || t.id}>
                          {t.name || t.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={allocationForm.taskId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          taskId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  )}
                </div>
              )}

              {allocationForm.allocationType === "activity" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Activity
                  </label>
                  {Array.isArray(activities) && activities.length > 0 ? (
                    <select
                      value={allocationForm.activityId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          activityId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="">Select activity</option>
                      {activities.map((a) => (
                        <option key={a._id || a.id} value={a._id || a.id}>
                          {a.name || a.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={allocationForm.activityId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          activityId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  )}
                </div>
              )}

              {allocationForm.allocationType === "milestone" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Milestone
                  </label>
                  {Array.isArray(milestones) && milestones.length > 0 ? (
                    <select
                      value={allocationForm.milestoneId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          milestoneId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    >
                      <option value="">Select milestone</option>
                      {milestones.map((m) => (
                        <option key={m._id || m.id} value={m._id || m.id}>
                          {m.name || m.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={allocationForm.milestoneId || ""}
                      onChange={(e) =>
                        setAllocationForm((prev) => ({
                          ...prev,
                          milestoneId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  )}
                </div>
              )}

              {allocationForm.allocationType === "general" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Allocation Scope
                  </label>
                  <input
                    type="text"
                    value="General"
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-md text-sm text-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAllocationEditModal(false)}
                className="px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAllocation}
                disabled={!allocationForm.name || !allocationForm.amount}
                className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Total Budget
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Total Expenses
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
              <ArrowTrendingDownIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Total Income
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
              <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>
        {/*
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">
                Profit/Loss
              </p>
              <p
                className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                  profitLoss >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(profitLoss)}
              </p>
            </div>
            <div
              className={`p-2 sm:p-3 rounded-lg ${
                profitLoss >= 0 ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {profitLoss >= 0 ? (
                <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>*/}
      </div>

      {/* Budget Utilization */}
      {totalBudget > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-black">
              Budget Utilization
            </h3>
            <span
              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border w-fit ${getStatusColor(
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
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 mb-2">
            <div
              className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                budgetUtilization > 100
                  ? "bg-red-500"
                  : budgetUtilization > 90
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            ></div>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-gray-600">
            <span>Spent: {formatCurrency(totalExpenses)}</span>
            <span>
              Remaining:{" "}
              {formatCurrency(Math.max(0, totalBudget - totalExpenses))}
            </span>
          </div>

          {/* Budget Overrun Warning */}
          {budgetUtilization > 100 && (
            <div className="mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                <span className="text-xs sm:text-sm font-medium text-red-800">
                  Budget Overrun Alert
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-700 mt-1">
                Project is {formatCurrency(totalExpenses - totalBudget)} over
                budget ({(budgetUtilization - 100).toFixed(1)}% overrun)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Budget Alerts */}
      {budgetData?.alerts && budgetData.alerts.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">
            Budget Alerts & Notifications
          </h3>
          <div className="space-y-3">
            {budgetData.alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 sm:p-4 rounded-lg border-l-4 ${
                  alert.severity === "high"
                    ? "bg-red-50 border-red-400"
                    : alert.severity === "medium"
                    ? "bg-yellow-50 border-yellow-400"
                    : "bg-blue-50 border-blue-400"
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0">
                    {alert.severity === "high" ? (
                      <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    ) : alert.severity === "medium" ? (
                      <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium ${
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
                      className={`text-xs sm:text-sm ${
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
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-black mb-3 sm:mb-4">
            Budget Allocations
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {budgetData.allocations.map((allocation) => (
              <div
                key={allocation._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3 sm:gap-0"
              >
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-medium text-black">
                    {allocation.name || allocation.category}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                    <span className="text-xs sm:text-sm text-gray-600">
                      Budget: {formatCurrency(allocation.budgetedAmount)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600">
                      Spent: {formatCurrency(allocation.spentAmount)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                        allocation.status
                      )} self-start sm:self-auto`}
                    >
                      {allocation.utilization?.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-24 bg-gray-200 rounded-full h-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Expenses */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-black">
              Recent Expenses
            </h3>
            <span className="text-xs sm:text-sm text-gray-500">
              {expenses.length} total
            </span>
          </div>
          <div className="space-y-3">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0"
              >
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-medium text-black">
                    {expense.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {expense.category} • {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm sm:text-base font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      expense.status
                    )} inline-block mt-1 sm:mt-0`}
                  >
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Income */}
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-black">
              Recent Income
            </h3>
            <span className="text-xs sm:text-sm text-gray-500">
              {income.length} total
            </span>
          </div>
          <div className="space-y-3">
            {income.slice(0, 5).map((inc) => (
              <div
                key={inc._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-2 sm:gap-0"
              >
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-medium text-black">
                    {inc.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {inc.clientName} • {formatDate(inc.receivedDate)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm sm:text-base font-semibold text-green-600">
                    {formatCurrency(inc.amount)}
                  </p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      inc.status
                    )} inline-block mt-1 sm:mt-0`}
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
  onCreateBudget,
  handleEditAllocation,
  handleDeleteAllocation,
  budgetSectionLoading,
}) => {
  const [activeView, setActiveView] = useState("summary");
  const allocations = budgetData?.allocations || [];
  const summary = budgetData?.summary || {};
  const metrics = budgetData?.metrics || {};
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + (allocation.budgetedAmount || 0),
    0
  );
  const totalSpent = allocations.reduce(
    (sum, allocation) => sum + (allocation.spentAmount || 0),
    0
  );
  const totalRemaining = allocations.reduce(
    (sum, allocation) => sum + (allocation.remainingAmount || 0),
    0
  );

  if (!budgetData) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <CurrencyDollarIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-black mb-2">
          No Budget Created
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Create a budget to start managing your project finances.
        </p>
        <button
          onClick={onCreateBudget}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          Create Budget
        </button>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 sm:space-y-6">
      {budgetSectionLoading && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-lg min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )}
      {/* Local tabs to separate Budget vs Allocations */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-black">
            Budget Management
          </h3>
          <p className="text-xs sm:text-sm text-gray-600">
            Switch between the high-level budget and the detailed allocation
            breakdown.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-gray-100 p-1 self-start">
          <button
            type="button"
            onClick={() => setActiveView("summary")}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
              activeView === "summary"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Budget
          </button>
          <button
            type="button"
            onClick={() => setActiveView("allocations")}
            className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
              activeView === "allocations"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Allocations
          </button>
        </div>
      </div>

      {/* Budget view */}
      {activeView === "summary" && (
        <div className="space-y-4 sm:space-y-6">
          {/* Top-level budget + allocation cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Budget card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    Budget
                  </p>
                  <h4 className="text-sm sm:text-base font-semibold text-black">
                    Project Budget Overview
                  </h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
                  {budgetData.currency || "ETB"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Budget
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-black">
                    {formatCurrency(budgetData.totalAmount, budgetData.currency)}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Remaining:{" "}
                    <span className="font-medium text-green-700">
                      {formatCurrency(
                        summary.remainingBudget ?? totalRemaining,
                        budgetData.currency
                      )}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Utilization
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            (summary.budgetUtilization || 0) > 100
                              ? "bg-red-500"
                              : (summary.budgetUtilization || 0) > 90
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              summary.budgetUtilization || 0,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-gray-800">
                        {(summary.budgetUtilization || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Profit / Loss
                    </p>
                    <p
                      className={`text-sm sm:text-base font-semibold ${
                        (summary.profitLoss || 0) >= 0
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(summary.profitLoss || 0, budgetData.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {budgetData.description && (
                <div className="mt-3 sm:mt-4 border-t border-gray-100 pt-3 sm:pt-4">
                  <p className="text-xs sm:text-sm text-gray-600">Description</p>
                  <p className="text-sm sm:text-base text-black">
                    {budgetData.description}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-gray-500">
                  Last updated:{" "}
                  {budgetData.updatedAt
                    ? `${budgetData.approvedBy || "—"} · ${formatDate(
                        budgetData.updatedAt
                      )}`
                    : budgetData.approvedBy
                    ? `${budgetData.approvedBy}`
                    : "—"}
                </p>
                <button
                  type="button"
                  onClick={onCreateBudget}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <PencilIcon className="h-4 w-4" />
                  {budgetData ? "Adjust Budget & Allocations" : "Create Budget"}
                </button>
              </div>
            </div>

            {/* Budget allocation card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    Budget Allocation
                  </p>
                  <h4 className="text-sm sm:text-base font-semibold text-black">
                    Allocation Summary
                  </h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-[11px] font-medium text-purple-700">
                  {metrics.totalAllocations || allocations.length} allocations
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Allocated
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-blue-700">
                    {formatCurrency(totalAllocated, budgetData.currency)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Overrun Allocations
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-red-600">
                    {metrics.overrunAllocations || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Avg. Utilization
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">
                    {(metrics.averageUtilization || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {metrics.highestUtilization !== undefined && (
                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Highest utilization
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {metrics.highestUtilization.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Lowest utilization
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {metrics.lowestUtilization.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-3 text-[11px] text-gray-500">
                Switch to the Allocations view to manage individual allocation
                lines and see detailed utilization per category.
              </p>
            </div>
          </div>

          {/* Budget management audit log (high-level activity) */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-sm sm:text-base font-semibold text-black mb-3 sm:mb-4">
              Budget Management Activity
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
              {budgetData.createdAt && (
                <li>
                  <span className="font-semibold text-gray-900">Budget created:</span>{" "}
                  {formatDate(budgetData.createdAt)}
                </li>
              )}
              {budgetData.updatedAt && (
                <li>
                  <span className="font-semibold text-gray-900">Last updated:</span>{" "}
                  {formatDate(budgetData.updatedAt)}{" "}
                  {budgetData.approvedBy && `by ${budgetData.approvedBy}`}
                </li>
              )}
              <li>
                <span className="font-semibold text-gray-900">
                  Total budget changes logged:
                </span>{" "}
                {/* This uses metrics / allocations as a proxy since audit entries are stored server-side */}
                {(metrics.totalAllocations || allocations.length) +
                  (metrics.overrunAllocations || 0)}
              </li>
              {!budgetData.createdAt && !budgetData.updatedAt && (
                <li className="text-gray-500">
                  Detailed audit entries are recorded server-side and can be
                  surfaced here when needed.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Allocations view */}
      {activeView === "allocations" && (
        <>
          {allocations.length === 0 ? (
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-dashed border-gray-300 text-center">
              <h4 className="text-sm sm:text-base font-semibold text-black mb-2">
                No allocations defined
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Use the budget editor to add allocations and distribute your
                total budget across categories.
              </p>
              <button
                type="button"
                onClick={onCreateBudget}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4" />
                Add Allocations
              </button>
            </div>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-black">
                    Budget Allocations
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Track how your budget is distributed and utilized across key
                    categories.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 self-start">
                  {allocations.length} allocation
                  {allocations.length === 1 ? "" : "s"}
                </span>
              </div>

              {/* Mobile-friendly budget-style cards */}
              <div className="space-y-3 sm:space-y-4 lg:hidden">
                {allocations.map((allocation) => (
                  <div
                    key={allocation._id}
                    className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-blue-50/60 p-3 sm:p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500">
                          Budget Allocation
                        </div>
                        <div className="text-sm font-semibold text-black">
                          {allocation.name || "Unnamed"}
                        </div>
                        {allocation.description && (
                          <div className="text-xs text-gray-600 line-clamp-2">
                            {allocation.description}
                          </div>
                        )}
                      </div>
                      {allocation.status && (
                        <span
                          className={`px-2 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full border ${getStatusColor(
                            allocation.status
                          )}`}
                        >
                          {allocation.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {allocation.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                          {allocation.category}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[11px] text-gray-500">Budget</p>
                        <p className="text-xs font-semibold text-blue-800">
                          {formatCurrency(allocation.budgetedAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Spent</p>
                        <p className="text-xs font-semibold text-red-600">
                          {formatCurrency(allocation.spentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Remaining</p>
                        <p className="text-xs font-semibold text-green-700">
                          {formatCurrency(allocation.remainingAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] text-gray-500">Utilization</p>
                        <span className="text-[11px] text-black">
                          {allocation.utilization?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
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
                        ></div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => handleEditAllocation(allocation)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <PencilIcon className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAllocation(allocation._id)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto mt-3">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Allocation
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budget
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spent
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilization
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allocations.map((allocation) => (
                      <tr key={allocation._id}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-black">
                            {allocation.name || "Unnamed"}
                          </div>
                          {allocation.description && (
                            <div className="text-xs sm:text-sm text-gray-500">
                              {allocation.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {allocation.category && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {allocation.category}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-black">
                          {formatCurrency(allocation.budgetedAmount)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-red-600">
                          {formatCurrency(allocation.spentAmount)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-black">
                          {formatCurrency(allocation.remainingAmount)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-2 mr-1 sm:mr-2">
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
                            <span className="text-xs sm:text-sm text-black">
                              {allocation.utilization?.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          {allocation.status && (
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                                allocation.status
                              )}`}
                            >
                              {allocation.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              onClick={() => handleEditAllocation(allocation)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                              title="Edit Allocation"
                            >
                              <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAllocation(allocation._id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                              title="Delete Allocation"
                            >
                              <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
  onEditExpense,
  onDeleteExpense,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Expenses Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Total Expenses</p>
          <p className="text-lg sm:text-xl font-bold text-red-600">
            {formatCurrency(
              expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Approved</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {formatCurrency(
              expenses
                .filter((exp) => exp.status === "approved")
                .reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Pending</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-600">
            {formatCurrency(
              expenses
                .filter((exp) => exp.status === "pending")
                .reduce((sum, exp) => sum + (exp.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Total Count</p>
          <p className="text-lg sm:text-xl font-bold text-black">
            {expenses.length}
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            All Expenses
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium text-black">
                      {expense.title}
                    </div>
                    {expense.description && (
                      <div className="text-xs sm:text-sm text-gray-500">
                        {expense.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-black">
                    {formatDate(expense.expenseDate)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-black">
                    {expense.vendor || "Not specified"}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                        expense.status
                      )}`}
                    >
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => onEditExpense(expense)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Expense"
                      >
                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(expense._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Expense"
                      >
                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
const IncomeTab = ({
  income,
  incomeCategories = [],
  formatCurrency,
  getStatusColor,
  formatDate,
  onEditIncome,
  onDeleteIncome,
  onOpenPaymentDetails,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Income Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Total Income</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {formatCurrency(
              income.reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Collected</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">
            {formatCurrency(
              income
                .filter((inc) => inc.status === "collected")
                .reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Pending</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-600">
            {formatCurrency(
              income
                .filter((inc) => inc.status === "pending")
                .reduce((sum, inc) => sum + (inc.amount || 0), 0)
            )}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
          <p className="text-xs sm:text-sm text-gray-600">Total Count</p>
          <p className="text-lg sm:text-xl font-bold text-black">
            {income.length}
          </p>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            All Income & Payments
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected / Received
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {income.map((inc) => (
                <tr key={inc._id}>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium text-black">
                      {inc.title}
                    </div>
                    {inc.invoiceNumber && (
                      <div className="text-xs sm:text-sm text-gray-500">
                        Invoice: {inc.invoiceNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(inc.expectedAmount ?? 0)}
                    </span>
                    <span className="text-gray-500"> / </span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(inc.amount ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm text-black">
                      {inc.clientName || "Not specified"}
                    </div>
                    {inc.clientEmail && (
                      <div className="text-xs sm:text-sm text-gray-500">
                        {inc.clientEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {inc.paymentMethod?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-black">
                    {formatDate(inc.receivedDate)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {onOpenPaymentDetails && (
                        <button
                          onClick={() => onOpenPaymentDetails(inc)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Set payment details (when paid, method, status, invoice, etc.)"
                        >
                          <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEditIncome && onEditIncome(inc)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit income"
                      >
                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() =>
                          onDeleteIncome && onDeleteIncome(inc._id)
                        }
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
const ReportsTab = ({
  projectId,
  financialReports,
  formatCurrency,
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
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-black mb-4">
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
            /* {
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
            },*/
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
            <h3 className="text-lg font-semibold text-black">
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

          {/* Add more report type renderings as needed */}
        </div>
      ) : (
        <div className="text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-black mb-2">
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
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            {isEdit ? "Edit Project Budget" : "Create Project Budget"}
          </h3>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Budget Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Budget Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={budgetForm.totalAmount}
                onChange={(e) =>
                  handleBudgetFormChange("totalAmount", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  budgetFormErrors.totalAmount
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="0.00"
                required
              />
              {budgetFormErrors.totalAmount && (
                <p className="text-xs text-red-600 mt-1">
                  {budgetFormErrors.totalAmount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={budgetForm.currency}
                onChange={(e) =>
                  handleBudgetFormChange("currency", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  budgetFormErrors.currency
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
              </select>
              {budgetFormErrors.currency && (
                <p className="text-xs text-red-600 mt-1">
                  {budgetFormErrors.currency}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={budgetForm.description}
              onChange={(e) =>
                handleBudgetFormChange("description", e.target.value)
              }
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                budgetFormErrors.description
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              placeholder="Budget description..."
            />
            {budgetFormErrors.description && (
              <p className="text-xs text-red-600 mt-1">
                {budgetFormErrors.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={() => setShowBudgetModal(false)}
            className="px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateBudget}
            disabled={!budgetForm.totalAmount}
            className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {isEdit ? "Update Budget" : "Create Budget"}
          </button>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocationModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h4 className="text-base sm:text-lg font-semibold text-black">
                Add Budget Allocation
              </h4>
            </div>

            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Allocation Name *
                </label>
                <input
                  type="text"
                  value={allocationForm.name}
                  onChange={(e) =>
                    handleAllocationFormChange("name", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                    allocationFormErrors.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="e.g., Development Team"
                  required
                />
                {allocationFormErrors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {allocationFormErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={allocationForm.categoryId}
                  onChange={(e) =>
                    setAllocationForm((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={allocationForm.amount}
                  onChange={(e) =>
                    handleAllocationFormChange("amount", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                    allocationFormErrors.amount
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="0.00"
                  required
                />
                {allocationFormErrors.amount && (
                  <p className="text-xs text-red-600 mt-1">
                    {allocationFormErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Allocation Type (Optional)
                </label>
                <select
                  value={allocationForm.allocationType}
                  onChange={(e) =>
                    handleAllocationFormChange("allocationType", e.target.value)
                  }
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                    allocationFormErrors.allocationType
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                >
                  <option value="">Select Type (Optional)</option>
                  <option value="general">General</option>
                  <option value="department">Department</option>
                  <option value="task">Task</option>
                  <option value="activity">Activity</option>
                  <option value="milestone">Milestone</option>
                </select>
                {allocationFormErrors.allocationType && (
                  <p className="text-xs text-red-600 mt-1">
                    {allocationFormErrors.allocationType}
                  </p>
                )}
              </div>

              {/* Dynamic Entity Selection */}
              {allocationForm.allocationType === "department" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    value={allocationForm.departmentId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        departmentId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      No departments found. Create departments first.
                    </p>
                  )}
                </div>
              )}

              {allocationForm.allocationType === "task" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Task *
                  </label>
                  <select
                    value={allocationForm.taskId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        taskId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select Task</option>
                    {tasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.title || task.name || "Untitled"}
                      </option>
                    ))}
                  </select>
                  {tasks.length === 0 && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      No tasks found. Create tasks first.
                    </p>
                  )}
                </div>
              )}

              {allocationForm.allocationType === "activity" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Activity *
                  </label>
                  <select
                    value={allocationForm.activityId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        activityId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select Activity</option>
                    {activities.map((activity) => (
                      <option key={activity._id} value={activity._id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                  {activities.length === 0 && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      No activities found. Create activities first.
                    </p>
                  )}
                </div>
              )}

              {allocationForm.allocationType === "milestone" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Milestone *
                  </label>
                  <select
                    value={allocationForm.milestoneId}
                    onChange={(e) =>
                      setAllocationForm((prev) => ({
                        ...prev,
                        milestoneId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select Milestone</option>
                    {milestones.map((milestone) => (
                      <option key={milestone._id} value={milestone._id}>
                        {milestone.title || milestone.name || "Untitled"}
                      </option>
                    ))}
                  </select>
                  {milestones.length === 0 && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      No milestones found. Create milestones first.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Allocation description..."
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAllocationModal(false);
                  resetAllocationForm();
                }}
                className="px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAllocation}
                disabled={!allocationForm.name || !allocationForm.amount}
                className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
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
  expenseFormErrors,
  handleExpenseFormChange,
  budgetData,
  budgetAllocationCategories,
  onSubmit,
  setShowExpenseModal,
  setEditingExpenseId,
  resetExpenseForm,
  isEdit = false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            {isEdit ? "Edit Expense" : "Add New Expense"}
          </h3>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Expense Title *
              </label>
              <input
                type="text"
                value={expenseForm.title}
                onChange={(e) =>
                  handleExpenseFormChange("title", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                  expenseFormErrors.title
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="e.g., Office Supplies"
                required
              />
              {expenseFormErrors.title && (
                <p className="text-xs text-red-600 mt-1">
                  {expenseFormErrors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) =>
                  handleExpenseFormChange("amount", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                  expenseFormErrors.amount
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="0.00"
                required
              />
              {expenseFormErrors.amount && (
                <p className="text-xs text-red-600 mt-1">
                  {expenseFormErrors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={expenseForm.categoryId}
                onChange={(e) =>
                  handleExpenseFormChange("categoryId", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                  expenseFormErrors.categoryId
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Select Category</option>
                {budgetAllocationCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {expenseFormErrors.category && (
                <p className="text-xs text-red-600 mt-1">
                  {expenseFormErrors.category}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) =>
                  handleExpenseFormChange("expenseDate", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                  expenseFormErrors.expenseDate
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              {expenseFormErrors.expenseDate && (
                <p className="text-xs text-red-600 mt-1">
                  {expenseFormErrors.expenseDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Vendor name"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="https://..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) =>
                  handleExpenseFormChange("description", e.target.value)
                }
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm ${
                  expenseFormErrors.description
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="Expense description..."
              />
              {expenseFormErrors.description && (
                <p className="text-xs text-red-600 mt-1">
                  {expenseFormErrors.description}
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="sm:col-span-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  Tags
                </label>
                <button
                  type="button"
                  onClick={addTag}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 self-start sm:self-auto"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Tag name"
                    />
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={() => {
              setShowExpenseModal(false);
              if (isEdit) {
                setEditingExpenseId(null);
              }
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!expenseForm.title || !expenseForm.amount}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
          >
            {isEdit ? "Update Expense" : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Income Payment Details Modal – normal form: read-only summary + editable fields + Save
const IncomePaymentDetailsModal = ({
  income,
  incomeCategories,
  formatCurrency,
  formatDate,
  onClose,
  onSave,
}) => {
  const getCategoryName = (categoryId) => {
    if (!categoryId) return "—";
    const cat = incomeCategories.find((c) => c._id === categoryId);
    return cat ? cat.name : "—";
  };

  const [form, setForm] = useState(() => ({
    amount:
      income.amount != null && income.amount !== ""
        ? String(income.amount)
        : income.expectedAmount != null
          ? String(income.expectedAmount)
          : "",
    paymentMethod: income.paymentMethod || "bank_transfer",
    status: income.status || "pending",
    receivedDate: income.receivedDate
      ? new Date(income.receivedDate).toISOString().split("T")[0]
      : "",
    invoiceNumber: income.invoiceNumber || "",
    paymentReference: income.paymentReference || "",
    notes: income.notes || "",
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      amount:
        income.amount != null && income.amount !== ""
          ? String(income.amount)
          : income.expectedAmount != null
            ? String(income.expectedAmount)
            : "",
      paymentMethod: income.paymentMethod || "bank_transfer",
      status: income.status || "pending",
      receivedDate: income.receivedDate
        ? new Date(income.receivedDate).toISOString().split("T")[0]
        : "",
      invoiceNumber: income.invoiceNumber || "",
      paymentReference: income.paymentReference || "",
      notes: income.notes || "",
    });
  }, [income._id, income.amount, income.expectedAmount]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const expected = parseFloat(income.expectedAmount);
      if (field === "amount" && value !== "" && !Number.isNaN(parseFloat(value)) && parseFloat(value) >= expected) {
        next.status = "collected";
      }
      if (field === "receivedDate" && value) {
        next.status = "collected";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const amountNum = form.amount ? parseFloat(form.amount) : undefined;
      await onSave(income._id, {
        ...(amountNum != null && !Number.isNaN(amountNum) && amountNum > 0 && { amount: amountNum }),
        paymentMethod: form.paymentMethod,
        status: form.status,
        receivedDate: form.receivedDate || undefined,
        invoiceNumber: form.invoiceNumber,
        paymentReference: form.paymentReference,
        notes: form.notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Payment details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-500 mb-3">
              Income (read-only)
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Income name</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{income.title || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Expected amount</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatCurrency(income.expectedAmount ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Received amount</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {formatCurrency(income.amount ?? 0)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{getCategoryName(income.categoryId)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Client name</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{income.clientName || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Due date</dt>
                <dd className="font-medium text-gray-900 mt-0.5">
                  {income.dueDate ? formatDate(income.dueDate) : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Payment information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={String(income.expectedAmount ?? "")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleChange("amount", String(income.expectedAmount ?? ""))
                    }
                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 whitespace-nowrap"
                  >
                    Set to expected
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Expected: {formatCurrency(income.expectedAmount ?? 0)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => handleChange("paymentMethod", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="collected">Collected</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received date
                </label>
                <input
                  type="date"
                  value={form.receivedDate}
                  onChange={(e) => handleChange("receivedDate", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice number
                </label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. INV-001"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment reference
                </label>
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) => handleChange("paymentReference", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction ID or reference"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Income Modal Component
const IncomeModal = ({
  incomeForm,
  setIncomeForm,
  incomeCategories,
  onSubmit,
  onClose,
  isEdit,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-black">
            {isEdit ? "Edit Income/Payment" : "Add New Income/Payment"}
          </h3>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Income Title *
              </label>
              <input
                type="text"
                value={incomeForm.title}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Project Payment - Phase 1"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0.00"
                required={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={incomeForm.categoryId}
                onChange={(e) =>
                  setIncomeForm((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="0.00"
                required={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Client name"
                required={isEdit}
              />
            </div>

            {/* Client Email removed per requirement */}

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={incomeForm.status}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required={isEdit}
              >
                <option value="pending">Pending</option>
                <option value="collected">Collected</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="INV-001"
                required={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Transaction ID or reference"
                required={isEdit}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Income description..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={incomeForm.notes}
                onChange={(e) =>
                  setIncomeForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
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
            className={`w-full sm:w-auto px-4 py-2 text-sm sm:text-base text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2 ${
              isEdit
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isEdit ? "Save Changes" : "Add Income"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectFinancialManagement;
