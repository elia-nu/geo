import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Generate comprehensive utilization report for a project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "summary";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    const budget = project.budget || {};
    const expenses = project.expenses || [];
    const income = project.income || [];
    const allocations = project.budgetAllocations || [];

    // Filter data by date range if provided
    let filteredExpenses = expenses;
    let filteredIncome = income;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();

      filteredExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.expenseDate || exp.createdAt);
        return expDate >= start && expDate <= end;
      });

      filteredIncome = income.filter((inc) => {
        const incDate = new Date(inc.receivedDate || inc.createdAt);
        return incDate >= start && incDate <= end;
      });
    }

    // Calculate basic metrics
    const totalBudget = budget.totalAmount || 0;
    const totalExpenses = filteredExpenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const totalIncome = filteredIncome.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const budgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;
    const profitLoss = totalIncome - totalExpenses;
    const roi = totalExpenses > 0 ? (profitLoss / totalExpenses) * 100 : 0;

    // Generate detailed allocation utilization
    const allocationUtilization = allocations.map((allocation) => {
      const allocationExpenses = filteredExpenses.filter(
        (exp) => exp.allocationId === allocation._id.toString()
      );
      const spentAmount = allocationExpenses.reduce(
        (sum, exp) => sum + (exp.amount || 0),
        0
      );
      const budgetedAmount = allocation.amount || 0;
      const utilization =
        budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;
      const variance = spentAmount - budgetedAmount;
      const variancePercent =
        budgetedAmount > 0 ? (variance / budgetedAmount) * 100 : 0;

      // Calculate burn rate and projected completion
      const startDate = new Date(allocation.startDate || allocation.createdAt);
      const daysElapsed = Math.max(
        1,
        Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24))
      );
      const dailyBurnRate = spentAmount / daysElapsed;
      const projectedTotal = allocation.endDate
        ? dailyBurnRate *
          Math.ceil(
            (new Date(allocation.endDate) - startDate) / (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        ...allocation,
        spentAmount,
        budgetedAmount,
        remainingAmount: budgetedAmount - spentAmount,
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
        dailyBurnRate,
        projectedTotal,
        projectedOverrun: projectedTotal && projectedTotal > budgetedAmount,
        efficiency:
          budgetedAmount > 0
            ? Math.min(100, (budgetedAmount / Math.max(spentAmount, 1)) * 100)
            : 100,
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
    });

    // Department and category analysis
    const departmentAnalysis = {};
    const categoryAnalysis = {};

    allocationUtilization.forEach((allocation) => {
      // Department analysis
      if (allocation.departmentId) {
        if (!departmentAnalysis[allocation.departmentId]) {
          departmentAnalysis[allocation.departmentId] = {
            departmentId: allocation.departmentId,
            totalBudget: 0,
            totalSpent: 0,
            allocations: [],
            utilization: 0,
            efficiency: 0,
          };
        }
        departmentAnalysis[allocation.departmentId].totalBudget +=
          allocation.budgetedAmount;
        departmentAnalysis[allocation.departmentId].totalSpent +=
          allocation.spentAmount;
        departmentAnalysis[allocation.departmentId].allocations.push(
          allocation._id
        );
      }

      // Category analysis
      const category = allocation.category || "general";
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          category,
          totalBudget: 0,
          totalSpent: 0,
          allocations: [],
          utilization: 0,
          efficiency: 0,
        };
      }
      categoryAnalysis[category].totalBudget += allocation.budgetedAmount;
      categoryAnalysis[category].totalSpent += allocation.spentAmount;
      categoryAnalysis[category].allocations.push(allocation._id);
    });

    // Calculate department and category metrics
    Object.values(departmentAnalysis).forEach((dept) => {
      dept.utilization =
        dept.totalBudget > 0 ? (dept.totalSpent / dept.totalBudget) * 100 : 0;
      dept.efficiency =
        dept.totalBudget > 0
          ? Math.min(
              100,
              (dept.totalBudget / Math.max(dept.totalSpent, 1)) * 100
            )
          : 100;
      dept.variance = dept.totalSpent - dept.totalBudget;
      dept.status =
        dept.utilization > 100
          ? "overrun"
          : dept.utilization > 90
          ? "warning"
          : "normal";
    });

    Object.values(categoryAnalysis).forEach((cat) => {
      cat.utilization =
        cat.totalBudget > 0 ? (cat.totalSpent / cat.totalBudget) * 100 : 0;
      cat.efficiency =
        cat.totalBudget > 0
          ? Math.min(100, (cat.totalBudget / Math.max(cat.totalSpent, 1)) * 100)
          : 100;
      cat.variance = cat.totalSpent - cat.totalBudget;
      cat.status =
        cat.utilization > 100
          ? "overrun"
          : cat.utilization > 90
          ? "warning"
          : "normal";
    });

    // Expense trend analysis
    const expensesByMonth = {};
    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.expenseDate || expense.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!expensesByMonth[monthKey]) {
        expensesByMonth[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
      expensesByMonth[monthKey].amount += expense.amount || 0;
      expensesByMonth[monthKey].count += 1;
    });

    // Income trend analysis
    const incomeByMonth = {};
    filteredIncome.forEach((income) => {
      const date = new Date(income.receivedDate || income.createdAt);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      if (!incomeByMonth[monthKey]) {
        incomeByMonth[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
      incomeByMonth[monthKey].amount += income.amount || 0;
      incomeByMonth[monthKey].count += 1;
    });

    // Generate alerts and recommendations
    const alerts = [];
    const recommendations = [];

    // Budget overrun alerts
    if (budgetUtilization > 100) {
      alerts.push({
        type: "budget_overrun",
        severity: "high",
        message: `Project budget exceeded by ${(
          budgetUtilization - 100
        ).toFixed(1)}%`,
        amount: totalExpenses - totalBudget,
      });
      recommendations.push({
        type: "budget_control",
        priority: "high",
        message: "Immediate budget review and expense control measures needed",
        action:
          "Review all pending expenses and implement spending freeze where possible",
      });
    }

    // Allocation overruns
    allocationUtilization
      .filter((a) => a.status === "overrun")
      .forEach((allocation) => {
        alerts.push({
          type: "allocation_overrun",
          severity: "high",
          message: `Budget allocation "${
            allocation.name
          }" exceeded by ${allocation.variancePercent.toFixed(1)}%`,
          allocationId: allocation._id,
          amount: allocation.variance,
        });
      });

    // Efficiency recommendations
    const lowEfficiencyAllocations = allocationUtilization.filter(
      (a) => a.efficiency < 70
    );
    if (lowEfficiencyAllocations.length > 0) {
      recommendations.push({
        type: "efficiency_improvement",
        priority: "medium",
        message: `${lowEfficiencyAllocations.length} budget allocations showing low efficiency`,
        action: "Review spending patterns and optimize resource allocation",
      });
    }

    // Projected overrun warnings
    const projectedOverruns = allocationUtilization.filter(
      (a) => a.projectedOverrun
    );
    projectedOverruns.forEach((allocation) => {
      alerts.push({
        type: "projected_overrun",
        severity: "medium",
        message: `Budget allocation "${
          allocation.name
        }" projected to exceed budget by ${(
          (allocation.projectedTotal / allocation.budgetedAmount - 1) *
          100
        ).toFixed(1)}%`,
        allocationId: allocation._id,
        amount: allocation.projectedTotal - allocation.budgetedAmount,
      });
    });

    // Compile comprehensive report
    const report = {
      projectId: id,
      projectName: project.name,
      reportType,
      generatedAt: new Date(),
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalBudget,
        totalExpenses,
        totalIncome,
        budgetUtilization,
        remainingBudget: totalBudget - totalExpenses,
        profitLoss,
        roi,
        overrunAmount: Math.max(0, totalExpenses - totalBudget),
        status:
          budgetUtilization > 100
            ? "overrun"
            : budgetUtilization > 90
            ? "warning"
            : "normal",
      },
      allocations: allocationUtilization,
      departmentAnalysis: Object.values(departmentAnalysis),
      categoryAnalysis: Object.values(categoryAnalysis),
      trends: {
        expensesByMonth: Object.values(expensesByMonth).sort((a, b) =>
          a.month.localeCompare(b.month)
        ),
        incomeByMonth: Object.values(incomeByMonth).sort((a, b) =>
          a.month.localeCompare(b.month)
        ),
      },
      metrics: {
        totalAllocations: allocations.length,
        activeAllocations: allocationUtilization.filter(
          (a) => a.status !== "overrun"
        ).length,
        overrunAllocations: allocationUtilization.filter(
          (a) => a.status === "overrun"
        ).length,
        averageUtilization:
          allocationUtilization.length > 0
            ? allocationUtilization.reduce((sum, a) => sum + a.utilization, 0) /
              allocationUtilization.length
            : 0,
        averageEfficiency:
          allocationUtilization.length > 0
            ? allocationUtilization.reduce((sum, a) => sum + a.efficiency, 0) /
              allocationUtilization.length
            : 100,
        totalVariance: allocationUtilization.reduce(
          (sum, a) => sum + a.variance,
          0
        ),
        projectedOverruns: projectedOverruns.length,
      },
      alerts,
      recommendations,
      performance: {
        budgetAccuracy: Math.max(0, 100 - Math.abs(budgetUtilization - 100)),
        spendingVelocity:
          totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0,
        incomeRealization:
          project.income?.reduce((sum, inc) => sum + inc.collectionRate, 0) /
            Math.max(1, project.income?.length) || 0,
        overallScore: Math.max(
          0,
          100 -
            Math.abs(budgetUtilization - 100) -
            alerts.filter((a) => a.severity === "high").length * 10
        ),
      },
    };

    // Create audit log
    await createAuditLog({
      action: "GENERATE_UTILIZATION_REPORT",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: project.name,
        reportType,
        budgetUtilization,
        alertsCount: alerts.length,
        recommendationsCount: recommendations.length,
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Error generating utilization report:", error);
    return NextResponse.json(
      { error: "Failed to generate utilization report" },
      { status: 500 }
    );
  }
}
