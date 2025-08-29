import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request) {
  try {
    const db = await getDb();
    const { employeeId, password } = await request.json();
    console.log("employeeId", employeeId);
    console.log("password", password);

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: "Employee ID and password are required" },
        { status: 400 }
      );
    }

    // Find employee by employee ID
    const employee = await db.collection("employees").findOne({
      $or: [
        { employeeId: employeeId },
        { "personalDetails.employeeId": employeeId },
      ],
    });
    console.log("employee", employee);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee has a password set
    const hasPassword = employee.password || employee.personalDetails?.password;

    if (!hasPassword) {
      return NextResponse.json(
        {
          error:
            "No password set for this employee. Please contact administrator.",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, hasPassword);

    if (!isValidPassword) {
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
