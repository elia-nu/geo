# Requirements Document

## Introduction

This specification defines enhancements to the ProjectFinancialManagement component for construction company financial tracking. The system manages expected income with due dates, tracks overdue payments, handles income collection with transaction details, provides pagination for data tables, and delivers comprehensive financial reporting and dashboard capabilities.

## Glossary

- **ProjectFinancialManagement**: A React component that manages financial data for construction projects including budgets, expenses, and income
- **Expected Income**: Anticipated revenue from a project with a defined due date
- **Actual Income**: Revenue that has been collected and recorded with transaction details
- **Overdue Payment**: Expected income that has passed its due date without being collected
- **Transaction Number**: Unique identifier for a payment transaction
- **Invoice Number**: Unique identifier for billing documents
- **Financial Dashboard**: Visual overview of project financial health including income, expenses, and budget status
- **Pagination**: Division of table data into discrete pages for improved performance and usability
- **Due Date**: The date by which payment is expected to be received

## Requirements

### Requirement 1

**User Story:** As a construction company financial manager, I want to set expected income with due dates for projects, so that I can track when payments should be received.

#### Acceptance Criteria

1. WHEN creating an expected income record, THE System SHALL require a due date to be specified
2. WHEN an expected income record is created, THE System SHALL store the expected amount separately from actual collected amount
3. WHEN viewing expected income records, THE System SHALL display the due date prominently
4. WHEN the current date exceeds the due date and payment has not been collected, THE System SHALL mark the income as overdue
5. THE System SHALL allow users to set expected income without requiring immediate payment collection

### Requirement 2

**User Story:** As a financial manager, I want to collect income with transaction details, so that I have complete payment records for auditing and reconciliation.

#### Acceptance Criteria

1. WHEN collecting payment for expected income, THE System SHALL provide a form to enter transaction number
2. WHEN collecting payment for expected income, THE System SHALL provide a form to enter invoice number
3. WHEN payment is collected, THE System SHALL record the actual amount received
4. WHEN payment is collected, THE System SHALL record the collection date
5. WHEN payment is collected, THE System SHALL update the income status from expected to collected

### Requirement 3

**User Story:** As a financial manager, I want to see overdue payments clearly identified, so that I can follow up on late payments promptly.

#### Acceptance Criteria

1. WHEN viewing the income list, THE System SHALL visually distinguish overdue payments with red or warning styling
2. WHEN an expected income passes its due date without payment, THE System SHALL automatically mark it as overdue
3. WHEN filtering income records, THE System SHALL provide an option to view only overdue payments
4. THE System SHALL display the number of days overdue for each late payment
5. WHEN payment is collected for an overdue income, THE System SHALL update the status to collected

### Requirement 4

**User Story:** As a user viewing large datasets, I want pagination on income and expense tables, so that the interface remains responsive and easy to navigate.

#### Acceptance Criteria

1. WHEN the income table contains more than 10 records, THE System SHALL display pagination controls
2. WHEN the expense table contains more than 10 records, THE System SHALL display pagination controls
3. WHEN clicking pagination controls, THE System SHALL display the selected page of records
4. THE System SHALL display the current page number and total number of pages
5. THE System SHALL allow users to configure the number of records per page

### Requirement 5

**User Story:** As a construction company manager, I want a financial dashboard that shows project financial health, so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN viewing the financial dashboard, THE System SHALL display total expected income for all projects
2. WHEN viewing the financial dashboard, THE System SHALL display total collected income
3. WHEN viewing the financial dashboard, THE System SHALL display total overdue amount
4. WHEN viewing the financial dashboard, THE System SHALL display total expenses
5. WHEN viewing the financial dashboard, THE System SHALL calculate and display profit margin

### Requirement 6

**User Story:** As a financial manager, I want the income data model simplified, so that the system is easier to use and maintain.

#### Acceptance Criteria

1. THE System SHALL remove the receipt type field from income records
2. WHEN creating income records, THE System SHALL not require receipt type selection
3. WHEN displaying income records, THE System SHALL not show receipt type column
4. THE System SHALL maintain backward compatibility with existing income records that have receipt type
5. THE System SHALL focus on essential fields: expected amount, actual amount, due date, transaction number, and invoice number

### Requirement 7

**User Story:** As a financial manager, I want improved financial reports for construction projects, so that I can analyze project profitability and cash flow.

#### Acceptance Criteria

1. WHEN generating income reports, THE System SHALL include expected vs actual income comparison
2. WHEN generating income reports, THE System SHALL show overdue payments separately
3. WHEN generating income reports, THE System SHALL calculate collection rate percentage
4. WHEN generating financial reports, THE System SHALL show income and expense trends over time
5. THE System SHALL allow exporting reports to PDF or Excel format