import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createAuditLog } from "../../../utils/audit";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request) {
  try {
    const db = await getDb();
    const { employeeId, password } = await request.json();
    // 'employeeId' here is treated as a generic identifier which can be
    // employeeId, email, or phone/contact number
    const identifier = typeof employeeId === "string" ? employeeId.trim() : "";
    console.log("identifier", identifier);
    console.log("password", password);

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Employee ID/Email/Phone and password are required" },
        { status: 400 }
      );
    }

    // Find employee by employeeId OR email (case-insensitive) OR contact number
    const emailRegex = new RegExp(`^${escapeRegExp(identifier)}$`, "i");
    const employee = await db.collection("employees").findOne({
      $or: [
        { employeeId: identifier },
        { "personalDetails.employeeId": identifier },
        { email: emailRegex },
        { "personalDetails.email": emailRegex },
        { contactNumber: identifier },
        { "personalDetails.contactNumber": identifier },
      ],
    });
    console.log("employee", employee);

    if (!employee) {
      await createAuditLog({
        action: "LOGIN_FAILURE",
        entityType: "auth",
        entityId: null,
        userId: null,
        userEmail: identifier || null,
        metadata: { reason: "employee_not_found", identifier },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      });
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee has a password set
    const rootPassword = employee.password;
    const personalPassword = employee.personalDetails?.password;
    const hasPassword = rootPassword || personalPassword;

    if (!hasPassword) {
      await createAuditLog({
        action: "LOGIN_FAILURE",
        entityType: "auth",
        entityId: employee._id.toString(),
        userId: employee._id.toString(),
        userEmail: employee.personalDetails?.email || employee.email || null,
        metadata: { reason: "no_password_set" },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      });
      return NextResponse.json(
        {
          error:
            "No password set for this employee. Please contact administrator.",
        },
        { status: 401 }
      );
    }

    // Verify password (try root password, then personalDetails password)
    let isValidPassword = false;
    if (rootPassword) {
      isValidPassword = await bcrypt.compare(password, rootPassword);
    }
    if (!isValidPassword && personalPassword) {
      isValidPassword = await bcrypt.compare(password, personalPassword);
      // Auto-sync root password if personalDetails password was valid
      if (isValidPassword) {
        await db.collection("employees").updateOne(
          { _id: employee._id },
          { $set: { password: personalPassword } }
        );
      }
    }

    if (!isValidPassword) {
      await createAuditLog({
        action: "LOGIN_FAILURE",
        entityType: "auth",
        entityId: employee._id.toString(),
        userId: employee._id.toString(),
        userEmail: employee.personalDetails?.email || employee.email || null,
        metadata: { reason: "invalid_password" },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      });
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Check if employee has designated locations (new system supports multiple locations)
    const hasWorkLocations =
      employee.workLocations &&
      Array.isArray(employee.workLocations) &&
      employee.workLocations.length > 0;
    const hasOldLocation =
      employee.workLocation || employee.personalDetails?.workLocation;

    if (!hasWorkLocations && !hasOldLocation) {
      await createAuditLog({
        action: "LOGIN_FAILURE",
        entityType: "auth",
        entityId: employee._id.toString(),
        userId: employee._id.toString(),
        userEmail: employee.personalDetails?.email || employee.email || null,
        metadata: { reason: "no_work_locations" },
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
        userAgent: request.headers.get("user-agent") || null,
      });
      return NextResponse.json(
        { error: "No work locations assigned. Please contact administrator." },
        { status: 403 }
      );
    }

    console.log("employee._id", employee._id.toString());

    // Get user role
    const userRole = await db.collection("user_roles").findOne({
      userId: employee._id.toString(),
      isActive: true,
    });

    console.log("userRole", userRole);

    // Create JWT token
    const token = jwt.sign(
      {
        employeeId: employee._id.toString(),
        employeeIdCode:
          employee.employeeId || employee.personalDetails?.employeeId,
        name: employee.personalDetails?.name || employee.name,
        email: employee.personalDetails?.email || employee.email,
        department: employee.personalDetails?.department || employee.department,
        workLocations: hasWorkLocations ? employee.workLocations : [],
        workLocation: hasOldLocation || null, // Keep for backward compatibility
        role: userRole ? userRole.role : "EMPLOYEE",
        permissions: userRole ? userRole.permissions : [],
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await createAuditLog({
      action: "LOGIN_SUCCESS",
      entityType: "auth",
      entityId: employee._id.toString(),
      userId: employee._id.toString(),
      userEmail: employee.personalDetails?.email || employee.email || null,
      metadata: {
        role: userRole ? userRole.role : "EMPLOYEE",
        department: employee.personalDetails?.department || employee.department || null,
      },
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      userAgent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        employee: {
          id: employee._id.toString(),
          employeeId:
            employee.employeeId || employee.personalDetails?.employeeId,
          name: employee.personalDetails?.name || employee.name,
          email: employee.personalDetails?.email || employee.email,
          department:
            employee.personalDetails?.department || employee.department,
          workLocations: hasWorkLocations ? employee.workLocations : [],
          workLocation: hasOldLocation || null, // Keep for backward compatibility
          role: userRole ? userRole.role : "EMPLOYEE",
          permissions: userRole ? userRole.permissions : [],
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed", message: error.message },
      { status: 500 }
    );
  }
}
