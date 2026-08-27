import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { createAuditLog } from "../../../utils/audit.js";

export async function POST(request) {
  try {
    const db = await getDb();
    const { employeeId, currentPassword, newPassword } = await request.json();

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Find employee by _id or employeeId
    const query = ObjectId.isValid(employeeId)
      ? {
          $or: [
            { _id: new ObjectId(employeeId) },
            { employeeId: employeeId },
            { "personalDetails.employeeId": employeeId },
          ],
        }
      : {
          $or: [
            { employeeId: employeeId },
            { "personalDetails.employeeId": employeeId },
          ],
        };

    const employee = await db.collection("employees").findOne(query);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeDbId = employee._id.toString();
    const employeeName =
      employee.personalDetails?.name || employee.name || "Employee";
    const employeeEmail =
      employee.personalDetails?.email || employee.email || "";

    // Existing password check
    const existingHashedPassword =
      employee.password || employee.personalDetails?.password;

    if (existingHashedPassword) {
      const isMatch = await bcrypt.compare(
        currentPassword,
        existingHashedPassword
      );
      if (!isMatch) {
        await createAuditLog({
          action: "PASSWORD_CHANGE_FAILED",
          entityType: "employee",
          entityId: employeeDbId,
          userId: employeeDbId,
          userEmail: employeeEmail,
          metadata: {
            employeeName,
            reason: "invalid_current_password",
          },
          ipAddress:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            null,
          userAgent: request.headers.get("user-agent") || null,
        });

        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update employee password in both root and personalDetails for compatibility
    const updateFields = {
      password: hashedNewPassword,
      "personalDetails.password": hashedNewPassword,
      updatedAt: new Date(),
    };

    await db.collection("employees").updateOne(
      { _id: employee._id },
      { $set: updateFields }
    );

    // Create audit log for successful password change
    await createAuditLog({
      action: "PASSWORD_CHANGE_SUCCESS",
      entityType: "employee",
      entityId: employeeDbId,
      userId: employeeDbId,
      userEmail: employeeEmail,
      metadata: {
        employeeName,
        employeeId: employee.employeeId || employee.personalDetails?.employeeId,
      },
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        null,
      userAgent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "Failed to update password", message: error.message },
      { status: 500 }
    );
  }
}
