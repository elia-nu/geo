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
    }
    // Removed amount limit - users can enter any expense amount
  }

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Expense title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Category validation removed - category field is no longer required

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

  // Vendor validation (required)
  if (!formData.vendor || formData.vendor.trim().length === 0) {
    errors.vendor = "Vendor name is required";
  } else if (formData.vendor.trim().length < 2) {
    errors.vendor = "Vendor name must be at least 2 characters long";
  } else if (formData.vendor.trim().length > 100) {
    errors.vendor = "Vendor name must be less than 100 characters";
  }

  // Receipt validation (conditional based on receiptType)
  const receiptType = formData.receiptType || "none";
  
  if (receiptType === "url") {
    if (!formData.receiptUrl || formData.receiptUrl.trim().length === 0) {
      errors.receiptUrl = "Receipt URL is required when receipt type is URL";
    } else if (formData.receiptUrl.trim().length > 200) {
      errors.receiptUrl = "Receipt URL must be less than 200 characters";
    }
  } else if (receiptType === "image") {
    if (!formData.receiptImage) {
      errors.receiptImage = "Receipt image is required when receipt type is Image";
    }
  }
  // No validation needed when receiptType is "none"

  // Allocation validation (required)
  if (!formData.allocationId || formData.allocationId.trim().length === 0) {
    errors.allocationId = "Budget allocation is required";
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
    }
    // Removed amount limit - users can enter any allocation amount
  }

  // Category validation
  if (!formData.categoryId && !formData.category) {
    errors.category = "Allocation category is required";
  }

  // Allocation type validation
  if (!formData.allocationType || formData.allocationType.trim().length === 0) {
    errors.allocationType = "Allocation type is required";
  } else {
    const validTypes = ["general", "department", "task", "activity", "milestone"];
    if (!validTypes.includes(formData.allocationType)) {
      errors.allocationType = "Invalid allocation type";
    }
  }

  // Description validation
  if (formData.description && formData.description.length > 300) {
    errors.description = "Description must be less than 300 characters";
  }

  return errors;
};

export const validateIncomeForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Income title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Expected amount validation
  if (!formData.expectedAmount || formData.expectedAmount <= 0) {
    errors.expectedAmount = "Expected amount must be greater than 0";
  }

  // Amount validation (for edit mode or when status is collected)
  if (formData.status === 'collected' && (!formData.amount || formData.amount <= 0)) {
    errors.amount = "Amount must be greater than 0 when status is collected";
  }

  // Due date validation
  if (!formData.dueDate) {
    errors.dueDate = "Due date is required";
  }

  // Description validation
  if (!formData.description || formData.description.trim().length === 0) {
    errors.description = "Description is required";
  } else if (formData.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters long";
  }

  // Invoice number validation
  if (!formData.invoiceNumber || formData.invoiceNumber.trim().length === 0) {
    errors.invoiceNumber = "Invoice number is required";
  }

  // Payment reference validation
  if (!formData.paymentReference || formData.paymentReference.trim().length === 0) {
    errors.paymentReference = "Payment reference is required";
  }

  // Payment method validation
  if (!formData.paymentMethod) {
    errors.paymentMethod = "Payment method is required";
  }

  // Notes validation
  if (!formData.notes || formData.notes.trim().length === 0) {
    errors.notes = "Notes are required";
  }

  // Status validation
  if (!formData.status) {
    errors.status = "Status is required";
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

  // Category validation
  if (!formData.categoryId) {
    errors.categoryId = "Task category is required";
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

// Collection form validation
export const validateCollectionForm = (formData) => {
  const errors = {};

  // Collected amount validation (required)
  if (!formData.collectedAmount || parseFloat(formData.collectedAmount) <= 0) {
    errors.collectedAmount = "Collected amount must be greater than 0";
  }

  // Transaction number validation (required)
  if (!formData.transactionNumber || formData.transactionNumber.trim().length === 0) {
    errors.transactionNumber = "Transaction number is required";
  }

  // Collection date validation (required, cannot be in future)
  if (!formData.collectedDate) {
    errors.collectedDate = "Collection date is required";
  } else {
    const collectionDate = new Date(formData.collectedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (collectionDate > today) {
      errors.collectedDate = "Collection date cannot be in the future";
    }
  }

  // Invoice number validation (optional but recommended)
  // Notes validation (optional)
  // Payment method validation (optional, has default)

  return errors;
};

export const validateExpectedPaymentForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = "Payment title is required";
  } else if (formData.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters long";
  } else if (formData.title.trim().length > 100) {
    errors.title = "Title must be less than 100 characters";
  }

  // Expected amount validation
  if (!formData.expectedAmount || parseFloat(formData.expectedAmount) <= 0) {
    errors.expectedAmount = "Expected amount must be greater than 0";
  }

  // Category validation (optional for now)
  // if (!formData.categoryId || formData.categoryId.trim().length === 0) {
  //   errors.categoryId = "Category is required";
  // }

  // Due date validation
  if (!formData.dueDate || formData.dueDate.trim().length === 0) {
    errors.dueDate = "Due date is required";
  } else {
    // Validate date format and ensure it's not in the past
    const selectedDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (isNaN(selectedDate.getTime())) {
      errors.dueDate = "Please enter a valid date";
    } else if (selectedDate < today) {
      errors.dueDate = "Due date cannot be in the past";
    }
  }

  return errors;
};
