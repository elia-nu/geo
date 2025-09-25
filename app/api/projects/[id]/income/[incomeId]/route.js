import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../../utils/audit.js";

// Get specific income entry
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
        { status: 400 }
      );
    }

    // Find project and income
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const income = project.income?.find(
      (inc) => inc._id.toString() === incomeId
    );

    if (!income) {
      return NextResponse.json(
        { error: "Income entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      income,
    });
  } catch (error) {
    console.error("Error fetching income entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch income entry" },
      { status: 500 }
    );
  }
}

// Update specific income entry
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = params;
    const data = await request.json();

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
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

    // Find income index
    const incomeIndex = project.income?.findIndex(
      (inc) => inc._id.toString() === incomeId
    );

    if (incomeIndex === -1 || incomeIndex === undefined) {
      return NextResponse.json(
        { error: "Income entry not found" },
        { status: 404 }
      );
    }

    const {
      title,
      description,
      amount,
      expectedAmount,
      receivedDate,
      dueDate,
      paymentMethod,
      clientName,
      clientEmail,
      invoiceNumber,
      status,
      paymentReference,
      notes,
    } = data;

    // Prepare update data
    const updateData = {};

    if (title !== undefined) updateData[`income.${incomeIndex}.title`] = title;
    if (description !== undefined)
      updateData[`income.${incomeIndex}.description`] = description;
    if (amount !== undefined) {
      if (amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        );
      }
      updateData[`income.${incomeIndex}.amount`] = parseFloat(amount);
    }
    if (expectedAmount !== undefined)
      updateData[`income.${incomeIndex}.expectedAmount`] =
        parseFloat(expectedAmount);
    if (receivedDate !== undefined)
      updateData[`income.${incomeIndex}.receivedDate`] = new Date(receivedDate);
    if (dueDate !== undefined)
      updateData[`income.${incomeIndex}.dueDate`] = dueDate
        ? new Date(dueDate)
        : null;
    if (paymentMethod !== undefined)
      updateData[`income.${incomeIndex}.paymentMethod`] = paymentMethod;
    if (clientName !== undefined)
      updateData[`income.${incomeIndex}.clientName`] = clientName;
    if (clientEmail !== undefined)
      updateData[`income.${incomeIndex}.clientEmail`] = clientEmail;
    if (invoiceNumber !== undefined)
      updateData[`income.${incomeIndex}.invoiceNumber`] = invoiceNumber;
    if (status !== undefined)
      updateData[`income.${incomeIndex}.status`] = status;
    if (paymentReference !== undefined)
      updateData[`income.${incomeIndex}.paymentReference`] = paymentReference;
    if (notes !== undefined) updateData[`income.${incomeIndex}.notes`] = notes;

    // Always update the income's updatedAt timestamp
    updateData[`income.${incomeIndex}.updatedAt`] = new Date();
    updateData.updatedAt = new Date();

    // Update the income entry
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        incomeId,
        incomeTitle: title || project.income[incomeIndex].title,
        updatedFields: Object.keys(updateData).filter(
          (key) => !key.includes("updatedAt")
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income entry updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating income entry:", error);
    return NextResponse.json(
      { error: "Failed to update income entry" },
      { status: 500 }
    );
  }
}

// Delete specific income entry
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
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

    // Find income entry
    const income = project.income?.find(
      (inc) => inc._id.toString() === incomeId
    );

    if (!income) {
      return NextResponse.json(
        { error: "Income entry not found" },
        { status: 404 }
      );
    }

    // Remove income entry from project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { income: { _id: new ObjectId(incomeId) } },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "DELETE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        incomeId,
        incomeTitle: income.title,
        amount: income.amount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income entry deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting income entry:", error);
    return NextResponse.json(
      { error: "Failed to delete income entry" },
      { status: 500 }
    );
  }
}
