import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";
import bcrypt from "bcryptjs";

// Create a new employee
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    // Generate a default password if not provided
    let password = body.password || body.personalDetails?.password;
    if (!password) {
      // Generate a random password
      const randomPassword = Math.random().toString(36).slice(-8) + "123!";
      password = randomPassword;
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Add timestamps and password
    const employeeData = {
      ...body,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    // If personalDetails exists, add password there too
    if (employeeData.personalDetails) {
      employeeData.personalDetails.password = hashedPassword;
    }

    const result = await db.collection("employees").insertOne(employeeData);
    const employeeId = result.insertedId.toString();

    // Automatically assign EMPLOYEE role
    const userRole = {
      userId: employeeId,
      email: employeeData.personalDetails?.email || employeeData.email,
      role: "EMPLOYEE",
      permissions: [
        "employee.read.own",
        "employee.update.own",
        "document.read.own",
        "document.create.own",
      ],
      assignedBy: "system",
      assignedAt: new Date(),
      isActive: true,
    };

    await db.collection("user_roles").insertOne(userRole);

    // Create audit log
    await createAuditLog({
      action: "CREATE",
      entityType: "employee",
      entityId: employeeId,
      userId: "system",
      userEmail: "system@company.com",
      metadata: {
        employeeName: employeeData.personalDetails?.name || employeeData.name,
        department:
          employeeData.personalDetails?.department || employeeData.department,
        roleAssigned: "EMPLOYEE",
        passwordSet: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully with login credentials",
        employeeId: employeeId,
        data: {
          employee: employeeData,
          role: "EMPLOYEE",
          loginEnabled: true,
          // Only return the plain password in development
          ...(process.env.NODE_ENV === "development" && {
            generatedPassword: password,
          }),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee", message: error.message },
      { status: 500 }
    );
  }
}

// Get all employees
export async function GET() {
  try {
    const db = await getDb();
    const employees = await db.collection("employees").find().toArray();
    return NextResponse.json({
      success: true,
      employees: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch employees",
      },
      { status: 500 }
    );
  }
}
