import { NextResponse } from "next/server";
import { getDb } from "../mongo";

export async function GET(request) {
  try {
    const db = await getDb();

    // Find admin employee
    const adminEmployee = await db.collection("employees").findOne({
      "personalDetails.employeeId": "ADMIN001",
    });

    if (!adminEmployee) {
      return NextResponse.json({
        success: false,
        error: "Admin employee not found",
      });
    }

    const adminEmployeeId = adminEmployee._id.toString();

    // Check admin role
    const adminRole = await db.collection("user_roles").findOne({
      userId: adminEmployeeId,
      isActive: true,
    });

    if (!adminRole) {
      // Create admin role if it doesn't exist
      const newAdminRole = {
        userId: adminEmployeeId,
        email: "admin@company.com",
        role: "ADMIN",
        permissions: [
          "employee.create",
          "employee.read",
          "employee.update",
          "employee.delete",
          "document.create",
          "document.read",
          "document.update",
          "document.delete",
          "reports.read",
          "reports.export",
          "audit.read",
          "settings.manage",
          "user.create",
          "user.update",
          "user.delete",
          "notifications.manage",
          "project.create",
          "project.read",
          "project.update",
          "project.delete",
          "milestone.create",
          "milestone.read",
          "milestone.update",
          "milestone.delete",
          "alert.create",
          "alert.read",
          "alert.update",
          "alert.delete",
        ],
        assignedBy: "system",
        assignedAt: new Date(),
        isActive: true,
      };

      await db.collection("user_roles").insertOne(newAdminRole);

      return NextResponse.json({
        success: true,
        message: "Admin role created successfully",
        adminEmployee: {
          id: adminEmployeeId,
          name: adminEmployee.personalDetails?.name,
          email: adminEmployee.personalDetails?.email,
          employeeId: adminEmployee.personalDetails?.employeeId,
        },
        adminRole: newAdminRole,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user and role are properly configured",
      adminEmployee: {
        id: adminEmployeeId,
        name: adminEmployee.personalDetails?.name,
        email: adminEmployee.personalDetails?.email,
        employeeId: adminEmployee.personalDetails?.employeeId,
      },
      adminRole: {
        role: adminRole.role,
        permissions: adminRole.permissions,
      },
    });
  } catch (error) {
    console.error("Error verifying admin:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify admin user" },
      { status: 500 }
    );
  }
}
