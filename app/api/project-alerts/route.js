import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Get all project alerts with optional filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const alertType = searchParams.get("alertType");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query
    let query = {};

    if (projectId) query.projectId = new ObjectId(projectId);
    if (alertType) query.alertType = alertType;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    // Fetch alerts with project details
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
        $addFields: {
          project: { $arrayElemAt: ["$project", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          projectId: 1,
          alertType: 1,
          message: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          priority: 1,
          relatedEntityId: 1,
          relatedEntityType: 1,
          projectName: "$project.name",
          projectCategory: "$project.category",
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [alerts, totalCount] = await Promise.all([
      db.collection("project_alerts").aggregate(pipeline).toArray(),
      db.collection("project_alerts").countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      alerts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching project alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch project alerts" },
      { status: 500 }
    );
  }
}

// Create a new project alert
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      projectId,
      alertType,
      message,
      priority = "medium",
      relatedEntityId = null,
      relatedEntityType = null,
    } = data;

    // Validation
    if (!projectId || !alertType || !message) {
      return NextResponse.json(
        { error: "Project ID, alert type, and message are required" },
        { status: 400 }
      );
    }

    // Validate project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create alert object
    const alert = {
      projectId: new ObjectId(projectId),
      alertType,
      message,
      priority,
      status: "active",
      relatedEntityId: relatedEntityId ? new ObjectId(relatedEntityId) : null,
      relatedEntityType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("project_alerts").insertOne(alert);

    // Create audit log
    await createAuditLog({
      action: "CREATE_ALERT",
      entityType: "project_alert",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectId,
        projectName: project.name,
        alertType,
        priority,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project alert created successfully",
        alert: { ...alert, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project alert:", error);
    return NextResponse.json(
      { error: "Failed to create project alert" },
      { status: 500 }
    );
  }
}

// Generate automatic alerts for all projects
export async function PUT(request) {
  try {
    const db = await getDb();
    const today = new Date();
    const alerts = [];

    // Find all active projects
    const projects = await db
      .collection("projects")
      .find({ status: "active" })
      .toArray();

    for (const project of projects) {
      // Check for approaching end date (within 7 days)
      const endDate = new Date(project.endDate);
      const daysToEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      if (daysToEnd >= 0 && daysToEnd <= 7) {
        const alert = {
          projectId: project._id,
          alertType: "approaching_deadline",
          message: `Project ${project.name} is ending in ${daysToEnd} days`,
          priority: daysToEnd <= 3 ? "high" : "medium",
          status: "active",
          relatedEntityId: null,
          relatedEntityType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        alerts.push(alert);
      }

      // Check for overdue project
      if (daysToEnd < 0) {
        const alert = {
          projectId: project._id,
          alertType: "overdue_project",
          message: `Project ${project.name} is overdue by ${Math.abs(
            daysToEnd
          )} days`,
          priority: "high",
          status: "active",
          relatedEntityId: null,
          relatedEntityType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        alerts.push(alert);
      }

      // Check for approaching or missed milestones
      if (project.milestones && project.milestones.length > 0) {
        for (const milestone of project.milestones) {
          if (milestone.status === "completed") continue;

          const dueDate = new Date(milestone.dueDate);
          const daysToMilestone = Math.ceil(
            (dueDate - today) / (1000 * 60 * 60 * 24)
          );

          // Approaching milestone (within 3 days)
          if (daysToMilestone >= 0 && daysToMilestone <= 3) {
            const alert = {
              projectId: project._id,
              alertType: "approaching_milestone",
              message: `Milestone "${milestone.title}" for project ${project.name} is due in ${daysToMilestone} days`,
              priority: daysToMilestone <= 1 ? "high" : "medium",
              status: "active",
              relatedEntityId: milestone._id,
              relatedEntityType: "milestone",
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            alerts.push(alert);
          }

          // Missed milestone
          if (daysToMilestone < 0) {
            const alert = {
              projectId: project._id,
              alertType: "missed_milestone",
              message: `Milestone "${milestone.title}" for project ${
                project.name
              } is overdue by ${Math.abs(daysToMilestone)} days`,
              priority: "high",
              status: "active",
              relatedEntityId: milestone._id,
              relatedEntityType: "milestone",
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            alerts.push(alert);
          }
        }
      }

      // Check for low progress projects (if more than 50% of time elapsed but less than 30% progress)
      const startDate = new Date(project.startDate);
      const totalDuration = endDate - startDate;
      const elapsedDuration = today - startDate;
      const percentTimeElapsed = (elapsedDuration / totalDuration) * 100;

      if (percentTimeElapsed > 50 && project.progress < 30) {
        const alert = {
          projectId: project._id,
          alertType: "low_progress",
          message: `Project ${project.name} is ${Math.round(
            percentTimeElapsed
          )}% through timeline but only ${project.progress}% complete`,
          priority: "medium",
          status: "active",
          relatedEntityId: null,
          relatedEntityType: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        alerts.push(alert);
      }
    }

    // Insert all alerts if any exist
    let result = { insertedCount: 0 };
    if (alerts.length > 0) {
      result = await db.collection("project_alerts").insertMany(alerts);
    }

    // Create audit log
    await createAuditLog({
      action: "GENERATE_AUTOMATIC_ALERTS",
      entityType: "project_alerts",
      entityId: "system",
      userId: "system",
      userEmail: "system@company.com",
      metadata: {
        alertsGenerated: alerts.length,
        projectsScanned: projects.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${alerts.length} project alerts`,
      alertsCount: alerts.length,
      insertedIds: result.insertedIds || [],
    });
  } catch (error) {
    console.error("Error generating project alerts:", error);
    return NextResponse.json(
      { error: "Failed to generate project alerts" },
      { status: 500 }
    );
  }
}
