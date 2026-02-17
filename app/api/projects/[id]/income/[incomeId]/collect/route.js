import { NextResponse } from "next/server";
import { getDb } from "../../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../../../utils/audit.js";
import {
  normalizeIncomeRecord,
  prepareIncomeForStorage,
} from "../../../../../../utils/incomeDataMigration.js";

// Collect payment for expected income
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, incomeId } = await params;
    const data = await request.json();

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(incomeId)) {
      return NextResponse.json(
        { error: "Invalid project or income ID" },
        { status: 400 }
      );
    }

    const {
      collectedAmount,
      transactionNumber,
      invoiceNumber,
      paymentMethod,
      collectedDate,
      notes,
      receiptFile,
    } = data;

    // Validation
    if (!collectedAmount || collectedAmount <= 0) {
      return NextResponse.json(
        { error: "Collected amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!transactionNumber || transactionNumber.trim() === '') {
      return NextResponse.json(
        { error: "Transaction number is required" },
        { status: 400 }
      );
    }

    if (!collectedDate) {
      return NextResponse.json(
        { error: "Collection date is required" },
        { status: 400 }
      );
    }

    // Validate collection date is not in the future
    const collectionDate = new Date(collectedDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (collectionDate > today) {
      return NextResponse.json(
        { error: "Collection date cannot be in the future" },
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

    // Normalize existing income for backward compatibility
    const existingIncome = normalizeIncomeRecord(project.income[incomeIndex]);

    // Check if already collected
    if (existingIncome.status === 'collected') {
      return NextResponse.json(
        { error: "Payment has already been collected" },
        { status: 400 }
      );
    }

    // Prepare collection data with new field names
    const collectionData = {
      collectedAmount: parseFloat(collectedAmount),
      collectedDate: new Date(collectedDate),
      transactionNumber,
      status: 'collected',
      invoiceNumber: invoiceNumber || existingIncome.invoiceNumber,
      paymentMethod: paymentMethod || existingIncome.paymentMethod,
      notes: notes || existingIncome.notes,
      updatedAt: new Date(),
    };

    // Handle receipt file if provided
    if (receiptFile) {
      collectionData.receiptUrl = receiptFile;
    }

    // Prepare for storage with backward compatibility (adds old field names)
    const storageData = prepareIncomeForStorage(collectionData);

    // Prepare update data for MongoDB
    const updateData = {};
    Object.keys(storageData).forEach(key => {
      updateData[`income.${incomeIndex}.${key}`] = storageData[key];
    });
    updateData.updatedAt = new Date();

    // Calculate financial impact
    const collectedAmountValue = parseFloat(collectedAmount);
    const previousCollectedAmount = existingIncome.collectedAmount || 0;
    const financialDelta = collectedAmountValue - previousCollectedAmount;

    // Update the income entry and project financial status
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updateData,
        $inc: {
          "financialStatus.totalIncome": financialDelta,
          "financialStatus.profitLoss": financialDelta,
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "COLLECT_PAYMENT",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        incomeId,
        incomeTitle: existingIncome.title,
        expectedAmount: existingIncome.expectedAmount,
        collectedAmount: collectedAmountValue,
        transactionNumber,
        collectedDate,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment collected successfully",
      income: {
        ...existingIncome,
        collectedAmount: collectedAmountValue,
        collectedDate: new Date(collectedDate),
        transactionNumber,
        invoiceNumber: invoiceNumber || existingIncome.invoiceNumber,
        paymentMethod: paymentMethod || existingIncome.paymentMethod,
        notes: notes || existingIncome.notes,
        status: 'collected',
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error collecting payment:", error);
    return NextResponse.json(
      { error: "Failed to collect payment: " + error.message },
      { status: 500 }
    );
  }
}
