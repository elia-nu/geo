// Form validation utilities for project forms

const parseLocalDate = (value) => {
  if (!value) return null;
  // Prefer YYYY-MM-DD to avoid timezone shifting
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** Validate a money amount string/number. Returns error message or null. */
export const validateMoneyAmount = (
  value,
  {
    fieldName = "Amount",
    required = true,
    min = 0.01,
    max = 1_000_000_000,
    allowZero = false,
  } = {}
) => {
  const raw = value === null || value === undefined ? "" : String(value).trim();

  if (!raw) {
    return required ? `${fieldName} is required` : null;
  }

  // Reject commas and invalid money formats
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    return `${fieldName} must be a valid number (up to 2 decimal places)`;
  }

  const amount = Number(raw);
  if (!Number.isFinite(amount)) {
    return `${fieldName} must be a valid number`;
  }

  if (allowZero ? amount < 0 : amount < min) {
    return allowZero
      ? `${fieldName} cannot be negative`
      : `${fieldName} must be a positive number`;
  }

  if (amount > max) {
    return `${fieldName} is too large`;
  }

  return null;
};

/** Validate a date string. Returns error message or null. */
export const validateDateField = (
  value,
  {
    fieldName = "Date",
    required = false,
    notFuture = false,
    notPast = false,
    minDate = null,
    maxDate = null,
    afterDate = null,
    afterFieldName = "start date",
  } = {}
) => {
  const raw = value === null || value === undefined ? "" : String(value).trim();

  if (!raw) {
    return required ? `${fieldName} is required` : null;
  }

  const date = parseLocalDate(raw);
  if (!date) {
    return `${fieldName} is not a valid date`;
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  if (notFuture && date > todayEnd) {
    return `${fieldName} cannot be in the future`;
  }

  if (notPast && date < todayStart) {
    return `${fieldName} cannot be in the past`;
  }

  if (minDate) {
    const min = parseLocalDate(minDate);
    if (min && date < startOfDay(min)) {
      return `${fieldName} is too early`;
    }
  }

  if (maxDate) {
    const max = parseLocalDate(maxDate);
    if (max && date > endOfDay(max)) {
      return `${fieldName} is too late`;
    }
  }

  if (afterDate) {
    const after = parseLocalDate(afterDate);
    if (after && date < startOfDay(after)) {
      return `${fieldName} must be on or after ${afterFieldName}`;
    }
  }

  return null;
};

export const validateProjectForm = (formData) => {
  const errors = {};

  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = "Project name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Project name must be at least 3 characters long";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Project name must be less than 100 characters";
  }

  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Project description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  const startErr = validateDateField(formData.startDate, {
    fieldName: "Start date",
    required: true,
    notPast: true,
  });
  if (startErr) errors.startDate = startErr;

  const endErr = validateDateField(formData.endDate, {
    fieldName: "End date",
    required: true,
    afterDate: formData.startDate,
    afterFieldName: "start date",
  });
  if (endErr) {
    // Keep clearer message when both dates exist but end is before/equal start
    const start = parseLocalDate(formData.startDate);
    const end = parseLocalDate(formData.endDate);
    if (start && end && end <= start) {
      errors.endDate = "End date must be after start date";
    } else {
      errors.endDate = endErr;
    }
  }

  if (!formData.status) {
    errors.status = "Project status is required";
  } else {
    const validStatuses = [
      "pending",
      "in_progress",
      "completed",
      "cancelled",
      "on_hold",
    ];
    if (!validStatuses.includes(formData.status)) {
      errors.status = "Invalid project status";
    }
  }

  if (!formData.category) {
    errors.category = "Project category is required";
  }

  if (!formData.priority) {
    errors.priority = "Project priority is required";
  } else {
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(formData.priority)) {
      errors.priority = "Invalid priority level";
    }
  }

  return errors;
};

export const validateBudgetForm = (formData) => {
  const errors = {};

  const amountErr = validateMoneyAmount(formData.totalAmount, {
    fieldName: "Budget amount",
    required: true,
    max: 1_000_000_000,
  });
  if (amountErr) errors.totalAmount = amountErr;

  if (!formData.currency) {
    errors.currency = "Currency is required";
  }

  if (formData.description && formData.description.length > 200) {
    errors.description = "Description must be less than 200 characters";
  }

  if (formData.approvedBy && formData.approvedBy.length > 100) {
    errors.approvedBy = "Approved by field must be less than 100 characters";
  }

  const approvalErr = validateDateField(formData.approvalDate, {
    fieldName: "Approval date",
    required: false,
    notFuture: true,
  });
  if (approvalErr) errors.approvalDate = approvalErr;

  // Ensure allocations do not exceed available budget
  if (!amountErr) {
    const total = Number(formData.totalAmount);
    const allocations = Array.isArray(formData.budgetAllocations)
      ? formData.budgetAllocations
      : [];
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + (Number(alloc?.amount) || 0),
      0
    );

    if (totalAllocated > total + 0.001) {
      errors.budgetAllocations = `Allocations (${totalAllocated.toFixed(
        2
      )}) exceed total budget (${total.toFixed(2)}). Reduce allocations or increase the budget.`;
    }
  }

  return errors;
};

export const validateExpenseForm = (formData) => {
  const errors = {};

  const amountErr = validateMoneyAmount(formData.amount, {
    fieldName: "Expense amount",
    required: true,
    max: 10_000_000,
  });
  if (amountErr) errors.amount = amountErr;

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Expense title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  if (!formData.category) {
    errors.category = "Expense category is required";
  }

  const dateErr = validateDateField(formData.expenseDate, {
    fieldName: "Expense date",
    required: true,
    notFuture: true,
  });
  if (dateErr) errors.expenseDate = dateErr;

  if (formData.receipt && formData.receipt.length > 100) {
    errors.receipt = "Receipt reference must be less than 100 characters";
  }

  return errors;
};

export const validateAllocationForm = (
  formData,
  { availableAmount = null, minAmount = null, currency = "ETB" } = {}
) => {
  const errors = {};

  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = "Allocation name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Allocation name must be at least 3 characters long";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Allocation name must be less than 100 characters";
  }

  const amountErr = validateMoneyAmount(formData.amount, {
    fieldName: "Allocation amount",
    required: true,
    max: 1_000_000_000,
  });
  if (amountErr) {
    errors.amount = amountErr;
  } else {
    const amount = Number(formData.amount);

    if (
      availableAmount !== null &&
      availableAmount !== undefined &&
      Number.isFinite(Number(availableAmount)) &&
      amount > Number(availableAmount) + 0.001
    ) {
      const available = Math.max(0, Number(availableAmount));
      errors.amount = `Amount exceeds available budget (${available.toFixed(
        2
      )} ${currency})`;
    }

    if (
      minAmount !== null &&
      minAmount !== undefined &&
      Number.isFinite(Number(minAmount)) &&
      amount + 0.001 < Number(minAmount)
    ) {
      errors.amount = `Amount cannot be less than already spent (${Number(
        minAmount
      ).toFixed(2)} ${currency})`;
    }
  }

  if (formData.description && formData.description.length > 300) {
    errors.description = "Description must be less than 300 characters";
  }

  const startErr = validateDateField(formData.startDate, {
    fieldName: "Start date",
    required: false,
  });
  if (startErr) errors.startDate = startErr;

  const endErr = validateDateField(formData.endDate, {
    fieldName: "End date",
    required: false,
    afterDate: formData.startDate || null,
    afterFieldName: "start date",
  });
  if (endErr) errors.endDate = endErr;

  if (formData.startDate && formData.endDate) {
    const start = parseLocalDate(formData.startDate);
    const end = parseLocalDate(formData.endDate);
    if (start && end && end < start) {
      errors.endDate = "End date must be on or after start date";
    }
  }

  // Require entity when allocation type needs one
  const type = formData.allocationType;
  if (type === "department" && !formData.departmentId) {
    errors.departmentId = "Select a department";
  }
  if (type === "task" && !formData.taskId) {
    errors.taskId = "Select a task";
  }
  if (type === "activity" && !formData.activityId) {
    errors.activityId = "Select an activity";
  }
  if (type === "milestone" && !formData.milestoneId) {
    errors.milestoneId = "Select a milestone";
  }

  return errors;
};

export const validateIncomeForm = (formData, { isEdit = false } = {}) => {
  const errors = {};

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Income title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  const hasAmount = String(formData.amount ?? "").trim() !== "";
  const hasExpected = String(formData.expectedAmount ?? "").trim() !== "";

  if (!hasAmount && !hasExpected) {
    errors.amount = "Enter a received amount or expected amount";
    errors.expectedAmount = "Enter a received amount or expected amount";
  }

  if (hasAmount) {
    const amountErr = validateMoneyAmount(formData.amount, {
      fieldName: "Amount",
      required: true,
      max: 1_000_000_000,
    });
    if (amountErr) errors.amount = amountErr;
  }

  if (hasExpected) {
    const expectedErr = validateMoneyAmount(formData.expectedAmount, {
      fieldName: "Expected amount",
      required: true,
      max: 1_000_000_000,
    });
    if (expectedErr) errors.expectedAmount = expectedErr;
  }

  if (isEdit && !hasAmount) {
    errors.amount = "Amount is required";
  }

  const receivedErr = validateDateField(formData.receivedDate, {
    fieldName: "Received date",
    required: isEdit,
    notFuture: true,
  });
  if (receivedErr) errors.receivedDate = receivedErr;

  const dueErr = validateDateField(formData.dueDate, {
    fieldName: "Due date",
    required: isEdit,
  });
  if (dueErr) errors.dueDate = dueErr;

  if (formData.clientName && formData.clientName.length > 100) {
    errors.clientName = "Client name must be less than 100 characters";
  }

  if (isEdit && (!formData.clientName || !formData.clientName.trim())) {
    errors.clientName = "Client name is required";
  }

  return errors;
};

export const validateExpectedPaymentForm = (formData) => {
  const errors = {};

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  }

  const amountErr = validateMoneyAmount(formData.expectedAmount, {
    fieldName: "Expected amount",
    required: true,
    max: 1_000_000_000,
  });
  if (amountErr) errors.expectedAmount = amountErr;

  const dueErr = validateDateField(formData.dueDate, {
    fieldName: "Due date",
    required: true,
  });
  if (dueErr) errors.dueDate = dueErr;

  return errors;
};

export const validateCollectPaymentForm = (
  formData,
  { remainingAmount = Infinity } = {}
) => {
  const errors = {};

  const amountErr = validateMoneyAmount(formData.collectAmount, {
    fieldName: "Collection amount",
    required: true,
    max: 1_000_000_000,
  });
  if (amountErr) {
    errors.collectAmount = amountErr;
  } else if (
    Number.isFinite(remainingAmount) &&
    Number(formData.collectAmount) > remainingAmount + 0.001
  ) {
    errors.collectAmount = `Amount cannot exceed remaining ${remainingAmount.toFixed(
      2
    )}`;
  }

  const dateErr = validateDateField(formData.receivedDate, {
    fieldName: "Received date",
    required: true,
    notFuture: true,
  });
  if (dateErr) errors.receivedDate = dateErr;

  return errors;
};

export const validateMilestoneForm = (formData) => {
  const errors = {};

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Milestone title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Milestone description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  const dueErr = validateDateField(formData.dueDate, {
    fieldName: "Due date",
    required: true,
    notPast: true,
  });
  if (dueErr) errors.dueDate = dueErr;

  if (!formData.status) {
    errors.status = "Milestone status is required";
  } else {
    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(formData.status)) {
      errors.status = "Invalid milestone status";
    }
  }

  if (formData.progress !== undefined && formData.progress !== null) {
    const progress = parseInt(formData.progress, 10);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.progress = "Progress must be between 0 and 100";
    }
  }

  return errors;
};

export const validateTaskForm = (formData) => {
  const errors = {};

  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Task title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Task description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 1000) {
    errors.description = "Description must be less than 1000 characters";
  }

  if (!formData.priority) {
    errors.priority = "Task priority is required";
  } else {
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(formData.priority)) {
      errors.priority = "Invalid priority level";
    }
  }

  if (!formData.status) {
    errors.status = "Task status is required";
  } else {
    const validStatuses = [
      "pending",
      "in_progress",
      "completed",
      "blocked",
      "cancelled",
    ];
    if (!validStatuses.includes(formData.status)) {
      errors.status = "Invalid task status";
    }
  }

  const dueErr = validateDateField(formData.dueDate, {
    fieldName: "Due date",
    required: true,
    notPast: true,
  });
  if (dueErr) errors.dueDate = dueErr;

  if (!formData.assignedTo || formData.assignedTo.length === 0) {
    errors.assignedTo = "At least one team member must be assigned";
  }

  return errors;
};

export const validateForm = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((field) => {
    const rules = validationRules[field];
    const value = formData[field];

    if (rules.required && (!value || value.toString().trim() === "")) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      return;
    }

    if (!value || value.toString().trim() === "") {
      return;
    }

    if (rules.minLength && value.toString().length < rules.minLength) {
      errors[field] =
        rules.minLengthMessage ||
        `${field} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.toString().length > rules.maxLength) {
      errors[field] =
        rules.maxLengthMessage ||
        `${field} must be less than ${rules.maxLength} characters`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || `${field} format is invalid`;
    }

    if (rules.custom && typeof rules.custom === "function") {
      const customError = rules.custom(value, formData);
      if (customError) {
        errors[field] = customError;
      }
    }
  });

  return errors;
};

export const hasFormErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

export const getFirstError = (errors) => {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
};
