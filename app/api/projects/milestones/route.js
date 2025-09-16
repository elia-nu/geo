import { getDb } from "../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const overdue = searchParams.get("overdue") === "true";

    // Build filter object
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (overdue) {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $in: ["pending", "in-progress"] };
    }

    // Get milestones
    const milestones = await db
      .collection("milestones")
      .find(filter)
      .sort({ dueDate: 1 })
      .toArray();

    // Get employee details
    const employeeIds = new Set();
    milestones.forEach((milestone) => {
      if (milestone.assignedTo) employeeIds.add(milestone.assignedTo);
      if (milestone.createdBy) employeeIds.add(milestone.createdBy);
    });

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

    // Enrich milestones with employee names
    const enrichedMilestones = milestones.map((milestone) => ({
      ...milestone,
      assignedToName: employeeMap[milestone.assignedTo] || "Unknown",
      createdByName: employeeMap[milestone.createdBy] || "Unknown",
    }));

    return Response.json({
      success: true,
      data: enrichedMilestones,
    });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return Response.json(
      { success: false, error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["projectId", "name", "dueDate"];
    const missingFields = requiredFields.filter((field) => !body[field]);

    if (missingFields.length > 0) {
      return Response.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(body.projectId) });
    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Create milestone object
    const milestone = {
      projectId: body.projectId,
      name: body.name,
      description: body.description || "",
      dueDate: new Date(body.dueDate),
      actualCompletionDate: body.actualCompletionDate
        ? new Date(body.actualCompletionDate)
        : null,
      status: body.status || "pending",
      progress: body.progress || 0,
      dependencies: body.dependencies || [],
      assignedTo: body.assignedTo || project.projectManager,
      deliverables: body.deliverables || [],
      notes: body.notes || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: body.createdBy || body.assignedTo || project.projectManager,
    };

    // Insert milestone
    const result = await db.collection("milestones").insertOne(milestone);

    // Update project progress if this milestone affects it
    if (body.updateProjectProgress) {
      await updateProjectProgress(db, body.projectId);
    }

    return Response.json({
      success: true,
      data: { _id: result.insertedId, ...milestone },
      message: "Milestone created successfully",
    });
  } catch (error) {
    console.error("Error creating milestone:", error);
    return Response.json(
      { success: false, error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}

// Helper function to update project progress based on milestones
async function updateProjectProgress(db, projectId) {
  try {
    const milestones = await db
      .collection("milestones")
      .find({ projectId })
      .toArray();

    if (milestones.length === 0) return;

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
