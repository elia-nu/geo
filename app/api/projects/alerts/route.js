import { getDb } from "../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type");
    const severity = searchParams.get("severity");
    const isResolved = searchParams.get("isResolved");
    const isRead = searchParams.get("isRead");
    const recipientId = searchParams.get("recipientId");

    // Build filter object
    const filter = {};

    if (projectId) filter.projectId = projectId;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (isResolved !== null) filter.isResolved = isResolved === "true";
    if (isRead !== null) filter.isRead = isRead === "true";
    if (recipientId) filter.recipients = { $in: [recipientId] };

    // Get alerts
    const alerts = await db
      .collection("project_alerts")
      .find(filter)
      .sort({ triggeredAt: -1 })
      .toArray();

    // Get project and milestone details
    const projectIds = [...new Set(alerts.map((alert) => alert.projectId))];
    const milestoneIds = [
      ...new Set(alerts.map((alert) => alert.milestoneId).filter(Boolean)),
    ];

    const [projects, milestones] = await Promise.all([
      db
        .collection("projects")
        .find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } })
        .toArray(),
      milestoneIds.length > 0
        ? db
            .collection("milestones")
            .find({ _id: { $in: milestoneIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : [],
    ]);

    const projectMap = {};
    projects.forEach((project) => {
      projectMap[project._id.toString()] = project;
    });

    const milestoneMap = {};
    milestones.forEach((milestone) => {
      milestoneMap[milestone._id.toString()] = milestone;
    });

    // Enrich alerts with project and milestone names
    const enrichedAlerts = alerts.map((alert) => ({
      ...alert,
      projectName: projectMap[alert.projectId]?.name || "Unknown Project",
      milestoneName: alert.milestoneId
        ? milestoneMap[alert.milestoneId]?.name
        : null,
    }));

    return Response.json({
      success: true,
      data: enrichedAlerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return Response.json(
      { success: false, error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "projectId",
      "type",
      "severity",
      "title",
      "message",
    ];
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

    // Create alert object
    const alert = {
      projectId: body.projectId,
      milestoneId: body.milestoneId || null,
      type: body.type,
      severity: body.severity,
      title: body.title,
      message: body.message,
      isRead: false,
      isResolved: false,
      triggeredAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      recipients: body.recipients || [
        project.projectManager,
        ...(project.teamMembers || []),
      ],
      metadata: body.metadata || {},
    };

    // Insert alert
    const result = await db.collection("project_alerts").insertOne(alert);

    return Response.json({
      success: true,
      data: { _id: result.insertedId, ...alert },
      message: "Alert created successfully",
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    return Response.json(
      { success: false, error: "Failed to create alert" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    const { alertIds, action, resolvedBy } = body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return Response.json(
        { success: false, error: "Alert IDs are required" },
        { status: 400 }
      );
    }

    if (
      !action ||
      !["mark_read", "mark_unread", "resolve", "unresolve"].includes(action)
    ) {
      return Response.json(
        { success: false, error: "Valid action is required" },
        { status: 400 }
      );
    }

    const updateData = {};

    switch (action) {
      case "mark_read":
        updateData.isRead = true;
        break;
      case "mark_unread":
        updateData.isRead = false;
        break;
      case "resolve":
        updateData.isResolved = true;
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy;
        break;
      case "unresolve":
        updateData.isResolved = false;
        updateData.resolvedAt = null;
        updateData.resolvedBy = null;
        break;
    }

    // Update alerts
    const result = await db
      .collection("project_alerts")
      .updateMany(
        { _id: { $in: alertIds.map((id) => new ObjectId(id)) } },
        { $set: updateData }
      );

    return Response.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} alerts updated successfully`,
    });
  } catch (error) {
    console.error("Error updating alerts:", error);
    return Response.json(
      { success: false, error: "Failed to update alerts" },
      { status: 500 }
    );
  }
}
