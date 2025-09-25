import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get project progress
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Fetch project with milestones
    const project = await db
      .collection("projects")
      .findOne(
        { _id: new ObjectId(id) },
        {
          projection: {
            name: 1,
            startDate: 1,
            endDate: 1,
            status: 1,
            progress: 1,
          },
        }
      );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch milestones for this project
    const milestones = await db
      .collection("projects")
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
        { $unwind: "$milestones" },
        { $replaceRoot: { newRoot: "$milestones" } },
        { $project: { _id: 1, title: 1, dueDate: 1, status: 1, progress: 1 } },
      ])
      .toArray();

    // Calculate overall progress
    const progressData = {
      overallProgress: project.progress || 0,
      milestones: milestones.map((m) => ({
        id: m._id,
        title: m.title,
        progress: m.progress || 0,
        status: m.status,
        dueDate: m.dueDate,
      })),
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
    };

    return NextResponse.json({
      success: true,
      progress: progressData,
    });
  } catch (error) {
    console.error("Error fetching project progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch project progress" },
      { status: 500 }
    );
  }
}

// Update project progress
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate progress data
    const { progress, status, milestoneUpdates } = data;

    if (
      progress !== undefined &&
      (typeof progress !== "number" || progress < 0 || progress > 100)
    ) {
      return NextResponse.json(
        { error: "Progress must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Prepare update data for project
    const updateData = {};
    if (progress !== undefined) updateData.progress = progress;
    if (status !== undefined) updateData.status = status;
    updateData.updatedAt = new Date();

    // Update project progress
    await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Update milestone progress if provided
    if (
      milestoneUpdates &&
      Array.isArray(milestoneUpdates) &&
      milestoneUpdates.length > 0
    ) {
      for (const update of milestoneUpdates) {
        const { milestoneId, progress, status } = update;

        if (!milestoneId || !ObjectId.isValid(milestoneId)) {
          continue; // Skip invalid milestone IDs
        }

        const milestoneUpdateData = {};
        if (progress !== undefined)
          milestoneUpdateData["milestones.$.progress"] = progress;
        if (status !== undefined)
          milestoneUpdateData["milestones.$.status"] = status;
        milestoneUpdateData["milestones.$.updatedAt"] = new Date();

        await db.collection("projects").updateOne(
          {
            _id: new ObjectId(id),
            "milestones._id": new ObjectId(milestoneId),
          },
          { $set: milestoneUpdateData }
        );
      }
    }

    // Create audit log
    await createAuditLog({
      action: "UPDATE_PROJECT_PROGRESS",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        previousProgress: project.progress,
        newProgress: progress,
        previousStatus: project.status,
        newStatus: status,
        milestonesUpdated: milestoneUpdates ? milestoneUpdates.length : 0,
      },
    });

    // Check if project is delayed and create alert if needed
    const today = new Date();
    if (
      project.endDate &&
      new Date(project.endDate) < today &&
      progress < 100
    ) {
      // Project is past due date but not complete
      await db.collection("project_alerts").insertOne({
        projectId: new ObjectId(id),
        alertType: "DELAY",
        message: `Project '${project.name}' is delayed. Current progress: ${progress}%`,
        status: "active",
        priority: "high",
        createdAt: new Date(),
        updatedAt: new Date(),
        relatedEntityId: id,
        relatedEntityType: "project",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Project progress updated successfully",
    });
  } catch (error) {
    console.error("Error updating project progress:", error);
    return NextResponse.json(
      { error: "Failed to update project progress" },
      { status: 500 }
    );
  }
}
