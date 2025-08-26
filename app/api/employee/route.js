import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../audit/route";

// Create a new employee
export async function POST(request) {
  try {
    const body = await request.json();
    const db = await getDb();

    // Add timestamps
    const employeeData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    const result = await db.collection("employees").insertOne(employeeData);

    // Create audit log
    await createAuditLog({
      action: "CREATE",
      entityType: "employee",
      entityId: result.insertedId.toString(),
      userId: "system", // Replace with actual user ID when auth is implemented
      userEmail: "system@company.com", // Replace with actual user email
      metadata: {
        employeeName: employeeData.personalDetails?.name,
        department: employeeData.department,
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}

// Get all employees
export async function GET() {
  try {
    const db = await getDb();
    const employees = await db.collection("employees").find().toArray();
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
