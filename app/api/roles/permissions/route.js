import { NextResponse } from "next/server";

// Master Permission Catalog — single source of truth
// Every permission in the system must be listed here.
export const PERMISSION_CATALOG = {
  "Employee Management": [
    { key: "employee.create", label: "Create Employees", description: "Add new employees to the system" },
    { key: "employee.read", label: "View All Employees", description: "View all employee profiles and data" },
    { key: "employee.update", label: "Edit Employees", description: "Modify employee records" },
    { key: "employee.delete", label: "Delete Employees", description: "Remove employees from the system" },
    { key: "employee.read.own", label: "View Own Profile", description: "View own employee profile" },
    { key: "employee.update.own", label: "Edit Own Profile", description: "Update own personal details" },
    { key: "employee.export", label: "Export Employee Data", description: "Export employee data to Excel/CSV" },
  ],
  "Document Management": [
    { key: "document.create", label: "Upload Documents", description: "Upload documents for any employee" },
    { key: "document.read", label: "View All Documents", description: "View all documents in the system" },
    { key: "document.update", label: "Edit Documents", description: "Modify document metadata" },
    { key: "document.delete", label: "Delete Documents", description: "Remove documents from the system" },
    { key: "document.read.own", label: "View Own Documents", description: "View documents related to own profile" },
    { key: "document.create.own", label: "Upload Own Documents", description: "Upload documents for own profile" },
  ],
  "Attendance & Leave": [
    { key: "attendance.view", label: "View Attendance", description: "View attendance records" },
    { key: "attendance.manage", label: "Manage Attendance", description: "Edit and manage attendance records" },
    { key: "attendance.reports", label: "Attendance Reports", description: "View attendance analytics and reports" },
    { key: "attendance.checkin", label: "Check In/Out", description: "Record own attendance check-in/out" },
    { key: "leave.request", label: "Submit Leave Requests", description: "Submit own leave requests" },
    { key: "leave.approve", label: "Approve Leave Requests", description: "Approve or reject leave requests" },
    { key: "leave.manage", label: "Manage Leave Balances", description: "Adjust leave balances for employees" },
    { key: "leave.view.all", label: "View All Leave Requests", description: "View leave requests from all employees" },
    { key: "overtime.view", label: "View Overtime", description: "View overtime records" },
    { key: "overtime.manage", label: "Manage Overtime", description: "Approve and manage overtime" },
  ],
  "Payroll": [
    { key: "payroll.view", label: "View Payroll", description: "View payroll data and calculations" },
    { key: "payroll.manage", label: "Manage Payroll", description: "Process and edit payroll" },
    { key: "payroll.approve", label: "Approve Payroll", description: "Final approval for payroll processing" },
    { key: "payroll.reports", label: "Payroll Reports", description: "View payroll analytics and reports" },
  ],
  "Projects & Tasks": [
    { key: "project.create", label: "Create Projects", description: "Create new projects" },
    { key: "project.read", label: "View All Projects", description: "View all projects across the organization" },
    { key: "project.read.assigned", label: "View Assigned Projects", description: "View only projects that you are assigned to as manager or team member" },
    { key: "project.update", label: "Edit Projects", description: "Modify project details" },
    { key: "project.delete", label: "Delete Projects", description: "Remove projects" },
    { key: "project.budget", label: "Manage Project Budgets", description: "Manage financial budgets for projects" },
    { key: "task.create", label: "Create Tasks", description: "Create new tasks" },
    { key: "task.read", label: "View Tasks", description: "View task details" },
    { key: "task.assign", label: "Assign Tasks", description: "Assign tasks to team members" },
    { key: "task.manage", label: "Manage All Tasks", description: "Full task management capabilities" },
    { key: "task.read.own", label: "View Own Tasks", description: "View tasks assigned to self" },
  ],
  "Organization": [
    { key: "department.read", label: "View Departments", description: "View department structure" },
    { key: "department.manage", label: "Manage Departments", description: "Create, edit, delete departments" },
    { key: "designation.read", label: "View Designations", description: "View job designations" },
    { key: "designation.manage", label: "Manage Designations", description: "Create, edit, delete designations" },
    { key: "location.read", label: "View Work Locations", description: "View work locations, GPS coordinates, and assigned staff" },
    { key: "location.create", label: "Create Work Locations", description: "Add new work locations and configure geofences" },
    { key: "location.update", label: "Edit Work Locations", description: "Modify location details, coordinates, and radius" },
    { key: "location.delete", label: "Delete Work Locations", description: "Remove work locations from the system" },
    { key: "location.assign", label: "Assign Location Staff", description: "Assign or unassign employees to work locations" },
    { key: "location.manage", label: "Manage Work Locations", description: "Full control: create, edit, delete, and assign work locations" },
    { key: "geofence.read", label: "View Geofences", description: "View geofence boundaries" },
    { key: "geofence.manage", label: "Manage Geofences", description: "Create, edit, delete geofences" },
    { key: "contract.read", label: "View Contracts", description: "View employee contracts" },
    { key: "contract.manage", label: "Manage Contracts", description: "Create, edit, delete contracts" },
  ],
  "Reports": [
    { key: "reports.read", label: "View Reports", description: "Access standard reports" },
    { key: "reports.export", label: "Export Reports", description: "Export reports to PDF/Excel" },
    { key: "reports.executive", label: "Executive Reports", description: "Access executive-level dashboards" },
    { key: "reports.attendance", label: "Attendance Reports", description: "Access attendance reports" },
    { key: "reports.employee", label: "Employee Reports", description: "Access employee analytics reports" },
    { key: "reports.payroll", label: "Payroll Reports", description: "Access payroll reports" },
    { key: "reports.project", label: "Project Reports", description: "Access project reports" },
    { key: "reports.document", label: "Document Reports", description: "Access document reports" },
    { key: "reports.location", label: "Location Reports", description: "Access location reports" },
    { key: "reports.organization", label: "Organization Reports", description: "Access organization reports" },
  ],
  "System Administration": [
    { key: "user.create", label: "Create Users", description: "Create system user accounts" },
    { key: "user.update", label: "Edit Users", description: "Modify user accounts" },
    { key: "user.delete", label: "Delete Users", description: "Remove user accounts" },
    { key: "role.read", label: "View Roles", description: "View role definitions" },
    { key: "role.manage", label: "Manage Roles", description: "Create, edit, delete roles and assign permissions" },
    { key: "settings.manage", label: "System Settings", description: "Manage system configuration" },
    { key: "audit.read", label: "View Audit Logs", description: "View system audit trail" },
    { key: "notifications.manage", label: "Manage Notifications", description: "Configure system notifications" },
    { key: "calendar.manage", label: "Manage Calendar", description: "Manage holidays and calendar events" },
  ],
};

// Flatten all permission keys for validation
export function getAllPermissionKeys() {
  const keys = [];
  for (const category of Object.values(PERMISSION_CATALOG)) {
    for (const perm of category) {
      keys.push(perm.key);
    }
  }
  return keys;
}

// GET /api/roles/permissions — returns the full permission catalog
export async function GET() {
  try {
    const allKeys = getAllPermissionKeys();
    return NextResponse.json({
      catalog: PERMISSION_CATALOG,
      totalPermissions: allKeys.length,
      allKeys,
    });
  } catch (error) {
    console.error("Error fetching permission catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch permission catalog" },
      { status: 500 }
    );
  }
}
