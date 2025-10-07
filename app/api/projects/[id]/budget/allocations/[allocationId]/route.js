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
          "budget.allocations.$.amount":
            updateData.budgetedAmount || updateData.amount,
          "budget.allocations.$.departmentId": updateData.departmentId,
          "budget.allocations.$.taskId": updateData.taskId,
          "budget.allocations.$.activityId": updateData.activityId,
          "budget.allocations.$.milestoneId": updateData.milestoneId,
          "budget.allocations.$.updatedAt": new Date(),
          // Also update budgetAllocations for consistency
          "budgetAllocations.$.name": updateData.name,
          "budgetAllocations.$.description": updateData.description,
          "budgetAllocations.$.category": updateData.category,
          "budgetAllocations.$.amount":
            updateData.budgetedAmount || updateData.amount,
          "budgetAllocations.$.departmentId": updateData.departmentId,
          "budgetAllocations.$.taskId": updateData.taskId,
          "budgetAllocations.$.activityId": updateData.activityId,
          "budgetAllocations.$.milestoneId": updateData.milestoneId,
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

    const allocations =
      updatedProject?.budget?.allocations || updatedProject?.budgetAllocations;
    if (allocations) {
      const allocation = allocations.find(
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
