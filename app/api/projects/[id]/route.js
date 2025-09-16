import { getDb } from "../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Get project details
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Get project milestones
    const milestones = await db
      .collection("milestones")
      .find({ projectId: id })
      .sort({ dueDate: 1 })
      .toArray();

    // Get project updates
    const updates = await db
      .collection("project_updates")
      .find({ projectId: id })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // Get project alerts
    const alerts = await db
      .collection("project_alerts")
      .find({ projectId: id, isResolved: false })
      .sort({ triggeredAt: -1 })
      .toArray();

    // Get employee details
    const employeeIds = new Set();
    if (project.projectManager) employeeIds.add(project.projectManager);
    if (project.teamMembers) {
      project.teamMembers.forEach((member) => employeeIds.add(member));
    }
    if (project.createdBy) employeeIds.add(project.createdBy);
    if (project.lastModifiedBy) employeeIds.add(project.lastModifiedBy);

    milestones.forEach((milestone) => {
      if (milestone.assignedTo) employeeIds.add(milestone.assignedTo);
      if (milestone.createdBy) employeeIds.add(milestone.createdBy);
    });

    updates.forEach((update) => {
      if (update.author) employeeIds.add(update.author);
    });

    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: Array.from(employeeIds).map((id) => new ObjectId(id)) },
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || "Unknown",
        email: emp.personalDetails?.email || "",
        department: emp.department || "",
        designation: emp.designation || "",
      };
    });

    // Enrich data with employee names
    const enrichedProject = {
      ...project,
      projectManagerName:
        employeeMap[project.projectManager]?.name || "Unknown",
      teamMemberNames:
        project.teamMembers?.map(
          (member) => employeeMap[member]?.name || "Unknown"
        ) || [],
      createdByName: employeeMap[project.createdBy]?.name || "Unknown",
      lastModifiedByName:
        employeeMap[project.lastModifiedBy]?.name || "Unknown",
    };

    const enrichedMilestones = milestones.map((milestone) => ({
      ...milestone,
      assignedToName: employeeMap[milestone.assignedTo]?.name || "Unknown",
      createdByName: employeeMap[milestone.createdBy]?.name || "Unknown",
    }));

    const enrichedUpdates = updates.map((update) => ({
      ...update,
      authorName: employeeMap[update.author]?.name || "Unknown",
    }));

    return Response.json({
      success: true,
      data: {
        project: enrichedProject,
        milestones: enrichedMilestones,
        updates: enrichedUpdates,
        alerts: alerts,
      },
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    return Response.json(
      { success: false, error: "Failed to fetch project details" },
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
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Prepare update object
    const updateData = {
      ...body,
      updatedAt: new Date(),
      lastModifiedBy: body.lastModifiedBy || body.projectManager,
    };

    // Convert date strings to Date objects
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.actualStartDate)
      updateData.actualStartDate = new Date(body.actualStartDate);
    if (body.actualEndDate)
      updateData.actualEndDate = new Date(body.actualEndDate);

    // Update project
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return Response.json(
        { success: false, error: "No changes made to project" },
        { status: 400 }
      );
    }

    // Get updated project
    const updatedProject = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    return Response.json({
      success: true,
      data: updatedProject,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return Response.json(
      { success: false, error: "Failed to update project" },
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
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Delete related data
    await Promise.all([
      db.collection("milestones").deleteMany({ projectId: id }),
      db.collection("project_updates").deleteMany({ projectId: id }),
      db.collection("project_alerts").deleteMany({ projectId: id }),
    ]);

    // Delete project
    const result = await db
      .collection("projects")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json(
        { success: false, error: "Failed to delete project" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Project and related data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return Response.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
