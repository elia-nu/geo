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
        "budget.allocations._id": new ObjectId(allocationId),
      },
      {
        $set: {
          "budget.allocations.$.name": updateData.name,
          "budget.allocations.$.description": updateData.description,
          "budget.allocations.$.category": updateData.category,
          "budget.allocations.$.budgetedAmount": updateData.budgetedAmount,
          "budget.allocations.$.department": updateData.department,
          "budget.allocations.$.task": updateData.task,
          "budget.allocations.$.activity": updateData.activity,
          "budget.allocations.$.milestone": updateData.milestone,
          "budget.allocations.$.lastModified": new Date(),
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

    if (updatedProject?.budget?.allocations) {
      const allocation = updatedProject.budget.allocations.find(
        (alloc) => alloc._id.toString() === allocationId
      );

      if (allocation) {
        const remainingAmount =
          allocation.budgetedAmount - (allocation.spentAmount || 0);
        const utilization =
          allocation.budgetedAmount > 0
            ? ((allocation.spentAmount || 0) / allocation.budgetedAmount) * 100
            : 0;

        await db.collection("projects").updateOne(
          {
            _id: new ObjectId(projectId),
            "budget.allocations._id": new ObjectId(allocationId),
          },
          {
            $set: {
              "budget.allocations.$.remainingAmount": remainingAmount,
              "budget.allocations.$.utilization": utilization,
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
    const allocation = project.budget?.allocations?.find(
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
        },
        $set: {
          "budget.lastModified": new Date(),
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
