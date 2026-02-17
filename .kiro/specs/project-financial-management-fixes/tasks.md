# Implementation Plan

- [x] 1. Implement pagination utility and hook





  - [x] 1.1 Create usePagination custom hook with state management


    - Write hook to manage currentPage, pageSize, totalPages state
    - Implement goToPage, changePageSize, and data slicing logic
    - Return paginatedData, navigation helpers, and page info
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 1.2 Create PaginationControls reusable component


    - Build UI component with Previous/Next buttons
    - Add page number display and page size selector
    - Implement responsive design for mobile and desktop
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Update income data model and state management

















  - [x] 2.1 Modify income state structure in component

    - Update income state to use new field names (collectedAmount, collectedDate, transactionNumber)
    - Remove receiptType field from state initialization
    - Add status field to income objects
    - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3, 6.5_
  

  - [x] 2.2 Implement status calculation functions

    - Write calculateIncomeStatus function to determine expected/collected/overdue status
    - Write getDaysOverdue function to calculate days past due date
    - Add useEffect hook to automatically update statuses based on current date
    - _Requirements: 1.4, 3.1, 3.2, 3.4_
-


- [x] 3. Create expected income modal and functionality






  - [x] 3.1 Build CreateExpectedIncomeModal component


    - Create modal with form fields: title, expectedAmount, dueDate, invoiceNumber, notes
    - Add form validation for required fields and due date (must be future date)
    - Implement date picker with minimum date set to today
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 3.2 Implement API call to create expected income


    - Write handleCreateExpectedIncome function to POST to /api/projects/:projectId/income/expected
    - Handle success response and update local income state
    - Display success/error messages to user
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Create payment collection modal and functionality










  - [x] 4.1 Build CollectPaymentModal component


    - Create modal with fields: collectedAmount, transactionNumber, invoiceNumber, paymentMethod, collectedDate, receipt upload
    - Display expected amount as read-only reference
    - Add validation for transaction number and collected amount
    - Implement date picker with maximum date set to today
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.2 Implement API call to collect payment


    - Write handleCollectPayment function to PUT to /api/projects/:projectId/income/:id/collect
    - Update income status to 'collected' after successful collection
    - Handle file upload for receipt if provided
    - Display success/error messages to user
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Redesign income tab with pagination and status filtering



  - [ ] 5.1 Update IncomeTab table structure
    - Remove receiptType column from table
    - Add status badge column with color coding (green=collected, red=overdue, yellow=expected)
    - Add days overdue indicator for overdue payments
    - Update table to show both expectedAmount and collectedAmount columns
    - _Requirements: 3.1, 3.3, 3.4, 6.2, 6.3_
  
  - [ ] 5.2 Add status filter dropdown to IncomeTab
    - Create filter dropdown with options: All, Expected, Collected, Overdue
    - Implement filtering logic to show only selected status
    - Update filtered results when status changes
    - _Requirements: 3.3_
  
  - [ ] 5.3 Integrate pagination into IncomeTab
    - Apply usePagination hook to income data
    - Add PaginationControls component below income table
    - Implement page size selector with options: 10, 25, 50, 100
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 5.4 Update income action buttons
    - Replace single "Add Income" button with "Create Expected Income" button
    - Add "Collect Payment" button to each income row where status is not 'collected'
    - Wire buttons to open respective modals with appropriate data
    - _Requirements: 1.5, 2.5_


- [ ] 6. Add pagination to expenses tab

  - [ ] 6.1 Integrate pagination into ExpensesTab
    - Apply usePagination hook to expenses data
    - Add PaginationControls component below expenses table
    - Implement page size selector matching income tab
    - Maintain existing filtering and sorting functionality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Enhance financial dashboard with new metrics
  - [ ] 7.1 Implement dashboard metrics calculation function
    - Write calculateDashboardMetrics function to compute all financial KPIs
    - Calculate totalExpectedIncome, totalCollectedIncome, totalOverdueAmount, overdueCount
    - Calculate profitMargin using collected income (not expected)
    - Calculate collectionRate percentage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 7.2 Update FinancialDashboard component UI
    - Add Expected Income card displaying total expected amount
    - Add Collected Income card displaying total collected amount
    - Add Overdue Payments card showing overdue amount and count with red styling
    - Update Profit Margin card to use collected income in calculation
    - Add Collection Rate indicator with percentage and progress bar
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [ ] 8. Enhance reports tab with income analysis


  - [ ] 8.1 Create income vs expected comparison report
    - Build report section showing expected vs collected income side-by-side
    - Add variance calculation (collected - expected)
    - Display collection rate percentage
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 8.2 Create overdue payments report section
    - Build dedicated section listing all overdue payments
    - Show days overdue for each payment
    - Calculate total overdue amount
    - _Requirements: 7.2_
  
  - [ ] 8.3 Add report export functionality
    - Implement export to PDF functionality for reports
    - Implement export to Excel functionality for reports
    - Include all relevant data in exports (expected, collected, overdue)
    - _Requirements: 7.5_

- [ ] 9. Create backend API endpoints for income management



  - [ ] 9.1 Implement POST /api/projects/:projectId/income/expected endpoint
    - Create API route to handle expected income creation
    - Validate required fields (title, expectedAmount, dueDate, invoiceNumber)
    - Save income record to database with status='expected'
    - Return created income record
    - _Requirements: 1.1, 1.2, 1.3_
  

  - [-] 9.2 Implement PUT /api/projects/:projectId/income/:id/collect endpoint


    - Create API route to handle payment collection
    - Validate required fields (collectedAmount, transactionNumber, collectedDate)
    - Update income record with collection details and status='collected'
    - Handle receipt file upload if provided
    - Return updated income record
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 9.3 Update GET /api/projects/:projectId/income endpoint
    - Modify existing endpoint to support pagination query parameters (page, pageSize)
    - Add status filter query parameter
    - Calculate and include status for each income record in response
    - Return paginated results with total count
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 9.4 Create GET /api/projects/:projectId/dashboard/metrics endpoint
    - Create API route to calculate and return dashboard metrics
    - Aggregate expected income, collected income, overdue amounts
    - Calculate profit margin and collection rate
    - Return metrics object
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [-] 10. Handle data migration and backward compatibility



  - [x] 10.1 Add backward compatibility for old income records


    - Write migration logic to handle old field names (amount → collectedAmount, receivedDate → collectedDate)
    - Support income records without status field by calculating on-the-fly
    - Hide receiptType field in UI but preserve in database
    - _Requirements: 6.4_
   

  - [-] 10.2 Add data validation and error handling

    - Validate expected amount is positive number
    - Validate due date is valid date format
    - Validate collected amount when collecting payment
    - Show user-friendly error messages for validation failures
    - _Requirements: 1.1, 2.1, 2.2_