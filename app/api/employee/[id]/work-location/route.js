import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Helper to safely parse an ID into an ObjectId or null
function toSafeObjectId(val) {
  if (!val) return null;
  if (val instanceof ObjectId) return val;
  if (typeof val === "object") {
    const raw = val.$oid || val._id || val.id;
    if (raw && ObjectId.isValid(String(raw))) {
      return new ObjectId(String(raw));
    }
    return null;
  }
  if (typeof val === "string" && ObjectId.isValid(val)) {
    return new ObjectId(val);
  }
  return null;
}

// Get employee work locations
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const employeeQuery = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { employeeId: id }] }
      : { employeeId: id };

    const employee = await db.collection("employees").findOne(employeeQuery);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found", workLocations: [], count: 0 },
        { status: 404 }
      );
    }

    // Collect all raw work location identifiers from various potential fields
    let rawLocationItems = [];

    if (Array.isArray(employee.workLocations)) {
      rawLocationItems.push(...employee.workLocations);
    }
    if (Array.isArray(employee.workLocationsDetails)) {
      rawLocationItems.push(...employee.workLocationsDetails);
    }
    if (employee.workLocation) {
      rawLocationItems.push(employee.workLocation);
    }
    if (employee.personalDetails?.workLocation) {
      rawLocationItems.push(employee.personalDetails.workLocation);
    }

    const objectIds = [];
    const nameStrings = [];
    const stringIds = [];

    for (const item of rawLocationItems) {
      if (!item) continue;

      const safeObjId = toSafeObjectId(item);
      if (safeObjId) {
        objectIds.push(safeObjId);
      }

      if (typeof item === "string") {
        if (ObjectId.isValid(item)) {
          stringIds.push(item);
        } else if (item.trim()) {
          nameStrings.push(item.trim());
        }
      } else if (typeof item === "object" && item.name) {
        nameStrings.push(String(item.name).trim());
      }
    }

    let workLocations = [];

    const queryOr = [];
    if (objectIds.length > 0) {
      queryOr.push({ _id: { $in: objectIds } });
    }
    if (stringIds.length > 0) {
      queryOr.push({ _id: { $in: stringIds } });
    }
    if (nameStrings.length > 0) {
      queryOr.push({ name: { $in: nameStrings } });
    }

    if (queryOr.length > 0) {
      workLocations = await db
        .collection("work_locations")
        .find({ $or: queryOr })
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
      { error: "Failed to fetch work locations", message: error.message, workLocations: [], count: 0 },
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

    const employeeQuery = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { employeeId: id }] }
      : { employeeId: id };

    const existingEmployee = await db
      .collection("employees")
      .findOne(employeeQuery);

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

    const updateData = {
      workLocation,
      updatedAt: new Date(),
    };

    if (existingEmployee.personalDetails) {
      await db.collection("employees").updateOne(
        { _id: existingEmployee._id },
        {
          $set: {
            "personalDetails.workLocation": workLocation,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      await db
        .collection("employees")
        .updateOne({ _id: existingEmployee._id }, { $set: updateData });
    }

    // Create audit log
    await createAuditLog({
      action: "UPDATE_EMPLOYEE_WORK_LOCATION",
      entityType: "employee",
      entityId: String(existingEmployee._id),
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        employeeName,
        previousLocation:
          existingEmployee.workLocation ||
          existingEmployee.personalDetails?.workLocation ||
          "None",
        newLocation: workLocation,
        locationName: workLocation?.name || "Unknown",
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
