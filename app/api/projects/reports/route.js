import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Generate project reports
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Get report type from query parameters
    const reportType = searchParams.get("type") || "summary";
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Base pipeline for all reports
    let pipeline = [];

    // Filter by project ID if provided
    if (projectId && ObjectId.isValid(projectId)) {
      pipeline.push({ $match: { _id: new ObjectId(projectId) } });
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      pipeline.push({
        $match: {
          $or: [
            {
              startDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
            },
            { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          ],
        },
      });
    }

    // Generate different types of reports
    switch (reportType) {
      case "summary":
        // Summary report with basic project stats
        pipeline = [
          ...pipeline,
          {
            $project: {
              name: 1,
              category: 1,
              status: 1,
              progress: 1,
              startDate: 1,
              endDate: 1,
              milestoneCount: { $size: { $ifNull: ["$milestones", []] } },
              employeeCount: { $size: { $ifNull: ["$assignedEmployees", []] } },
            },
          },
        ];
        break;

      case "detailed":
        // Detailed report with milestones and employees
        pipeline = [
          ...pipeline,
          {
            $lookup: {
              from: "employees",
              localField: "assignedEmployees",
              foreignField: "_id",
              as: "employeeDetails",
            },
          },
          {
            $project: {
              name: 1,
              description: 1,
              category: 1,
              status: 1,
              progress: 1,
              startDate: 1,
              endDate: 1,
              milestones: 1,
              employeeDetails: {
                $map: {
                  input: "$employeeDetails",
                  as: "employee",
                  in: {
                    _id: "$$employee._id",
                    name: {
                      $concat: [
                        "$$employee.firstName",
                        " ",
                        "$$employee.lastName",
                      ],
                    },
                    email: "$$employee.email",
                    role: "$$employee.role",
                  },
                },
              },
            },
          },
        ];
        break;

      case "progress":
        // Progress report focusing on timeline and completion
        pipeline = [
          ...pipeline,
          {
            $project: {
              name: 1,
              status: 1,
              progress: 1,
              startDate: 1,
              endDate: 1,
              duration: {
                $divide: [
                  { $subtract: ["$endDate", "$startDate"] },
                  1000 * 60 * 60 * 24, // Convert to days
                ],
              },
              daysRemaining: {
                $divide: [
                  { $subtract: ["$endDate", new Date()] },
                  1000 * 60 * 60 * 24, // Convert to days
                ],
              },
              milestones: {
                $map: {
                  input: "$milestones",
                  as: "milestone",
                  in: {
                    title: "$$milestone.title",
                    status: "$$milestone.status",
                    progress: "$$milestone.progress",
                    dueDate: "$$milestone.dueDate",
                  },
                },
              },
            },
          },
          {
            $addFields: {
              isDelayed: { $lt: ["$daysRemaining", 0] },
              completedMilestones: {
                $size: {
                  $filter: {
                    input: "$milestones",
                    as: "m",
                    cond: { $eq: ["$$m.status", "completed"] },
                  },
                },
              },
              totalMilestones: { $size: { $ifNull: ["$milestones", []] } },
            },
          },
        ];
        break;

      case "alerts":
        // Alert report showing potential issues
        pipeline = [
          ...pipeline,
          {
            $lookup: {
              from: "project_alerts",
              localField: "_id",
              foreignField: "projectId",
              as: "alerts",
            },
          },
          {
            $project: {
              name: 1,
              status: 1,
              progress: 1,
              endDate: 1,
              isDelayed: { $lt: ["$endDate", new Date()] },
              alerts: 1,
              riskLevel: {
                $cond: [
                  { $lt: ["$progress", 50] },
                  "high",
                  { $cond: [{ $lt: ["$progress", 75] }, "medium", "low"] },
                ],
              },
              delayedMilestones: {
                $size: {
                  $filter: {
                    input: "$milestones",
                    as: "m",
                    cond: {
                      $and: [
                        { $lt: ["$$m.dueDate", new Date()] },
                        { $ne: ["$$m.status", "completed"] },
                      ],
                    },
                  },
                },
              },
            },
          },
        ];
        break;

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    // Execute the pipeline
    const reports = await db
      .collection("projects")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      reportType,
      reports,
    });
  } catch (error) {
    console.error("Error generating project reports:", error);
    return NextResponse.json(
      { error: "Failed to generate project reports" },
      { status: 500 }
    );
  }
}
