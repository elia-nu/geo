import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// Function to check and update overdue payments for a specific project
async function checkAndUpdateOverduePayments(db, projectId) {
  try {
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project || !project.income) {
      return { updated: 0, overduePayments: [] };
    }

    const currentDate = new Date();
    let hasUpdates = false;
    const overduePayments = [];

    // Check each income record for overdue status
    const updatedIncome = project.income.map((income) => {
      // Skip if already collected or no due date
      if (income.status === "collected" || !income.dueDate) {
        return income;
      }

      const dueDate = new Date(income.dueDate);
      const isOverdue = dueDate < currentDate;

      // If payment is overdue and not already marked as overdue
      if (isOverdue && income.status !== "overdue") {
        hasUpdates = true;
        const daysPastDue = Math.ceil(
          (currentDate - dueDate) / (1000 * 60 * 60 * 24)
        );

        const updatedIncome = {
          ...income,
          status: "overdue",
          isOverdue: true,
          daysPastDue: daysPastDue,
          uncollectedAmount: income.expectedAmount || income.amount || 0,
          riskLevel: daysPastDue > 30 ? "high" : "medium",
          updatedAt: currentDate,
        };

        overduePayments.push(updatedIncome);
        return updatedIncome;
      }

      // Update existing overdue payments with current days past due
      if (isOverdue && income.status === "overdue") {
        const daysPastDue = Math.ceil(
          (currentDate - dueDate) / (1000 * 60 * 60 * 24)
        );
        const updatedIncome = {
          ...income,
          daysPastDue: daysPastDue,
          riskLevel: daysPastDue > 30 ? "high" : "medium",
          updatedAt: currentDate,
        };
        overduePayments.push(updatedIncome);
        return updatedIncome;
      }

      return income;
    });

    // Update the project if there are changes
    if (hasUpdates) {
      await db.collection("projects").updateOne(
        { _id: new ObjectId(projectId) },
        {
          $set: {
            income: updatedIncome,
            updatedAt: currentDate,
          },
        }
      );

      // Create audit log for overdue updates
      await createAuditLog(db, "income_overdue_update", "system", projectId, {
        overdueCount: overduePayments.filter((p) => p.status === "overdue")
          .length,
        totalOverdueAmount: overduePayments.reduce(
          (sum, p) => sum + (p.uncollectedAmount || 0),
          0
        ),
      });
    }

    return {
      updated: hasUpdates
        ? overduePayments.filter((p) => p.status === "overdue").length
        : 0,
      overduePayments: overduePayments,
      projectId: projectId,
      projectName: project.name || "Unknown Project",
    };
  } catch (error) {
    console.error(
      `Error checking overdue payments for project ${projectId}:`,
      error
    );
    return { updated: 0, overduePayments: [], projectId, error: error.message };
  }
}

// Cron job endpoint to check overdue payments across all projects
export async function POST(request) {
  try {
    const db = await getDb();

    // Get all projects that have income records
    const projects = await db
      .collection("projects")
      .find({
        income: { $exists: true, $ne: [] },
      })
      .toArray();

    if (projects.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No projects with income records found",
        results: [],
      });
    }

    const results = [];
    let totalUpdated = 0;
    let totalOverdueAmount = 0;

    // Process each project
    for (const project of projects) {
      const result = await checkAndUpdateOverduePayments(
        db,
        project._id.toString()
      );
      results.push(result);
      totalUpdated += result.updated;
      totalOverdueAmount += result.overduePayments.reduce(
        (sum, p) => sum + (p.uncollectedAmount || 0),
        0
      );
    }

    // Create system audit log for the cron job
    await createAuditLog(db, "system_overdue_check", "system", null, {
      projectsChecked: projects.length,
      totalUpdated,
      totalOverdueAmount,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Checked ${projects.length} projects, updated ${totalUpdated} overdue payments`,
      summary: {
        projectsChecked: projects.length,
        totalUpdated,
        totalOverdueAmount,
        projectsWithOverdue: results.filter((r) => r.overduePayments.length > 0)
          .length,
      },
      results: results.map((r) => ({
        projectId: r.projectId,
        projectName: r.projectName,
        updated: r.updated,
        overdueCount: r.overduePayments.length,
        overdueAmount: r.overduePayments.reduce(
          (sum, p) => sum + (p.uncollectedAmount || 0),
          0
        ),
        error: r.error || null,
      })),
    });
  } catch (error) {
    console.error("Error in overdue payments cron job:", error);
    return NextResponse.json(
      { error: "Failed to check overdue payments", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for manual trigger or status check
export async function GET(request) {
  try {
    const db = await getDb();

    // Get summary of overdue payments across all projects
    const projects = await db
      .collection("projects")
      .find({
        income: { $exists: true, $ne: [] },
      })
      .toArray();

    let totalOverdue = 0;
    let totalOverdueAmount = 0;
    const projectSummaries = [];

    for (const project of projects) {
      const income = project.income || [];
      const overduePayments = income.filter(
        (inc) =>
          inc.status === "overdue" ||
          (inc.dueDate &&
            new Date(inc.dueDate) < new Date() &&
            inc.status !== "collected")
      );

      if (overduePayments.length > 0) {
        const overdueAmount = overduePayments.reduce(
          (sum, p) =>
            sum + (p.uncollectedAmount || p.expectedAmount || p.amount || 0),
          0
        );

        totalOverdue += overduePayments.length;
        totalOverdueAmount += overdueAmount;

        projectSummaries.push({
          projectId: project._id.toString(),
          projectName: project.name || "Unknown Project",
          overdueCount: overduePayments.length,
          overdueAmount,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalProjects: projects.length,
        projectsWithOverdue: projectSummaries.length,
        totalOverduePayments: totalOverdue,
        totalOverdueAmount,
      },
      projects: projectSummaries,
    });
  } catch (error) {
    console.error("Error getting overdue payments summary:", error);
    return NextResponse.json(
      { error: "Failed to get overdue payments summary" },
      { status: 500 }
    );
  }
}