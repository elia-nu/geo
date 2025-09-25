# 📋 Leave Request Approval Guide

This guide explains how managers can approve or deny leave requests in the HRM system.

## 🎯 Where to Approve/Deny Requests

### Primary Location: HRM Portal

**URL**: `http://localhost:3000/hrm`

**Navigation Path**:

1. Go to the HRM portal
2. In the left sidebar, expand **"Leave Management"**
3. Click on **"Leave Approval"**



### Alternative: Direct URL

**Direct Access**: `http://localhost:3000/hrm` → Select "Leave Approval" from sidebar

## 🖥️ Interface Overview

The Leave Approval interface provides:

- **📋 Request List**: All pending leave requests that require your approval
- **🔍 Search & Filters**: Filter by status, department, leave type, and date range
- **✅ Action Buttons**: Approve/Reject buttons for each request
- **📊 Request Details**: Employee info, leave dates, reason, and current status

## 🚀 Quick Start

### Step 1: Access the Interface

1. **Open your browser** and go to `http://localhost:3000/hrm`
2. **Login** with your admin credentials
3. **Navigate** to **Leave Management** → **Leave Approval**

### Step 2: Review Pending Requests

The interface will show:

- **Employee Name** and **Department**
- **Leave Type** (Annual, Sick, Personal, etc.)
- **Start and End Dates**
- **Number of Days** requested
- **Reason** for leave
- **Current Status** (Pending)

### Step 3: Approve or Reject

For each request, you can:

#### ✅ **Approve Request**

1. Click the **"Approve"** button (green checkmark)
2. Add optional **approval notes**
3. Click **"Submit Approval"**
4. The request status changes to "Approved"
5. Employee's leave balance is automatically updated

#### ❌ **Reject Request**

1. Click the **"Reject"** button (red X)
2. **Required**: Add rejection reason/notes
3. Click **"Submit Rejection"**
4. The request status changes to "Rejected"
5. Employee is notified of the rejection

## 🔍 Advanced Features

### Filtering Options

Use the filter panel to narrow down requests:

- **Status**: Pending, Approved, Rejected, All
- **Department**: Filter by employee department
- **Leave Type**: Annual, Sick, Personal, Maternity, etc.
- **Date Range**: Last 7 days, Last 30 days, Custom range
- **Search**: Search by employee name or request details

### Bulk Actions

For multiple requests:

- **Select multiple requests** using checkboxes
- **Bulk approve** or **bulk reject** with common notes
- **Export** filtered results to CSV/Excel

### Request Details

Click **"View Details"** to see:

- **Complete request information**
- **Approval history** (if any)
- **Employee's current leave balance**
- **Previous leave requests**
- **Manager comments**

## 📊 Leave Balance Integration

When you approve a leave request:

1. **Automatic Balance Update**: The employee's leave balance is automatically decremented
2. **Real-time Updates**: Changes are reflected immediately in the Leave Balances section
3. **Audit Trail**: All approvals are logged with timestamp and approver details

## 🔐 Permission Levels

### Manager Permissions

- **Department Managers**: Can approve requests from their department
- **HR Managers**: Can approve requests from any department
- **Senior Managers**: Can approve all requests and override other approvals

### Approval Hierarchy

The system supports multi-level approval:

1. **Level 1**: Direct Supervisor
2. **Level 2**: Department Manager
3. **Level 3**: HR Manager
4. **Level 4**: Senior Management (for extended leaves)

## 📱 Mobile Access

The interface is **mobile-responsive** and can be accessed from:

- **Smartphones** and **tablets**
- **Mobile browsers** (Chrome, Safari, Firefox)
- **Progressive Web App** features available

## 🔔 Notifications

### Automatic Notifications

When you approve/reject a request:

- **Email notification** sent to employee
- **In-app notification** in employee portal
- **SMS notification** (if configured)
- **Calendar update** (if integrated)

### Notification Settings

Configure your notification preferences:

- **Email notifications**: On/Off
- **SMS notifications**: On/Off
- **In-app notifications**: On/Off
- **Notification frequency**: Immediate, Daily digest, Weekly summary

## 📈 Reporting & Analytics

### Approval Statistics

View your approval metrics:

- **Requests processed** this month
- **Average approval time**
- **Approval rate** by department
- **Common rejection reasons**

### Export Options

Export approval data for:

- **Monthly reports**
- **Audit purposes**
- **Performance reviews**
- **Compliance reporting**

## 🛠️ Troubleshooting

### Common Issues

#### "No pending requests shown"

- **Check filters**: Make sure you haven't applied restrictive filters
- **Refresh page**: Click the refresh button
- **Check permissions**: Ensure you have approval permissions for the department

#### "Cannot approve request"

- **Check approval level**: Request might need higher-level approval
- **Verify permissions**: Ensure you have the right role
- **Check request status**: Request might already be approved/rejected

#### "Balance not updating"

- **Refresh page**: Click refresh to see latest balances
- **Check approval**: Ensure request was actually approved
- **Contact HR**: If issue persists, contact HR support

### Error Messages

| Error               | Solution                                               |
| ------------------- | ------------------------------------------------------ |
| "Permission denied" | Contact HR to verify your approval permissions         |
| "Request not found" | Refresh the page and try again                         |
| "Invalid action"    | Ensure you're using the correct approve/reject buttons |
| "Notes required"    | Add rejection notes when rejecting a request           |

## 🎯 Best Practices

### Approval Guidelines

1. **Review thoroughly**: Check leave dates, reason, and employee's balance
2. **Respond promptly**: Process requests within 24-48 hours
3. **Add helpful notes**: Provide constructive feedback when rejecting
4. **Check patterns**: Look for unusual leave patterns or conflicts
5. **Consider workload**: Ensure team coverage during leave periods

### Communication Tips

1. **Be clear**: Use specific, actionable language in notes
2. **Be consistent**: Apply the same standards to all employees
3. **Be timely**: Respond quickly to avoid employee uncertainty
4. **Be professional**: Keep notes professional and constructive

## 📞 Support

### Getting Help

If you encounter issues:

1. **Check this guide** for common solutions
2. **Contact HR Support**: hr-support@company.com
3. **System Admin**: admin@company.com
4. **Emergency**: Call IT support at extension 1234

### Training Resources

- **Video tutorials**: Available in the HR portal
- **User manual**: Downloadable PDF guide
- **Training sessions**: Monthly group training available
- **One-on-one support**: Schedule with HR team

---

## 🧪 Testing the System

To test the leave approval system:

1. **Run the test script**: Copy and paste the contents of `test-leave-approval.js` into your browser console
2. **Execute**: Run `testLeaveApprovalSystem()` in the console
3. **Follow the prompts**: The script will create test data and guide you through the process
4. **Verify functionality**: Check that all features are working as expected

**Test Script Location**: `test-leave-approval.js` in your project root

---

_Last updated: January 2024_
_Version: 1.0_
