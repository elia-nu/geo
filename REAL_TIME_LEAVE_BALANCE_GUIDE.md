# Real-Time Leave Balance System

## Overview

The Real-Time Leave Balance System provides comprehensive leave management with automatic accrual calculations, real-time updates, and advanced monitoring capabilities. This system ensures accurate leave tracking and provides both employees and administrators with up-to-date information.

## Features

### ✅ Real-Time Accrual Calculations

- **Automatic accrual based on employment date**
- **Prorated calculations for new employees**
- **Annual accrual calculations**
- **Carry-forward support for eligible leave types**

### ✅ Leave Types Supported

- **Annual Leave**: 20 days/year, 5 days carry-forward
- **Sick Leave**: 10 days/year, no carry-forward
- **Personal Leave**: 5 days/year, no carry-forward
- **Maternity Leave**: 90 days/year, no carry-forward
- **Paternity Leave**: 14 days/year, no carry-forward
- **Bereavement Leave**: 3 days/year, no carry-forward

### ✅ Real-Time Monitoring

- **Live balance updates**
- **Auto-refresh capabilities**
- **Real-time notifications**
- **Usage percentage tracking**

### ✅ Admin Management

- **Bulk leave balance management**
- **Manual adjustments with audit trail**
- **Department-based filtering**
- **Export capabilities (CSV/JSON)**

### ✅ Notifications & Alerts

- **Low balance warnings**
- **High usage alerts**
- **Pending request notifications**
- **Accrual reminders**

## API Endpoints

### 1. Basic Leave Balance API

```
GET /api/leave/balances?employeeId={id}
PUT /api/leave/balances
```

**Features:**

- Fetch individual employee leave balance
- Update leave balance (admin only)
- Automatic balance creation for new employees
- Real-time accrual calculations

### 2. Real-Time Leave Balance API

```
GET /api/leave/balances/realtime?employeeId={id}&includeNotifications=true
POST /api/leave/balances/realtime
```

**Features:**

- Real-time balance calculations
- Bulk employee management
- Department filtering
- Notification generation
- Admin actions (adjust, recalculate, reset)

### 3. Export API

```
POST /api/leave/balances/export
```

**Features:**

- CSV and JSON export formats
- Department-based filtering
- Comprehensive leave data export
- Employee details inclusion

## Frontend Components

### 1. LeaveBalance Component

**Location:** `app/components/LeaveBalance.js`

**Features:**

- Employee leave balance display
- Real-time mode toggle
- Auto-refresh functionality
- Detailed leave information
- Export capabilities
- Usage progress bars

**Usage:**

```jsx
<LeaveBalance
  employeeId={employeeId}
  employeeName={employeeName}
  isManager={false}
/>
```

### 2. AdminLeaveBalanceManagement Component

**Location:** `app/components/AdminLeaveBalanceManagement.js`

**Features:**

- Bulk employee management
- Real-time monitoring dashboard
- Leave balance adjustments
- Department filtering
- Export functionality
- Notification management

**Usage:**

```jsx
<AdminLeaveBalanceManagement />
```

## Database Schema

### Leave Balances Collection

```javascript
{
  _id: ObjectId,
  employeeId: ObjectId,
  employeeName: String,
  employmentDate: Date,
  yearsOfService: Number,
  balances: {
    annual: {
      totalEarned: Number,
      carriedForward: Number,
      available: Number,
      used: Number,
      pending: Number,
      currentYearAccrual: Number,
      nextAccrualDate: Date,
      description: String,
      lastCalculated: Date
    },
    // ... other leave types
  },
  adjustments: [{
    leaveType: String,
    adjustment: Number,
    reason: String,
    adminId: String,
    adjustedAt: Date
  }],
  lastCalculated: Date,
  realTimeAccrual: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Accrual Logic

### 1. New Employee (Current Year)

```javascript
// Prorated accrual based on employment date
const daysInYear = (currentDate - employmentDate) / (1000 * 60 * 60 * 24);
const totalDaysInYear = 365;
const accrual = Math.floor((daysInYear / totalDaysInYear) * daysPerYear);
```

### 2. Existing Employee

```javascript
// Full annual accrual
const accrual = daysPerYear;
```

### 3. Carry-Forward Calculation

```javascript
// Only for eligible leave types (e.g., Annual Leave)
const carriedForward = Math.min(
  maxCarryForward,
  Math.max(0, totalEarned - daysPerYear)
);
```

## Real-Time Features

### 1. Auto-Refresh

- **Interval**: 30 seconds (configurable)
- **Trigger**: User-enabled auto-refresh
- **Scope**: Individual employee or bulk monitoring

### 2. Live Notifications

- **Low Balance**: ≤ 2 days remaining
- **High Usage**: ≥ 80% of leave used
- **Pending Requests**: Leave requests awaiting approval
- **Priority Levels**: High, Medium, Low

### 3. Real-Time Calculations

- **Current year accrual**
- **Next accrual date**
- **Usage percentages**
- **Available balance updates**

## Admin Functions

### 1. Leave Balance Adjustments

```javascript
// Adjust leave balance
POST /api/leave/balances/realtime
{
  "employeeId": "employee_id",
  "action": "adjust",
  "leaveType": "annual",
  "days": 5,
  "reason": "Compensation for overtime",
  "adminId": "admin_id"
}
```

### 2. Recalculate Balances

```javascript
// Recalculate all balances
POST /api/leave/balances/realtime
{
  "employeeId": "employee_id",
  "action": "recalculate",
  "adminId": "admin_id"
}
```

### 3. Reset Balances

```javascript
// Reset to initial state
POST /api/leave/balances/realtime
{
  "employeeId": "employee_id",
  "action": "reset",
  "adminId": "admin_id"
}
```

## Usage Examples

### 1. Employee View

```jsx
// Employee checking their leave balance
const employeeId = "64f1a2b3c4d5e6f7g8h9i0j1";
<LeaveBalance
  employeeId={employeeId}
  employeeName="John Doe"
  isManager={false}
/>;
```

### 2. Manager View

```jsx
// Manager viewing team leave balances
<AdminLeaveBalanceManagement />
```

### 3. Export Leave Data

```javascript
// Export leave balances to CSV
const response = await fetch("/api/leave/balances/export", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    format: "csv",
    department: "IT",
  }),
});
```

## Configuration

### 1. Leave Entitlements

Modify in `app/api/leave/balances/route.js`:

```javascript
const leaveEntitlements = {
  annual: {
    daysPerYear: 20,
    maxCarryForward: 5,
    description: "Annual Leave",
  },
  // ... other leave types
};
```

### 2. Notification Thresholds

Modify in `app/api/leave/balances/realtime/route.js`:

```javascript
// Low balance threshold
if (leaveBalance.available <= 2) {
  // Generate warning
}

// High usage threshold
if (usagePercentage >= 80) {
  // Generate alert
}
```

### 3. Auto-Refresh Interval

Modify in frontend components:

```javascript
// 30 seconds interval
const interval = setInterval(fetchLeaveBalance, 30000);
```

## Security & Audit

### 1. Audit Trail

- All leave balance adjustments are logged
- Admin actions are tracked
- Employee access is monitored

### 2. Access Control

- Employee: View own balance only
- Manager: View team balances
- Admin: Full access to all functions

### 3. Data Validation

- Input validation on all API endpoints
- Balance validation before adjustments
- Employment date verification

## Performance Considerations

### 1. Database Optimization

- Indexed queries on employeeId
- Efficient aggregation pipelines
- Cached calculations where appropriate

### 2. Real-Time Updates

- Optimized refresh intervals
- Selective data updates
- Efficient notification generation

### 3. Bulk Operations

- Batch processing for large datasets
- Pagination for large result sets
- Optimized export functions

## Troubleshooting

### 1. Common Issues

- **Balance not updating**: Check real-time mode is enabled
- **Incorrect accruals**: Verify employment date
- **Missing notifications**: Check notification thresholds
- **Export failures**: Verify data format and permissions

### 2. Debug Mode

Enable console logging for debugging:

```javascript
console.log("Leave balance calculation:", balance);
console.log("Real-time accrual:", accrual);
```

### 3. Data Validation

Use the recalculation function to fix inconsistencies:

```javascript
// Recalculate specific employee
POST /api/leave/balances/realtime
{
  "employeeId": "employee_id",
  "action": "recalculate"
}
```

## Future Enhancements

### 1. Planned Features

- **Leave request integration**
- **Calendar integration**
- **Mobile app support**
- **Advanced reporting**

### 2. Customization Options

- **Configurable leave types**
- **Custom accrual rules**
- **Department-specific policies**
- **Role-based entitlements**

### 3. Integration Possibilities

- **HR system integration**
- **Payroll system sync**
- **Email notifications**
- **SMS alerts**

## Support

For technical support or feature requests, please refer to the development team or create an issue in the project repository.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready
