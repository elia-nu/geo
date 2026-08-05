import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../../utils/audit.js";
import {
  applyCollection,
  enrichIncomeRecord,
} from "../../../../../utils/incomeLifecycle.js";

// Get specific income entry
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = await params;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
        { status: 400 }
      );
    }

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
      income: enrichIncomeRecord(income),
    });
  } catch (error) {
    console.error("Error fetching income entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch income entry" },
      { status: 500 }
    );
  }
}

/**
 * Update income entry OR collect payment.
 *
 * Collect payload:
 *   { action: "collect", collectAmount, receivedDate?, paymentMethod?, invoiceNumber?, paymentReference?, notes? }
 *
 * Regular edit: field patch (recomputes lifecycle fields).
 */
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = await params;
    const data = await request.json();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
        { status: 400 }
      );
    }

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const incomeIndex = project.income?.findIndex(
      (inc) => inc._id.toString() === incomeId
    );

    if (incomeIndex === -1 || incomeIndex === undefined) {
      return NextResponse.json(
        { error: "Income entry not found" },
        { status: 404 }
      );
    }

    const existing = project.income[incomeIndex];
    const previousAmount = Number(existing.amount) || 0;
    let updated;

    if (data.action === "collect") {
      try {
        updated = applyCollection(existing, {
          collectAmount: data.collectAmount,
          receivedDate: data.receivedDate,
          paymentMethod: data.paymentMethod || data.paymentType,
          invoiceNumber: data.invoiceNumber,
          paymentReference: data.paymentReference,
          notes: data.notes,
        });
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    } else {
      let nextCategoryId =
        data.categoryId !== undefined ? data.categoryId : existing.categoryId;
      let nextCategoryName =
        data.categoryName !== undefined
          ? data.categoryName
          : existing.categoryName;

      if (data.categoryId !== undefined) {
        if (data.categoryId && ObjectId.isValid(data.categoryId)) {
          const category = await db.collection("incomeCategories").findOne({
            _id: new ObjectId(data.categoryId),
          });
          nextCategoryId = category ? category._id.toString() : "";
          nextCategoryName = category?.name || "";
        } else {
          nextCategoryId = "";
          nextCategoryName = "";
        }
      }

      const merged = {
        ...existing,
        title: data.title !== undefined ? data.title : existing.title,
        description:
          data.description !== undefined
            ? data.description
            : existing.description,
        expectedAmount:
          data.expectedAmount !== undefined
            ? data.expectedAmount
            : existing.expectedAmount,
        amount:
          data.amount !== undefined ? data.amount : existing.amount,
        receivedDate:
          data.receivedDate !== undefined
            ? data.receivedDate
            : existing.receivedDate,
        dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
        paymentMethod:
          data.paymentMethod !== undefined
            ? data.paymentMethod
            : data.paymentType !== undefined
            ? data.paymentType
            : existing.paymentMethod,
        clientName:
          data.clientName !== undefined ? data.clientName : existing.clientName,
        categoryId: nextCategoryId || "",
        categoryName: nextCategoryName || "",
        invoiceNumber:
          data.invoiceNumber !== undefined
            ? data.invoiceNumber
            : existing.invoiceNumber,
        paymentReference:
          data.paymentReference !== undefined
            ? data.paymentReference
            : existing.paymentReference,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        status:
          data.status === "cancelled"
            ? "cancelled"
            : data.status === "pending" && previousAmount === 0
            ? "pending"
            : existing.status,
      };

      // Allow resetting cancelled only via explicit status
      if (data.status === "cancelled") {
        merged.status = "cancelled";
      }

      updated = enrichIncomeRecord(merged);
      if (data.status === "cancelled") {
        updated.status = "cancelled";
        updated.isOverdue = false;
      }
    }

    // Preserve ObjectId
    updated._id = existing._id;
    updated.createdAt = existing.createdAt || new Date();

    const amountDelta = (Number(updated.amount) || 0) - previousAmount;

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`income.${incomeIndex}`]: updated,
          updatedAt: new Date(),
          "financialStatus.lastUpdated": new Date(),
        },
        ...(amountDelta !== 0
          ? {
              $inc: {
                "financialStatus.totalIncome": amountDelta,
                "financialStatus.profitLoss": amountDelta,
              },
            }
          : {}),
      }
    );

    await createAuditLog({
      action: data.action === "collect" ? "COLLECT_INCOME" : "UPDATE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: project.name,
        incomeId,
        incomeTitle: updated.title,
        previousAmount,
        newAmount: updated.amount,
        status: updated.status,
        action: data.action || "update",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        data.action === "collect"
          ? updated.status === "collected"
            ? "Payment fully collected"
            : "Partial collection recorded"
          : "Income entry updated successfully",
      income: updated,
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
    const { id, incomeId } = await params;

    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
        { status: 400 }
      );
    }

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

    const receivedAmt = Number(income.amount) || 0;

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { income: { _id: new ObjectId(incomeId) } },
        $inc: {
          "financialStatus.totalIncome": -receivedAmt,
          "financialStatus.profitLoss": -receivedAmt,
        },
        $set: {
          updatedAt: new Date(),
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    await createAuditLog({
      action: "DELETE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
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
    });
  } catch (error) {
    console.error("Error deleting income entry:", error);
    return NextResponse.json(
      { error: "Failed to delete income entry" },
      { status: 500 }
    );
  }
}
