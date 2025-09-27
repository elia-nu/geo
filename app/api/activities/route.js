import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Get all activities
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const taskId = searchParams.get("taskId");
    const departmentId = searchParams.get("departmentId");
    const status = searchParams.get("status");
    const includeAssignees = searchParams.get("includeAssignees") === "true";

    let query = {};
    if (projectId && ObjectId.isValid(projectId)) {
      query.projectId = new ObjectId(projectId);
    }
    if (taskId && ObjectId.isValid(taskId)) {
      query.taskId = new ObjectId(taskId);
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

    // Add task and department information
    pipeline.push({
      $lookup: {
        from: "tasks",
        localField: "taskId",
        foreignField: "_id",
        as: "task",
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
        task: { $arrayElemAt: ["$task", 0] },
        department: { $arrayElemAt: ["$department", 0] },
      },
    });

    const activities = await db
      .collection("activities")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// Create a new activity
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      name,
      description,
      projectId,
      taskId,
      departmentId,
      assignedEmployees = [],
      priority = "medium",
      estimatedHours,
      startDate,
      endDate,
      status = "pending",
      activityType = "development",
    } = data;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Activity name is required" },
        { status: 400 }
      );
    }

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Valid project ID is required" },
        { status: 400 }
      );
    }

    // Check if activity already exists in the project
    const existingActivity = await db.collection("activities").findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      projectId: new ObjectId(projectId),
    });

    if (existingActivity) {
      return NextResponse.json(
        { error: "Activity with this name already exists in the project" },
        { status: 400 }
      );
    }

    const activity = {
      name,
      description: description || "",
      projectId: new ObjectId(projectId),
      taskId: taskId && ObjectId.isValid(taskId) ? new ObjectId(taskId) : null,
      departmentId:
        departmentId && ObjectId.isValid(departmentId)
          ? new ObjectId(departmentId)
          : null,
      assignedEmployees: assignedEmployees
        .map((id) => (ObjectId.isValid(id) ? new ObjectId(id) : null))
        .filter(Boolean),
      priority,
      activityType,
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

    const result = await db.collection("activities").insertOne(activity);

    // Create audit log
    await createAuditLog({
      action: "CREATE_ACTIVITY",
      entityType: "activity",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        activityName: name,
        projectId: projectId,
        taskId: taskId,
        departmentId: departmentId,
        activityType: activityType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Activity created successfully",
      activity: {
        _id: result.insertedId,
        ...activity,
      },
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
