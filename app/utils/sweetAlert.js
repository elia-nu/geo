import Swal from "sweetalert2";

// SweetAlert2 configuration and utility functions
export const showLoadingToast = (
  title = "Loading...",
  text = "Please wait while we process your request"
) => {
  return Swal.fire({
    title: title,
    text: text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

export const showSuccessToast = (
  title = "Success!",
  text = "Operation completed successfully",
  timer = 3000
) => {
  return Swal.fire({
    icon: "success",
    title: title,
    text: text,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

export const showErrorToast = (
  title = "Error!",
  text = "Something went wrong",
  timer = 5000
) => {
  return Swal.fire({
    icon: "error",
    title: title,
    text: text,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

export const showWarningToast = (
  title = "Warning!",
  text = "Please check your input",
  timer = 4000
) => {
  return Swal.fire({
    icon: "warning",
    title: title,
    text: text,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

export const showInfoToast = (
  title = "Info",
  text = "Information",
  timer = 3000
) => {
  return Swal.fire({
    icon: "info",
    title: title,
    text: text,
    timer: timer,
    timerProgressBar: true,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
};

// Confirmation dialogs
export const showConfirmDialog = (
  title = "Are you sure?",
  text = "This action cannot be undone",
  confirmButtonText = "Yes, do it!"
) => {
  return Swal.fire({
    title: title,
    text: text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: confirmButtonText,
    cancelButtonText: "Cancel",
  });
};

export const showDeleteConfirmDialog = (options = {}) => {
  const {
    title = "Delete Item",
    text = "Are you sure you want to delete this item? This action cannot be undone.",
    confirmButtonText = "Yes, delete it!",
    cancelButtonText = "Cancel"
  } = options;

  return Swal.fire({
    title: title,
    text: text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: confirmButtonText,
    cancelButtonText: cancelButtonText,
  });
};

// Form validation error display
export const showValidationErrors = (errors) => {
  const errorMessages = Object.values(errors);
  const errorList = errorMessages.map((error) => `• ${error}`).join("\n");

  return Swal.fire({
    icon: "error",
    title: "Validation Error",
    text: "Please fix the following errors:",
    html: `<div style="text-align: left; margin-top: 10px;">${errorList}</div>`,
    confirmButtonText: "OK",
  });
};

// Custom form input dialog
export const showInputDialog = (
  title,
  text,
  inputType = "text",
  inputValue = "",
  placeholder = ""
) => {
  return Swal.fire({
    title: title,
    text: text,
    input: inputType,
    inputValue: inputValue,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: "Submit",
    cancelButtonText: "Cancel",
    inputValidator: (value) => {
      if (!value) {
        return "You need to write something!";
      }
    },
  });
};

// Progress dialog
export const showProgressDialog = (
  title = "Processing...",
  text = "Please wait"
) => {
  return Swal.fire({
    title: title,
    text: text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// Update progress dialog
export const updateProgressDialog = (progress, text = null) => {
  if (Swal.isLoading()) {
    Swal.update({
      text: text || `Progress: ${progress}%`,
      html: `
        <div style="margin-top: 20px;">
          <div style="width: 100%; background-color: #f0f0f0; border-radius: 10px; overflow: hidden;">
            <div style="width: ${progress}%; background-color: #4CAF50; height: 20px; transition: width 0.3s ease;"></div>
          </div>
          <p style="margin-top: 10px;">${text || `Progress: ${progress}%`}</p>
        </div>
      `,
    });
  }
};

// Close any open dialog
export const closeDialog = () => {
  Swal.close();
};

// Form submission with loading and error handling
export const handleFormSubmission = async (submitFunction, options = {}) => {
  const {
    loadingTitle = "Processing...",
    loadingText = "Please wait while we process your request",
    successTitle = "Success!",
    successText = "Operation completed successfully",
    errorTitle = "Error!",
    errorText = "Something went wrong. Please try again.",
    showValidationErrors: showValidation = true,
  } = options;

  try {
    // Show loading dialog
    const loadingToast = showLoadingToast(loadingTitle, loadingText);

    // Execute the submit function
    const result = await submitFunction();

    // Close loading dialog
    closeDialog();

    // Show success message
    if (result && result.success !== false) {
      showSuccessToast(successTitle, successText);
      return result;
    } else {
      // Handle API error response
      const errorMessage = result?.error || result?.message || errorText;
      showErrorToast(errorTitle, errorMessage);
      return result;
    }
  } catch (error) {
    // Close loading dialog
    closeDialog();

    // Handle different types of errors
    if (error.validationErrors && showValidation) {
      showValidationErrors(error.validationErrors);
    } else {
      const errorMessage = error.message || errorText;
      showErrorToast(errorTitle, errorMessage);
    }

    throw error;
  }
};

// Project-specific toast messages
export const projectToasts = {
  // Budget related
  budgetCreated: () =>
    showSuccessToast(
      "Budget Created!",
      "Project budget has been created successfully"
    ),
  budgetUpdated: () =>
    showSuccessToast(
      "Budget Updated!",
      "Project budget has been updated successfully"
    ),
  budgetError: (message) =>
    showErrorToast(
      "Budget Error",
      message || "Failed to process budget request"
    ),

  // Expense related
  expenseAdded: () =>
    showSuccessToast("Expense Added!", "Expense has been added successfully"),
  expenseUpdated: () =>
    showSuccessToast(
      "Expense Updated!",
      "Expense has been updated successfully"
    ),
  expenseDeleted: () =>
    showSuccessToast(
      "Expense Deleted!",
      "Expense has been deleted successfully"
    ),
  expenseError: (message) =>
    showErrorToast(
      "Expense Error",
      message || "Failed to process expense request"
    ),

  // Income related
  incomeAdded: () =>
    showSuccessToast("Income Added!", "Income has been added successfully"),
  incomeUpdated: () =>
    showSuccessToast(
      "Income Updated!",
      "Income has been updated successfully"
    ),
  incomeDeleted: () =>
    showSuccessToast(
      "Income Deleted!",
      "Income has been deleted successfully"
    ),
  incomeError: (message) =>
    showErrorToast(
      "Income Error",
      message || "Failed to process income request"
    ),

  // Collection related
  collectionConfirmed: () =>
    showSuccessToast(
      "Collection Confirmed!",
      "Income collection has been confirmed successfully"
    ),
  collectionError: (message) =>
    showErrorToast(
      "Collection Error",
      message || "Failed to process collection request"
    ),

  // Allocation related
  allocationAdded: () =>
    showSuccessToast(
      "Allocation Added!",
      "Budget allocation has been added successfully"
    ),
  allocationUpdated: () =>
    showSuccessToast(
      "Allocation Updated!",
      "Budget allocation has been updated successfully"
    ),
  allocationDeleted: () =>
    showSuccessToast(
      "Allocation Deleted!",
      "Budget allocation has been deleted successfully"
    ),
  allocationError: (message) =>
    showErrorToast(
      "Allocation Error",
      message || "Failed to process allocation request"
    ),

  // Milestone related
  milestoneCreated: () =>
    showSuccessToast(
      "Milestone Created!",
      "Project milestone has been created successfully"
    ),
  milestoneUpdated: () =>
    showSuccessToast(
      "Milestone Updated!",
      "Project milestone has been updated successfully"
    ),
  milestoneDeleted: () =>
    showSuccessToast(
      "Milestone Deleted!",
      "Project milestone has been deleted successfully"
    ),
  milestoneError: (message) =>
    showErrorToast(
      "Milestone Error",
      message || "Failed to process milestone request"
    ),

  // Task related
  taskCreated: () =>
    showSuccessToast(
      "Task Created!",
      "Project task has been created successfully"
    ),
  taskUpdated: () =>
    showSuccessToast(
      "Task Updated!",
      "Project task has been updated successfully"
    ),
  taskDeleted: () =>
    showSuccessToast(
      "Task Deleted!",
      "Project task has been deleted successfully"
    ),
  taskError: (message) =>
    showErrorToast("Task Error", message || "Failed to process task request"),

  // Project related
  projectCreated: () =>
    showSuccessToast(
      "Project Created!",
      "New project has been created successfully"
    ),
  projectUpdated: () =>
    showSuccessToast(
      "Project Updated!",
      "Project has been updated successfully"
    ),
  projectDeleted: () =>
    showSuccessToast(
      "Project Deleted!",
      "Project has been deleted successfully"
    ),
  projectError: (message) =>
    showErrorToast(
      "Project Error",
      message || "Failed to process project request"
    ),

  // Team related
  teamMemberAdded: () =>
    showSuccessToast(
      "Team Member Added!",
      "Team member has been added to the project"
    ),
  teamMemberRemoved: () =>
    showSuccessToast(
      "Team Member Removed!",
      "Team member has been removed from the project"
    ),
  teamError: (message) =>
    showErrorToast("Team Error", message || "Failed to process team request"),
};

// Custom error dialog for budget allocation conflicts
export const showBudgetAllocationError = (milestoneTitle, allocations) => {
  const allocationsHtml = allocations
    .map(
      (alloc) => `
      <div style="
        background: #f8f9fa; 
        border-left: 4px solid #dc3545; 
        padding: 12px; 
        margin: 8px 0; 
        border-radius: 4px;
        text-align: left;
      ">
        <div style="font-weight: 600; color: #495057; margin-bottom: 4px;">
          ${alloc.name || 'Unnamed Allocation'}
        </div>
        <div style="color: #6c757d; font-size: 14px;">
          Amount: <span style="font-weight: 500; color: #28a745;">$${alloc.amount?.toLocaleString() || '0'}</span>
        </div>
      </div>
    `
    )
    .join("");

  return Swal.fire({
    icon: "error",
    title: "Cannot Delete Milestone",
    html: `
      <div style="text-align: left; margin: 20px 0;">
        <p style="margin-bottom: 16px; color: #495057; font-size: 16px;">
          The milestone <strong>"${milestoneTitle}"</strong> cannot be deleted because it has budget allocations tied to it.
        </p>
        
        <div style="margin: 20px 0;">
          <h4 style="color: #dc3545; margin-bottom: 12px; font-size: 16px;">
            📊 Active Budget Allocations:
          </h4>
          ${allocationsHtml}
        </div>
        
        <div style="
          background: #e3f2fd; 
          border: 1px solid #2196f3; 
          border-radius: 8px; 
          padding: 16px; 
          margin-top: 20px;
        ">
          <div style="color: #1976d2; font-weight: 600; margin-bottom: 8px;">
            💡 What you need to do:
          </div>
          <ol style="margin: 0; padding-left: 20px; color: #424242;">
            <li style="margin-bottom: 8px;">Go to the <strong>Budget Management</strong> section</li>
            <li style="margin-bottom: 8px;">Remove or reassign these budget allocations</li>
            <li>Then try deleting the milestone again</li>
          </ol>
        </div>
      </div>
    `,
    confirmButtonText: "Go to Budget Management",
    showCancelButton: true,
    cancelButtonText: "Cancel",
    confirmButtonColor: "#2196f3",
    cancelButtonColor: "#6c757d",
    width: "600px",
    customClass: {
      popup: "budget-error-popup",
      htmlContainer: "budget-error-content"
    }
  });
};

// Validation error messages
export const validationMessages = {
  required: "This field is required",
  minLength: (min) => `Minimum ${min} characters required`,
  maxLength: (max) => `Maximum ${max} characters allowed`,
  invalidEmail: "Please enter a valid email address",
  invalidDate: "Please enter a valid date",
  invalidNumber: "Please enter a valid number",
  positiveNumber: "Please enter a positive number",
  futureDate: "Date cannot be in the future",
  pastDate: "Date cannot be in the past",
  endDateAfterStart: "End date must be after start date",
  dueDateBeforeToday: "Due date cannot be before today",
  dueDateBeforeProjectStart: "Due date cannot be before project start date",
  dueDateAfterProjectEnd: "Due date cannot be after project end date",
};
