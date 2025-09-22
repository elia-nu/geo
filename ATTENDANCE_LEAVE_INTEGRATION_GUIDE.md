# Attendance-Leave Integration Guide

## Overview

The Attendance-Leave Integration system ensures that approved leave requests are properly excluded from absence counts and payroll deductions. This integration provides accurate attendance tracking and fair payroll processing by distinguishing between actual absences and approved leave days.

## Key Features

### ✅ Approved Leave Exclusion

- **Absence Counts**: Approved leave days are excluded from absence calculations
- **Payroll Deductions**: No deductions for approved leave days
- **Working Hours**: Leave days show 0 working hours
- **Status Tracking**: Clear distinction between "absent" and "on_leave" statuses

### ✅ Comprehensive Reporting

- **Integrated Dashboard**: Real-time view of attendance with leave data
- **Payroll Integration**: Ready-to-use data for payroll processing
- **Department Analytics**: Breakdown by department and employee
- **Leave Type Tracking**: Detailed tracking of different leave types

### ✅ Real-time Updates

- **Automatic Integration**: Leave approvals automatically update attendance records
- **Live Dashboard**: Real-time statistics and trends
- **Export Functionality**: CSV/Excel export for external systems

## API Endpoints

### 1. Payroll Integration API

```
GET /api/attendance/payroll-integration
```

**Parameters:**

- `startDate` (required): Start date for the period
- `endDate` (required): End date for the period
- `employeeId` (optional): Specific employee ID
- `includeLeaveData` (optional): Include detailed leave information

**Response:**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "employeeId": "ObjectId",
        "employeeName": "John Doe",
        "department": "IT",
        "date": "2025-09-20",
        "checkInTime": "2025-09-20T09:00:00Z",
        "checkOutTime": "2025-09-20T17:00:00Z",
        "workingHours": 8,
        "payrollStatus": "present|absent|on_leave|partial",
        "absenceReason": null,
        "leaveInfo": {
          "leaveType": "sick",
          "leaveId": "ObjectId",
          "reason": "Medical appointment"
        }
      }
    ],
    "summary": {
      "totalEmployees": 10,
      "totalDays": 200,
      "totalWorkingHours": 1600,
      "totalAbsentDays": 5,
      "totalLeaveDays": 15,
      "totalPartialDays": 2
    }
  }
}
```

### 2. Integrated Reports API

```
GET /api/attendance/reports/integrated
```

**Parameters:**

- `startDate` (required): Start date for the period
- `endDate` (required): End date for the period
- `employeeId` (optional): Specific employee ID
- `department` (optional): Filter by department
- `includeLeaveDetails` (optional): Include detailed leave information

**Response:**

```json
{
  "success": true,
  "data": {
    "records": [...],
    "statistics": {
      "totalRecords": 200,
      "totalEmployees": 10,
      "totalWorkingHours": 1600,
      "totalAbsentDays": 5,
      "totalLeaveDays": 15,
      "totalPartialDays": 2,
      "totalPresentDays": 178,
      "totalPayrollDeductions": 6,
      "averageWorkingHours": 8.0,
      "byDepartment": {...},
      "byEmployee": {...},
      "byLeaveType": {
        "sick": 8,
        "annual": 5,
        "personal": 2
      },
      "attendanceTrend": {...}
    }
  }
}
```

## Payroll Status Types

### 1. `present`

- **Description**: Employee worked full day
- **Working Hours**: Actual hours worked
- **Payroll Deduction**: 0 days
- **Check-in/out**: Both recorded

### 2. `on_leave`

- **Description**: Employee on approved leave
- **Working Hours**: 0 hours
- **Payroll Deduction**: 0 days
- **Leave Info**: Includes leave type and reason

### 3. `absent`

- **Description**: Employee absent without approved leave
- **Working Hours**: 0 hours
- **Payroll Deduction**: 1 day (full deduction)
- **Absence Reason**: "No check-in recorded"

### 4. `partial`

- **Description**: Employee worked partial day
- **Working Hours**: Calculated based on check-in time
- **Payroll Deduction**: 0.5 days (half deduction)
- **Check-in**: Recorded, check-out: missing

## Frontend Components

### 1. Enhanced Attendance Management

**File**: `app/components/AttendanceManagement.js`

**Features:**

- Integrated with payroll API for leave data
- "On Leave" status filter
- Visual distinction between absences and leave days
- Real-time leave information display

**Key Updates:**

```javascript
// Status filter includes leave option
{ value: "leave", label: "On Leave" }

// Status display shows leave type
if (record.leaveInfo) {
  return {
    text: `On Leave (${record.leaveInfo.leaveType})`,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    icon: Calendar,
  };
}
```

### 2. Integrated Attendance Dashboard

**File**: `app/components/IntegratedAttendanceDashboard.js`

**Features:**

- Comprehensive statistics overview
- Department and employee breakdowns
- Leave type analytics
- Payroll impact visualization
- Export functionality

## Database Integration

### Leave Request Processing

When a leave request is approved, the system:

1. **Updates Leave Balance**: Automatically updates used/available leave days
2. **Triggers UI Refresh**: Notifies frontend components of changes
3. **Integrates with Attendance**: Leave days are immediately available in attendance reports

### Attendance Record Processing

The system processes attendance records by:

1. **Checking Leave Status**: For each date, checks if employee is on approved leave
2. **Setting Payroll Status**: Assigns appropriate status (present/absent/on_leave/partial)
3. **Calculating Hours**: Determines working hours based on status
4. **Applying Deductions**: Calculates payroll deductions excluding leave days

## Testing

### Test Script

**File**: `test-attendance-leave-integration.js`

**Test Coverage:**

- Payroll integration API functionality
- Integrated reports API functionality
- Leave exclusion from absence counts
- Payroll deduction calculations
- Leave type tracking

**Run Test:**

```bash
node test-attendance-leave-integration.js
```

## Usage Examples

### 1. Get Payroll Data for Current Month

```javascript
const response = await fetch(
  "/api/attendance/payroll-integration?startDate=2025-09-01&endDate=2025-09-30&includeLeaveData=true"
);
const data = await response.json();

// Process payroll data
data.data.records.forEach((record) => {
  if (record.payrollStatus === "on_leave") {
    console.log(
      `${record.employeeName} on ${record.leaveInfo.leaveType} leave - no deduction`
    );
  } else if (record.payrollStatus === "absent") {
    console.log(`${record.employeeName} absent - 1 day deduction`);
  }
});
```

### 2. Generate Department Report

```javascript
const response = await fetch(
  "/api/attendance/reports/integrated?startDate=2025-09-01&endDate=2025-09-30&department=IT"
);
const data = await response.json();

console.log("IT Department Statistics:", data.data.statistics.byDepartment.IT);
```

### 3. Track Leave Types

```javascript
const response = await fetch(
  "/api/attendance/reports/integrated?startDate=2025-09-01&endDate=2025-09-30"
);
const data = await response.json();

console.log("Leave Types Breakdown:", data.data.statistics.byLeaveType);
```

## Benefits

### For HR Management

- **Accurate Reporting**: Clear distinction between absences and leave days
- **Fair Payroll**: No deductions for approved leave days
- **Compliance**: Proper tracking for labor law compliance
- **Analytics**: Detailed insights into attendance patterns

### For Employees

- **Transparency**: Clear visibility of leave status
- **Fair Treatment**: No payroll deductions for approved leave
- **Real-time Updates**: Immediate reflection of leave approvals

### for Payroll Processing

- **Ready-to-Use Data**: Pre-calculated payroll deductions
- **Export Options**: CSV/Excel formats for external systems
- **Audit Trail**: Complete history of attendance and leave decisions

## Configuration

### Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/geo
```

### Database Collections

- `daily_attendance`: Attendance records
- `attendance_documents`: Leave requests
- `leave_balances`: Employee leave balances
- `employees`: Employee information

## Troubleshooting

### Common Issues

1. **Leave Days Showing as Absent**

   - Check if leave request is approved (`status: "approved"`)
   - Verify date range overlaps correctly
   - Ensure employee ID matches in both collections

2. **Payroll Deductions Incorrect**

   - Verify payroll status calculation logic
   - Check working hours calculation
   - Ensure leave days have 0 deductions

3. **API Not Returning Leave Data**
   - Check `includeLeaveData` parameter
   - Verify date range parameters
   - Ensure proper authentication

### Debug Logging

Enable debug logging by adding console.log statements in:

- `app/api/attendance/payroll-integration/route.js`
- `app/api/attendance/reports/integrated/route.js`

## Future Enhancements

### Planned Features

- **Holiday Integration**: Automatic holiday detection
- **Overtime Calculation**: Overtime hours for extended work
- **Shift Management**: Different shift patterns support
- **Mobile App**: Mobile attendance tracking
- **Notifications**: Real-time attendance alerts

### Integration Opportunities

- **HRIS Systems**: Integration with external HR systems
- **Payroll Software**: Direct integration with payroll providers
- **Time Tracking**: Integration with time tracking tools
- **Analytics**: Advanced analytics and reporting

## Support

For technical support or questions about the attendance-leave integration:

1. Check the test script output for validation
2. Review API responses for error messages
3. Verify database collections and data integrity
4. Check frontend component console logs

## Conclusion

The Attendance-Leave Integration system provides a comprehensive solution for managing attendance with proper leave handling. It ensures accurate payroll processing, fair employee treatment, and detailed reporting capabilities while maintaining data integrity and real-time updates.

The system is designed to be scalable, maintainable, and user-friendly, providing both technical and business value to organizations implementing it.
