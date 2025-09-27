import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get employee work locations
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(id) });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get work locations from the employee's workLocations array
    let workLocationIds = [];

    if (employee.workLocations && Array.isArray(employee.workLocations)) {
      workLocationIds = employee.workLocations;
    } else if (employee.workLocation) {
      // Handle legacy single work location
      workLocationIds = [employee.workLocation];
    } else if (employee.personalDetails?.workLocation) {
      // Handle legacy single work location in personalDetails
      workLocationIds = [employee.personalDetails.workLocation];
    }

    // Fetch the actual work location documents
    let workLocations = [];
    if (workLocationIds.length > 0) {
      const locationObjectIds = workLocationIds.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );

      workLocations = await db
        .collection("work_locations")
        .find({ _id: { $in: locationObjectIds } })
        .toArray();
    }

    return NextResponse.json({
      success: true,
      workLocations: workLocations,
      count: workLocations.length,
    });
  } catch (error) {
    console.error("Error fetching employee work locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch work locations", message: error.message },
      { status: 500 }
    );
  }
}

// Update employee work location (legacy - for backward compatibility)
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    const { workLocation } = data;

    if (!workLocation) {
      return NextResponse.json(
        { error: "Work location data is required" },
        { status: 400 }
      );
    }

    // Get existing employee
    const existingEmployee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(id) });

    if (!existingEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeName =
      existingEmployee.personalDetails?.name ||
      existingEmployee.name ||
      "Unknown";

    // Update work location
    const updateData = {
      workLocation,
      updatedAt: new Date(),
    };

    // Update based on data structure (old vs new format)
    if (existingEmployee.personalDetails) {
      // New format - update personalDetails
      await db.collection("employees").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            "personalDetails.workLocation": workLocation,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Old format - update directly
      await db
        .collection("employees")
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    }

    // Create audit log
    await createAuditLog({
      action: "UPDATE_EMPLOYEE_WORK_LOCATION",
      entityType: "employee",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        employeeName,
        previousLocation:
          existingEmployee.workLocation ||
          existingEmployee.personalDetails?.workLocation ||
          "None",
        newLocation: workLocation,
        locationName: workLocation.name || "Unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work location updated successfully",
    });
  } catch (error) {
    console.error("Error updating employee work location:", error);
    return NextResponse.json(
      { error: "Failed to update work location", message: error.message },
      { status: 500 }
    );
  }
}
