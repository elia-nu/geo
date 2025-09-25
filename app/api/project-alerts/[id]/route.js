import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// Get a specific project alert
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Fetch alert with project details
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "projects",
          localField: "projectId",
          foreignField: "_id",
          as: "project",
        },
      },
      {
        $addFields: {
          project: { $arrayElemAt: ["$project", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          projectId: 1,
          alertType: 1,
          message: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          priority: 1,
          relatedEntityId: 1,
          relatedEntityType: 1,
          projectName: "$project.name",
          projectCategory: "$project.category",
        },
      },
    ];

    const alert = await db
      .collection("project_alerts")
      .aggregate(pipeline)
      .next();

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error("Error fetching project alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch project alert" },
      { status: 500 }
    );
  }
}

// Update a project alert
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Check if alert exists
    const existingAlert = await db.collection("project_alerts").findOne({
      _id: new ObjectId(id),
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Prepare update data
    const { message, status, priority } = data;

    const updateData = {};

    // Only update fields that are provided
    if (message !== undefined) updateData.message = message;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // Update the alert
    const result = await db
      .collection("project_alerts")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_ALERT",
      entityType: "project_alert",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        alertType: existingAlert.alertType,
        projectId: existingAlert.projectId.toString(),
        updatedFields: Object.keys(updateData).filter(
          (key) => key !== "updatedAt"
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Alert updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating project alert:", error);
    return NextResponse.json(
      { error: "Failed to update project alert" },
      { status: 500 }
    );
  }
}

// Delete a project alert
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    }

    // Check if alert exists
    const existingAlert = await db.collection("project_alerts").findOne({
      _id: new ObjectId(id),
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Delete the alert
    const result = await db.collection("project_alerts").deleteOne({
      _id: new ObjectId(id),
    });

    // Create audit log
    await createAuditLog({
      action: "DELETE_ALERT",
      entityType: "project_alert",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        alertType: existingAlert.alertType,
        projectId: existingAlert.projectId.toString(),
        message: existingAlert.message,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting project alert:", error);
    return NextResponse.json(
      { error: "Failed to delete project alert" },
      { status: 500 }
    );
  }
}
