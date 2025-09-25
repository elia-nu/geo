import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Get project budget information
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Get project budget data
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          name: 1,
          budget: 1,
          expenses: 1,
          income: 1,
          budgetAllocations: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate budget summary
    const totalBudget = project.budget?.totalAmount || 0;
    const totalExpenses =
      project.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const totalIncome =
      project.income?.reduce((sum, inc) => sum + (inc.amount || 0), 0) || 0;
    const remainingBudget = totalBudget - totalExpenses;
    const budgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    // Calculate allocation summaries with enhanced tracking
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

        // Determine status based on utilization and timeline
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
          // Enhanced tracking
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
          burnRate:
            allocationExpenses.length > 0
              ? spentAmount /
                Math.max(
                  1,
                  Math.ceil(
                    (new Date() -
                      new Date(allocation.startDate || allocation.createdAt)) /
                      (1000 * 60 * 60 * 24)
                  )
                )
              : 0,
        };
      }) || [];

    // Calculate department and category summaries
    const departmentSummary = allocationSummary.reduce((acc, allocation) => {
      if (allocation.departmentId) {
        if (!acc[allocation.departmentId]) {
          acc[allocation.departmentId] = {
            departmentId: allocation.departmentId,
            totalBudget: 0,
            totalSpent: 0,
            allocations: [],
          };
        }
        acc[allocation.departmentId].totalBudget += allocation.budgetedAmount;
        acc[allocation.departmentId].totalSpent += allocation.spentAmount;
        acc[allocation.departmentId].allocations.push(allocation._id);
      }
      return acc;
    }, {});

    const categorySummary = allocationSummary.reduce((acc, allocation) => {
      const category = allocation.category || "general";
      if (!acc[category]) {
        acc[category] = {
          category,
          totalBudget: 0,
          totalSpent: 0,
          allocations: [],
        };
      }
      acc[category].totalBudget += allocation.budgetedAmount;
      acc[category].totalSpent += allocation.spentAmount;
      acc[category].allocations.push(allocation._id);
      return acc;
    }, {});

    // Generate alerts and notifications
    const alerts = [];
    allocationSummary.forEach((allocation) => {
      if (allocation.status === "overrun") {
        alerts.push({
          type: "overrun",
          severity: "high",
          message: `Budget allocation "${
            allocation.name
          }" is ${allocation.variancePercent.toFixed(1)}% over budget`,
          allocationId: allocation._id,
          amount: allocation.variance,
        });
      } else if (allocation.status === "warning") {
        alerts.push({
          type: "warning",
          severity: "medium",
          message: `Budget allocation "${
            allocation.name
          }" is at ${allocation.utilization.toFixed(1)}% utilization`,
          allocationId: allocation._id,
          amount: allocation.remainingAmount,
        });
      }

      if (
        allocation.daysRemaining !== null &&
        allocation.daysRemaining <= 7 &&
        allocation.utilization < 50
      ) {
        alerts.push({
          type: "underutilized",
          severity: "low",
          message: `Budget allocation "${allocation.name}" expires in ${
            allocation.daysRemaining
          } days with only ${allocation.utilization.toFixed(1)}% utilized`,
          allocationId: allocation._id,
          amount: allocation.remainingAmount,
        });
      }
    });

    return NextResponse.json({
      success: true,
      budget: {
        ...project.budget,
        summary: {
          totalBudget,
          totalExpenses,
          totalIncome,
          remainingBudget,
          budgetUtilization,
          profitLoss: totalIncome - totalExpenses,
          roi:
            totalExpenses > 0
              ? ((totalIncome - totalExpenses) / totalExpenses) * 100
              : 0,
          status:
            budgetUtilization > 100
              ? "overrun"
              : budgetUtilization > 90
              ? "warning"
              : "normal",
          overrunAmount: Math.max(0, totalExpenses - totalBudget),
          projectedOverrun: totalBudget > 0 && budgetUtilization > 100,
        },
        allocations: allocationSummary,
        departmentSummary: Object.values(departmentSummary),
        categorySummary: Object.values(categorySummary),
        alerts,
        expenses: project.expenses || [],
        income: project.income || [],
        // Enhanced metrics
        metrics: {
          totalAllocations: allocationSummary.length,
          activeAllocations: allocationSummary.filter(
            (a) => a.status === "normal" || a.status === "warning"
          ).length,
          overrunAllocations: allocationSummary.filter(
            (a) => a.status === "overrun"
          ).length,
          averageUtilization:
            allocationSummary.length > 0
              ? allocationSummary.reduce((sum, a) => sum + a.utilization, 0) /
                allocationSummary.length
              : 0,
          highestUtilization: Math.max(
            ...allocationSummary.map((a) => a.utilization),
            0
          ),
          lowestUtilization:
            allocationSummary.length > 0
              ? Math.min(...allocationSummary.map((a) => a.utilization))
              : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching project budget:", error);
    return NextResponse.json(
      { error: "Failed to fetch project budget" },
      { status: 500 }
    );
  }
}

// Create or update project budget
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const {
      totalAmount,
      currency = "USD",
      description,
      approvedBy,
      approvalDate,
      budgetAllocations = [],
    } = data;

    // Validation
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Total amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate allocations don't exceed total budget
    const totalAllocated = budgetAllocations.reduce(
      (sum, allocation) => sum + (allocation.amount || 0),
      0
    );
    if (totalAllocated > totalAmount) {
      return NextResponse.json(
        { error: "Total allocations cannot exceed total budget" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Prepare budget data
    const budgetData = {
      totalAmount,
      currency,
      description: description || "",
      approvedBy: approvedBy || "admin",
      approvalDate: approvalDate ? new Date(approvalDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Prepare allocations with IDs and enhanced structure
    const allocationsWithIds = budgetAllocations.map((allocation) => ({
      _id: new ObjectId(),
      name: allocation.name || `${allocation.category} Allocation`,
      category: allocation.category || "general",
      amount: parseFloat(allocation.amount || 0),
      description: allocation.description || "",
      // Enhanced allocation types
      allocationType: allocation.allocationType || "general", // general, department, task, activity, milestone
      departmentId: allocation.departmentId || null,
      taskId: allocation.taskId || null,
      activityId: allocation.activityId || null,
      milestoneId: allocation.milestoneId || null,
      // Financial tracking
      spentAmount: 0,
      remainingAmount: parseFloat(allocation.amount || 0),
      utilization: 0,
      status: "active",
      // Approval and tracking
      approvedBy: allocation.approvedBy || "admin",
      approvalDate: allocation.approvalDate
        ? new Date(allocation.approvalDate)
        : new Date(),
      startDate: allocation.startDate
        ? new Date(allocation.startDate)
        : new Date(),
      endDate: allocation.endDate ? new Date(allocation.endDate) : null,
      // Metadata
      priority: allocation.priority || "medium", // low, medium, high, critical
      tags: allocation.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Update project with budget information
    const updateResult = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          budget: budgetData,
          budgetAllocations: allocationsWithIds,
          updatedAt: new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "CREATE_BUDGET",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        totalAmount,
        currency,
        allocationsCount: budgetAllocations.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Budget created successfully",
      budget: {
        ...budgetData,
        allocations: allocationsWithIds,
      },
    });
  } catch (error) {
    console.error("Error creating project budget:", error);
    return NextResponse.json(
      { error: "Failed to create project budget" },
      { status: 500 }
    );
  }
}

// Update project budget
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const {
      totalAmount,
      currency,
      description,
      approvedBy,
      approvalDate,
      budgetAllocations,
    } = data;

    const updateData = {};

    // Update budget fields
    if (totalAmount !== undefined) {
      if (totalAmount <= 0) {
        return NextResponse.json(
          { error: "Total amount must be greater than 0" },
          { status: 400 }
        );
      }
      updateData["budget.totalAmount"] = totalAmount;
    }

    if (currency !== undefined) updateData["budget.currency"] = currency;
    if (description !== undefined)
      updateData["budget.description"] = description;
    if (approvedBy !== undefined) updateData["budget.approvedBy"] = approvedBy;
    if (approvalDate !== undefined)
      updateData["budget.approvalDate"] = new Date(approvalDate);

    // Handle budget allocations update
    if (budgetAllocations !== undefined) {
      // Validate allocations don't exceed total budget
      const totalBudget =
        totalAmount || existingProject.budget?.totalAmount || 0;
      const totalAllocated = budgetAllocations.reduce(
        (sum, allocation) => sum + (allocation.amount || 0),
        0
      );

      if (totalAllocated > totalBudget) {
        return NextResponse.json(
          { error: "Total allocations cannot exceed total budget" },
          { status: 400 }
        );
      }

      // Preserve existing allocation IDs or create new ones
      const allocationsWithIds = budgetAllocations.map((allocation) => {
        if (allocation._id) {
          return {
            ...allocation,
            _id:
              typeof allocation._id === "string"
                ? new ObjectId(allocation._id)
                : allocation._id,
            updatedAt: new Date(),
          };
        } else {
          return {
            ...allocation,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      });

      updateData.budgetAllocations = allocationsWithIds;
    }

    // Always update the budget's updatedAt timestamp
    updateData["budget.updatedAt"] = new Date();
    updateData.updatedAt = new Date();

    // Update the project
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_BUDGET",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        updatedFields: Object.keys(updateData).filter(
          (key) => !key.includes("updatedAt")
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Budget updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating project budget:", error);
    return NextResponse.json(
      { error: "Failed to update project budget" },
      { status: 500 }
    );
  }
}
