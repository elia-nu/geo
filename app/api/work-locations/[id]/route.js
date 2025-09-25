import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Get a specific work location with assigned employees
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    const workLocation = await db.collection("work_locations")
      .aggregate([
        {
          $match: { _id: new ObjectId(id) }
        },
        {
          $lookup: {
            from: "employees",
            localField: "assignedEmployees",
            foreignField: "_id",
            as: "assignedEmployees"
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).toArray();

    if (workLocation.length === 0) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      location: workLocation[0]
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
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();
    
    const { name, address, latitude, longitude, radius, description, status } = data;

    const updateData = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (latitude) updateData.latitude = parseFloat(latitude);
    if (longitude) updateData.longitude = parseFloat(longitude);
    if (radius) updateData.radius = parseInt(radius);
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const result = await db.collection("work_locations").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

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
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work location updated successfully"
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
    const db = await getDb();
    const { id } = await params;

    // Check if any employees are assigned to this location
    const workLocation = await db.collection("work_locations").findOne(
      { _id: new ObjectId(id) }
    );

    if (!workLocation) {
      return NextResponse.json(
        { error: "Work location not found" },
        { status: 404 }
      );
    }

    if (workLocation.assignedEmployees && workLocation.assignedEmployees.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete location with assigned employees. Please reassign employees first." },
        { status: 400 }
      );
    }

    const result = await db.collection("work_locations").deleteOne(
      { _id: new ObjectId(id) }
    );

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
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        locationName: workLocation.name
      },
    });

    return NextResponse.json({
      success: true,
      message: "Work location deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting work location:", error);
    return NextResponse.json(
      { error: "Failed to delete work location" },
      { status: 500 }
    );
  }
}
