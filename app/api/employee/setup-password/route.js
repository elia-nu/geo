import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { createAuditLog } from "../../audit/route";

export async function POST(request) {
  try {
    const db = await getDb();
    const { employeeId, password } = await request.json();

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: "Employee ID and password are required" },
        { status: 400 }
      );
    }

    // Find employee
    const employee = await db.collection("employees").findOne({
      $or: [
        { _id: new ObjectId(employeeId) },
        { employeeId: employeeId },
        { "personalDetails.employeeId": employeeId },
      ],
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const employeeName =
      employee.personalDetails?.name || employee.name || "Unknown";

    // Update employee with password
    if (employee.personalDetails) {
      // New format - update personalDetails
      await db.collection("employees").updateOne(
        { _id: employee._id },
        {
          $set: {
            "personalDetails.password": hashedPassword,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Old format - update directly
      await db.collection("employees").updateOne(
        { _id: employee._id },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "SETUP_EMPLOYEE_PASSWORD",
      entityType: "employee",
      entityId: employee._id.toString(),
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        employeeName,
        employeeId: employee.employeeId || employee.personalDetails?.employeeId,
        passwordSet: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully for employee",
    });
  } catch (error) {
    console.error("Error setting up password:", error);
    return NextResponse.json(
      { error: "Failed to set password", message: error.message },
      { status: 500 }
    );
  }
}
