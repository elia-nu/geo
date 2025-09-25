import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get project expenses
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
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

    // Build filter for expenses
    let expenseFilter = {};
    if (category) expenseFilter.category = category;
    if (status) expenseFilter.status = status;
    if (startDate || endDate) {
      expenseFilter.expenseDate = {};
      if (startDate) expenseFilter.expenseDate.$gte = new Date(startDate);
      if (endDate) expenseFilter.expenseDate.$lte = new Date(endDate);
    }

    // Filter expenses from the project
    let expenses = project.expenses || [];

    // Apply filters
    if (Object.keys(expenseFilter).length > 0) {
      expenses = expenses.filter((expense) => {
        if (
          expenseFilter.category &&
          expense.category !== expenseFilter.category
        )
          return false;
        if (expenseFilter.status && expense.status !== expenseFilter.status)
          return false;
        if (expenseFilter.expenseDate) {
          const expDate = new Date(expense.expenseDate);
          if (
            expenseFilter.expenseDate.$gte &&
            expDate < expenseFilter.expenseDate.$gte
          )
            return false;
          if (
            expenseFilter.expenseDate.$lte &&
            expDate > expenseFilter.expenseDate.$lte
          )
            return false;
        }
        return true;
      });
    }

    // Sort by expense date (newest first)
    expenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedExpenses = expenses.slice(skip, skip + limit);
    const totalCount = expenses.length;
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate expense summary
    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const expensesByCategory = expenses.reduce((acc, exp) => {
      const category = exp.category || "uncategorized";
      acc[category] = (acc[category] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    const expensesByStatus = expenses.reduce((acc, exp) => {
      const status = exp.status || "pending";
      acc[status] = (acc[status] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      expenses: paginatedExpenses,
      summary: {
        totalExpenses,
        totalCount,
        expensesByCategory,
        expensesByStatus,
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
    console.error("Error fetching project expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch project expenses" },
      { status: 500 }
    );
  }
}

// Add new expense to project
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
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
      category,
      expenseDate,
      allocationId,
      vendor,
      receiptUrl,
      approvedBy,
      status = "pending",
      tags = [],
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

    // Validate allocation if provided
    if (allocationId) {
      const allocation = existingProject.budgetAllocations?.find(
        (alloc) => alloc._id.toString() === allocationId
      );
      if (!allocation) {
        return NextResponse.json(
          { error: "Invalid allocation ID" },
          { status: 400 }
        );
      }
    }

    // Create expense object
    const expense = {
      _id: new ObjectId(),
      title,
      description: description || "",
      amount: parseFloat(amount),
      category: category || "general",
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      allocationId: allocationId || null,
      vendor: vendor || "",
      receiptUrl: receiptUrl || "",
      approvedBy: approvedBy || null,
      status,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add expense to project and update allocation if applicable
    const updateOperations = {
      $push: { expenses: expense },
      $set: { updatedAt: new Date() },
    };

    // If expense is allocated to a specific budget allocation, update the allocation tracking
    if (allocationId) {
      // Update the allocation's spent amount and utilization
      updateOperations.$inc = {
        [`budgetAllocations.$[allocation].spentAmount`]: parseFloat(amount),
      };
      updateOperations.$set[`budgetAllocations.$[allocation].utilization`] = {
        $cond: {
          if: { $gt: [`$budgetAllocations.$[allocation].amount`, 0] },
          then: {
            $multiply: [
              {
                $divide: [
                  `$budgetAllocations.$[allocation].spentAmount`,
                  `$budgetAllocations.$[allocation].amount`,
                ],
              },
              100,
            ],
          },
          else: 0,
        },
      };
      updateOperations.$set[`budgetAllocations.$[allocation].remainingAmount`] =
        {
          $subtract: [
            `$budgetAllocations.$[allocation].amount`,
            `$budgetAllocations.$[allocation].spentAmount`,
          ],
        };
      updateOperations.$set[`budgetAllocations.$[allocation].updatedAt`] =
        new Date();
    }

    // Update financial status
    updateOperations.$inc = {
      ...updateOperations.$inc,
      "financialStatus.totalExpenses": parseFloat(amount),
    };
    updateOperations.$set["financialStatus.lastUpdated"] = new Date();

    const arrayFilters = allocationId
      ? [{ "allocation._id": new ObjectId(allocationId) }]
      : [];

    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, updateOperations, { arrayFilters });

    // Update allocation status based on utilization
    if (allocationId) {
      await db.collection("projects").updateOne(
        {
          _id: new ObjectId(id),
          "budgetAllocations._id": new ObjectId(allocationId),
        },
        [
          {
            $set: {
              "budgetAllocations.$.status": {
                $cond: {
                  if: { $gt: ["$budgetAllocations.$.utilization", 100] },
                  then: "overrun",
                  else: {
                    $cond: {
                      if: { $gt: ["$budgetAllocations.$.utilization", 90] },
                      then: "warning",
                      else: "normal",
                    },
                  },
                },
              },
            },
          },
        ]
      );
    }

    // Create audit log
    await createAuditLog({
      action: "ADD_EXPENSE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        expenseTitle: title,
        amount,
        category,
        allocationId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    console.error("Error adding expense:", error);
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 500 }
    );
  }
}

// Update project expenses (bulk operations)
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const { expenses } = data;

    if (!Array.isArray(expenses)) {
      return NextResponse.json(
        { error: "Expenses must be an array" },
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

    // Process expenses with IDs
    const processedExpenses = expenses.map((expense) => {
      if (expense._id) {
        return {
          ...expense,
          _id:
            typeof expense._id === "string"
              ? new ObjectId(expense._id)
              : expense._id,
          updatedAt: new Date(),
        };
      } else {
        return {
          ...expense,
          _id: new ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    });

    // Update project with new expenses array
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          expenses: processedExpenses,
          updatedAt: new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_EXPENSES",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        expensesCount: expenses.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Expenses updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating expenses:", error);
    return NextResponse.json(
      { error: "Failed to update expenses" },
      { status: 500 }
    );
  }
}
