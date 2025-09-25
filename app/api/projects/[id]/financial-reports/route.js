import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Generate comprehensive financial reports for a project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "summary";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json";

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Fetch project with all financial data
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Filter data by date range if provided
    let expenses = project.expenses || [];
    let income = project.income || [];

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start || end) {
        expenses = expenses.filter((expense) => {
          const expDate = new Date(expense.expenseDate);
          if (start && expDate < start) return false;
          if (end && expDate > end) return false;
          return true;
        });

        income = income.filter((inc) => {
          const incDate = new Date(inc.receivedDate);
          if (start && incDate < start) return false;
          if (end && incDate > end) return false;
          return true;
        });
      }
    }

    // Calculate financial metrics
    const budget = project.budget || {};
    const totalBudget = budget.totalAmount || 0;
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const remainingBudget = totalBudget - totalExpenses;
    const budgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    const profitLoss = totalIncome - totalExpenses;
    const roi = totalExpenses > 0 ? (profitLoss / totalExpenses) * 100 : 0;

    // Budget allocation analysis
    const allocationAnalysis = (project.budgetAllocations || []).map(
      (allocation) => {
        const allocationExpenses = expenses.filter(
          (exp) => exp.allocationId === allocation._id.toString()
        );
        const spent = allocationExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0),
          0
        );
        const remaining = allocation.amount - spent;
        const utilization =
          allocation.amount > 0 ? (spent / allocation.amount) * 100 : 0;
        const variance = spent - allocation.amount;
        const variancePercent =
          allocation.amount > 0 ? (variance / allocation.amount) * 100 : 0;

        return {
          allocationId: allocation._id,
          name: allocation.name || allocation.category || "Unnamed",
          category: allocation.category || "general",
          budgetedAmount: allocation.amount,
          spentAmount: spent,
          remainingAmount: remaining,
          utilization,
          variance,
          variancePercent,
          status:
            utilization > 100
              ? "overrun"
              : utilization > 90
              ? "warning"
              : "normal",
          expenseCount: allocationExpenses.length,
        };
      }
    );

    // Expense analysis by category
    const expensesByCategory = expenses.reduce((acc, exp) => {
      const category = exp.category || "uncategorized";
      if (!acc[category]) {
        acc[category] = { amount: 0, count: 0, expenses: [] };
      }
      acc[category].amount += exp.amount || 0;
      acc[category].count += 1;
      acc[category].expenses.push(exp);
      return acc;
    }, {});

    // Income analysis
    const incomeAnalysis = {
      total: totalIncome,
      collected: income
        .filter((inc) => inc.status === "collected")
        .reduce((sum, inc) => sum + (inc.amount || 0), 0),
      pending: income
        .filter((inc) => inc.status === "pending")
        .reduce((sum, inc) => sum + (inc.amount || 0), 0),
      overdue: income
        .filter((inc) => inc.status === "overdue")
        .reduce((sum, inc) => sum + (inc.amount || 0), 0),
      byMethod: income.reduce((acc, inc) => {
        const method = inc.paymentMethod || "unknown";
        acc[method] = (acc[method] || 0) + (inc.amount || 0);
        return acc;
      }, {}),
      byStatus: income.reduce((acc, inc) => {
        const status = inc.status || "pending";
        acc[status] = (acc[status] || 0) + (inc.amount || 0);
        return acc;
      }, {}),
    };

    // Monthly trend analysis (last 12 months)
    const monthlyTrends = [];
    const currentDate = new Date();

    for (let i = 11; i >= 0; i--) {
      const month = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const nextMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i + 1,
        1
      );

      const monthExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.expenseDate);
        return expDate >= month && expDate < nextMonth;
      });

      const monthIncome = income.filter((inc) => {
        const incDate = new Date(inc.receivedDate);
        return incDate >= month && incDate < nextMonth;
      });

      const monthExpenseTotal = monthExpenses.reduce(
        (sum, exp) => sum + (exp.amount || 0),
        0
      );
      const monthIncomeTotal = monthIncome.reduce(
        (sum, inc) => sum + (inc.amount || 0),
        0
      );

      monthlyTrends.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        expenses: monthExpenseTotal,
        income: monthIncomeTotal,
        netFlow: monthIncomeTotal - monthExpenseTotal,
        expenseCount: monthExpenses.length,
        incomeCount: monthIncome.length,
      });
    }

    // Variance analysis
    const varianceAnalysis = {
      budgetVariance: totalExpenses - totalBudget,
      budgetVariancePercent:
        totalBudget > 0
          ? ((totalExpenses - totalBudget) / totalBudget) * 100
          : 0,
      incomeVariance: totalIncome - (budget.expectedIncome || 0),
      incomeVariancePercent:
        (budget.expectedIncome || 0) > 0
          ? ((totalIncome - (budget.expectedIncome || 0)) /
              (budget.expectedIncome || 0)) *
            100
          : 0,
    };

    // Risk assessment
    const riskFactors = [];
    if (budgetUtilization > 90) {
      riskFactors.push({
        type: "budget_overrun",
        severity: budgetUtilization > 100 ? "high" : "medium",
        description: `Budget utilization is at ${budgetUtilization.toFixed(
          1
        )}%`,
        recommendation:
          "Review remaining expenses and consider budget adjustment",
      });
    }

    const overdueIncome = income.filter(
      (inc) =>
        inc.status === "overdue" ||
        (inc.dueDate && new Date(inc.dueDate) < new Date())
    );
    if (overdueIncome.length > 0) {
      const overdueAmount = overdueIncome.reduce(
        (sum, inc) => sum + (inc.amount || 0),
        0
      );
      riskFactors.push({
        type: "overdue_payments",
        severity: overdueAmount > totalBudget * 0.1 ? "high" : "medium",
        description: `${
          overdueIncome.length
        } overdue payments totaling $${overdueAmount.toFixed(2)}`,
        recommendation: "Follow up on overdue payments to improve cash flow",
      });
    }

    // Generate report based on type
    let reportData = {};

    switch (reportType) {
      case "summary":
        reportData = {
          projectInfo: {
            id: project._id,
            name: project.name,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
          },
          financialSummary: {
            totalBudget,
            totalExpenses,
            totalIncome,
            remainingBudget,
            budgetUtilization,
            profitLoss,
            roi,
          },
          allocationSummary: allocationAnalysis,
          riskFactors,
          generatedAt: new Date(),
        };
        break;

      case "detailed":
        reportData = {
          projectInfo: {
            id: project._id,
            name: project.name,
            description: project.description,
            startDate: project.startDate,
            endDate: project.endDate,
            status: project.status,
            category: project.category,
          },
          budget: {
            ...budget,
            utilization: budgetUtilization,
            remaining: remainingBudget,
            status:
              budgetUtilization > 100
                ? "overrun"
                : budgetUtilization > 90
                ? "warning"
                : "normal",
          },
          expenses: {
            total: totalExpenses,
            count: expenses.length,
            byCategory: expensesByCategory,
            items: expenses.map((exp) => ({
              ...exp,
              allocationName:
                project.budgetAllocations?.find(
                  (alloc) => alloc._id.toString() === exp.allocationId
                )?.name || "Unallocated",
            })),
          },
          income: {
            ...incomeAnalysis,
            count: income.length,
            items: income,
          },
          allocations: allocationAnalysis,
          variance: varianceAnalysis,
          monthlyTrends,
          riskFactors,
          generatedAt: new Date(),
        };
        break;

      case "variance":
        reportData = {
          projectInfo: {
            id: project._id,
            name: project.name,
          },
          varianceAnalysis,
          allocationVariances: allocationAnalysis.map((alloc) => ({
            name: alloc.name,
            budgeted: alloc.budgetedAmount,
            actual: alloc.spentAmount,
            variance: alloc.variance,
            variancePercent: alloc.variancePercent,
            status: alloc.status,
          })),
          overrunAlerts: allocationAnalysis.filter(
            (alloc) => alloc.status === "overrun"
          ),
          warningAlerts: allocationAnalysis.filter(
            (alloc) => alloc.status === "warning"
          ),
          generatedAt: new Date(),
        };
        break;

      case "trends":
        reportData = {
          projectInfo: {
            id: project._id,
            name: project.name,
          },
          monthlyTrends,
          trendAnalysis: {
            avgMonthlyExpenses:
              monthlyTrends.reduce((sum, month) => sum + month.expenses, 0) /
              monthlyTrends.length,
            avgMonthlyIncome:
              monthlyTrends.reduce((sum, month) => sum + month.income, 0) /
              monthlyTrends.length,
            avgNetFlow:
              monthlyTrends.reduce((sum, month) => sum + month.netFlow, 0) /
              monthlyTrends.length,
            expenseTrend: calculateTrend(monthlyTrends.map((m) => m.expenses)),
            incomeTrend: calculateTrend(monthlyTrends.map((m) => m.income)),
          },
          generatedAt: new Date(),
        };
        break;

      default:
        return NextResponse.json(
          {
            error:
              "Invalid report type. Use: summary, detailed, variance, or trends",
          },
          { status: 400 }
        );
    }

    // Return appropriate format
    if (format === "csv" && reportType === "detailed") {
      // Generate CSV for detailed report
      const csvData = generateCSVReport(reportData);
      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="project-${id}-financial-report.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reportType,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      data: reportData,
    });
  } catch (error) {
    console.error("Error generating financial report:", error);
    return NextResponse.json(
      { error: "Failed to generate financial report" },
      { status: 500 }
    );
  }
}

// Helper function to calculate trend (simple linear regression slope)
function calculateTrend(values) {
  const n = values.length;
  if (n < 2) return 0;

  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
  const sumXX = values.reduce((sum, val, index) => sum + index * index, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

// Helper function to generate CSV report
function generateCSVReport(reportData) {
  let csv = "Project Financial Report\n\n";

  // Project info
  csv += "Project Information\n";
  csv += `Name,${reportData.projectInfo.name}\n`;
  csv += `ID,${reportData.projectInfo.id}\n`;
  csv += `Status,${reportData.projectInfo.status}\n\n`;

  // Financial summary
  if (reportData.budget) {
    csv += "Budget Information\n";
    csv += `Total Budget,${reportData.budget.totalAmount || 0}\n`;
    csv += `Budget Utilization,${reportData.budget.utilization || 0}%\n`;
    csv += `Remaining Budget,${reportData.budget.remaining || 0}\n\n`;
  }

  // Expenses
  if (reportData.expenses && reportData.expenses.items) {
    csv += "Expenses\n";
    csv += "Title,Amount,Category,Date,Status,Vendor\n";
    reportData.expenses.items.forEach((expense) => {
      csv += `"${expense.title}",${expense.amount},${expense.category},${
        expense.expenseDate
      },${expense.status},"${expense.vendor || ""}"\n`;
    });
    csv += "\n";
  }

  // Income
  if (reportData.income && reportData.income.items) {
    csv += "Income\n";
    csv += "Title,Amount,Status,Client,Payment Method,Received Date\n";
    reportData.income.items.forEach((income) => {
      csv += `"${income.title}",${income.amount},${income.status},"${
        income.clientName || ""
      }",${income.paymentMethod},${income.receivedDate}\n`;
    });
  }

  return csv;
}
