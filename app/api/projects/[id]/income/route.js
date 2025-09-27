import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

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

    // Build filter for income
    let incomeFilter = {};
    if (status) incomeFilter.status = status;
    if (paymentMethod) incomeFilter.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      incomeFilter.receivedDate = {};
      if (startDate) incomeFilter.receivedDate.$gte = new Date(startDate);
      if (endDate) incomeFilter.receivedDate.$lte = new Date(endDate);
    }

    // Filter income from the project
    let income = project.income || [];

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

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedIncome = income.slice(skip, skip + limit);
    const totalCount = income.length;
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate income summary
    const totalIncome = income.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const collectedAmount = income
      .filter((inc) => inc.status === "collected")
      .reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const pendingAmount = income
      .filter((inc) => inc.status === "pending")
      .reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const overdueAmount = income
      .filter((inc) => inc.status === "overdue")
      .reduce((sum, inc) => sum + (inc.amount || 0), 0);

    const incomeByStatus = income.reduce((acc, inc) => {
      const status = inc.status || "pending";
      acc[status] = (acc[status] || 0) + (inc.amount || 0);
      return acc;
    }, {});

    const incomeByMethod = income.reduce((acc, inc) => {
      const method = inc.paymentMethod || "unknown";
      acc[method] = (acc[method] || 0) + (inc.amount || 0);
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
      clientName,
      clientEmail,
      invoiceNumber,
      status = "pending",
      paymentReference,
      notes,
    } = data;

    // Validation
    if (!title || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Title and amount (greater than 0) are required" },
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
      : parseFloat(amount);
    const receivedAmt = parseFloat(amount);
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

    const income = {
      _id: new ObjectId(),
      title,
      description: description || "",
      amount: receivedAmt,
      expectedAmount: expectedAmt,
      uncollectedAmount: Math.max(0, expectedAmt - receivedAmt),
      collectionRate,
      isFullyCollected,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentMethod: paymentMethod || "bank_transfer",
      clientName: clientName || "",
      clientEmail: clientEmail || "",
      invoiceNumber: invoiceNumber || "",
      status: paymentStatus,
      paymentReference: paymentReference || "",
      notes: notes || "",
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
        clientName,
        status,
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
