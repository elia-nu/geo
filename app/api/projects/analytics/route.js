import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "3months";

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (dateRange) {
      case "1month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6months":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1year":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Performance metrics
    const [
      totalProjects,
      completedProjects,
      activeProjects,
      totalBudget,
      totalSpent,
    ] = await Promise.all([
      db.collection("projects").countDocuments({
        createdAt: { $gte: startDate },
      }),
      db.collection("projects").countDocuments({
        status: "Completed",
        createdAt: { $gte: startDate },
      }),
      db.collection("projects").countDocuments({
        status: "In Progress",
        createdAt: { $gte: startDate },
      }),
      db
        .collection("projects")
        .aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: "$budget" } } },
        ])
        .toArray(),
      db
        .collection("projects")
        .aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: "$actualCost" } } },
        ])
        .toArray(),
    ]);

    const completionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 100)
        : 0;
    const budgetUtilization =
      totalBudget[0]?.total > 0
        ? Math.round(((totalSpent[0]?.total || 0) / totalBudget[0].total) * 100)
        : 0;

    // Calculate average duration
    const completedProjectsWithDuration = await db
      .collection("projects")
      .find({
        status: "Completed",
        createdAt: { $gte: startDate },
      })
      .toArray();

    const averageDuration =
      completedProjectsWithDuration.length > 0
        ? Math.round(
            completedProjectsWithDuration.reduce((sum, project) => {
              const duration = Math.ceil(
                (project.endDate - project.startDate) / (1000 * 60 * 60 * 24)
              );
              return sum + duration;
            }, 0) / completedProjectsWithDuration.length
          )
        : 0;

    // Category performance
    const categoryPerformance = await db
      .collection("projects")
      .aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$category",
            totalProjects: { $sum: 1 },
            completedProjects: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
            totalBudget: { $sum: "$budget" },
            totalSpent: { $sum: "$actualCost" },
          },
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [
                { $divide: ["$completedProjects", "$totalProjects"] },
                100,
              ],
            },
          },
        },
      ])
      .toArray();

    // Team productivity (mock data for now)
    const teamProductivity = {
      topTeams: [
        { name: "Frontend Team", productivity: 95, projectsCompleted: 8 },
        { name: "Backend Team", productivity: 88, projectsCompleted: 6 },
        { name: "DevOps Team", productivity: 92, projectsCompleted: 4 },
      ],
      workloadDistribution: [
        { range: "0-2 projects", percentage: 25, count: 5 },
        { range: "3-5 projects", percentage: 45, count: 9 },
        { range: "6-8 projects", percentage: 20, count: 4 },
        { range: "9+ projects", percentage: 10, count: 2 },
      ],
    };

    // Risk analysis
    const riskAnalysis = await Promise.all([
      db.collection("projects").countDocuments({
        status: { $in: ["On Hold", "At Risk"] },
        createdAt: { $gte: startDate },
      }),
      db.collection("milestones").countDocuments({
        dueDate: { $lt: now },
        status: { $ne: "Completed" },
      }),
      db.collection("projects").countDocuments({
        $expr: { $gt: ["$actualCost", "$budget"] },
        createdAt: { $gte: startDate },
      }),
    ]);

    // Completion trends
    const monthlyCompletions = [];
    const milestoneCompletion = [
      { type: "Planning", completionRate: 100 },
      { type: "Development", completionRate: 75 },
      { type: "Testing", completionRate: 60 },
      { type: "Deployment", completionRate: 45 },
    ];

    // Generate monthly data for the selected period
    const months = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    for (const month of months) {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const [completed, total] = await Promise.all([
        db.collection("projects").countDocuments({
          status: "Completed",
          endDate: { $gte: monthStart, $lte: monthEnd },
        }),
        db.collection("projects").countDocuments({
          createdAt: { $lte: monthEnd },
        }),
      ]);

      monthlyCompletions.push({
        month: month.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        completed,
        total,
      });
    }

    return NextResponse.json({
      success: true,
      performance: {
        completionRate,
        completionRateChange: Math.floor(Math.random() * 20) - 10, // Mock change
        averageDuration,
        durationChange: Math.floor(Math.random() * 15) - 5, // Mock change
        budgetUtilization,
        totalSpent: totalSpent[0]?.total || 0,
        teamProductivity: Math.floor(Math.random() * 20) + 80, // Mock productivity
        productivityChange: Math.floor(Math.random() * 15) - 5, // Mock change
      },
      categoryPerformance: categoryPerformance.map((cat) => ({
        category: cat._id,
        totalProjects: cat.totalProjects,
        completedProjects: cat.completedProjects,
        completionRate: Math.round(cat.completionRate),
        averageDuration: Math.floor(Math.random() * 60) + 30, // Mock duration
      })),
      teamProductivity,
      riskAnalysis: {
        highRiskProjects: riskAnalysis[0],
        overdueMilestones: riskAnalysis[1],
        budgetOverruns: riskAnalysis[2],
      },
      completionTrends: {
        monthlyCompletions,
        milestoneCompletion,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
