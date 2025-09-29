import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";


// Create a new task
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {

      title,
      description,
      projectId,
      milestoneId,
      assignedTo = [],
      assignedTeams = [],
      priority = "medium",
      status = "pending",
      startDate,
      dueDate,
      estimatedHours,
      actualHours = 0,
      tags = [],
      dependencies = [],
      subtasks = [],
      category = "general",
      createdBy,
    } = data;

    // Validation
    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and project ID are required" },

        { status: 400 }
      );
    }


    // Validate ObjectIds
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid project ID" },

        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Convert employee IDs to ObjectIds
    const assignedToObjectIds = Array.isArray(assignedTo)
      ? assignedTo.map((id) => (typeof id === "string" ? new ObjectId(id) : id))
      : [];

    const assignedTeamsObjectIds = Array.isArray(assignedTeams)
      ? assignedTeams.map((id) =>
          typeof id === "string" ? new ObjectId(id) : id
        )
      : [];

    const dependencyObjectIds = Array.isArray(dependencies)
      ? dependencies.map((id) =>
          typeof id === "string" ? new ObjectId(id) : id
        )
      : [];

    // Process subtasks
    const processedSubtasks = Array.isArray(subtasks)
      ? subtasks.map((subtask) => ({
          _id: new ObjectId(),
          title: subtask.title || "",
          description: subtask.description || "",
          assignedTo: subtask.assignedTo
            ? typeof subtask.assignedTo === "string"
              ? new ObjectId(subtask.assignedTo)
              : subtask.assignedTo
            : null,
          status: subtask.status || "pending",
          priority: subtask.priority || "medium",
          estimatedHours: subtask.estimatedHours || 0,
          actualHours: 0,
          startDate: subtask.startDate ? new Date(subtask.startDate) : null,
          dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      : [];

    // Create task object
    const task = {
      title,
      description: description || "",
      projectId: new ObjectId(projectId),
      milestoneId: milestoneId ? new ObjectId(milestoneId) : null,
      assignedTo: assignedToObjectIds,
      assignedTeams: assignedTeamsObjectIds,
      priority, // low, medium, high, critical
      status, // pending, in_progress, review, completed, cancelled, blocked
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours || 0,
      actualHours,
      progress: 0,
      tags,
      dependencies: dependencyObjectIds,
      subtasks: processedSubtasks,
      category,
      createdBy: createdBy
        ? typeof createdBy === "string" && ObjectId.isValid(createdBy)
          ? new ObjectId(createdBy)
          : createdBy
        : null,

      // Communication and collaboration
      comments: [],
      attachments: [],
      activityLog: [
        {
          action: "created",
          userId: createdBy
            ? typeof createdBy === "string" && ObjectId.isValid(createdBy)
              ? new ObjectId(createdBy)
              : createdBy
            : null,
          timestamp: new Date(),
          details: "Task created",
        },
      ],

      // Workflow tracking
      isBlocked: false,
      blockReason: null,
      completedAt: null,

      // Time tracking
      timeEntries: [],

      // Approval workflow
      requiresApproval: false,
      approvedBy: null,
      approvedAt: null,


      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tasks").insertOne(task);


    // Update project with task reference
    await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $push: { taskIds: result.insertedId },
        $set: { updatedAt: new Date() },
      }
    );


    // Create audit log
    await createAuditLog({
      action: "CREATE_TASK",
      entityType: "task",
      entityId: result.insertedId.toString(),

      userId: createdBy || "admin",
      userEmail: "admin@company.com",
      metadata: {
        taskTitle: title,
        projectId: projectId,
        assignedCount: assignedToObjectIds.length,
        priority,
        dueDate,

      },
    });

    return NextResponse.json({
      success: true,
      message: "Task created successfully",

      task: { _id: result.insertedId, ...task },

    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}


// Get all tasks with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const assignedTo = searchParams.get("assignedTo");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const dueWithin = searchParams.get("dueWithin"); // days
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const db = await getDb();

    // Build query
    let query = {};

    if (projectId) {
      if (!ObjectId.isValid(projectId)) {
        return NextResponse.json(
          { error: "Invalid project ID" },
          { status: 400 }
        );
      }
      query.projectId = new ObjectId(projectId);
    }

    if (assignedTo) {
      if (!ObjectId.isValid(assignedTo)) {
        return NextResponse.json(
          { error: "Invalid assignedTo ID" },
          { status: 400 }
        );
      }
      query.assignedTo = new ObjectId(assignedTo);
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    // Due date filter
    if (dueWithin) {
      const days = parseInt(dueWithin);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      query.dueDate = { $lte: futureDate };
    }

    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch tasks with lookup for project and employee details
    const pipeline = [
      { $match: query },
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
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ];

    const [tasks, totalCount] = await Promise.all([
      db.collection("tasks").aggregate(pipeline).toArray(),
      db.collection("tasks").countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
