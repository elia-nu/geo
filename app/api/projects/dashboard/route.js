import { NextResponse } from "next/server";
import { getDb } from "../../mongo.js";

export async function GET(request) {
  try {
    const db = await getDb();

    // Get overview statistics
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      totalTeamMembers,
    ] = await Promise.all([
      db.collection("projects").countDocuments(),
      db.collection("projects").countDocuments({ status: "In Progress" }),
      db.collection("projects").countDocuments({ status: "Completed" }),
      db
        .collection("projects")
        .aggregate([{ $group: { _id: null, total: { $sum: "$budget" } } }])
        .toArray(),
      db
        .collection("projects")
        .aggregate([
          { $unwind: "$teamMembers" },
          { $group: { _id: "$teamMembers" } },
          { $count: "uniqueMembers" },
        ])
        .toArray(),
    ]);

    // Get projects created this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const projectsThisMonth = await db.collection("projects").countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    // Calculate completion rate
    const completionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 100)
        : 0;

    // Get status distribution
    const statusDistribution = await db
      .collection("projects")
      .aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Get recent projects
    const recentProjects = await db
      .collection("projects")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ name: 1, category: 1, status: 1, createdAt: 1 })
      .toArray();

    // Get category distribution
    const categoryDistribution = await db
      .collection("projects")
      .aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Get project alerts (overdue, at risk, etc.)
    const now = new Date();
    const alerts = [];

    // Check for overdue projects
    const overdueProjects = await db
      .collection("projects")
      .find({
        endDate: { $lt: now },
        status: { $nin: ["Completed", "Cancelled"] },
      })
      .toArray();

    overdueProjects.forEach((project) => {
      alerts.push({
        type: "overdue",
        title: "Project Overdue",
        message: `${project.name} is past its end date`,
        projectName: project.name,
        severity: "high",
      });
    });

    // Check for projects at risk (ending within 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const atRiskProjects = await db
      .collection("projects")
      .find({
        endDate: { $lte: sevenDaysFromNow, $gte: now },
        status: { $nin: ["Completed", "Cancelled"] },
      })
      .toArray();

    atRiskProjects.forEach((project) => {
      alerts.push({
        type: "at_risk",
        title: "Project At Risk",
        message: `${project.name} is ending soon`,
        projectName: project.name,
        severity: "medium",
      });
    });

    // Check for stalled projects (no updates in 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const stalledProjects = await db
      .collection("projects")
      .find({
        updatedAt: { $lt: thirtyDaysAgo },
        status: { $nin: ["Completed", "Cancelled"] },
      })
      .toArray();

    stalledProjects.forEach((project) => {
      alerts.push({
        type: "stalled",
        title: "Project Stalled",
        message: `${project.name} hasn't been updated recently`,
        projectName: project.name,
        severity: "medium",
      });
    });

    return NextResponse.json({
      success: true,
      overview: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalBudget: totalBudget[0]?.total || 0,
        totalTeamMembers: totalTeamMembers[0]?.uniqueMembers || 0,
        projectsThisMonth,
        completionRate,
      },
      statusDistribution: statusDistribution.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      recentProjects,
      categoryDistribution: categoryDistribution.map((item) => ({
        category: item._id,
        count: item.count,
      })),
      alerts,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
