import { getDb } from "../../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { success: false, error: "Invalid milestone ID" },
        { status: 400 }
      );
    }

    const milestone = await db
      .collection("milestones")
      .findOne({ _id: new ObjectId(id) });

    if (!milestone) {
      return Response.json(
        { success: false, error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Get employee details
    const employeeIds = new Set();
    if (milestone.assignedTo) employeeIds.add(milestone.assignedTo);
    if (milestone.createdBy) employeeIds.add(milestone.createdBy);

    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: Array.from(employeeIds).map((id) => new ObjectId(id)) },
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp.personalDetails?.name || "Unknown";
    });

    const enrichedMilestone = {
      ...milestone,
      assignedToName: employeeMap[milestone.assignedTo] || "Unknown",
      createdByName: employeeMap[milestone.createdBy] || "Unknown",
    };

    return Response.json({
      success: true,
      data: enrichedMilestone,
    });
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return Response.json(
      { success: false, error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { success: false, error: "Invalid milestone ID" },
        { status: 400 }
      );
    }

    // Check if milestone exists
    const existingMilestone = await db
      .collection("milestones")
      .findOne({ _id: new ObjectId(id) });
    if (!existingMilestone) {
      return Response.json(
        { success: false, error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    // Convert date strings to Date objects
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.actualCompletionDate)
      updateData.actualCompletionDate = new Date(body.actualCompletionDate);

    // Update milestone
    const result = await db
      .collection("milestones")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return Response.json(
        { success: false, error: "No changes made to milestone" },
        { status: 400 }
      );
    }

    // Update project progress
    await updateProjectProgress(db, existingMilestone.projectId);

    // Check for milestone completion and create alerts if needed
    if (
      body.status === "completed" &&
      existingMilestone.status !== "completed"
    ) {
      await createMilestoneCompletionAlert(db, existingMilestone);
    }

    // Check for overdue milestones
    if (body.status && ["pending", "in-progress"].includes(body.status)) {
      await checkOverdueMilestone(db, { _id: new ObjectId(id), ...updateData });
    }

    // Get updated milestone
    const updatedMilestone = await db
      .collection("milestones")
      .findOne({ _id: new ObjectId(id) });

    return Response.json({
      success: true,
      data: updatedMilestone,
      message: "Milestone updated successfully",
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return Response.json(
      { success: false, error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { success: false, error: "Invalid milestone ID" },
        { status: 400 }
      );
    }

    // Get milestone to get project ID
    const milestone = await db
      .collection("milestones")
      .findOne({ _id: new ObjectId(id) });
    if (!milestone) {
      return Response.json(
        { success: false, error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Delete milestone
    const result = await db
      .collection("milestones")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json(
        { success: false, error: "Failed to delete milestone" },
        { status: 500 }
      );
    }

    // Update project progress
    await updateProjectProgress(db, milestone.projectId);

    return Response.json({
      success: true,
      message: "Milestone deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return Response.json(
      { success: false, error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}

// Helper functions
async function updateProjectProgress(db, projectId) {
  try {
    const milestones = await db
      .collection("milestones")
      .find({ projectId })
      .toArray();

    if (milestones.length === 0) {
      await db
        .collection("projects")
        .updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { progress: 0, updatedAt: new Date() } }
        );
      return;
    }

    const totalProgress = milestones.reduce(
      (sum, milestone) => sum + (milestone.progress || 0),
      0
    );
    const averageProgress = Math.round(totalProgress / milestones.length);

    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { progress: averageProgress, updatedAt: new Date() } }
      );
  } catch (error) {
    console.error("Error updating project progress:", error);
  }
}

async function createMilestoneCompletionAlert(db, milestone) {
  try {
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(milestone.projectId) });
    if (!project) return;

    const alert = {
      projectId: milestone.projectId,
      milestoneId: milestone._id.toString(),
      type: "milestone",
      severity: "medium",
      title: `Milestone Completed: ${milestone.name}`,
      message: `The milestone "${milestone.name}" has been completed for project "${project.name}".`,
      isRead: false,
      isResolved: false,
      triggeredAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      recipients: [project.projectManager, ...(project.teamMembers || [])],
      metadata: {
        milestoneName: milestone.name,
        projectName: project.name,
        completionDate: new Date(),
      },
    };

    await db.collection("project_alerts").insertOne(alert);
  } catch (error) {
    console.error("Error creating milestone completion alert:", error);
  }
}

async function checkOverdueMilestone(db, milestone) {
  try {
    if (milestone.dueDate && new Date(milestone.dueDate) < new Date()) {
      const project = await db
        .collection("projects")
        .findOne({ _id: new ObjectId(milestone.projectId) });
      if (!project) return;

      // Check if alert already exists
      const existingAlert = await db.collection("project_alerts").findOne({
        projectId: milestone.projectId,
        milestoneId: milestone._id.toString(),
        type: "delay",
        isResolved: false,
      });

      if (!existingAlert) {
        const alert = {
          projectId: milestone.projectId,
          milestoneId: milestone._id.toString(),
          type: "delay",
          severity: "high",
          title: `Overdue Milestone: ${milestone.name}`,
          message: `The milestone "${milestone.name}" is overdue for project "${project.name}".`,
          isRead: false,
          isResolved: false,
          triggeredAt: new Date(),
          resolvedAt: null,
          resolvedBy: null,
          recipients: [project.projectManager, ...(project.teamMembers || [])],
          metadata: {
            milestoneName: milestone.name,
            projectName: project.name,
            dueDate: milestone.dueDate,
            daysOverdue: Math.ceil(
              (new Date() - new Date(milestone.dueDate)) / (1000 * 60 * 60 * 24)
            ),
          },
        };

        await db.collection("project_alerts").insertOne(alert);
      }
    }
  } catch (error) {
    console.error("Error checking overdue milestone:", error);
  }
}
