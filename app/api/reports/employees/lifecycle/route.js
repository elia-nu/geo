import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Employee Lifecycle Activity Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Get current user for role-based access
    const user = await getCurrentUser(request);

    // Check permission to view reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to view reports." },
        { status: 403 }
      );
    }

    // Extract filter parameters
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const actionType = searchParams.get("actionType"); // CREATE, UPDATE, DELETE, TRANSFER, ROLE_CHANGE, TERMINATE
    const format = searchParams.get("format") || "json";

    // Build query for audit logs
    let query = {
      entityType: "employee",
    };

    if (employeeId && ObjectId.isValid(employeeId)) {
      query.entityId = employeeId;
    }

    if (actionType && actionType !== "all") {
      // Map action types
      const actionMap = {
        create: "CREATE",
        update: "UPDATE",
        delete: "DELETE",
        transfer: "TRANSFER",
        role_change: "ROLE_CHANGE",
        terminate: "TERMINATE",
        termination: "TERMINATE",
      };
      query.action = actionMap[actionType.toLowerCase()] || actionType.toUpperCase();
    }

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch audit logs
    const auditLogs = await db
      .collection("audit_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(10000) // Limit to prevent memory issues
      .toArray();

    // Fetch employee details for each log
    const employeeIds = [...new Set(auditLogs.map((log) => log.entityId))];
    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: employeeIds.map((id) => new ObjectId(id)) },
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "",
      };
    });

    // Process lifecycle activities
    const activities = auditLogs.map((log) => {
      const employee = employeeMap[log.entityId] || {
        name: "Unknown Employee",
        email: "",
        department: "",
      };

      // Determine activity type
      let activityType = log.action;
      let activityDescription = log.action;

      // Parse metadata for specific activity types
      if (log.metadata) {
        if (log.metadata.department && log.changes?.department) {
          activityType = "TRANSFER";
          activityDescription = `Transferred to ${log.metadata.department}`;
        } else if (log.metadata.roleCreated || log.changes?.designation || log.changes?.role) {
          activityType = "ROLE_CHANGE";
          activityDescription = `Role changed`;
          if (log.changes?.designation) {
            activityDescription = `Role changed to ${log.changes.designation.after || "N/A"}`;
          }
        } else if (log.action === "DELETE" || log.metadata.deletedData) {
          activityType = "TERMINATE";
          activityDescription = "Employee terminated";
        } else if (log.action === "CREATE") {
          activityType = "CREATE";
          activityDescription = "Employee created";
        }
      }

      return {
        id: log.id || log._id?.toString(),
        timestamp: log.timestamp,
        activityType,
        activityDescription,
        employee: {
          id: log.entityId,
          name: employee.name,
          email: employee.email,
          department: employee.department,
        },
        admin: {
          userId: log.userId,
          email: log.userEmail,
        },
        changes: log.changes,
        metadata: log.metadata,
        action: log.action,
      };
    });

    // Calculate statistics
    const stats = {
      totalActivities: activities.length,
      byType: {},
      byEmployee: {},
      byAdmin: {},
      timeline: [],
    };

    activities.forEach((activity) => {
      // Count by type
      const type = activity.activityType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by employee
      const empId = activity.employee.id;
      if (!stats.byEmployee[empId]) {
        stats.byEmployee[empId] = {
          employeeId: empId,
          employeeName: activity.employee.name,
          activityCount: 0,
          activities: [],
        };
      }
      stats.byEmployee[empId].activityCount++;
      stats.byEmployee[empId].activities.push({
        type: activity.activityType,
        timestamp: activity.timestamp,
        description: activity.activityDescription,
      });

      // Count by admin
      const adminEmail = activity.admin.email;
      if (!stats.byAdmin[adminEmail]) {
        stats.byAdmin[adminEmail] = {
          email: adminEmail,
          activityCount: 0,
        };
      }
      stats.byAdmin[adminEmail].activityCount++;
    });

    // Create timeline (group by date)
    const timelineMap = {};
    activities.forEach((activity) => {
      const date = new Date(activity.timestamp).toISOString().split("T")[0];
      if (!timelineMap[date]) {
        timelineMap[date] = {
          date,
          activities: [],
          count: 0,
        };
      }
      timelineMap[date].activities.push(activity);
      timelineMap[date].count++;
    });

    stats.timeline = Object.values(timelineMap).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Create audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "employee_lifecycle",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_lifecycle",
        filters: {
          employeeId,
          startDate,
          endDate,
          actionType,
        },
        recordCount: activities.length,
      },
    });

    // Return data
    return NextResponse.json({
      success: true,
      reportType: "employee_lifecycle",
      generatedAt: new Date().toISOString(),
      filters: {
        employeeId,
        startDate,
        endDate,
        actionType,
      },
      stats,
      activities,
      totalRecords: activities.length,
    });
  } catch (error) {
    console.error("Error generating employee lifecycle report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate employee lifecycle report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
