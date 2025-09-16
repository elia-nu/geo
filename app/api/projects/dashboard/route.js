import { getDb } from "../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const timeframe = searchParams.get("timeframe") || "30"; // days

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // Build project filter based on user role
    let projectFilter = {};
    if (userId) {
      // Get user's projects (as manager or team member)
      projectFilter = {
        $or: [{ projectManager: userId }, { teamMembers: { $in: [userId] } }],
      };
    }

    // Get project statistics
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      overdueProjects,
      projectsByStatus,
      projectsByPriority,
      projectsByCategory,
      recentProjects,
      upcomingMilestones,
      overdueMilestones,
      recentAlerts,
      projectProgress,
    ] = await Promise.all([
      // Total projects
      db.collection("projects").countDocuments(projectFilter),

      // Active projects
      db
        .collection("projects")
        .countDocuments({ ...projectFilter, status: "active" }),

      // Completed projects
      db
        .collection("projects")
        .countDocuments({ ...projectFilter, status: "completed" }),

      // Overdue projects
      db.collection("projects").countDocuments({
        ...projectFilter,
        endDate: { $lt: new Date() },
        status: { $in: ["planning", "active"] },
      }),

      // Projects by status
      db
        .collection("projects")
        .aggregate([
          { $match: projectFilter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),

      // Projects by priority
      db
        .collection("projects")
        .aggregate([
          { $match: projectFilter },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ])
        .toArray(),

      // Projects by category
      db
        .collection("projects")
        .aggregate([
          { $match: projectFilter },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ])
        .toArray(),

      // Recent projects
      db
        .collection("projects")
        .find(projectFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),

      // Upcoming milestones (next 7 days)
      db
        .collection("milestones")
        .aggregate([
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          {
            $match: {
              ...(userId
                ? {
                    $or: [
                      { "project.projectManager": userId },
                      { "project.teamMembers": { $in: [userId] } },
                    ],
                  }
                : {}),
              dueDate: {
                $gte: new Date(),
                $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              status: { $in: ["pending", "in-progress"] },
            },
          },
          { $sort: { dueDate: 1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Overdue milestones
      db
        .collection("milestones")
        .aggregate([
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          {
            $match: {
              ...(userId
                ? {
                    $or: [
                      { "project.projectManager": userId },
                      { "project.teamMembers": { $in: [userId] } },
                    ],
                  }
                : {}),
              dueDate: { $lt: new Date() },
              status: { $in: ["pending", "in-progress"] },
            },
          },
          { $sort: { dueDate: 1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Recent alerts
      db
        .collection("project_alerts")
        .aggregate([
          {
            $lookup: {
              from: "projects",
              localField: "projectId",
              foreignField: "_id",
              as: "project",
            },
          },
          { $unwind: "$project" },
          {
            $match: {
              ...(userId
                ? {
                    $or: [
                      { "project.projectManager": userId },
                      { "project.teamMembers": { $in: [userId] } },
                      { recipients: { $in: [userId] } },
                    ],
                  }
                : {}),
              triggeredAt: { $gte: startDate, $lte: endDate },
              isResolved: false,
            },
          },
          { $sort: { triggeredAt: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // Project progress distribution
      db
        .collection("projects")
        .aggregate([
          { $match: projectFilter },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $lt: ["$progress", 25] }, then: "0-25%" },
                    { case: { $lt: ["$progress", 50] }, then: "25-50%" },
                    { case: { $lt: ["$progress", 75] }, then: "50-75%" },
                    { case: { $lt: ["$progress", 100] }, then: "75-100%" },
                  ],
                  default: "100%",
                },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    // Get employee details for enrichment
    const employeeIds = new Set();
    recentProjects.forEach((project) => {
      if (project.projectManager) employeeIds.add(project.projectManager);
      if (project.teamMembers) {
        project.teamMembers.forEach((member) => employeeIds.add(member));
      }
    });

    upcomingMilestones.forEach((milestone) => {
      if (milestone.assignedTo) employeeIds.add(milestone.assignedTo);
    });

    overdueMilestones.forEach((milestone) => {
      if (milestone.assignedTo) employeeIds.add(milestone.assignedTo);
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

    // Enrich data with employee names
    const enrichedRecentProjects = recentProjects.map((project) => ({
      ...project,
      projectManagerName: employeeMap[project.projectManager] || "Unknown",
    }));

    const enrichedUpcomingMilestones = upcomingMilestones.map((milestone) => ({
      ...milestone,
      assignedToName: employeeMap[milestone.assignedTo] || "Unknown",
      projectName: milestone.project.name,
    }));

    const enrichedOverdueMilestones = overdueMilestones.map((milestone) => ({
      ...milestone,
      assignedToName: employeeMap[milestone.assignedTo] || "Unknown",
      projectName: milestone.project.name,
    }));

    const enrichedRecentAlerts = recentAlerts.map((alert) => ({
      ...alert,
      projectName: alert.project.name,
    }));

    return Response.json({
      success: true,
      data: {
        statistics: {
          totalProjects,
          activeProjects,
          completedProjects,
          overdueProjects,
          completionRate:
            totalProjects > 0
              ? Math.round((completedProjects / totalProjects) * 100)
              : 0,
        },
        charts: {
          projectsByStatus: projectsByStatus.map((item) => ({
            name: item._id,
            value: item.count,
          })),
          projectsByPriority: projectsByPriority.map((item) => ({
            name: item._id,
            value: item.count,
          })),
          projectsByCategory: projectsByCategory.map((item) => ({
            name: item._id,
            value: item.count,
          })),
          projectProgress: projectProgress.map((item) => ({
            name: item._id,
            value: item.count,
          })),
        },
        recent: {
          projects: enrichedRecentProjects,
          upcomingMilestones: enrichedUpcomingMilestones,
          overdueMilestones: enrichedOverdueMilestones,
          alerts: enrichedRecentAlerts,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return Response.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
