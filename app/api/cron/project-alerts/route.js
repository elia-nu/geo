import { getDb } from "../../mongo.js";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await getDb();

    console.log("Starting automated project alert checks...");

    // Check for overdue milestones
    await checkOverdueMilestones(db);

    // Check for upcoming milestones (3 days ahead)
    await checkUpcomingMilestones(db);

    // Check for overdue projects
    await checkOverdueProjects(db);

    // Check for budget overruns
    await checkBudgetOverruns(db);

    console.log("Automated project alert checks completed");

    return Response.json({
      success: true,
      message: "Automated alerts processed successfully",
    });
  } catch (error) {
    console.error("Error in automated project alerts:", error);
    return Response.json(
      { success: false, error: "Failed to process automated alerts" },
      { status: 500 }
    );
  }
}

async function checkOverdueMilestones(db) {
  try {
    const overdueMilestones = await db
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
            dueDate: { $lt: new Date() },
            status: { $in: ["pending", "in-progress"] },
          },
        },
      ])
      .toArray();

    for (const milestone of overdueMilestones) {
      // Check if alert already exists
      const existingAlert = await db.collection("project_alerts").findOne({
        projectId: milestone.projectId,
        milestoneId: milestone._id.toString(),
        type: "delay",
        isResolved: false,
      });

      if (!existingAlert) {
        const daysOverdue = Math.ceil(
          (new Date() - new Date(milestone.dueDate)) / (1000 * 60 * 60 * 24)
        );

        const alert = {
          projectId: milestone.projectId,
          milestoneId: milestone._id.toString(),
          type: "delay",
          severity:
            daysOverdue > 7 ? "critical" : daysOverdue > 3 ? "high" : "medium",
          title: `Overdue Milestone: ${milestone.name}`,
          message: `The milestone "${milestone.name}" is ${daysOverdue} days overdue for project "${milestone.project.name}". Please take immediate action.`,
          isRead: false,
          isResolved: false,
          triggeredAt: new Date(),
          resolvedAt: null,
          resolvedBy: null,
          recipients: [
            milestone.project.projectManager,
            ...(milestone.project.teamMembers || []),
          ],
          metadata: {
            milestoneName: milestone.name,
            projectName: milestone.project.name,
            dueDate: milestone.dueDate,
            daysOverdue: daysOverdue,
          },
        };

        await db.collection("project_alerts").insertOne(alert);
        console.log(`Created overdue milestone alert for: ${milestone.name}`);
      }
    }
  } catch (error) {
    console.error("Error checking overdue milestones:", error);
  }
}

async function checkUpcomingMilestones(db) {
  try {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const upcomingMilestones = await db
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
            dueDate: {
              $gte: new Date(),
              $lte: threeDaysFromNow,
            },
            status: { $in: ["pending", "in-progress"] },
          },
        },
      ])
      .toArray();

    for (const milestone of upcomingMilestones) {
      // Check if alert already exists
      const existingAlert = await db.collection("project_alerts").findOne({
        projectId: milestone.projectId,
        milestoneId: milestone._id.toString(),
        type: "milestone",
        isResolved: false,
        "metadata.alertType": "upcoming",
      });

      if (!existingAlert) {
        const daysUntilDue = Math.ceil(
          (new Date(milestone.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
        );

        const alert = {
          projectId: milestone.projectId,
          milestoneId: milestone._id.toString(),
          type: "milestone",
          severity: "medium",
          title: `Upcoming Milestone: ${milestone.name}`,
          message: `The milestone "${milestone.name}" is due in ${daysUntilDue} days for project "${milestone.project.name}". Please ensure you're on track to meet the deadline.`,
          isRead: false,
          isResolved: false,
          triggeredAt: new Date(),
          resolvedAt: null,
          resolvedBy: null,
          recipients: [
            milestone.project.projectManager,
            ...(milestone.project.teamMembers || []),
          ],
          metadata: {
            milestoneName: milestone.name,
            projectName: milestone.project.name,
            dueDate: milestone.dueDate,
            daysUntilDue: daysUntilDue,
            alertType: "upcoming",
          },
        };

        await db.collection("project_alerts").insertOne(alert);
        console.log(`Created upcoming milestone alert for: ${milestone.name}`);
      }
    }
  } catch (error) {
    console.error("Error checking upcoming milestones:", error);
  }
}

async function checkOverdueProjects(db) {
  try {
    const overdueProjects = await db
      .collection("projects")
      .find({
        endDate: { $lt: new Date() },
        status: { $in: ["planning", "active"] },
      })
      .toArray();

    for (const project of overdueProjects) {
      // Check if alert already exists
      const existingAlert = await db.collection("project_alerts").findOne({
        projectId: project._id.toString(),
        type: "delay",
        isResolved: false,
        "metadata.alertType": "project_overdue",
      });

      if (!existingAlert) {
        const daysOverdue = Math.ceil(
          (new Date() - new Date(project.endDate)) / (1000 * 60 * 60 * 24)
        );

        const alert = {
          projectId: project._id.toString(),
          milestoneId: null,
          type: "delay",
          severity:
            daysOverdue > 14 ? "critical" : daysOverdue > 7 ? "high" : "medium",
          title: `Overdue Project: ${project.name}`,
          message: `The project "${project.name}" is ${daysOverdue} days overdue. Please review the project status and take necessary actions.`,
          isRead: false,
          isResolved: false,
          triggeredAt: new Date(),
          resolvedAt: null,
          resolvedBy: null,
          recipients: [project.projectManager, ...(project.teamMembers || [])],
          metadata: {
            projectName: project.name,
            endDate: project.endDate,
            daysOverdue: daysOverdue,
            alertType: "project_overdue",
          },
        };

        await db.collection("project_alerts").insertOne(alert);
        console.log(`Created overdue project alert for: ${project.name}`);
      }
    }
  } catch (error) {
    console.error("Error checking overdue projects:", error);
  }
}

async function checkBudgetOverruns(db) {
  try {
    const projectsWithBudget = await db
      .collection("projects")
      .find({
        budget: { $gt: 0 },
        actualCost: { $gt: 0 },
      })
      .toArray();

    for (const project of projectsWithBudget) {
      const budgetUtilization = (project.actualCost / project.budget) * 100;

      // Alert if budget utilization exceeds 90%
      if (budgetUtilization >= 90) {
        // Check if alert already exists
        const existingAlert = await db.collection("project_alerts").findOne({
          projectId: project._id.toString(),
          type: "budget",
          isResolved: false,
          "metadata.alertType": "budget_overrun",
        });

        if (!existingAlert) {
          const alert = {
            projectId: project._id.toString(),
            milestoneId: null,
            type: "budget",
            severity: budgetUtilization >= 100 ? "critical" : "high",
            title: `Budget Alert: ${project.name}`,
            message: `The project "${
              project.name
            }" has used ${budgetUtilization.toFixed(
              1
            )}% of its budget ($${project.actualCost.toLocaleString()} of $${project.budget.toLocaleString()}). ${
              budgetUtilization >= 100
                ? "Budget has been exceeded!"
                : "Budget is nearly exhausted."
            }`,
            isRead: false,
            isResolved: false,
            triggeredAt: new Date(),
            resolvedAt: null,
            resolvedBy: null,
            recipients: [
              project.projectManager,
              ...(project.teamMembers || []),
            ],
            metadata: {
              projectName: project.name,
              budget: project.budget,
              actualCost: project.actualCost,
              budgetUtilization: budgetUtilization,
              alertType: "budget_overrun",
            },
          };

          await db.collection("project_alerts").insertOne(alert);
          console.log(`Created budget alert for: ${project.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error checking budget overruns:", error);
  }
}

