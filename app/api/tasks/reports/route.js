import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get task analytics and reporting data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const dateRange = parseInt(searchParams.get("dateRange")) || 30; // days
    const format = searchParams.get("format"); // csv, json

    const db = await getDb();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Build base query
    let baseQuery = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (projectId && ObjectId.isValid(projectId)) {
      baseQuery.projectId = new ObjectId(projectId);
    }

    // Aggregate task data
    const [
      totalTasks,
      statusDistribution,
      priorityDistribution,
      completedTasks,
      overdueTasks,
      dueSoonTasks,
      blockedTasks,
      newTasksThisPeriod,
      timeTrackingData,
      topPerformers,
      recentActivity,
    ] = await Promise.all([
      // Total tasks
      db.collection("tasks").countDocuments(baseQuery),

      // Status distribution
      db
        .collection("tasks")
        .aggregate([
          { $match: baseQuery },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),

      // Priority distribution
      db
        .collection("tasks")
        .aggregate([
          { $match: baseQuery },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ])
        .toArray(),

      // Completed tasks
      db.collection("tasks").countDocuments({
        ...baseQuery,
        status: "completed",
      }),

      // Overdue tasks
      db.collection("tasks").countDocuments({
        ...baseQuery,
        dueDate: { $lt: new Date() },
        status: { $nin: ["completed", "cancelled"] },
      }),

      // Due soon tasks (next 7 days)
      db.collection("tasks").countDocuments({
        ...baseQuery,
        dueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { $nin: ["completed", "cancelled"] },
      }),

      // Blocked tasks
      db.collection("tasks").countDocuments({
        ...baseQuery,
        status: "blocked",
      }),

      // New tasks this period
      db.collection("tasks").countDocuments(baseQuery),

      // Time tracking aggregation
      db
        .collection("tasks")
        .aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: null,
              totalHoursLogged: { $sum: "$actualHours" },
              totalHoursEstimated: { $sum: "$estimatedHours" },
              avgActualHours: { $avg: "$actualHours" },
              avgEstimatedHours: { $avg: "$estimatedHours" },
              totalTasks: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      // Top performers
      db
        .collection("tasks")
        .aggregate([
          { $match: { ...baseQuery, status: "completed" } },
          { $unwind: "$assignedTo" },
          {
            $lookup: {
              from: "employees",
              localField: "assignedTo",
              foreignField: "_id",
              as: "employee",
            },
          },
          { $unwind: "$employee" },
          {
            $group: {
              _id: "$assignedTo",
              userName: {
                $first: {
                  $ifNull: [
                    "$employee.personalDetails.name",
                    "$employee.name",
                    "Unknown",
                  ],
                },
              },
              completedTasks: { $sum: 1 },
              totalHours: { $sum: "$actualHours" },
              avgHoursPerTask: { $avg: "$actualHours" },
            },
          },
          { $sort: { completedTasks: -1 } },
          { $limit: 5 },
          {
            $project: {
              userId: "$_id",
              userName: 1,
              completedTasks: 1,
              avgHoursPerTask: { $round: ["$avgHoursPerTask", 1] },
            },
          },
        ])
        .toArray(),

      // Recent activity
      db
        .collection("tasks")
        .aggregate([
          { $match: baseQuery },
          { $unwind: "$activityLog" },
          { $sort: { "activityLog.timestamp": -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "employees",
              localField: "activityLog.userId",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $project: {
              taskTitle: "$title",
              action: "$activityLog.action",
              timestamp: "$activityLog.timestamp",
              userName: {
                $ifNull: [
                  { $arrayElemAt: ["$user.personalDetails.name", 0] },
                  { $arrayElemAt: ["$user.name", 0] },
                  "Unknown User",
                ],
              },
            },
          },
        ])
        .toArray(),
    ]);

    // Process status distribution
    const statusDist = {};
    statusDistribution.forEach((item) => {
      statusDist[item._id] = item.count;
    });

    // Process priority distribution
    const priorityDist = {};
    priorityDistribution.forEach((item) => {
      priorityDist[item._id] = item.count;
    });

    // Calculate metrics
    const inProgressTasks = statusDist.in_progress || 0;
    const timeData = timeTrackingData[0] || {};
    const timeAccuracy =
      timeData.totalHoursEstimated > 0
        ? (timeData.totalHoursLogged / timeData.totalHoursEstimated) * 100
        : 0;

    const productivityScore = calculateProductivityScore(
      completedTasks,
      totalTasks,
      timeAccuracy,
      overdueTasks
    );

    const reportData = {
      // Basic metrics
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      dueSoonTasks,
      blockedTasks,
      newTasksThisPeriod,

      // Distributions
      statusDistribution: statusDist,
      priorityDistribution: priorityDist,

      // Time tracking
      totalHoursLogged: Math.round(timeData.totalHoursLogged || 0),
      totalHoursEstimated: Math.round(timeData.totalHoursEstimated || 0),
      avgTaskDuration: Math.round((timeData.avgActualHours || 0) * 10) / 10,
      timeAccuracy: Math.round(timeAccuracy * 10) / 10,
      productivityScore: Math.round(productivityScore),

      // Performance data
      topPerformers,
      recentActivity,

      // Metadata
      dateRange,
      reportGeneratedAt: new Date(),
      projectId,
    };

    // Handle CSV export
    if (format === "csv") {
      const csv = generateCSVReport(reportData);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="task-report-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (error) {
    console.error("Error generating task report:", error);
    return NextResponse.json(
      { error: "Failed to generate task report" },
      { status: 500 }
    );
  }
}

// Helper function to calculate productivity score
function calculateProductivityScore(completed, total, timeAccuracy, overdue) {
  if (total === 0) return 0;

  const completionRate = (completed / total) * 100;
  const timeScore = Math.min(timeAccuracy, 100);
  const overduePenalty = (overdue / total) * 100;

  // Weighted score: 50% completion, 30% time accuracy, 20% overdue penalty
  const score = completionRate * 0.5 + timeScore * 0.3 - overduePenalty * 0.2;
  return Math.max(0, Math.min(100, score));
}

// Helper function to generate CSV report
function generateCSVReport(data) {
  const lines = [];

  // Header
  lines.push("Task Report");
  lines.push(`Generated: ${data.reportGeneratedAt.toISOString()}`);
  lines.push(`Date Range: Last ${data.dateRange} days`);
  lines.push("");

  // Summary metrics
  lines.push("Summary Metrics");
  lines.push("Metric,Value");
  lines.push(`Total Tasks,${data.totalTasks}`);
  lines.push(`Completed Tasks,${data.completedTasks}`);
  lines.push(`In Progress Tasks,${data.inProgressTasks}`);
  lines.push(`Overdue Tasks,${data.overdueTasks}`);
  lines.push(`Due Soon Tasks,${data.dueSoonTasks}`);
  lines.push(`Blocked Tasks,${data.blockedTasks}`);
  lines.push("");

  // Status distribution
  lines.push("Status Distribution");
  lines.push("Status,Count");
  Object.entries(data.statusDistribution).forEach(([status, count]) => {
    lines.push(`${status},${count}`);
  });
  lines.push("");

  // Priority distribution
  lines.push("Priority Distribution");
  lines.push("Priority,Count");
  Object.entries(data.priorityDistribution).forEach(([priority, count]) => {
    lines.push(`${priority},${count}`);
  });
  lines.push("");

  // Top performers
  lines.push("Top Performers");
  lines.push("Name,Completed Tasks,Avg Hours Per Task");
  data.topPerformers.forEach((performer) => {
    lines.push(
      `${performer.userName},${performer.completedTasks},${performer.avgHoursPerTask}`
    );
  });

  return lines.join("\n");
}
