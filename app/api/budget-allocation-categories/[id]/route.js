import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// Get specific budget allocation category
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const category = await db.collection("budgetAllocationCategories").findOne({
      _id: new ObjectId(id),
    });

    if (!category) {
      return NextResponse.json(
        { error: "Budget allocation category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching budget allocation category:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget allocation category" },
      { status: 500 }
    );
  }
}

// Update budget allocation category
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    const { name, description, status } = data;

    // Check if category exists
    const existingCategory = await db
      .collection("budgetAllocationCategories")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Budget allocation category not found" },
        { status: 404 }
      );
    }

    // Validation
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name cannot be empty" },
        { status: 400 }
      );
    }

    // Check if another category with same name already exists (excluding current one)
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await db
        .collection("budgetAllocationCategories")
        .findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          _id: { $ne: new ObjectId(id) },
        });

      if (duplicateCategory) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || "";
    if (status !== undefined) updateData.status = status;

    const result = await db
      .collection("budgetAllocationCategories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Budget allocation category not found" },
        { status: 404 }
      );
    }

    // Get updated category
    const updatedCategory = await db
      .collection("budgetAllocationCategories")
      .findOne({
        _id: new ObjectId(id),
      });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_BUDGET_ALLOCATION_CATEGORY",
      entityType: "budgetAllocationCategory",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        categoryName: updatedCategory.name,
        changes: updateData,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Budget allocation category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating budget allocation category:", error);
    return NextResponse.json(
      { error: "Failed to update budget allocation category" },
      { status: 500 }
    );
  }
}

// Delete budget allocation category
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await db.collection("budgetAllocationCategories").findOne({
      _id: new ObjectId(id),
    });

    if (!category) {
      return NextResponse.json(
        { error: "Budget allocation category not found" },
        { status: 404 }
      );
    }

    // Check if category is being used by any budget allocations
    const allocationsUsingCategory = await db
      .collection("projects")
      .countDocuments({
        "budgetAllocations.categoryId": new ObjectId(id),
      });

    if (allocationsUsingCategory > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category. It is being used by ${allocationsUsingCategory} budget allocation(s). Please reassign or delete those allocations first.`,
        },
        { status: 400 }
      );
    }

    // Delete the category
    const result = await db.collection("budgetAllocationCategories").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Budget allocation category not found" },
        { status: 404 }
      );
    }

    // Create audit log
    await createAuditLog({
      action: "DELETE_BUDGET_ALLOCATION_CATEGORY",
      entityType: "budgetAllocationCategory",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        categoryName: category.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Budget allocation category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget allocation category:", error);
    return NextResponse.json(
      { error: "Failed to delete budget allocation category" },
      { status: 500 }
    );
  }
}
