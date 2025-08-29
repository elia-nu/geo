import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Get a specific employee by ID
export async function GET(request, { params }) {
  try {
    const db = await getDb();

    console.log("Fetching employee with ID:", params.id);

    // Find the employee
    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("Found employee:", employee);

    return NextResponse.json({
      success: true,
      employee: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// Update an employee
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const db = await getDb();

    // Get the current employee data for audit trail
    const currentEmployee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!currentEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Add updated timestamp
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("employees")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });

    // Create audit log with changes
    const changes = {};
    Object.keys(body).forEach((key) => {
      if (JSON.stringify(currentEmployee[key]) !== JSON.stringify(body[key])) {
        changes[key] = {
          before: currentEmployee[key],
          after: body[key],
        };
      }
    });

    await createAuditLog({
      action: "UPDATE",
      entityType: "employee",
      entityId: params.id,
      userId: "system", // Replace with actual user ID when auth is implemented
      userEmail: "system@company.com", // Replace with actual user email
      changes: changes,
      metadata: {
        employeeName: currentEmployee.personalDetails?.name,
        department: currentEmployee.department,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// Delete an employee
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();

    // Get the employee data before deletion for audit trail
    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee has associated documents
    const documentCount = await db.collection("documents").countDocuments({
      employeeId: params.id,
    });

    if (documentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee with ${documentCount} associated documents. Please delete or reassign documents first.`,
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection("employees")
      .deleteOne({ _id: new ObjectId(params.id) });

    // Create audit log
    await createAuditLog({
      action: "DELETE",
      entityType: "employee",
      entityId: params.id,
      userId: "system", // Replace with actual user ID when auth is implemented
      userEmail: "system@company.com", // Replace with actual user email
      metadata: {
        employeeName: employee.personalDetails?.name,
        department: employee.department,
        deletedData: employee, // Store the deleted data for recovery purposes
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
