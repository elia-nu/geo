// Form validation utilities for project forms
export const validateProjectForm = (formData) => {
  const errors = {};

  // Project name validation
  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = "Project name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Project name must be at least 3 characters long";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Project name must be less than 100 characters";
  }

  // Description validation
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Project description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  // Start date validation
  if (!formData.startDate) {
    errors.startDate = "Start date is required";
  } else {
    const startDate = new Date(formData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      errors.startDate = "Start date cannot be in the past";
    }
  }

  // End date validation
  if (!formData.endDate) {
    errors.endDate = "End date is required";
  } else {
    const endDate = new Date(formData.endDate);
    const startDate = new Date(formData.startDate);

    if (endDate <= startDate) {
      errors.endDate = "End date must be after start date";
    }
  }

  // Status validation
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

  // Category validation
  if (!formData.category) {
    errors.category = "Project category is required";
  }

  // Priority validation
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

  // Total amount validation
  if (!formData.totalAmount || formData.totalAmount === "") {
    errors.totalAmount = "Budget amount is required";
  } else {
    const amount = parseFloat(formData.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.totalAmount = "Budget amount must be a positive number";
    } else if (amount > 1000000000) {
      errors.totalAmount = "Budget amount is too large";
    }
  }

  // Currency validation
  if (!formData.currency) {
    errors.currency = "Currency is required";
  }

  // Description validation
  if (formData.description && formData.description.length > 200) {
    errors.description = "Description must be less than 200 characters";
  }

  // Approved by validation
  if (formData.approvedBy && formData.approvedBy.length > 100) {
    errors.approvedBy = "Approved by field must be less than 100 characters";
  }

  // Approval date validation
  if (formData.approvalDate) {
    const approvalDate = new Date(formData.approvalDate);
    const today = new Date();

    if (approvalDate > today) {
      errors.approvalDate = "Approval date cannot be in the future";
    }
  }

  return errors;
};

export const validateExpenseForm = (formData) => {
  const errors = {};

  // Amount validation
  if (!formData.amount || formData.amount === "") {
    errors.amount = "Expense amount is required";
  } else {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = "Expense amount must be a positive number";
    } else if (amount > 10000000) {
      errors.amount = "Expense amount is too large";
    }
  }

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Expense title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Category validation
  if (!formData.category) {
    errors.category = "Expense category is required";
  }

  // Date validation
  if (!formData.expenseDate) {
    errors.expenseDate = "Expense date is required";
  } else {
    const expenseDate = new Date(formData.expenseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (expenseDate > today) {
      errors.expenseDate = "Expense date cannot be in the future";
    }
  }

  // Receipt validation (optional but if provided, should be valid)
  if (formData.receipt && formData.receipt.length > 100) {
    errors.receipt = "Receipt reference must be less than 100 characters";
  }

  return errors;
};

export const validateAllocationForm = (formData) => {
  const errors = {};

  // Name validation
  if (!formData.name || formData.name.trim().length === 0) {
    errors.name = "Allocation name is required";
  } else if (formData.name.trim().length < 3) {
    errors.name = "Allocation name must be at least 3 characters long";
  } else if (formData.name.trim().length > 100) {
    errors.name = "Allocation name must be less than 100 characters";
  }

  // Amount validation
  if (!formData.amount || formData.amount === "") {
    errors.amount = "Allocation amount is required";
  } else {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.amount = "Allocation amount must be a positive number";
    } else if (amount > 1000000000) {
      errors.amount = "Allocation amount is too large";
    }
  }

  // Allocation type validation (optional)

  // Description validation
  if (formData.description && formData.description.length > 300) {
    errors.description = "Description must be less than 300 characters";
  }

  return errors;
};

export const validateMilestoneForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Milestone title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Description validation
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Milestone description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 500) {
    errors.description = "Description must be less than 500 characters";
  }

  // Due date validation
  if (!formData.dueDate) {
    errors.dueDate = "Due date is required";
  } else {
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      errors.dueDate = "Due date cannot be in the past";
    }
  }

  // Status validation
  if (!formData.status) {
    errors.status = "Milestone status is required";
  } else {
    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(formData.status)) {
      errors.status = "Invalid milestone status";
    }
  }

  // Progress validation
  if (formData.progress !== undefined && formData.progress !== null) {
    const progress = parseInt(formData.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.progress = "Progress must be between 0 and 100";
    }
  }

  return errors;
};

export const validateTaskForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Task title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Description validation
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Task description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  } else if (formData.description.trim().length > 1000) {
    errors.description = "Description must be less than 1000 characters";
  }

  // Priority validation
  if (!formData.priority) {
    errors.priority = "Task priority is required";
  } else {
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(formData.priority)) {
      errors.priority = "Invalid priority level";
    }
  }

  // Status validation
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

  // Due date validation
  if (!formData.dueDate) {
    errors.dueDate = "Due date is required";
  } else {
    const dueDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      errors.dueDate = "Due date cannot be in the past";
    }
  }

  // Assigned to validation
  if (!formData.assignedTo || formData.assignedTo.length === 0) {
    errors.assignedTo = "At least one team member must be assigned";
  }

  return errors;
};

// Generic form validation helper
export const validateForm = (formData, validationRules) => {
  const errors = {};

  Object.keys(validationRules).forEach((field) => {
    const rules = validationRules[field];
    const value = formData[field];

    // Required validation
    if (rules.required && (!value || value.toString().trim() === "")) {
      errors[field] = rules.requiredMessage || `${field} is required`;
      return;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === "") {
      return;
    }

    // Min length validation
    if (rules.minLength && value.toString().length < rules.minLength) {
      errors[field] =
        rules.minLengthMessage ||
        `${field} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && value.toString().length > rules.maxLength) {
      errors[field] =
        rules.maxLengthMessage ||
        `${field} must be less than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.patternMessage || `${field} format is invalid`;
    }

    // Custom validation
    if (rules.custom && typeof rules.custom === "function") {
      const customError = rules.custom(value, formData);
      if (customError) {
        errors[field] = customError;
      }
    }
  });

  return errors;
};

// Utility function to check if form has errors
export const hasFormErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

// Utility function to get first error message
export const getFirstError = (errors) => {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : null;
};
