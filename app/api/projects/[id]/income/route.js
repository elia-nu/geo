import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";
import {
  buildIncomeRecord,
  refreshIncomeList,
  summarizeIncome,
} from "../../../../utils/incomeLifecycle.js";

// Get project income/payments (refreshes overdue/partial status on read)
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { income: refreshed, changed } = refreshIncomeList(
      project.income || []
    );

    // Persist status flips (e.g. pending → overdue) so lists stay accurate
    if (changed) {
      await db.collection("projects").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            income: refreshed,
            updatedAt: new Date(),
            "financialStatus.lastUpdated": new Date(),
          },
        }
      );
    }

    let income = refreshed;

    if (status) income = income.filter((inc) => inc.status === status);
    if (paymentMethod) {
      income = income.filter((inc) => inc.paymentMethod === paymentMethod);
    }
    if (startDate || endDate) {
      income = income.filter((inc) => {
        const date = new Date(inc.receivedDate || inc.dueDate || 0);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
      });
    }

    // Sort: overdue first, then by due/received date
    income.sort((a, b) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      const aDate = new Date(a.dueDate || a.receivedDate || 0);
      const bDate = new Date(b.dueDate || b.receivedDate || 0);
      return bDate - aDate;
    });

    const skip = (page - 1) * limit;
    const paginatedIncome = income.slice(skip, skip + limit);
    const totalCount = income.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    const summary = summarizeIncome(refreshed);

    return NextResponse.json({
      success: true,
      income: paginatedIncome,
      summary: {
        totalIncome: summary.totalCollected,
        totalExpected: summary.totalExpected,
        totalCollected: summary.totalCollected,
        totalUncollected: summary.totalUncollected,
        collectionRate: summary.collectionRate,
        collectedAmount: summary.collectedAmount,
        pendingAmount: summary.pendingExpected,
        partialAmount: summary.partialExpected,
        overdueAmount: summary.overdueUncollected,
        pendingCount: summary.pendingCount,
        partialCount: summary.partialCount,
        collectedCount: summary.collectedCount,
        overdueCount: summary.overdueCount,
        totalCount: refreshed.length,
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

// Create expected income (or income with initial collection)
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

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
      categoryId,
      invoiceNumber,
      status,
      paymentReference,
      notes,
    } = data;

    const hasExpected =
      expectedAmount !== undefined &&
      expectedAmount !== null &&
      String(expectedAmount).trim() !== "";
    const hasAmount =
      amount !== undefined &&
      amount !== null &&
      String(amount).trim() !== "";

    if (!title || (!hasAmount && !hasExpected)) {
      return NextResponse.json(
        { error: "Title and either amount or expectedAmount is required" },
        { status: 400 }
      );
    }

    // Expected-only records require a due date
    if (hasExpected && !hasAmount && !dueDate) {
      return NextResponse.json(
        { error: "Due date is required for expected income" },
        { status: 400 }
      );
    }

    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let categoryName = "";
    let normalizedCategoryId = "";
    if (categoryId && ObjectId.isValid(categoryId)) {
      const category = await db.collection("incomeCategories").findOne({
        _id: new ObjectId(categoryId),
      });
      if (category) {
        normalizedCategoryId = category._id.toString();
        categoryName = category.name || "";
      }
    }

    const income = buildIncomeRecord({
      _id: new ObjectId(),
      title,
      description,
      amount: hasAmount ? amount : 0,
      expectedAmount: hasExpected
        ? expectedAmount
        : hasAmount
        ? amount
        : 0,
      receivedDate,
      dueDate,
      paymentMethod,
      clientName,
      categoryId: normalizedCategoryId,
      categoryName,
      invoiceNumber,
      status: status === "cancelled" ? "cancelled" : undefined,
      paymentReference,
      notes,
    });

    const receivedAmt = income.amount || 0;

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { income },
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

    await createAuditLog({
      action: "ADD_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: existingProject.name,
        incomeTitle: title,
        expectedAmount: income.expectedAmount,
        amount: income.amount,
        status: income.status,
        clientName,
        dueDate: income.dueDate,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        income.amount > 0
          ? "Income recorded successfully"
          : "Expected income created successfully",
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

// Bulk replace income array
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

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

    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const processedIncome = income.map((inc) =>
      buildIncomeRecord({
        ...inc,
        _id:
          typeof inc._id === "string"
            ? new ObjectId(inc._id)
            : inc._id || new ObjectId(),
      })
    );

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          income: processedIncome,
          updatedAt: new Date(),
        },
      }
    );

    await createAuditLog({
      action: "UPDATE_INCOME",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: existingProject.name,
        incomeCount: income.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Income updated successfully",
      income: processedIncome,
    });
  } catch (error) {
    console.error("Error updating income:", error);
    return NextResponse.json(
      { error: "Failed to update income" },
      { status: 500 }
    );
  }
}
