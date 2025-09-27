import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Get comprehensive financial summary for a specific project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("includeDetails") === "true";

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Get project with financial data
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          name: 1,
          category: 1,
          status: 1,
          startDate: 1,
          endDate: 1,
          budget: 1,
          budgetAllocations: 1,
          expenses: 1,
          income: 1,
          financialStatus: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate comprehensive financial summary
    const totalBudget = project.budget?.totalAmount || 0;
    const totalExpenses =
      project.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const totalIncome =
      project.income?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
    const totalExpectedIncome =
      project.income?.reduce(
        (sum, inc) => sum + (inc.expectedAmount || inc.amount || 0),
        0
      ) || 0;
    const totalUncollected =
      project.income?.reduce(
        (sum, inc) => sum + (inc.uncollectedAmount || 0),
        0
      ) || 0;

    // Budget utilization
    const budgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - totalExpenses;
    const budgetVariance = totalExpenses - totalBudget;
    const budgetVariancePercent =
      totalBudget > 0 ? (budgetVariance / totalBudget) * 100 : 0;

    // Profit & Loss
    const profitLoss = totalIncome - totalExpenses;
    const roi = totalExpenses > 0 ? (profitLoss / totalExpenses) * 100 : 0;
    const margin = totalIncome > 0 ? (profitLoss / totalIncome) * 100 : 0;

    // Payment collection analysis
    const collectedPayments =
      project.income?.filter((inc) => inc.status === "collected") || [];
    const pendingPayments =
      project.income?.filter((inc) => inc.status === "pending") || [];
    const overduePayments =
      project.income?.filter((inc) => inc.status === "overdue") || [];
    const cancelledPayments =
      project.income?.filter((inc) => inc.status === "cancelled") || [];

    const collectedAmount = collectedPayments.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const pendingAmount = pendingPayments.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const overdueAmount = overduePayments.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const cancelledAmount = cancelledPayments.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );

    const collectionRate =
      totalExpectedIncome > 0
        ? (collectedAmount / totalExpectedIncome) * 100
        : 0;

    // Budget allocation analysis
    const allocationSummary =
      project.budgetAllocations?.map((allocation) => {
        const allocationExpenses =
          project.expenses?.filter(
            (exp) => exp.allocationId === allocation._id.toString()
          ) || [];
        const spentAmount = allocationExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0),
          0
        );
        const budgetedAmount = allocation.amount || 0;
        const remainingAmount = budgetedAmount - spentAmount;
        const utilization =
          budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;
        const variance = spentAmount - budgetedAmount;
        const variancePercent =
          budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

        // Determine status
        let status = "normal";
        if (utilization > 100) {
          status = "overrun";
        } else if (utilization > 90) {
          status = "warning";
        } else if (
          allocation.endDate &&
          new Date() > new Date(allocation.endDate) &&
          utilization < 80
        ) {
          status = "underutilized";
        }

        return {
          ...allocation,
          budgetedAmount,
          spentAmount,
          remainingAmount,
          utilization,
          variance,
          variancePercent,
          status,
          expenseCount: allocationExpenses.length,
          isOverBudget: spentAmount > budgetedAmount,
          isNearLimit: utilization > 80 && utilization <= 100,
          daysRemaining: allocation.endDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(allocation.endDate) - new Date()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : null,
        };
      }) || [];

    // Expense analysis by category
    const expensesByCategory =
      project.expenses?.reduce((acc, exp) => {
        const category = exp.category || "uncategorized";
        if (!acc[category]) {
          acc[category] = { amount: 0, count: 0, expenses: [] };
        }
        acc[category].amount += exp.amount || 0;
        acc[category].count += 1;
        if (includeDetails) {
          acc[category].expenses.push(exp);
        }
        return acc;
      }, {}) || {};

    // Income analysis by status and payment method
    const incomeByStatus =
      project.income?.reduce((acc, inc) => {
        const status = inc.status || "pending";
        if (!acc[status]) {
          acc[status] = { amount: 0, count: 0, payments: [] };
        }
        acc[status].amount += inc.amount || 0;
        acc[status].count += 1;
        if (includeDetails) {
          acc[status].payments.push(inc);
        }
        return acc;
      }, {}) || {};

    const incomeByMethod =
      project.income?.reduce((acc, inc) => {
        const method = inc.paymentMethod || "unknown";
        if (!acc[method]) {
          acc[method] = { amount: 0, count: 0 };
        }
        acc[method].amount += inc.amount || 0;
        acc[method].count += 1;
        return acc;
      }, {}) || {};

    // Risk assessment
    const riskFactors = [];
    if (budgetUtilization > 100) {
      riskFactors.push({
        type: "budget_overrun",
        severity: "high",
        message: `Project is ${budgetVariancePercent.toFixed(1)}% over budget`,
        amount: budgetVariance,
      });
    } else if (budgetUtilization > 90) {
      riskFactors.push({
        type: "budget_warning",
        severity: "medium",
        message: `Project is at ${budgetUtilization.toFixed(
          1
        )}% budget utilization`,
        amount: remainingBudget,
      });
    }

    if (overduePayments.length > 0) {
      riskFactors.push({
        type: "overdue_payments",
        severity: "high",
        message: `${overduePayments.length} payments are overdue`,
        amount: overdueAmount,
      });
    }

    if (collectionRate < 80) {
      riskFactors.push({
        type: "low_collection_rate",
        severity: "medium",
        message: `Collection rate is ${collectionRate.toFixed(1)}%`,
        amount: totalUncollected,
      });
    }

    // Performance metrics
    const performanceMetrics = {
      budgetEfficiency:
        totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
      revenueEfficiency:
        totalBudget > 0 ? (totalIncome / totalBudget) * 100 : 0,
      costPerDollarRevenue: totalIncome > 0 ? totalExpenses / totalIncome : 0,
      averageExpenseAmount:
        project.expenses?.length > 0
          ? totalExpenses / project.expenses.length
          : 0,
      averageIncomeAmount:
        project.income?.length > 0 ? totalIncome / project.income.length : 0,
      expenseGrowthRate: 0, // Would need historical data to calculate
      incomeGrowthRate: 0, // Would need historical data to calculate
    };

    // Timeline analysis
    const currentDate = new Date();
    const projectStartDate = new Date(project.startDate);
    const projectEndDate = new Date(project.endDate);
    const projectDuration = Math.ceil(
      (projectEndDate - projectStartDate) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
      (currentDate - projectStartDate) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.ceil(
      (projectEndDate - currentDate) / (1000 * 60 * 60 * 24)
    );
    const projectProgress = Math.max(
      0,
      Math.min(100, (daysElapsed / projectDuration) * 100)
    );

    // Burn rate analysis
    const dailyBurnRate = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
    const projectedTotalExpenses = dailyBurnRate * projectDuration;
    const projectedVariance = projectedTotalExpenses - totalBudget;

    const financialSummary = {
      project: {
        id: project._id,
        name: project.name,
        category: project.category,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        duration: projectDuration,
        daysElapsed,
        daysRemaining,
        progress: projectProgress,
      },
      budget: {
        totalBudget,
        totalExpenses,
        remainingBudget,
        budgetUtilization,
        budgetVariance,
        budgetVariancePercent,
        status:
          budgetUtilization > 100
            ? "overrun"
            : budgetUtilization > 90
            ? "warning"
            : "normal",
      },
      income: {
        totalIncome,
        totalExpectedIncome,
        totalUncollected,
        collectedAmount,
        pendingAmount,
        overdueAmount,
        cancelledAmount,
        collectionRate,
        status:
          collectionRate >= 95
            ? "excellent"
            : collectionRate >= 80
            ? "good"
            : collectionRate >= 60
            ? "fair"
            : "poor",
      },
      profitLoss: {
        profitLoss,
        roi,
        margin,
        isProfitable: profitLoss > 0,
        status:
          profitLoss > 0
            ? "profitable"
            : profitLoss === 0
            ? "break_even"
            : "loss",
      },
      payments: {
        collected: {
          count: collectedPayments.length,
          amount: collectedAmount,
        },
        pending: {
          count: pendingPayments.length,
          amount: pendingAmount,
        },
        overdue: {
          count: overduePayments.length,
          amount: overdueAmount,
        },
        cancelled: {
          count: cancelledPayments.length,
          amount: cancelledAmount,
        },
      },
      allocations: {
        total: allocationSummary.length,
        overrun: allocationSummary.filter((a) => a.status === "overrun").length,
        warning: allocationSummary.filter((a) => a.status === "warning").length,
        normal: allocationSummary.filter((a) => a.status === "normal").length,
        underutilized: allocationSummary.filter(
          (a) => a.status === "underutilized"
        ).length,
        summary: allocationSummary,
      },
      analysis: {
        expensesByCategory,
        incomeByStatus,
        incomeByMethod,
        riskFactors,
        performanceMetrics,
      },
      projections: {
        dailyBurnRate,
        projectedTotalExpenses,
        projectedVariance,
        projectedCompletionDate:
          dailyBurnRate > 0
            ? new Date(
                currentDate.getTime() +
                  (remainingBudget / dailyBurnRate) * (1000 * 60 * 60 * 24)
              )
            : null,
      },
      lastUpdated: new Date(),
    };

    return NextResponse.json({
      success: true,
      financialSummary,
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 }
    );
  }
}
