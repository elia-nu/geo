import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Get all tasks
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const includeAssignees = searchParams.get("includeAssignees") === "true";

    let query = {};
    if (projectId && ObjectId.isValid(projectId)) {
      query.projectId = new ObjectId(projectId);
    }
    if (departmentId && ObjectId.isValid(departmentId)) {
      query.departmentId = new ObjectId(departmentId);
    }
    if (status) {
      query.status = status;
    }

    let pipeline = [{ $match: query }];

    if (includeAssignees) {
      pipeline.push({
        $lookup: {
          from: "employees",
          localField: "assignedEmployees",
          foreignField: "_id",
          as: "assignees",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: { $ifNull: ["$personalDetails.name", "$name"] },
                email: { $ifNull: ["$personalDetails.email", "$email"] },
                role: { $ifNull: ["$personalDetails.role", "$role"] },
              },
            },
          ],
        },
      });
    }

    // Add department information
    pipeline.push({
      $lookup: {
        from: "departments",
        localField: "departmentId",
        foreignField: "_id",
        as: "department",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
            },
          },
        ],
      },
    });

    pipeline.push({
      $addFields: {
        department: { $arrayElemAt: ["$department", 0] },
      },
    });

    const tasks = await db.collection("tasks").aggregate(pipeline).toArray();

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// Create a new task
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      name,
      description,
      projectId,
      departmentId,
      assignedEmployees = [],
      priority = "medium",
      estimatedHours,
      startDate,
      endDate,
      status = "pending",
    } = data;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      );
    }

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Valid project ID is required" },
        { status: 400 }
      );
    }

    // Check if task already exists in the project
    const existingTask = await db.collection("tasks").findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      projectId: new ObjectId(projectId),
    });

    if (existingTask) {
      return NextResponse.json(
        { error: "Task with this name already exists in the project" },
        { status: 400 }
      );
    }

    const task = {
      name,
      description: description || "",
      projectId: new ObjectId(projectId),
      departmentId:
        departmentId && ObjectId.isValid(departmentId)
          ? new ObjectId(departmentId)
          : null,
      assignedEmployees: assignedEmployees
        .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : null))
        .filter(Boolean),
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : 0,
      actualHours: 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      progress: 0,
      budget: 0,
      actualCost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tasks").insertOne(task);

    // Create audit log
    await createAuditLog({
      action: "CREATE_TASK",
      entityType: "task",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        taskName: name,
        projectId: projectId,
        departmentId: departmentId,
        priority: priority,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task created successfully",
      task: {
        _id: result.insertedId,
        ...task,
      },
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
