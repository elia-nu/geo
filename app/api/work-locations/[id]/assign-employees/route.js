import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Assign employees to a work location
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();
    
    const { employeeIds } = data;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      );
    }

    // Validate that the work location exists
    const workLocation = await db.collection("work_locations").findOne(
      { _id: new ObjectId(id) }
    );

    if (!workLocation) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    // Validate that all employees exist
    const employeeObjectIds = employeeIds.map(id => new ObjectId(id));
    const employees = await db.collection("employees").find({
      _id: { $in: employeeObjectIds }
    }).toArray();

    if (employees.length !== employeeIds.length) {
      return NextResponse.json(
        { error: "One or more employees not found" },
        { status: 400 }
      );
    }

    // Add employees to the work location
    const result = await db.collection("work_locations").updateOne(
      { _id: new ObjectId(id) },
      { 
        $addToSet: { assignedEmployees: { $each: employeeObjectIds } },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    // Update employee records to include this work location
    for (const employeeId of employeeObjectIds) {
      await db.collection("employees").updateOne(
        { _id: employeeId },
        { 
          $addToSet: { workLocations: new ObjectId(id) },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "ASSIGN_EMPLOYEES",
      entityType: "work_location",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        locationName: workLocation.name,
        assignedEmployeeIds: employeeIds,
        employeeCount: employeeIds.length
      },
    });

    return NextResponse.json({
      success: true,
      message: `${employeeIds.length} employee(s) assigned to work location successfully`
    });

  } catch (error) {
    console.error("Error assigning employees to work location:", error);
    return NextResponse.json(
      { error: "Failed to assign employees to work location" },
      { status: 500 }
    );
  }
}

// Remove employees from a work location
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();
    
    const { employeeIds } = data;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      );
    }

    // Validate that the work location exists
    const workLocation = await db.collection("work_locations").findOne(
      { _id: new ObjectId(id) }
    );

    if (!workLocation) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    const employeeObjectIds = employeeIds.map(id => new ObjectId(id));

    // Remove employees from the work location
    const result = await db.collection("work_locations").updateOne(
      { _id: new ObjectId(id) },
      { 
        $pull: { assignedEmployees: { $in: employeeObjectIds } },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    // Remove work location from employee records
    for (const employeeId of employeeObjectIds) {
      await db.collection("employees").updateOne(
        { _id: employeeId },
        { 
          $pull: { workLocations: new ObjectId(id) },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "REMOVE_EMPLOYEES",
      entityType: "work_location",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        locationName: workLocation.name,
        removedEmployeeIds: employeeIds,
        employeeCount: employeeIds.length
      },
    });

    return NextResponse.json({
      success: true,
      message: `${employeeIds.length} employee(s) removed from work location successfully`
    });

  } catch (error) {
    console.error("Error removing employees from work location:", error);
    return NextResponse.json(
      { error: "Failed to remove employees from work location" },
      { status: 500 }
    );
  }
}
