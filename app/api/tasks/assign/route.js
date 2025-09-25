import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Bulk assign tasks to users or teams
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      taskIds,
      assignedTo = [],
      assignedTeams = [],
      assignedBy,
      notifyAssignees = true,
    } = data;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "Task IDs array is required" },
        { status: 400 }
      );
    }

    if (assignedTo.length === 0 && assignedTeams.length === 0) {
      return NextResponse.json(
        { error: "At least one assignee (user or team) is required" },
        { status: 400 }
      );
    }

    // Validate all task IDs
    const validTaskIds = taskIds.filter((id) => ObjectId.isValid(id));
    if (validTaskIds.length !== taskIds.length) {
      return NextResponse.json(
        { error: "All task IDs must be valid ObjectIds" },
        { status: 400 }
      );
    }

    // Convert to ObjectIds
    const taskObjectIds = validTaskIds.map((id) => new ObjectId(id));
    const assignedToObjectIds = assignedTo.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );
    const assignedTeamsObjectIds = assignedTeams.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    // Check if all tasks exist
    const existingTasks = await db
      .collection("tasks")
      .find({
        _id: { $in: taskObjectIds },
      })
      .toArray();

    if (existingTasks.length !== taskObjectIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found" },
        { status: 404 }
      );
    }

    // Update all tasks with new assignments
    const result = await db.collection("tasks").updateMany(
      { _id: { $in: taskObjectIds } },
      {
        $addToSet: {
          assignedTo: { $each: assignedToObjectIds },
          assignedTeams: { $each: assignedTeamsObjectIds },
        },
        $push: {
          activityLog: {
            action: "bulk_assigned",
            userId: assignedBy ? new ObjectId(assignedBy) : null,
            timestamp: new Date(),
            details: `Bulk assigned to ${assignedToObjectIds.length} users and ${assignedTeamsObjectIds.length} teams`,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit logs for each task
    for (const task of existingTasks) {
      await createAuditLog({
        action: "BULK_ASSIGN_TASK",
        entityType: "task",
        entityId: task._id.toString(),
        userId: assignedBy || "admin",
        userEmail: "admin@company.com",
        metadata: {
          taskTitle: task.title,
          newAssignees: assignedToObjectIds.length,
          newTeams: assignedTeamsObjectIds.length,
        },
      });
    }

    // TODO: Send notifications to newly assigned users if notifyAssignees is true

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} tasks assigned successfully`,
      assignedTasks: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk assigning tasks:", error);
    return NextResponse.json(
      { error: "Failed to assign tasks" },
      { status: 500 }
    );
  }
}

// Remove assignments from tasks
export async function DELETE(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      taskIds,
      removeAssignedTo = [],
      removeAssignedTeams = [],
      removedBy,
    } = data;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "Task IDs array is required" },
        { status: 400 }
      );
    }

    if (removeAssignedTo.length === 0 && removeAssignedTeams.length === 0) {
      return NextResponse.json(
        { error: "At least one assignee to remove is required" },
        { status: 400 }
      );
    }

    // Validate all task IDs
    const validTaskIds = taskIds.filter((id) => ObjectId.isValid(id));
    if (validTaskIds.length !== taskIds.length) {
      return NextResponse.json(
        { error: "All task IDs must be valid ObjectIds" },
        { status: 400 }
      );
    }

    // Convert to ObjectIds
    const taskObjectIds = validTaskIds.map((id) => new ObjectId(id));
    const removeAssignedToObjectIds = removeAssignedTo.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );
    const removeAssignedTeamsObjectIds = removeAssignedTeams.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    // Update tasks by removing assignments
    const result = await db.collection("tasks").updateMany(
      { _id: { $in: taskObjectIds } },
      {
        $pullAll: {
          assignedTo: removeAssignedToObjectIds,
          assignedTeams: removeAssignedTeamsObjectIds,
        },
        $push: {
          activityLog: {
            action: "assignments_removed",
            userId: removedBy ? new ObjectId(removedBy) : null,
            timestamp: new Date(),
            details: `Removed ${removeAssignedToObjectIds.length} user assignments and ${removeAssignedTeamsObjectIds.length} team assignments`,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Assignments removed from ${result.modifiedCount} tasks`,
      modifiedTasks: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error removing task assignments:", error);
    return NextResponse.json(
      { error: "Failed to remove assignments" },
      { status: 500 }
    );
  }
}
