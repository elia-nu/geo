import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../../utils/audit.js";
import {
  prepareIncomeForStorage,
} from "../../../../../utils/incomeDataMigration.js";

// Create expected income (without collection details)
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
      title,
      expectedAmount,
      dueDate,
      invoiceNumber,
      notes,
    } = data;

    // Validation
    if (!title || !expectedAmount || !dueDate || !invoiceNumber) {
      return NextResponse.json(
        { error: "Title, expected amount, due date, and invoice number are required" },
        { status: 400 }
      );
    }

    // Validate expected amount is positive
    const expectedAmt = parseFloat(expectedAmount);
    if (expectedAmt <= 0) {
      return NextResponse.json(
        { error: "Expected amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate due date is not in the past
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDateObj.setHours(0, 0, 0, 0);

    if (dueDateObj < today) {
      return NextResponse.json(
        { error: "Due date cannot be in the past" },
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

    // Create expected income object with new field names
    const incomeData = {
      _id: new ObjectId(),
      title,
      expectedAmount: expectedAmt,
      dueDate: new Date(dueDate),
      invoiceNumber,
      notes: notes || "",
      status: "expected",
      // Collection fields (null until payment is collected)
      collectedAmount: null,
      collectedDate: null,
      transactionNumber: null,
      paymentMethod: null,
      receiptImage: null,
      receiptUrl: null,
      // Tracking fields
      isOverdue: false,
      daysPastDue: 0,
      daysUntilDue: Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Prepare for storage with backward compatibility (adds old field names)
    const income = prepareIncomeForStorage(incomeData);

    // Add income to project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { income: income },
        $set: {
          updatedAt: new Date(),
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "CREATE_EXPECTED_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        incomeTitle: title,
        expectedAmount: expectedAmt,
        dueDate: dueDate,
        invoiceNumber,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expected income created successfully",
      income,
    });
  } catch (error) {
    console.error("Error creating expected income:", error);
    return NextResponse.json(
      { error: "Failed to create expected income" },
      { status: 500 }
    );
  }
}
