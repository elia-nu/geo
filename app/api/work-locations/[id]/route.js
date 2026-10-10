import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import { getCurrentUser, checkPermission } from "../../middleware/auth.js";

// Get a specific work location with assigned employees
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (user && user.userId !== "guest" && user.authenticated) {
      const hasPerm =
        user.role === "ADMIN" ||
        user.role === "EMPLOYEE" ||
        (await checkPermission(user.userId, "location.read", user.role)) ||
        (await checkPermission(user.userId, "attendance.checkin", user.role)) ||
        (await checkPermission(user.userId, "employee.read.own", user.role));

      if (!hasPerm) {
        return NextResponse.json(
          { error: "Access denied. 'location.read' or employee access required." },
          { status: 403 }
        );
      }
    }

    const db = await getDb();
    const { id } = await params;

    const workLocation = await db
      .collection("work_locations")
      .aggregate([
        {
          $match: { _id: new ObjectId(id) },
        },
        {
          $lookup: {
            from: "employees",
            localField: "assignedEmployees",
            foreignField: "_id",
            as: "assignedEmployees",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    if (workLocation.length === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      location: workLocation[0],
    });
  } catch (error) {
    console.error("Error fetching work location:", error);
    return NextResponse.json(
      { error: "Failed to fetch work location" },
      { status: 500 }
    );
  }
}

// Update a work location
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await checkPermission(user.userId, "location.update", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied. 'location.update' or 'location.manage' permission required." },
        { status: 403 }
      );
    }

    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    const { name, address, latitude, longitude, radius, description, status } =
      data;

    const updateData = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (radius) updateData.radius = parseInt(radius);
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const result = await db
      .collection("work_locations")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "UPDATE",
      entityType: "work_location",
      entityId: id,
      userId: user.userId || "system",
      userEmail: user.email || "user@company.com",
      metadata: {
        updatedFields: Object.keys(updateData).filter(
          (key) => key !== "updatedAt"
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work location updated successfully",
    });
  } catch (error) {
    console.error("Error updating work location:", error);
    return NextResponse.json(
      { error: "Failed to update work location" },
      { status: 500 }
    );
  }
}

// Delete a work location
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await checkPermission(user.userId, "location.delete", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied. 'location.delete' or 'location.manage' permission required." },
        { status: 403 }
      );
    }

    const db = await getDb();
    const { id } = await params;

    // Check if any employees are assigned to this location
    const workLocation = await db
      .collection("work_locations")
      .findOne({ _id: new ObjectId(id) });

    if (!workLocation) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    const locationObjectId = new ObjectId(id);
    const assignedIds = Array.isArray(workLocation.assignedEmployees)
      ? workLocation.assignedEmployees
          .map((emp) => (ObjectId.isValid(emp) ? new ObjectId(emp) : null))
          .filter(Boolean)
      : [];

    // Check how many actual active employees exist referencing this location
    const activeAssignedEmployees = await db
      .collection("employees")
      .find({
        $or: [
          { _id: { $in: assignedIds } },
          { workLocations: locationObjectId },
          { workLocations: id },
          { workLocationId: locationObjectId },
          { workLocationId: id },
          { workLocation: workLocation.name },
          { workLocationName: workLocation.name },
          { "personalDetails.workLocation": workLocation.name },
          { "workLocationsDetails._id": locationObjectId },
        ],
      })
      .toArray();

    const activeCount = activeAssignedEmployees.length;
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    if (activeCount > 0 && !force) {
      return NextResponse.json(
        {
          error: `Cannot delete location "${workLocation.name}". It is currently assigned to ${activeCount} active employee(s). Please unassign them first or delete with force.`,
          assignedCount: activeCount,
        },
        { status: 400 }
      );
    }

    // Clean up all references from employees collection
    await db.collection("employees").updateMany(
      {
        $or: [
          { workLocations: locationObjectId },
          { workLocations: id },
          { workLocationId: locationObjectId },
          { workLocationId: id },
          { workLocation: workLocation.name },
          { workLocationName: workLocation.name },
          { "personalDetails.workLocation": workLocation.name },
          { "workLocationsDetails._id": locationObjectId },
        ],
      },
      {
        $pull: {
          workLocations: { $in: [locationObjectId, id] },
          workLocationsDetails: { _id: locationObjectId },
        },
        $unset: {
          workLocationId: "",
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    await db.collection("employees").updateMany(
      {
        $or: [
          { workLocation: id },
          { workLocation: workLocation.name },
          { workLocationName: workLocation.name },
          { "personalDetails.workLocation": id },
          { "personalDetails.workLocation": workLocation.name },
        ],
      },
      {
        $unset: {
          workLocation: "",
          workLocationName: "",
          "personalDetails.workLocation": "",
        },
      }
    );

    const result = await db
      .collection("work_locations")
      .deleteOne({ _id: locationObjectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "DELETE",
      entityType: "work_location",
      entityId: id,
      userId: user.userId || "system",
      userEmail: user.email || "user@company.com",
      metadata: {
        locationName: workLocation.name,
        forced: force,
        unassignedCount: activeCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting work location:", error);
    return NextResponse.json(
      { error: "Failed to delete work location" },
      { status: 500 }
    );
  }
}
