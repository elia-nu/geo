# Leave & Absence Management System

This document outlines the comprehensive Leave & Absence Management features that have been implemented in the HR Management System.

## 🎯 Features Implemented

### 1. Digital Leave Requests

- **Online Leave Applications**: Employees can submit leave requests through a user-friendly web interface
- **Multiple Leave Types**: Support for Annual, Sick, Personal, Maternity, Paternity, and Bereavement leave
- **Document Upload**: Ability to attach supporting documents (PDF, DOC, DOCX, JPG, PNG)
- **Real-time Status Tracking**: Employees can track the status of their leave requests

### 2. Automated Manager Approval Routing

- **Smart Routing Logic**: Automatic routing based on leave type, duration, and employee hierarchy
- **Multi-level Approvals**: Support for up to 4 approval levels:
  - Level 1: Immediate Supervisor (always required)
  - Level 2: Department Manager (for leaves > 5 days or special types)
  - Level 3: HR Manager (for leaves > 10 days or special cases)
  - Level 4: Senior Management (for leaves > 20 days)
- **Custom Routing Configuration**: Ability to set custom approval workflows per employee
- **Role-based Permissions**: Automatic approver identification based on department and designation

### 3. Real-Time Leave Balances

- **Auto-calculated Accruals**: Automatic calculation based on years of service and company policy
- **Multiple Leave Types**: Separate tracking for different leave categories
- **Usage Tracking**: Real-time updates of used, available, and pending leave days
- **Carry-forward Support**: Configurable carry-forward limits for different leave types
- **Visual Indicators**: Progress bars and color-coded status indicators

### 4. Integration with Attendance System

- **Leave Exclusion**: Approved leaves automatically excluded from absence counts
- **Payroll Integration**: Ready-to-use data for payroll processing with leave exclusions
- **Working Days Calculation**: Automatic calculation excluding weekends
- **Status Classification**: Clear distinction between absent, on leave, and present days

## 📁 File Structure

### API Endpoints

```
app/api/
├── leave/
│   ├── balances/
│   │   └── route.js                    # Leave balance management
│   └── approval-routing/
│       ├── route.js                    # Approval routing configuration
│       ├── requests/
│       │   └── route.js                # Get leave requests for approval
│       └── approve/
│           └── route.js                # Approve/reject leave requests
└── attendance/
    └── payroll-integration/
        └── route.js                    # Payroll data with leave exclusions
```

### Frontend Components

```
app/components/
├── EmployeeLeaveRequest.js             # Employee leave request interface
├── LeaveBalance.js                     # Leave balance display component
├── ManagerLeaveApproval.js             # Manager approval interface
└── EmployeeSidebar.js                  # Updated with leave balance navigation
```

## 🔧 Technical Implementation

### Database Collections

#### 1. `leave_balances`

```javascript
{
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
      description: String
    },
    // ... other leave types
  },
  adjustments: [{
    leaveType: String,
    adjustment: Number,
    reason: String,
    adminId: ObjectId,
    adjustedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. `approval_routing`

```javascript
{
  employeeId: ObjectId,
  routingConfig: {
    levels: [{
      level: Number,
      role: String,
      required: Boolean,
      description: String,
      approvers: [ObjectId]
    }]
  },
  updatedBy: ObjectId,
  updatedAt: Date
}
```

#### 3. Enhanced `attendance_documents`

```javascript
{
  // ... existing fields
  leaveType: String,                    // For leave requests
  approvalHistory: [{
    approverId: ObjectId,
    approverName: String,
    action: String,                     // "approve" or "reject"
    notes: String,
    approvedAt: Date
  }]
}
```

### Key Features

#### 1. Leave Balance Calculation

- **Automatic Accrual**: Based on employment date and company policy
- **Real-time Updates**: Automatic recalculation when leave requests are approved
- **Working Days**: Excludes weekends from leave day calculations
- **Carry-forward Logic**: Configurable limits for different leave types

#### 2. Approval Workflow

- **Hierarchical Routing**: Automatic routing based on employee hierarchy
- **Permission Checking**: Ensures only authorized managers can approve requests
- **Audit Trail**: Complete history of all approval actions
- **Multi-level Support**: Sequential approval through multiple levels

#### 3. Payroll Integration

- **Leave Exclusion**: Approved leaves marked as "on_leave" status
- **Working Hours**: Automatic calculation excluding leave days
- **Export Formats**: Support for JSON, CSV, and Excel exports
- **Summary Reports**: Department and employee-level summaries

## 🚀 Usage Guide

### For Employees

#### 1. Submit Leave Request

1. Navigate to "Leave Requests" in the employee portal
2. Click "New Request"
3. Select leave type, dates, and provide reason
4. Upload supporting documents (optional)
5. Submit request

#### 2. View Leave Balance

1. Navigate to "Leave Balance" in the employee portal
2. View real-time balances for all leave types
3. Check usage percentages and remaining days
4. Export balance report if needed

### For Managers

#### 1. Approve Leave Requests

1. Access the manager approval interface
2. Filter requests by status, department, or date range
3. Review request details and supporting documents
4. Approve or reject with notes
5. Track approval history

#### 2. Configure Approval Routing

1. Set custom approval workflows for specific employees
2. Define approval levels and required approvers
3. Override default routing logic when needed

### For HR/Administrators

#### 1. Manage Leave Balances

1. Adjust leave balances manually when needed
2. View balance reports across all employees
3. Monitor leave usage patterns

#### 2. Generate Payroll Reports

1. Export attendance data with leave exclusions
2. Generate department-level summaries
3. Export in multiple formats for payroll systems

## 🔒 Security & Permissions

### Role-based Access Control

- **Employees**: Can view own leave balance and submit requests
- **Managers**: Can approve requests for their team members
- **HR Managers**: Can approve all requests and manage balances
- **Administrators**: Full access to all features and configurations

### Data Validation

- **Date Validation**: Ensures leave dates are valid and not in the past
- **Balance Validation**: Prevents leave requests exceeding available balance
- **Permission Validation**: Ensures only authorized users can approve requests

## 📊 Reporting & Analytics

### Available Reports

1. **Leave Balance Reports**: Individual and team leave balances
2. **Approval Status Reports**: Pending, approved, and rejected requests
3. **Leave Usage Reports**: Department and company-wide leave patterns
4. **Payroll Integration Reports**: Attendance data with leave exclusions

### Export Options

- **JSON**: For system integration
- **CSV**: For spreadsheet analysis
- **Excel**: For detailed reporting

## 🔄 Integration Points

### Existing System Integration

- **Employee Database**: Uses existing employee records
- **Attendance System**: Integrates with daily attendance tracking
- **Document Management**: Leverages existing file upload system
- **Audit System**: Integrates with existing audit logging

### External System Integration

- **Payroll Systems**: Ready-to-use data export
- **HRIS Systems**: Standard data formats for integration
- **Email Notifications**: Can be extended for approval notifications

## 🛠 Configuration Options

### Leave Policy Configuration

```javascript
const leaveEntitlements = {
  annual: { daysPerYear: 20, maxCarryForward: 5 },
  sick: { daysPerYear: 10, maxCarryForward: 0 },
  personal: { daysPerYear: 5, maxCarryForward: 0 },
  maternity: { daysPerYear: 90, maxCarryForward: 0 },
  paternity: { daysPerYear: 14, maxCarryForward: 0 },
  bereavement: { daysPerYear: 3, maxCarryForward: 0 },
};
```

### Approval Routing Configuration

```javascript
const approvalLevels = [
  { level: 1, role: "immediate_supervisor", required: true },
  {
    level: 2,
    role: "department_manager",
    required: true,
    condition: "days > 5",
  },
  { level: 3, role: "hr_manager", required: true, condition: "days > 10" },
  {
    level: 4,
    role: "senior_management",
    required: true,
    condition: "days > 20",
  },
];
```

## 🎯 Benefits

### For Employees

- **Transparency**: Clear view of leave balances and request status
- **Convenience**: Easy online submission and tracking
- **Accuracy**: Automatic calculation prevents errors

### For Managers

- **Efficiency**: Automated routing reduces manual work
- **Control**: Clear approval workflows and permissions
- **Visibility**: Complete view of team leave patterns

### For Organization

- **Compliance**: Proper leave tracking and approval workflows
- **Integration**: Seamless integration with payroll and attendance
- **Analytics**: Data-driven insights for workforce planning

## 🔮 Future Enhancements

### Planned Features

1. **Email Notifications**: Automatic notifications for approvals and status changes
2. **Mobile App**: Native mobile application for leave management
3. **Calendar Integration**: Sync with popular calendar applications
4. **Advanced Analytics**: Predictive analytics for leave planning
5. **Workflow Automation**: Advanced workflow rules and automation

### Integration Opportunities

1. **Slack/Teams Integration**: Approval notifications in chat platforms
2. **Calendar Systems**: Integration with Google Calendar, Outlook
3. **HRIS Integration**: Deep integration with existing HR systems
4. **Payroll Systems**: Direct integration with payroll processing

## 📝 Support & Maintenance

### Regular Maintenance

- **Balance Recalculation**: Monthly automatic balance updates
- **Data Cleanup**: Regular cleanup of old records
- **Performance Optimization**: Database indexing and query optimization

### Troubleshooting

- **Common Issues**: Documentation of common problems and solutions
- **Error Logging**: Comprehensive error logging for debugging
- **Support Channels**: Clear escalation paths for technical issues

---

This Leave & Absence Management system provides a comprehensive solution for modern organizations, combining ease of use with powerful automation and integration capabilities.
