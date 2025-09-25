import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../audit/route";

// Get a specific milestone
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id, milestoneId } = await params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(milestoneId)) {
      return NextResponse.json(
        { error: "Invalid project ID or milestone ID" },
        { status: 400 }
      );
    }

    // Find the project
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find the milestone
    const milestone = project.milestones?.find(
      (m) =>
        m._id.toString() === milestoneId ||
        m._id.equals(new ObjectId(milestoneId))
    );

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      milestone,
      projectName: project.name,
    });
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

// Update a specific milestone
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, milestoneId } = await params;
    const data = await request.json();

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(milestoneId)) {
      return NextResponse.json(
        { error: "Invalid project ID or milestone ID" },
        { status: 400 }
      );
    }

    // Find the project
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if milestone exists
    const milestoneIndex = project.milestones?.findIndex(
      (m) =>
        m._id.toString() === milestoneId ||
        m._id.equals(new ObjectId(milestoneId))
    );

    if (milestoneIndex === -1 || milestoneIndex === undefined) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const { title, description, dueDate, status, completedDate } = data;
    const updateData = {};

    // Only update fields that are provided
    if (title !== undefined)
      updateData[`milestones.${milestoneIndex}.title`] = title;
    if (description !== undefined)
      updateData[`milestones.${milestoneIndex}.description`] = description;
    if (dueDate !== undefined)
      updateData[`milestones.${milestoneIndex}.dueDate`] = new Date(dueDate);
    if (status !== undefined)
      updateData[`milestones.${milestoneIndex}.status`] = status;
    if (completedDate !== undefined)
      updateData[`milestones.${milestoneIndex}.completedDate`] = new Date(
        completedDate
      );

    // Always update the updatedAt timestamp
    updateData[`milestones.${milestoneIndex}.updatedAt`] = new Date();
    updateData.updatedAt = new Date();

    // Update the project
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_MILESTONE",
      entityType: "project_milestone",
      entityId: `${id}_${milestoneId}`,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        milestoneTitle: title || project.milestones[milestoneIndex].title,
        updatedFields: Object.keys(data),
      },
    });

    // Get the updated milestone
    const updatedProject = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    const updatedMilestone = updatedProject.milestones[milestoneIndex];

    return NextResponse.json({
      success: true,
      message: "Milestone updated successfully",
      milestone: updatedMilestone,
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// Delete a specific milestone
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id, milestoneId } = await params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(milestoneId)) {
      return NextResponse.json(
        { error: "Invalid project ID or milestone ID" },
        { status: 400 }
      );
    }

    // Find the project to get milestone details for audit log
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find the milestone
    const milestone = project.milestones?.find(
      (m) =>
        m._id.toString() === milestoneId ||
        m._id.equals(new ObjectId(milestoneId))
    );

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Remove the milestone
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { milestones: { _id: new ObjectId(milestoneId) } },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "DELETE_MILESTONE",
      entityType: "project_milestone",
      entityId: `${id}_${milestoneId}`,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        milestoneTitle: milestone.title,
        milestoneStatus: milestone.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Milestone deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
