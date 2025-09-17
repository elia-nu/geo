import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const db = await getDb();

    // Check if admin already exists
    const existingAdmin = await db.collection("employees").findOne({
      "personalDetails.employeeId": "ADMIN001",
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: "Admin user already exists",
        adminId: existingAdmin._id.toString(),
      });
    }

    // Create admin employee
    const adminEmployee = {
      personalDetails: {
        name: "Admin User",
        dateOfBirth: "1990-01-01",
        address: "Admin Address",
        contactNumber: "+1234567890",
        email: "admin@company.com",
        employeeId: "ADMIN001",
        password:
          "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // "password"
      },
      department: "IT",
      designation: "System Administrator",
      workLocation: "Office",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    const adminResult = await db
      .collection("employees")
      .insertOne(adminEmployee);
    const adminEmployeeId = adminResult.insertedId.toString();

    console.log("Admin employee created with ID:", adminEmployeeId);

    // Create admin role
    const adminRole = {
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

    // Clear existing admin role if exists
    await db.collection("user_roles").deleteOne({ userId: adminEmployeeId });

    // Insert admin role
    await db.collection("user_roles").insertOne(adminRole);

    console.log("Admin role assigned successfully");

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      adminId: adminEmployeeId,
      credentials: {
        email: "admin@company.com",
        password: "password",
        employeeId: "ADMIN001",
      },
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
