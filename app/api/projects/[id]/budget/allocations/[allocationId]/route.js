import { NextResponse } from "next/server";
import { getDb } from "../../../../../mongo";
import { ObjectId } from "mongodb";

// PUT - Update a specific budget allocation
export async function PUT(request, { params }) {
  try {
    const { id: projectId, allocationId } = await params;
    const updateData = await request.json();

    const db = await getDb();

    // Validate project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const allocations =
      project.budget?.allocations || project.budgetAllocations || [];
    const currentAllocation = allocations.find(
      (alloc) => alloc._id?.toString() === allocationId
    );

    if (!currentAllocation) {
      return NextResponse.json(
        { success: false, error: "Allocation not found" },
        { status: 404 }
      );
    }

    const newAmount = Number(
      updateData.budgetedAmount ?? updateData.amount ?? currentAllocation.amount
    );
    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Allocation amount must be a positive number" },
        { status: 400 }
      );
    }

    const spentAmount = Number(currentAllocation.spentAmount) || 0;
    if (newAmount + 0.001 < spentAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Amount cannot be less than already spent (${spentAmount.toFixed(
            2
          )})`,
        },
        { status: 400 }
      );
    }

    const totalBudget = Number(project.budget?.totalAmount) || 0;
    const otherAllocated = allocations
      .filter((alloc) => alloc._id?.toString() !== allocationId)
      .reduce((sum, alloc) => sum + (Number(alloc.amount) || 0), 0);

    if (otherAllocated + newAmount > totalBudget + 0.001) {
      const available = Math.max(0, totalBudget - otherAllocated);
      return NextResponse.json(
        {
          success: false,
          error: `Amount exceeds available budget (${available.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    if (updateData.startDate && updateData.endDate) {
      const start = new Date(updateData.startDate);
      const end = new Date(updateData.endDate);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end < start
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "End date must be on or after start date",
          },
          { status: 400 }
        );
      }
    }

    const startDate = updateData.startDate
      ? new Date(updateData.startDate)
      : null;
    const endDate = updateData.endDate ? new Date(updateData.endDate) : null;

    // Update the specific allocation within the project's budget
    const result = await db.collection("projects").updateOne(
      {
        _id: new ObjectId(projectId),
        $or: [
          { "budget.allocations._id": new ObjectId(allocationId) },
          { "budgetAllocations._id": new ObjectId(allocationId) },
        ],
      },
      {
        $set: {
          "budget.allocations.$.name": updateData.name,
          "budget.allocations.$.description": updateData.description,
          "budget.allocations.$.category": updateData.category,
          "budget.allocations.$.categoryId": updateData.categoryId || null,
          "budget.allocations.$.amount": newAmount,
          "budget.allocations.$.departmentId": updateData.departmentId,
          "budget.allocations.$.taskId": updateData.taskId,
          "budget.allocations.$.activityId": updateData.activityId,
          "budget.allocations.$.milestoneId": updateData.milestoneId,
          "budget.allocations.$.allocationType":
            updateData.allocationType || currentAllocation.allocationType,
          "budget.allocations.$.priority":
            updateData.priority || currentAllocation.priority || "medium",
          "budget.allocations.$.startDate": startDate,
          "budget.allocations.$.endDate": endDate,
          "budget.allocations.$.updatedAt": new Date(),
          // Also update budgetAllocations for consistency
          "budgetAllocations.$.name": updateData.name,
          "budgetAllocations.$.description": updateData.description,
          "budgetAllocations.$.category": updateData.category,
          "budgetAllocations.$.categoryId": updateData.categoryId || null,
          "budgetAllocations.$.amount": newAmount,
          "budgetAllocations.$.departmentId": updateData.departmentId,
          "budgetAllocations.$.taskId": updateData.taskId,
          "budgetAllocations.$.activityId": updateData.activityId,
          "budgetAllocations.$.milestoneId": updateData.milestoneId,
          "budgetAllocations.$.allocationType":
            updateData.allocationType || currentAllocation.allocationType,
          "budgetAllocations.$.priority":
            updateData.priority || currentAllocation.priority || "medium",
          "budgetAllocations.$.startDate": startDate,
          "budgetAllocations.$.endDate": endDate,
          "budgetAllocations.$.updatedAt": new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Allocation not found" },
        { status: 404 }
      );
    }

    // Recalculate remaining amount
    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    const updatedAllocations =
      updatedProject?.budget?.allocations || updatedProject?.budgetAllocations;
    if (updatedAllocations) {
      const allocation = updatedAllocations.find(
        (alloc) => alloc._id.toString() === allocationId
      );

      if (allocation) {
        const budgetedAmount =
          allocation.amount || allocation.budgetedAmount || 0;
        const spentAmount = allocation.spentAmount || 0;
        const remainingAmount = budgetedAmount - spentAmount;
        const utilization =
          budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;

        // Update both locations for consistency
        await db.collection("projects").updateOne(
          {
            _id: new ObjectId(projectId),
            $or: [
              { "budget.allocations._id": new ObjectId(allocationId) },
              { "budgetAllocations._id": new ObjectId(allocationId) },
            ],
          },
          {
            $set: {
              "budget.allocations.$.remainingAmount": remainingAmount,
              "budget.allocations.$.utilization": utilization,
              "budgetAllocations.$.remainingAmount": remainingAmount,
              "budgetAllocations.$.utilization": utilization,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Budget allocation updated successfully",
    });
  } catch (error) {
    console.error("Error updating budget allocation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update budget allocation" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific budget allocation
export async function DELETE(request, { params }) {
  try {
    const { id: projectId, allocationId } = await params;

    const db = await getDb();

    // Validate project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if allocation has any expenses before deleting
    const allocations =
      project.budget?.allocations || project.budgetAllocations;
    const allocation = allocations?.find(
      (alloc) => alloc._id.toString() === allocationId
    );

    if (!allocation) {
      return NextResponse.json(
        { success: false, error: "Allocation not found" },
        { status: 404 }
      );
    }

    if (allocation.spentAmount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete allocation with existing expenses. Please remove expenses first.",
        },
        { status: 400 }
      );
    }

    // Remove the allocation from the project's budget
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $pull: {
          "budget.allocations": { _id: new ObjectId(allocationId) },
          budgetAllocations: { _id: new ObjectId(allocationId) },
        },
        $set: {
          "budget.updatedAt": new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to delete allocation" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Budget allocation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget allocation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete budget allocation" },
      { status: 500 }
    );
  }
}
