import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// Get a specific task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Fetch task with related data
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
        $lookup: {
          from: "employees",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedEmployees",
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      {
        $lookup: {
          from: "tasks",
          localField: "dependencies",
          foreignField: "_id",
          as: "dependentTasks",
        },
      },
      {
        $addFields: {
          project: { $arrayElemAt: ["$project", 0] },
          creator: { $arrayElemAt: ["$creator", 0] },
          assignedEmployees: {
            $map: {
              input: "$assignedEmployees",
              as: "employee",
              in: {
                _id: "$$employee._id",
                name: {
                  $ifNull: [
                    "$$employee.personalDetails.name",
                    "$$employee.name",
                    "Unknown",
                  ],
                },
                email: {
                  $ifNull: [
                    "$$employee.personalDetails.email",
                    "$$employee.email",
                    "",
                  ],
                },
                department: {
                  $ifNull: [
                    "$$employee.department",
                    "$$employee.personalDetails.department",
                    "",
                  ],
                },
              },
            },
          },
          dependentTasks: {
            $map: {
              input: "$dependentTasks",
              as: "task",
              in: {
                _id: "$$task._id",
                title: "$$task.title",
                status: "$$task.status",
                priority: "$$task.priority",
              },
            },
          },
        },
      },
    ];

    const tasks = await db.collection("tasks").aggregate(pipeline).toArray();

    if (tasks.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: tasks[0],
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// Update a task
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    console.log(
      "PUT /api/tasks/[id] - Received data:",
      JSON.stringify(data, null, 2)
    );
    console.log("PUT /api/tasks/[id] - Task ID:", id);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Check if task exists
    const existingTask = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const {
      title,
      description,
      assignedTo,
      assignedTeams,
      priority,
      status,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      progress,
      tags,
      dependencies,
      subtasks,
      category,
      isBlocked,
      blockReason,
      requiresApproval,
      updatedBy,
    } = data;

    const updateData = {};

    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      // If status is completed, set completedAt
      if (status === "completed" && existingTask.status !== "completed") {
        updateData.completedAt = new Date();
      }
    }
    if (startDate !== undefined)
      updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedHours !== undefined)
      updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (progress !== undefined)
      updateData.progress = Math.min(100, Math.max(0, progress));
    if (tags !== undefined) updateData.tags = tags;
    if (category !== undefined) updateData.category = category;
    if (isBlocked !== undefined) updateData.isBlocked = isBlocked;
    if (blockReason !== undefined) updateData.blockReason = blockReason;
    if (requiresApproval !== undefined)
      updateData.requiresApproval = requiresApproval;

    // Handle assigned employees
    if (assignedTo !== undefined) {
      if (Array.isArray(assignedTo)) {
        updateData.assignedTo = assignedTo
          .map((id) => {
            if (typeof id === "string") {
              if (ObjectId.isValid(id)) {
                return new ObjectId(id);
              } else {
                console.warn(`Invalid ObjectId in assignedTo: ${id}`);
                return null;
              }
            }
            return id;
          })
          .filter((id) => id !== null);
      } else {
        updateData.assignedTo = [];
      }
    }

    // Handle assigned teams
    if (assignedTeams !== undefined) {
      if (Array.isArray(assignedTeams)) {
        updateData.assignedTeams = assignedTeams
          .map((id) => {
            if (typeof id === "string") {
              if (ObjectId.isValid(id)) {
                return new ObjectId(id);
              } else {
                console.warn(`Invalid ObjectId in assignedTeams: ${id}`);
                return null;
              }
            }
            return id;
          })
          .filter((id) => id !== null);
      } else {
        updateData.assignedTeams = [];
      }
    }

    // Handle dependencies
    if (dependencies !== undefined) {
      if (Array.isArray(dependencies)) {
        updateData.dependencies = dependencies
          .map((id) => {
            if (typeof id === "string") {
              if (ObjectId.isValid(id)) {
                return new ObjectId(id);
              } else {
                console.warn(`Invalid ObjectId in dependencies: ${id}`);
                return null;
              }
            }
            return id;
          })
          .filter((id) => id !== null);
      } else {
        updateData.dependencies = [];
      }
    }

    // Handle subtasks
    if (subtasks !== undefined) {
      if (Array.isArray(subtasks)) {
        updateData.subtasks = subtasks.map((subtask) => ({
          _id: subtask._id ? new ObjectId(subtask._id) : new ObjectId(),
          title: subtask.title || "",
          description: subtask.description || "",
          assignedTo: subtask.assignedTo
            ? typeof subtask.assignedTo === "string" &&
              ObjectId.isValid(subtask.assignedTo)
              ? new ObjectId(subtask.assignedTo)
              : subtask.assignedTo instanceof ObjectId
              ? subtask.assignedTo
              : null
            : null,
          status: subtask.status || "pending",
          priority: subtask.priority || "medium",
          estimatedHours: subtask.estimatedHours || 0,
          actualHours: subtask.actualHours || 0,
          startDate: subtask.startDate ? new Date(subtask.startDate) : null,
          dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
          progress: subtask.progress || 0,
          createdAt: subtask.createdAt
            ? new Date(subtask.createdAt)
            : new Date(),
          updatedAt: new Date(),
        }));
      } else {
        updateData.subtasks = [];
      }
    }

    updateData.updatedAt = new Date();

    // Add activity log entry
    const activityEntry = {
      action: "updated",
      userId: updatedBy
        ? typeof updatedBy === "string" && ObjectId.isValid(updatedBy)
          ? new ObjectId(updatedBy)
          : updatedBy
        : null,
      timestamp: new Date(),
      details: `Task updated`,
      changes: Object.keys(updateData).filter((key) => key !== "updatedAt"),
    };

    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $push: { activityLog: activityEntry },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_TASK",
      entityType: "task",
      entityId: id,
      userId: updatedBy || "admin",
      userEmail: "admin@company.com",
      metadata: {
        taskTitle: title || existingTask.title,
        previousStatus: existingTask.status,
        newStatus: status,
        changedFields: Object.keys(updateData).filter(
          (key) => key !== "updatedAt" && key !== "$push"
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    return NextResponse.json(
      {
        error: "Failed to update task",
        details: error.message,
        errorName: error.name,
      },
      { status: 500 }
    );
  }
}

// Delete a task
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Remove task from project's taskIds array
    await db.collection("projects").updateOne(
      { _id: task.projectId },
      {
        $pull: { taskIds: new ObjectId(id) },
        $set: { updatedAt: new Date() },
      }
    );

    // Remove task dependencies from other tasks
    await db.collection("tasks").updateMany(
      { dependencies: new ObjectId(id) },
      {
        $pull: { dependencies: new ObjectId(id) },
        $set: { updatedAt: new Date() },
      }
    );

    // Delete the task
    const result = await db.collection("tasks").deleteOne({
      _id: new ObjectId(id),
    });

    // Create audit log
    await createAuditLog({
      action: "DELETE_TASK",
      entityType: "task",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        taskTitle: task.title,
        projectId: task.projectId.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
