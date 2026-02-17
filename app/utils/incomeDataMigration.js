/**
 * Income Data Migration Utilities
 * 
 * Handles backward compatibility for old income records by:
 * - Mapping old field names to new field names (amount → collectedAmount, receivedDate → collectedDate)
 * - Calculating status on-the-fly for records without status field
 * - Preserving receiptType field in database while hiding from UI
 */

/**
 * Normalize income record to use new field names
 * Handles backward compatibility with old field names
 * 
 * @param {Object} incomeRecord - Raw income record from database
 * @returns {Object} Normalized income record with new field names
 */
export const normalizeIncomeRecord = (incomeRecord) => {
  if (!incomeRecord) return null;

  const normalized = { ...incomeRecord };

  // Map old field names to new field names
  // amount → collectedAmount (if collectedAmount doesn't exist)
  if (normalized.collectedAmount === undefined && normalized.amount !== undefined) {
    normalized.collectedAmount = normalized.amount;
  }

  // receivedDate → collectedDate (if collectedDate doesn't exist)
  if (!normalized.collectedDate && normalized.receivedDate) {
    normalized.collectedDate = normalized.receivedDate;
  }

  // paymentReference → transactionNumber (if transactionNumber doesn't exist)
  if (!normalized.transactionNumber && normalized.paymentReference) {
    normalized.transactionNumber = normalized.paymentReference;
  }

  // Calculate status if not present
  if (!normalized.status) {
    normalized.status = calculateIncomeStatus(normalized);
  }

  return normalized;
};

/**
 * Calculate income status based on payment collection and due date
 * 
 * @param {Object} incomeRecord - Income record
 * @returns {string} Status: 'collected', 'overdue', or 'expected'
 */
export const calculateIncomeStatus = (incomeRecord) => {
  // If payment has been collected, status is 'collected'
  if (incomeRecord.collectedAmount && incomeRecord.collectedDate) {
    return 'collected';
  }

  // Check if overdue
  if (incomeRecord.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    const dueDate = new Date(incomeRecord.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      return 'overdue';
    }
  }

  // Default status is 'expected'
  return 'expected';
};

/**
 * Calculate days overdue for an income record
 * 
 * @param {Object} incomeRecord - Income record
 * @returns {number} Number of days overdue (0 if not overdue)
 */
export const getDaysOverdue = (incomeRecord) => {
  if (!incomeRecord.dueDate) return 0;

  const status = calculateIncomeStatus(incomeRecord);
  if (status !== 'overdue') return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(incomeRecord.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = today - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Normalize an array of income records
 * 
 * @param {Array} incomeRecords - Array of raw income records
 * @returns {Array} Array of normalized income records
 */
export const normalizeIncomeRecords = (incomeRecords) => {
  if (!Array.isArray(incomeRecords)) return [];
  return incomeRecords.map(normalizeIncomeRecord);
};

/**
 * Prepare income record for database storage
 * Ensures both old and new field names are stored for backward compatibility
 * 
 * @param {Object} incomeData - Income data to store
 * @returns {Object} Income data with both old and new field names
 */
export const prepareIncomeForStorage = (incomeData) => {
  const prepared = { ...incomeData };

  // Store both old and new field names for backward compatibility
  if (prepared.collectedAmount !== undefined) {
    prepared.amount = prepared.collectedAmount; // Keep old field name
  }

  if (prepared.collectedDate) {
    prepared.receivedDate = prepared.collectedDate; // Keep old field name
  }

  if (prepared.transactionNumber) {
    prepared.paymentReference = prepared.transactionNumber; // Keep old field name
  }

  // Preserve receiptType if it exists (even though we don't show it in UI)
  // This ensures we don't lose data from old records

  return prepared;
};

/**
 * Filter income records by status
 * 
 * @param {Array} incomeRecords - Array of income records
 * @param {string} statusFilter - Status to filter by ('all', 'expected', 'collected', 'overdue')
 * @returns {Array} Filtered income records
 */
export const filterIncomeByStatus = (incomeRecords, statusFilter) => {
  if (!Array.isArray(incomeRecords)) return [];
  if (!statusFilter || statusFilter === 'all') return incomeRecords;

  return incomeRecords.filter(record => {
    const status = record.status || calculateIncomeStatus(record);
    return status === statusFilter.toLowerCase();
  });
};

/**
 * Validate income data
 * 
 * @param {Object} incomeData - Income data to validate
 * @param {boolean} isCollection - Whether this is a payment collection (vs expected income creation)
 * @returns {Object} Validation errors object
 */
export const validateIncomeData = (incomeData, isCollection = false) => {
  const errors = {};

  // Common validations
  if (!incomeData.title || incomeData.title.trim() === '') {
    errors.title = 'Title is required';
  }

  // Expected income validations
  if (!isCollection) {
    if (!incomeData.expectedAmount || parseFloat(incomeData.expectedAmount) <= 0) {
      errors.expectedAmount = 'Expected amount must be greater than 0';
    }

    if (!incomeData.dueDate) {
      errors.dueDate = 'Due date is required';
    } else {
      // Validate due date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(incomeData.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        errors.dueDate = 'Due date cannot be in the past';
      }
    }
  }

  // Payment collection validations
  if (isCollection) {
    if (!incomeData.collectedAmount || parseFloat(incomeData.collectedAmount) <= 0) {
      errors.collectedAmount = 'Collected amount must be greater than 0';
    }

    if (!incomeData.transactionNumber || incomeData.transactionNumber.trim() === '') {
      errors.transactionNumber = 'Transaction number is required';
    }

    if (!incomeData.collectedDate) {
      errors.collectedDate = 'Collection date is required';
    } else {
      // Validate collection date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const collectedDate = new Date(incomeData.collectedDate);
      collectedDate.setHours(0, 0, 0, 0);

      if (collectedDate > today) {
        errors.collectedDate = 'Collection date cannot be in the future';
      }
    }
  }

  return errors;
};

/**
 * Check if validation errors object has any errors
 * 
 * @param {Object} errors - Validation errors object
 * @returns {boolean} True if there are errors
 */
export const hasValidationErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
