import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get task progress audits
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const projectId = searchParams.get("projectId");
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query
    let query = {};

    if (taskId && ObjectId.isValid(taskId)) {
      query.taskId = new ObjectId(taskId);
    }

    if (projectId && ObjectId.isValid(projectId)) {
      // First get all task IDs for this project
      const tasks = await db
        .collection("tasks")
        .find({ projectId: new ObjectId(projectId) })
        .project({ _id: 1 })
        .toArray();
      const taskIds = tasks.map((t) => t._id);
      if (taskIds.length > 0) {
        query.taskId = { $in: taskIds };
      } else {
        // No tasks for this project, return empty
        return NextResponse.json({
          success: true,
          audits: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }
    }

    if (employeeId && ObjectId.isValid(employeeId)) {
      query.updatedBy = new ObjectId(employeeId);
    }

    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) {
        query.updatedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.updatedAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    // Fetch audits with pagination
    const [audits, totalCount] = await Promise.all([
      db
        .collection("taskProgressAudits")
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("taskProgressAudits").countDocuments(query),
    ]);

    // Get task details for each audit
    const taskIds = [...new Set(audits.map((a) => a.taskId.toString()))];
    const tasks = await db
      .collection("tasks")
      .find({
        _id: { $in: taskIds.map((id) => new ObjectId(id)) },
      })
      .project({ _id: 1, title: 1, projectId: 1 })
      .toArray();

    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

    // Get project details
    const projectIds = [...new Set(tasks.map((t) => t.projectId?.toString()).filter(Boolean))];
    const projects = projectIds.length > 0
      ? await db
          .collection("projects")
          .find({
            _id: { $in: projectIds.map((id) => new ObjectId(id)) },
          })
          .project({ _id: 1, name: 1 })
          .toArray()
      : [];

    const projectMap = new Map(
      projects.map((p) => [p._id.toString(), p])
    );

    // Enrich audits with task and project details
    const enrichedAudits = audits.map((audit) => {
      const task = taskMap.get(audit.taskId.toString());
      const project = task?.projectId
        ? projectMap.get(task.projectId.toString())
        : null;

      return {
        ...audit,
        task: task
          ? {
              _id: task._id,
              title: task.title,
            }
          : null,
        project: project
          ? {
              _id: project._id,
              name: project.name,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      audits: enrichedAudits,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching progress audits:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress audits" },
      { status: 500 }
    );
  }
}

