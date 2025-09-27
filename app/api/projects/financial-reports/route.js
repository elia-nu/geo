import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Generate comprehensive financial reports
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Get report parameters
    const reportType = searchParams.get("type") || "overview";
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "project"; // project, category, department, month
    const format = searchParams.get("format") || "json"; // json, csv

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
            {
              "budget.createdAt": {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            },
          ],
        },
      });
    }

    // Generate different types of financial reports
    switch (reportType) {
      case "overview":
        pipeline = [
          ...pipeline,
          {
            $project: {
              name: 1,
              category: 1,
              status: 1,
              startDate: 1,
              endDate: 1,
              budget: 1,
              financialStatus: 1,
              totalBudget: { $ifNull: ["$budget.totalAmount", 0] },
              totalExpenses: { $ifNull: ["$financialStatus.totalExpenses", 0] },
              totalIncome: { $ifNull: ["$financialStatus.totalIncome", 0] },
              budgetUtilization: {
                $ifNull: ["$financialStatus.budgetUtilization", 0],
              },
              profitLoss: { $ifNull: ["$financialStatus.profitLoss", 0] },
              roi: {
                $cond: {
                  if: {
                    $gt: [
                      { $ifNull: ["$financialStatus.totalExpenses", 0] },
                      0,
                    ],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $ifNull: ["$financialStatus.profitLoss", 0] },
                          { $ifNull: ["$financialStatus.totalExpenses", 0] },
                        ],
                      },
                      100,
                    ],
                  },
                  else: 0,
                },
              },
              budgetStatus: {
                $cond: {
                  if: {
                    $gt: [
                      { $ifNull: ["$financialStatus.budgetUtilization", 0] },
                      100,
                    ],
                  },
                  then: "overrun",
                  else: {
                    $cond: {
                      if: {
                        $gt: [
                          {
                            $ifNull: ["$financialStatus.budgetUtilization", 0],
                          },
                          90,
                        ],
                      },
                      then: "warning",
                      else: "normal",
                    },
                  },
                },
              },
            },
          },
        ];
        break;

      case "budget-utilization":
        pipeline = [
          ...pipeline,
          {
            $unwind: {
              path: "$budgetAllocations",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              projectName: "$name",
              projectId: "$_id",
              allocationName: "$budgetAllocations.name",
              allocationId: "$budgetAllocations._id",
              category: "$budgetAllocations.category",
              allocationType: "$budgetAllocations.allocationType",
              departmentId: "$budgetAllocations.departmentId",
              budgetedAmount: { $ifNull: ["$budgetAllocations.amount", 0] },
              spentAmount: { $ifNull: ["$budgetAllocations.spentAmount", 0] },
              remainingAmount: {
                $ifNull: ["$budgetAllocations.remainingAmount", 0],
              },
              utilization: { $ifNull: ["$budgetAllocations.utilization", 0] },
              status: "$budgetAllocations.status",
              priority: "$budgetAllocations.priority",
              startDate: "$budgetAllocations.startDate",
              endDate: "$budgetAllocations.endDate",
              isOverBudget: {
                $gt: [
                  { $ifNull: ["$budgetAllocations.spentAmount", 0] },
                  { $ifNull: ["$budgetAllocations.amount", 0] },
                ],
              },
              variance: {
                $subtract: [
                  { $ifNull: ["$budgetAllocations.spentAmount", 0] },
                  { $ifNull: ["$budgetAllocations.amount", 0] },
                ],
              },
              variancePercent: {
                $cond: {
                  if: {
                    $gt: [{ $ifNull: ["$budgetAllocations.amount", 0] }, 0],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $subtract: [
                              {
                                $ifNull: ["$budgetAllocations.spentAmount", 0],
                              },
                              { $ifNull: ["$budgetAllocations.amount", 0] },
                            ],
                          },
                          { $ifNull: ["$budgetAllocations.amount", 0] },
                        ],
                      },
                      100,
                    ],
                  },
                  else: 0,
                },
              },
            },
          },
          {
            $match: {
              budgetedAmount: { $gt: 0 },
            },
          },
        ];
        break;

      case "expense-analysis":
        pipeline = [
          ...pipeline,
          {
            $unwind: {
              path: "$expenses",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              projectName: "$name",
              projectId: "$_id",
              expenseId: "$expenses._id",
              title: "$expenses.title",
              description: "$expenses.description",
              amount: { $ifNull: ["$expenses.amount", 0] },
              category: "$expenses.category",
              expenseDate: "$expenses.expenseDate",
              vendor: "$expenses.vendor",
              status: "$expenses.status",
              allocationId: "$expenses.allocationId",
              tags: "$expenses.tags",
              createdAt: "$expenses.createdAt",
              month: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$expenses.expenseDate",
                },
              },
              year: {
                $dateToString: {
                  format: "%Y",
                  date: "$expenses.expenseDate",
                },
              },
            },
          },
          {
            $match: {
              amount: { $gt: 0 },
            },
          },
        ];
        break;

      case "income-tracking":
        pipeline = [
          ...pipeline,
          {
            $unwind: {
              path: "$income",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              projectName: "$name",
              projectId: "$_id",
              incomeId: "$income._id",
              title: "$income.title",
              description: "$income.description",
              amount: { $ifNull: ["$income.amount", 0] },
              expectedAmount: { $ifNull: ["$income.expectedAmount", 0] },
              uncollectedAmount: { $ifNull: ["$income.uncollectedAmount", 0] },
              collectionRate: { $ifNull: ["$income.collectionRate", 0] },
              receivedDate: "$income.receivedDate",
              dueDate: "$income.dueDate",
              paymentMethod: "$income.paymentMethod",
              clientName: "$income.clientName",
              clientEmail: "$income.clientEmail",
              invoiceNumber: "$income.invoiceNumber",
              status: "$income.status",
              paymentReference: "$income.paymentReference",
              isOverdue: "$income.isOverdue",
              daysPastDue: "$income.daysPastDue",
              paymentType: "$income.paymentType",
              riskLevel: "$income.riskLevel",
              month: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$income.receivedDate",
                },
              },
              year: {
                $dateToString: {
                  format: "%Y",
                  date: "$income.receivedDate",
                },
              },
            },
          },
          {
            $match: {
              amount: { $gt: 0 },
            },
          },
        ];
        break;

      case "payment-status":
        pipeline = [
          ...pipeline,
          {
            $unwind: {
              path: "$income",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: {
                projectId: "$_id",
                projectName: "$name",
                status: "$income.status",
              },
              totalAmount: { $sum: { $ifNull: ["$income.amount", 0] } },
              count: { $sum: 1 },
              expectedAmount: {
                $sum: { $ifNull: ["$income.expectedAmount", 0] },
              },
              uncollectedAmount: {
                $sum: { $ifNull: ["$income.uncollectedAmount", 0] },
              },
              overdueCount: {
                $sum: {
                  $cond: [{ $eq: ["$income.isOverdue", true] }, 1, 0],
                },
              },
              highRiskCount: {
                $sum: {
                  $cond: [{ $eq: ["$income.riskLevel", "high"] }, 1, 0],
                },
              },
            },
          },
          {
            $group: {
              _id: "$_id.projectId",
              projectName: { $first: "$_id.projectName" },
              paymentStatus: {
                $push: {
                  status: "$_id.status",
                  totalAmount: "$totalAmount",
                  count: "$count",
                  expectedAmount: "$expectedAmount",
                  uncollectedAmount: "$uncollectedAmount",
                  overdueCount: "$overdueCount",
                  highRiskCount: "$highRiskCount",
                },
              },
            },
          },
          {
            $project: {
              projectName: 1,
              projectId: "$_id",
              paymentStatus: 1,
              totalCollected: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$paymentStatus",
                        as: "status",
                        cond: { $eq: ["$$status.status", "collected"] },
                      },
                    },
                    as: "collected",
                    in: "$$collected.totalAmount",
                  },
                },
              },
              totalPending: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$paymentStatus",
                        as: "status",
                        cond: { $eq: ["$$status.status", "pending"] },
                      },
                    },
                    as: "pending",
                    in: "$$pending.totalAmount",
                  },
                },
              },
              totalOverdue: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$paymentStatus",
                        as: "status",
                        cond: { $eq: ["$$status.status", "overdue"] },
                      },
                    },
                    as: "overdue",
                    in: "$$overdue.totalAmount",
                  },
                },
              },
              totalUncollected: {
                $sum: {
                  $map: {
                    input: "$paymentStatus",
                    as: "status",
                    in: "$$status.uncollectedAmount",
                  },
                },
              },
            },
          },
        ];
        break;

      case "profit-loss":
        pipeline = [
          ...pipeline,
          {
            $project: {
              name: 1,
              category: 1,
              status: 1,
              startDate: 1,
              endDate: 1,
              totalBudget: { $ifNull: ["$budget.totalAmount", 0] },
              totalExpenses: { $ifNull: ["$financialStatus.totalExpenses", 0] },
              totalIncome: { $ifNull: ["$financialStatus.totalIncome", 0] },
              profitLoss: { $ifNull: ["$financialStatus.profitLoss", 0] },
              roi: {
                $cond: {
                  if: {
                    $gt: [
                      { $ifNull: ["$financialStatus.totalExpenses", 0] },
                      0,
                    ],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $ifNull: ["$financialStatus.profitLoss", 0] },
                          { $ifNull: ["$financialStatus.totalExpenses", 0] },
                        ],
                      },
                      100,
                    ],
                  },
                  else: 0,
                },
              },
              margin: {
                $cond: {
                  if: {
                    $gt: [{ $ifNull: ["$financialStatus.totalIncome", 0] }, 0],
                  },
                  then: {
                    $multiply: [
                      {
                        $divide: [
                          { $ifNull: ["$financialStatus.profitLoss", 0] },
                          { $ifNull: ["$financialStatus.totalIncome", 0] },
                        ],
                      },
                      100,
                    ],
                  },
                  else: 0,
                },
              },
              isProfitable: {
                $gt: [{ $ifNull: ["$financialStatus.profitLoss", 0] }, 0],
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

    // Calculate summary statistics
    let summary = {};
    if (reports.length > 0) {
      switch (reportType) {
        case "overview":
          summary = {
            totalProjects: reports.length,
            totalBudget: reports.reduce((sum, r) => sum + r.totalBudget, 0),
            totalExpenses: reports.reduce((sum, r) => sum + r.totalExpenses, 0),
            totalIncome: reports.reduce((sum, r) => sum + r.totalIncome, 0),
            totalProfitLoss: reports.reduce((sum, r) => sum + r.profitLoss, 0),
            averageROI:
              reports.reduce((sum, r) => sum + r.roi, 0) / reports.length,
            overrunProjects: reports.filter((r) => r.budgetStatus === "overrun")
              .length,
            warningProjects: reports.filter((r) => r.budgetStatus === "warning")
              .length,
            normalProjects: reports.filter((r) => r.budgetStatus === "normal")
              .length,
          };
          break;

        case "budget-utilization":
          summary = {
            totalAllocations: reports.length,
            totalBudgeted: reports.reduce(
              (sum, r) => sum + r.budgetedAmount,
              0
            ),
            totalSpent: reports.reduce((sum, r) => sum + r.spentAmount, 0),
            totalRemaining: reports.reduce(
              (sum, r) => sum + r.remainingAmount,
              0
            ),
            averageUtilization:
              reports.reduce((sum, r) => sum + r.utilization, 0) /
              reports.length,
            overrunAllocations: reports.filter((r) => r.isOverBudget).length,
            warningAllocations: reports.filter(
              (r) => r.utilization > 90 && r.utilization <= 100
            ).length,
            normalAllocations: reports.filter((r) => r.utilization <= 90)
              .length,
          };
          break;

        case "expense-analysis":
          summary = {
            totalExpenses: reports.length,
            totalAmount: reports.reduce((sum, r) => sum + r.amount, 0),
            averageExpense:
              reports.reduce((sum, r) => sum + r.amount, 0) / reports.length,
            expensesByCategory: reports.reduce((acc, r) => {
              acc[r.category] = (acc[r.category] || 0) + r.amount;
              return acc;
            }, {}),
            expensesByStatus: reports.reduce((acc, r) => {
              acc[r.status] = (acc[r.status] || 0) + r.amount;
              return acc;
            }, {}),
          };
          break;

        case "income-tracking":
          summary = {
            totalIncome: reports.length,
            totalAmount: reports.reduce((sum, r) => sum + r.amount, 0),
            totalExpected: reports.reduce(
              (sum, r) => sum + r.expectedAmount,
              0
            ),
            totalUncollected: reports.reduce(
              (sum, r) => sum + r.uncollectedAmount,
              0
            ),
            averageCollectionRate:
              reports.reduce((sum, r) => sum + r.collectionRate, 0) /
              reports.length,
            overdueCount: reports.filter((r) => r.isOverdue).length,
            highRiskCount: reports.filter((r) => r.riskLevel === "high").length,
          };
          break;

        case "payment-status":
          summary = {
            totalProjects: reports.length,
            totalCollected: reports.reduce(
              (sum, r) => sum + r.totalCollected,
              0
            ),
            totalPending: reports.reduce((sum, r) => sum + r.totalPending, 0),
            totalOverdue: reports.reduce((sum, r) => sum + r.totalOverdue, 0),
            totalUncollected: reports.reduce(
              (sum, r) => sum + r.totalUncollected,
              0
            ),
          };
          break;

        case "profit-loss":
          summary = {
            totalProjects: reports.length,
            totalBudget: reports.reduce((sum, r) => sum + r.totalBudget, 0),
            totalExpenses: reports.reduce((sum, r) => sum + r.totalExpenses, 0),
            totalIncome: reports.reduce((sum, r) => sum + r.totalIncome, 0),
            totalProfitLoss: reports.reduce((sum, r) => sum + r.profitLoss, 0),
            averageROI:
              reports.reduce((sum, r) => sum + r.roi, 0) / reports.length,
            averageMargin:
              reports.reduce((sum, r) => sum + r.margin, 0) / reports.length,
            profitableProjects: reports.filter((r) => r.isProfitable).length,
            lossProjects: reports.filter((r) => !r.isProfitable).length,
          };
          break;
      }
    }

    return NextResponse.json({
      success: true,
      reportType,
      groupBy,
      dateRange: { startDate, endDate },
      summary,
      data: reports,
      generatedAt: new Date().toISOString(),
      totalRecords: reports.length,
    });
  } catch (error) {
    console.error("Error generating financial reports:", error);
    return NextResponse.json(
      { error: "Failed to generate financial reports" },
      { status: 500 }
    );
  }
}
