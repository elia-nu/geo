import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../audit/route";

// Get specific expense
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id, expenseId } = await params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(expenseId)) {
      return NextResponse.json(
        { error: "Invalid project or expense ID" },
        { status: 400 }
      );
    }

    // Find project and expense
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const expense = project.expenses?.find(
      (exp) => exp._id.toString() === expenseId
    );

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

// Update specific expense
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, expenseId } = await params;
    const data = await request.json();

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(expenseId)) {
      return NextResponse.json(
        { error: "Invalid project or expense ID" },
        { status: 400 }
      );
    }

    // Find project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find expense index
    const expenseIndex = project.expenses?.findIndex(
      (exp) => exp._id.toString() === expenseId
    );

    if (expenseIndex === -1 || expenseIndex === undefined) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const {
      title,
      description,
      amount,
      category,
      expenseDate,
      allocationId,
      vendor,
      receiptUrl,
      approvedBy,
      status,
      tags,
    } = data;

    // Prepare update data
    const updateData = {};

    if (title !== undefined)
      updateData[`expenses.${expenseIndex}.title`] = title;
    if (description !== undefined)
      updateData[`expenses.${expenseIndex}.description`] = description;
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        );
      }
      updateData[`expenses.${expenseIndex}.amount`] = parseFloat(amount);
    }
    if (category !== undefined)
      updateData[`expenses.${expenseIndex}.category`] = category;
    if (expenseDate !== undefined)
      updateData[`expenses.${expenseIndex}.expenseDate`] = new Date(
        expenseDate
      );
    if (allocationId !== undefined) {
      // Validate allocation if provided
      if (allocationId) {
        const allocation = project.budgetAllocations?.find(
          (alloc) => alloc._id.toString() === allocationId
        );
        if (!allocation) {
          return NextResponse.json(
            { error: "Invalid allocation ID" },
            { status: 400 }
          );
        }
      }
      updateData[`expenses.${expenseIndex}.allocationId`] = allocationId;
    }
    if (vendor !== undefined)
      updateData[`expenses.${expenseIndex}.vendor`] = vendor;
    if (receiptUrl !== undefined)
      updateData[`expenses.${expenseIndex}.receiptUrl`] = receiptUrl;
    if (approvedBy !== undefined)
      updateData[`expenses.${expenseIndex}.approvedBy`] = approvedBy;
    if (status !== undefined)
      updateData[`expenses.${expenseIndex}.status`] = status;
    if (tags !== undefined) updateData[`expenses.${expenseIndex}.tags`] = tags;

    // Always update the expense's updatedAt timestamp
    updateData[`expenses.${expenseIndex}.updatedAt`] = new Date();
    updateData.updatedAt = new Date();

    // Update the expense
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_EXPENSE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        expenseId,
        expenseTitle: title || project.expenses[expenseIndex].title,
        updatedFields: Object.keys(updateData).filter(
          (key) => !key.includes("updatedAt")
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expense updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

// Delete specific expense
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id, expenseId } = await params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(expenseId)) {
      return NextResponse.json(
        { error: "Invalid project or expense ID" },
        { status: 400 }
      );
    }

    // Find project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find expense
    const expense = project.expenses?.find(
      (exp) => exp._id.toString() === expenseId
    );

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Remove expense from project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { expenses: { _id: new ObjectId(expenseId) } },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "DELETE_EXPENSE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        expenseId,
        expenseTitle: expense.title,
        amount: expense.amount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expense deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
