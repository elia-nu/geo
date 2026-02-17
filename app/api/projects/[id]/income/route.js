import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";
import {
  normalizeIncomeRecord,
  normalizeIncomeRecords,
  prepareIncomeForStorage,
} from "../../../../utils/incomeDataMigration.js";

// Function to check and update overdue payments
async function checkAndUpdateOverduePayments(db, projectId) {
  try {
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project || !project.income) {
      return { updated: 0, overduePayments: [] };
    }

    const currentDate = new Date();
    let hasUpdates = false;
    const overduePayments = [];

    // Check each income record for overdue status
    const updatedIncome = project.income.map((income) => {
      // Skip if already collected or no due date
      if (income.status === "collected" || !income.dueDate) {
        return income;
      }

      const dueDate = new Date(income.dueDate);
      const isOverdue = dueDate < currentDate;

      // If payment is overdue and not already marked as overdue
      if (isOverdue && income.status !== "overdue") {
        hasUpdates = true;
        const daysPastDue = Math.ceil(
          (currentDate - dueDate) / (1000 * 60 * 60 * 24)
        );

        const updatedIncome = {
          ...income,
          status: "overdue",
          isOverdue: true,
          daysPastDue: daysPastDue,
          uncollectedAmount: income.expectedAmount || income.amount || 0,
          riskLevel: daysPastDue > 30 ? "high" : "medium",
          updatedAt: currentDate,
        };

        overduePayments.push(updatedIncome);
        return updatedIncome;
      }

      // Update existing overdue payments with current days past due
      if (isOverdue && income.status === "overdue") {
        const daysPastDue = Math.ceil(
          (currentDate - dueDate) / (1000 * 60 * 60 * 24)
        );
        const updatedIncome = {
          ...income,
          daysPastDue: daysPastDue,
          riskLevel: daysPastDue > 30 ? "high" : "medium",
          updatedAt: currentDate,
        };
        overduePayments.push(updatedIncome);
        return updatedIncome;
      }

      return income;
    });

    // Update the project if there are changes
    if (hasUpdates) {
      await db.collection("projects").updateOne(
        { _id: new ObjectId(projectId) },
        {
          $set: {
            income: updatedIncome,
            updatedAt: currentDate,
          },
        }
      );

      // Create audit log for overdue updates
      await createAuditLog(db, "income_overdue_update", "system", projectId, {
        overdueCount: overduePayments.filter((p) => p.status === "overdue")
          .length,
        totalOverdueAmount: overduePayments.reduce(
          (sum, p) => sum + (p.uncollectedAmount || 0),
          0
        ),
      });
    }

    return {
      updated: hasUpdates
        ? overduePayments.filter((p) => p.status === "overdue").length
        : 0,
      overduePayments: overduePayments,
    };
  } catch (error) {
    console.error("Error checking overdue payments:", error);
    return { updated: 0, overduePayments: [] };
  }
}

// Get project income/payments
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check and update overdue payments before fetching data
    await checkAndUpdateOverduePayments(db, id);

    // Fetch updated project data
    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    // Build filter for income
    let incomeFilter = {};
    if (status) incomeFilter.status = status;
    if (paymentMethod) incomeFilter.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      incomeFilter.receivedDate = {};
      if (startDate) incomeFilter.receivedDate.$gte = new Date(startDate);
      if (endDate) incomeFilter.receivedDate.$lte = new Date(endDate);
    }

    // Filter income from the updated project
    let income = updatedProject.income || [];

    // Apply filters
    if (Object.keys(incomeFilter).length > 0) {
      income = income.filter((inc) => {
        if (incomeFilter.status && inc.status !== incomeFilter.status)
          return false;
        if (
          incomeFilter.paymentMethod &&
          inc.paymentMethod !== incomeFilter.paymentMethod
        )
          return false;
        if (incomeFilter.receivedDate) {
          const recDate = new Date(inc.receivedDate);
          if (
            incomeFilter.receivedDate.$gte &&
            recDate < incomeFilter.receivedDate.$gte
          )
            return false;
          if (
            incomeFilter.receivedDate.$lte &&
            recDate > incomeFilter.receivedDate.$lte
          )
            return false;
        }
        return true;
      });
    }

    // Sort by received date (newest first)
    income.sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate));

    // Normalize income records for backward compatibility
    const normalizedIncome = normalizeIncomeRecords(income);

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedIncome = normalizedIncome.slice(skip, skip + limit);
    const totalCount = normalizedIncome.length;
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate income summary using normalized data
    const totalIncome = normalizedIncome.reduce((sum, inc) => sum + (inc.collectedAmount || 0), 0);
    const collectedAmount = normalizedIncome
      .filter((inc) => inc.status === "collected")
      .reduce((sum, inc) => sum + (inc.collectedAmount || 0), 0);
    const pendingAmount = normalizedIncome
      .filter((inc) => inc.status === "pending" || inc.status === "expected")
      .reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);
    const overdueAmount = normalizedIncome
      .filter((inc) => inc.status === "overdue")
      .reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);

    const incomeByStatus = normalizedIncome.reduce((acc, inc) => {
      const status = inc.status || "expected";
      const amount = inc.status === "collected" ? (inc.collectedAmount || 0) : (inc.expectedAmount || 0);
      acc[status] = (acc[status] || 0) + amount;
      return acc;
    }, {});

    const incomeByMethod = normalizedIncome.reduce((acc, inc) => {
      const method = inc.paymentMethod || "unknown";
      const amount = inc.collectedAmount || 0;
      acc[method] = (acc[method] || 0) + amount;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      income: paginatedIncome,
      summary: {
        totalIncome,
        collectedAmount,
        pendingAmount,
        overdueAmount,
        totalCount,
        incomeByStatus,
        incomeByMethod,
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching project income:", error);
    return NextResponse.json(
      { error: "Failed to fetch project income" },
      { status: 500 }
    );
  }
}

// Add new income/payment to project
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
      description,
      amount,
      expectedAmount,
      receivedDate,
      dueDate,
      paymentMethod,
      invoiceNumber,
      status = "pending",
      paymentReference,
      notes,
      receiptType = "none",
      receiptImage,
      receiptUrl,
      categoryId,
    } = data;

    // Validation: allow creating records with expectedAmount first (amount optional)
    if (!title || (!amount && !expectedAmount)) {
      return NextResponse.json(
        { error: "Title and either amount or expectedAmount is required" },
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

    // Create enhanced income object with better payment tracking
    const expectedAmt = expectedAmount
      ? parseFloat(expectedAmount)
      : parseFloat(amount || 0);
    const receivedAmt = amount ? parseFloat(amount) : 0;
    const isFullyCollected = receivedAmt >= expectedAmt;
    const collectionRate =
      expectedAmt > 0 ? (receivedAmt / expectedAmt) * 100 : 100;

    // Determine payment status automatically if not provided
    let paymentStatus = status;
    if (!paymentStatus || paymentStatus === "pending") {
      if (isFullyCollected) {
        paymentStatus = "collected";
      } else if (dueDate && new Date(dueDate) < new Date()) {
        paymentStatus = "overdue";
      } else {
        paymentStatus = "pending";
      }
    }

    // Create income object with new field names
    const incomeData = {
      _id: new ObjectId(),
      title,
      description: description || "",
      collectedAmount: receivedAmt, // New field name
      expectedAmount: expectedAmt,
      uncollectedAmount: Math.max(0, expectedAmt - receivedAmt),
      collectionRate,
      isFullyCollected,
      collectedDate:
        receivedAmt > 0
          ? receivedDate
            ? new Date(receivedDate)
            : new Date()
          : null, // New field name
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentMethod: paymentMethod || "bank_transfer",
      invoiceNumber: invoiceNumber || "",
      receiptType: receiptType || "none", // Preserved for backward compatibility
      receiptImage: receiptImage || "",
      receiptUrl: receiptUrl || "",
      status: paymentStatus,
      transactionNumber: paymentReference || "", // New field name
      notes: notes || "",
      categoryId: categoryId || null,
      // Enhanced tracking
      isOverdue: dueDate
        ? new Date(dueDate) < new Date() && paymentStatus !== "collected"
        : false,
      daysPastDue:
        dueDate && new Date(dueDate) < new Date()
          ? Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))
          : 0,
      daysUntilDue:
        dueDate && new Date(dueDate) > new Date()
          ? Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24))
          : null,
      // Classification
      paymentType:
        expectedAmt === receivedAmt
          ? "full_payment"
          : receivedAmt < expectedAmt
          ? "partial_payment"
          : "overpayment",
      riskLevel:
        dueDate &&
        new Date(dueDate) < new Date() &&
        paymentStatus !== "collected"
          ? Math.ceil(
              (new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24)
            ) > 30
            ? "high"
            : "medium"
          : "low",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Prepare for storage with backward compatibility (adds old field names)
    const income = prepareIncomeForStorage(incomeData);

    // Add income to project and update financial status
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { income: income },
        $inc: {
          "financialStatus.totalIncome": receivedAmt,
          "financialStatus.profitLoss": receivedAmt,
        },
        $set: {
          updatedAt: new Date(),
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "ADD_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        incomeTitle: title,
        amount,
        status,
        receiptType,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income added successfully",
      income,
    });
  } catch (error) {
    console.error("Error adding income:", error);
    return NextResponse.json(
      { error: "Failed to add income" },
      { status: 500 }
    );
  }
}

// Update project income (bulk operations)
// Manual overdue payment check endpoint
export async function PATCH(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    if (action === "check-overdue") {
      const result = await checkAndUpdateOverduePayments(db, id);

      return NextResponse.json({
        success: true,
        message: `Updated ${result.updated} overdue payments`,
        overduePayments: result.overduePayments,
        summary: {
          totalOverdue: result.overduePayments.length,
          totalOverdueAmount: result.overduePayments.reduce(
            (sum, p) => sum + (p.uncollectedAmount || 0),
            0
          ),
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=check-overdue" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in manual overdue check:", error);
    return NextResponse.json(
      { error: "Failed to check overdue payments" },
      { status: 500 }
    );
  }
}

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

    const { income } = data;

    if (!Array.isArray(income)) {
      return NextResponse.json(
        { error: "Income must be an array" },
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

    // Process income with IDs
    const processedIncome = income.map((inc) => {
      if (inc._id) {
        return {
          ...inc,
          _id: typeof inc._id === "string" ? new ObjectId(inc._id) : inc._id,
          updatedAt: new Date(),
        };
      } else {
        return {
          ...inc,
          _id: new ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    });

    // Update project with new income array
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          income: processedIncome,
          updatedAt: new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        incomeCount: income.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating income:", error);
    return NextResponse.json(
      { error: "Failed to update income" },
      { status: 500 }
    );
  }
}
