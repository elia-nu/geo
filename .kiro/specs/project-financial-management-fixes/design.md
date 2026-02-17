# Design Document

## Overview

This design transforms the ProjectFinancialManagement component into a comprehensive construction company financial tracking system. The system manages expected income with due dates, automatically tracks overdue payments, provides detailed payment collection forms, implements pagination for large datasets, and delivers a financial dashboard with enhanced reporting capabilities. The design separates expected income from actual collected income to provide better cash flow visibility and payment tracking.

## Architecture

The ProjectFinancialManagement component follows an enhanced React functional component pattern with:

### Core Architecture Components
- **State Management**: React hooks (useState, useEffect) for local state and data management
- **Tab-Based Navigation**: Multiple sections (Overview, Dashboard, Budget, Expenses, Income, Reports)
- **Modal System**: Separate modals for creating expected income and collecting payments
- **Pagination Engine**: Reusable pagination logic for income and expense tables
- **Status Calculator**: Automatic overdue detection based on due dates and payment status
- **Dashboard Analytics**: Real-time calculation of financial metrics and KPIs

### Data Flow
1. **Expected Income Creation** → Store with due date and expected amount
2. **Overdue Detection** → Background process checks due dates vs current date
3. **Payment Collection** → Separate flow captures transaction details and actual amount
4. **Dashboard Updates** → Reactive calculations based on income/expense changes
5. **Report Generation** → Aggregation of financial data with filtering and export

## Components and Interfaces

### Main Component Structure
```
ProjectFinancialManagement
├── Tab Navigation
├── Overview Tab (OverviewTab)
├── Financial Dashboard Tab (Enhanced)
│   ├── Expected Income Card
│   ├── Collected Income Card
│   ├── Overdue Payments Card
│   ├── Total Expenses Card
│   ├── Profit Margin Card
│   └── Collection Rate Indicator
├── Budget Tab (BudgetTab)
├── Expenses Tab (ExpensesTab with Pagination)
│   ├── Expense Table with Pagination Controls
│   ├── Page Size Selector
│   └── Page Navigation
├── Income Tab (IncomeTab - Redesigned)
│   ├── Income Status Filter (All/Expected/Collected/Overdue)
│   ├── Income Table with Pagination
│   │   ├── Expected Amount Column
│   │   ├── Collected Amount Column
│   │   ├── Due Date Column
│   │   ├── Status Badge (Expected/Collected/Overdue)
│   │   ├── Days Overdue Indicator
│   │   └── Action Buttons (Collect Payment/View Details)
│   └── Pagination Controls
├── Reports Tab (ReportsTab - Enhanced)
│   ├── Income vs Expected Report
│   ├── Overdue Payments Report
│   ├── Collection Rate Analysis
│   └── Export Functionality
└── Modal Components
    ├── BudgetModal
    ├── ExpenseModal
    ├── CreateExpectedIncomeModal (New)
    │   ├── Title Field
    │   ├── Expected Amount Field
    │   ├── Due Date Picker
    │   ├── Invoice Number Field
    │   └── Notes Field
    ├── CollectPaymentModal (New)
    │   ├── Expected Amount Display (Read-only)
    │   ├── Actual Amount Field
    │   ├── Transaction Number Field
    │   ├── Invoice Number Field (Pre-filled, editable)
    │   ├── Payment Method Selector
    │   ├── Collection Date Picker
    │   └── Receipt Upload
    └── IncomeDetailsModal (Updated)

### Key Component Changes

#### IncomeTab Component (Major Redesign)
- **Removed**: Receipt type field and column
- **Added**: Status filter dropdown (All/Expected/Collected/Overdue)
- **Added**: Pagination controls (10, 25, 50, 100 records per page)
- **Added**: Overdue indicator with days count
- **Enhanced**: Status badges with color coding
- **Split**: Single "Add Income" into "Create Expected Income" and "Collect Payment" actions

#### ExpensesTab Component (Pagination Enhancement)
- **Added**: Pagination controls matching income tab
- **Added**: Page size selector
- **Maintained**: All existing filtering and sorting functionality

#### FinancialDashboard Component (Enhanced)
- **Added**: Expected income total card
- **Added**: Collected income total card
- **Added**: Overdue payments card with count and amount
- **Added**: Collection rate percentage indicator
- **Enhanced**: Profit calculation using collected income (not expected)

## Data Models

### Income Model (Redesigned)
```javascript
{
  _id: String,
  projectId: String,
  title: String,
  
  // Expected Income Fields
  expectedAmount: Number,        // Amount we expect to receive
  dueDate: Date,                 // When payment is due
  
  // Collected Income Fields
  collectedAmount: Number,       // Actual amount received (null if not collected)
  collectedDate: Date,           // When payment was received (null if not collected)
  transactionNumber: String,     // Bank/payment transaction reference
  
  // Common Fields
  invoiceNumber: String,         // Invoice reference
  paymentMethod: String,         // Cash, Bank Transfer, Check, etc.
  notes: String,
  
  // Status Management
  status: String,                // 'expected', 'collected', 'overdue'
  
  // Receipt/Documentation
  receiptImage: String,          // File path for receipt image
  receiptUrl: String,            // URL for receipt document
  
  // Removed Fields
  // receiptType: REMOVED - No longer needed
  // paymentReference: MERGED into transactionNumber
  // receivedDate: RENAMED to collectedDate for clarity
  // amount: RENAMED to collectedAmount for clarity
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: String
}
```

### Status Calculation Logic
```javascript
function calculateIncomeStatus(income) {
  if (income.collectedAmount && income.collectedDate) {
    return 'collected';
  }
  
  const today = new Date();
  const dueDate = new Date(income.dueDate);
  
  if (today > dueDate) {
    return 'overdue';
  }
  
  return 'expected';
}

function getDaysOverdue(income) {
  if (income.status !== 'overdue') return 0;
  
  const today = new Date();
  const dueDate = new Date(income.dueDate);
  const diffTime = today - dueDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}
```

### Expense Model (Unchanged with Pagination)
```javascript
{
  _id: String,
  projectId: String,
  title: String,
  description: String,
  amount: Number,
  expenseDate: Date,
  allocationId: String,
  vendor: String,
  receiptUrl: String,
  status: String,
  tags: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### Pagination State Model
```javascript
{
  currentPage: Number,           // Current page number (1-indexed)
  pageSize: Number,              // Records per page (default: 10)
  totalRecords: Number,          // Total number of records
  totalPages: Number             // Calculated: Math.ceil(totalRecords / pageSize)
}
```

### Dashboard Metrics Model
```javascript
{
  totalExpectedIncome: Number,   // Sum of all expectedAmount
  totalCollectedIncome: Number,  // Sum of all collectedAmount where status='collected'
  totalOverdueAmount: Number,    // Sum of expectedAmount where status='overdue'
  overdueCount: Number,          // Count of income records with status='overdue'
  totalExpenses: Number,         // Sum of all expenses
  profitMargin: Number,          // (totalCollectedIncome - totalExpenses) / totalCollectedIncome * 100
  collectionRate: Number         // (totalCollectedIncome / totalExpectedIncome) * 100
}
```

## Error Handling

### Input Validation
1. **Expected Income Creation**
   - Validate expected amount is positive number
   - Validate due date is not in the past
   - Validate invoice number is unique
   - Show clear error messages for validation failures

2. **Payment Collection**
   - Validate collected amount is positive number
   - Validate transaction number is provided
   - Validate collection date is not in the future
   - Warn if collected amount differs significantly from expected amount

3. **Pagination**
   - Handle empty result sets gracefully
   - Validate page numbers are within valid range
   - Default to page 1 if invalid page requested

### Status Management
1. **Overdue Detection**
   - Run status check on component mount
   - Update status when viewing income list
   - Handle timezone differences correctly
   - Cache status calculations to avoid repeated computation

2. **Status Transitions**
   - Expected → Overdue (automatic when due date passes)
   - Expected → Collected (manual when payment collected)
   - Overdue → Collected (manual when payment collected)
   - Prevent invalid status transitions

### API Error Handling
1. **Network Failures**
   - Show user-friendly error messages
   - Retry failed requests with exponential backoff
   - Maintain local state during network issues

2. **Data Consistency**
   - Validate income records have required fields
   - Handle missing or null values gracefully
   - Provide default values for optional fields

## Testing Strategy

### Unit Testing Focus
1. **Status Calculation Functions**
   - Test calculateIncomeStatus with various date scenarios
   - Test getDaysOverdue calculation accuracy
   - Test edge cases (today is due date, far future dates)

2. **Pagination Logic**
   - Test page calculation with various record counts
   - Test boundary conditions (empty list, single page, many pages)
   - Test page size changes

3. **Dashboard Calculations**
   - Test metric calculations with sample data
   - Test profit margin calculation
   - Test collection rate calculation
   - Test handling of zero or null values

### Integration Testing
1. **Expected Income Flow**
   - Create expected income → Verify appears in table
   - Wait for due date to pass → Verify status changes to overdue
   - Collect payment → Verify status changes to collected

2. **Pagination Flow**
   - Load large dataset → Verify pagination appears
   - Navigate pages → Verify correct records displayed
   - Change page size → Verify records update correctly

3. **Dashboard Updates**
   - Add income → Verify dashboard metrics update
   - Collect payment → Verify collected income increases
   - Add expense → Verify profit margin recalculates

### User Acceptance Testing
1. **Income Management Workflow**
   - Create expected income with due date
   - View income in table with status
   - Filter by overdue status
   - Collect payment with transaction details
   - Verify payment appears as collected

2. **Reporting Workflow**
   - Generate income report
   - Verify expected vs collected comparison
   - Export report to PDF/Excel
   - Verify data accuracy

## Technical Implementation Details

### Pagination Implementation
```javascript
// Pagination Hook
function usePagination(data, initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  };
  
  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    goToPage,
    changePageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}
```

### Status Management Implementation
```javascript
// Automatic Status Update
useEffect(() => {
  const updateIncomeStatuses = () => {
    const today = new Date();
    
    const updatedIncome = income.map(inc => {
      // Skip if already collected
      if (inc.collectedAmount && inc.collectedDate) {
        return { ...inc, status: 'collected' };
      }
      
      // Check if overdue
      const dueDate = new Date(inc.dueDate);
      if (today > dueDate) {
        return { ...inc, status: 'overdue' };
      }
      
      return { ...inc, status: 'expected' };
    });
    
    setIncome(updatedIncome);
  };
  
  updateIncomeStatuses();
  
  // Update daily at midnight
  const interval = setInterval(updateIncomeStatuses, 24 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}, [income]);
```

### Dashboard Metrics Calculation
```javascript
// Calculate Dashboard Metrics
function calculateDashboardMetrics(income, expenses) {
  const totalExpectedIncome = income.reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);
  
  const collectedIncome = income.filter(inc => inc.status === 'collected');
  const totalCollectedIncome = collectedIncome.reduce((sum, inc) => sum + (inc.collectedAmount || 0), 0);
  
  const overdueIncome = income.filter(inc => inc.status === 'overdue');
  const totalOverdueAmount = overdueIncome.reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);
  const overdueCount = overdueIncome.length;
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  
  const profitMargin = totalCollectedIncome > 0 
    ? ((totalCollectedIncome - totalExpenses) / totalCollectedIncome * 100).toFixed(2)
    : 0;
  
  const collectionRate = totalExpectedIncome > 0
    ? (totalCollectedIncome / totalExpectedIncome * 100).toFixed(2)
    : 0;
  
  return {
    totalExpectedIncome,
    totalCollectedIncome,
    totalOverdueAmount,
    overdueCount,
    totalExpenses,
    profitMargin,
    collectionRate
  };
}
```

### API Endpoints Required
```javascript
// Income Management APIs
POST   /api/projects/:projectId/income/expected     // Create expected income
PUT    /api/projects/:projectId/income/:id/collect  // Collect payment
GET    /api/projects/:projectId/income              // Get all income (with pagination)
GET    /api/projects/:projectId/income/overdue      // Get overdue income
PUT    /api/projects/:projectId/income/:id          // Update income details
DELETE /api/projects/:projectId/income/:id          // Delete income record

// Dashboard APIs
GET    /api/projects/:projectId/dashboard/metrics   // Get dashboard metrics
GET    /api/projects/:projectId/reports/income      // Generate income report
```

### UI Component Structure

#### CreateExpectedIncomeModal
```jsx
<Modal>
  <Input label="Title" required />
  <Input label="Expected Amount" type="number" required />
  <DatePicker label="Due Date" required minDate={today} />
  <Input label="Invoice Number" required />
  <Textarea label="Notes" optional />
  <Button>Create Expected Income</Button>
</Modal>
```

#### CollectPaymentModal
```jsx
<Modal>
  <Display label="Expected Amount" value={expectedAmount} />
  <Input label="Actual Amount Collected" type="number" required />
  <Input label="Transaction Number" required />
  <Input label="Invoice Number" value={invoiceNumber} />
  <Select label="Payment Method" options={['Cash', 'Bank Transfer', 'Check', 'Card']} />
  <DatePicker label="Collection Date" required maxDate={today} />
  <FileUpload label="Receipt/Proof" optional />
  <Button>Collect Payment</Button>
</Modal>
```

#### Income Table with Status Badges
```jsx
<Table>
  <Column header="Title" />
  <Column header="Expected Amount" />
  <Column header="Collected Amount" render={(inc) => inc.collectedAmount || '-'} />
  <Column header="Due Date" />
  <Column header="Status" render={(inc) => (
    <Badge 
      color={inc.status === 'collected' ? 'green' : inc.status === 'overdue' ? 'red' : 'yellow'}
    >
      {inc.status}
      {inc.status === 'overdue' && ` (${getDaysOverdue(inc)} days)`}
    </Badge>
  )} />
  <Column header="Actions" render={(inc) => (
    inc.status !== 'collected' && <Button onClick={() => openCollectModal(inc)}>Collect</Button>
  )} />
</Table>
```

## Risk Mitigation

### Data Migration Risks
1. **Existing Income Records**: May have receiptType field that needs to be handled
   - **Mitigation**: Keep field in database but hide from UI, allow gradual migration

2. **Field Name Changes**: amount → collectedAmount, receivedDate → collectedDate
   - **Mitigation**: Support both old and new field names during transition period

3. **Status Field**: May not exist in old records
   - **Mitigation**: Calculate status on-the-fly for records without status field

### Performance Risks
1. **Large Datasets**: Pagination helps but initial load may be slow
   - **Mitigation**: Implement server-side pagination with API support

2. **Status Calculations**: Running on every render could be expensive
   - **Mitigation**: Memoize calculations using useMemo hook

3. **Dashboard Metrics**: Calculating on large datasets
   - **Mitigation**: Cache metrics and recalculate only when data changes

### User Experience Risks
1. **Confusion Between Expected and Collected**: Users may not understand the difference
   - **Mitigation**: Clear labeling, tooltips, and help text

2. **Overdue Notifications**: Users may miss overdue payments
   - **Mitigation**: Prominent visual indicators, dashboard alerts, optional email notifications