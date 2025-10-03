import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get payment tracking information for a project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientName = searchParams.get("clientName");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeOverdue = searchParams.get("includeOverdue") === "true";

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Get project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Filter income/payments
    let payments = project.income || [];

    // Apply filters
    if (status) {
      payments = payments.filter((p) => p.status === status);
    }
    if (clientName) {
      payments = payments.filter((p) =>
        p.clientName?.toLowerCase().includes(clientName.toLowerCase())
      );
    }
    if (startDate || endDate) {
      payments = payments.filter((p) => {
        const paymentDate = new Date(p.receivedDate || p.dueDate);
        if (startDate && paymentDate < new Date(startDate)) return false;
        if (endDate && paymentDate > new Date(endDate)) return false;
        return true;
      });
    }
    if (includeOverdue) {
      payments = payments.filter((p) => p.isOverdue === true);
    }

    // Sort by due date (overdue first, then by date)
    payments.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return (
        new Date(b.dueDate || b.receivedDate) -
        new Date(a.dueDate || a.receivedDate)
      );
    });

    // Calculate payment tracking summary
    const totalExpected = payments.reduce(
      (sum, p) => sum + (p.expectedAmount || p.amount || 0),
      0
    );
    const totalCollected = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const totalUncollected = payments.reduce(
      (sum, p) => sum + (p.uncollectedAmount || 0),
      0
    );

    const paymentsByStatus = payments.reduce((acc, p) => {
      const status = p.status || "pending";
      if (!acc[status]) {
        acc[status] = {
          count: 0,
          amount: 0,
          expectedAmount: 0,
          uncollectedAmount: 0,
        };
      }
      acc[status].count += 1;
      acc[status].amount += p.amount || 0;
      acc[status].expectedAmount += p.expectedAmount || p.amount || 0;
      acc[status].uncollectedAmount += p.uncollectedAmount || 0;
      return acc;
    }, {});

    const paymentsByClient = payments.reduce((acc, p) => {
      const client = p.clientName || "Unknown Client";
      if (!acc[client]) {
        acc[client] = {
          clientName: client,
          clientEmail: p.clientEmail,
          count: 0,
          totalAmount: 0,
          expectedAmount: 0,
          uncollectedAmount: 0,
          collectionRate: 0,
          status: "good",
          payments: [],
        };
      }
      acc[client].count += 1;
      acc[client].totalAmount += p.amount || 0;
      acc[client].expectedAmount += p.expectedAmount || p.amount || 0;
      acc[client].uncollectedAmount += p.uncollectedAmount || 0;
      acc[client].payments.push(p);
      return acc;
    }, {});

    // Calculate client performance
    Object.values(paymentsByClient).forEach((client) => {
      client.collectionRate =
        client.expectedAmount > 0
          ? (client.totalAmount / client.expectedAmount) * 100
          : 100;
      const overduePayments = client.payments.filter((p) => p.isOverdue).length;
      const overdueAmount = client.payments
        .filter((p) => p.isOverdue)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      if (overduePayments > 0 || client.collectionRate < 60) {
        client.status = "high_risk";
      } else if (overduePayments > 0 || client.collectionRate < 80) {
        client.status = "medium_risk";
      } else {
        client.status = "good";
      }

      client.overdueCount = overduePayments;
      client.overdueAmount = overdueAmount;
    });

    // Risk analysis
    const overduePayments = payments.filter((p) => p.isOverdue);
    const highRiskPayments = payments.filter((p) => p.riskLevel === "high");
    const mediumRiskPayments = payments.filter((p) => p.riskLevel === "medium");

    const riskAnalysis = {
      totalPayments: payments.length,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      ),
      highRiskCount: highRiskPayments.length,
      highRiskAmount: highRiskPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      ),
      mediumRiskCount: mediumRiskPayments.length,
      mediumRiskAmount: mediumRiskPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      ),
      averageDaysPastDue:
        overduePayments.length > 0
          ? overduePayments.reduce((sum, p) => sum + (p.daysPastDue || 0), 0) /
            overduePayments.length
          : 0,
    };

    // Collection forecast
    const pendingPayments = payments.filter((p) => p.status === "pending");
    const projectedCollection = pendingPayments.reduce(
      (sum, p) => sum + (p.expectedAmount || p.amount || 0),
      0
    );
    const collectionForecast = {
      projectedCollection,
      collectionRate:
        totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
      estimatedCollectionDate:
        pendingPayments.length > 0
          ? new Date(
              Math.max(
                ...pendingPayments.map((p) => new Date(p.dueDate || new Date()))
              )
            )
          : null,
    };

    return NextResponse.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
      },
      summary: {
        totalExpected,
        totalCollected,
        totalUncollected,
        collectionRate:
          totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
      },
      paymentsByStatus,
      paymentsByClient: Object.values(paymentsByClient),
      riskAnalysis,
      collectionForecast,
      payments: payments.map((p) => ({
        ...p,
        daysPastDue: p.daysPastDue || 0,
        daysUntilDue: p.daysUntilDue || null,
        isOverdue: p.isOverdue || false,
        riskLevel: p.riskLevel || "low",
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching payment tracking:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment tracking" },
      { status: 500 }
    );
  }
}

// Update payment status (mark as collected, add partial payment, etc.)
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

    const {
      paymentId,
      status,
      amount,
      receivedDate,
      paymentMethod,
      paymentReference,
      notes,
    } = data;

    // Validation
    if (!paymentId || !status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
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

    // Find the payment
    const paymentIndex = project.income?.findIndex(
      (p) => p._id.toString() === paymentId
    );
    if (paymentIndex === -1 || paymentIndex === undefined) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = project.income[paymentIndex];
    const expectedAmount = payment.expectedAmount || payment.amount || 0;
    const newAmount =
      amount !== undefined ? parseFloat(amount) : payment.amount || 0;
    const newUncollectedAmount = Math.max(0, expectedAmount - newAmount);
    const newCollectionRate =
      expectedAmount > 0 ? (newAmount / expectedAmount) * 100 : 100;
    const isFullyCollected = newAmount >= expectedAmount;

    // Determine new status
    let newStatus = status;
    if (status === "collected" && !isFullyCollected) {
      newStatus = "partial";
    } else if (status === "partial" && isFullyCollected) {
      newStatus = "collected";
    }

    // Update payment
    const updatedPayment = {
      ...payment,
      amount: newAmount,
      uncollectedAmount: newUncollectedAmount,
      collectionRate: newCollectionRate,
      isFullyCollected,
      status: newStatus,
      receivedDate: receivedDate
        ? new Date(receivedDate)
        : payment.receivedDate,
      paymentMethod: paymentMethod || payment.paymentMethod,
      paymentReference: paymentReference || payment.paymentReference,
      notes: notes || payment.notes,
      updatedAt: new Date(),
      // Update risk assessment
      isOverdue:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date(),
      daysPastDue:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date()
          ? Math.ceil(
              (new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24)
            )
          : 0,
      riskLevel:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date()
          ? Math.ceil(
              (new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24)
            ) > 30
            ? "high"
            : "medium"
          : "low",
    };

    // Update the project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`income.${paymentIndex}`]: updatedPayment,
          updatedAt: new Date(),
        },
      }
    );

    // Update financial status
    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          "financialStatus.totalIncome": newAmount - (payment.amount || 0),
        },
        $set: {
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_PAYMENT_STATUS",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        paymentId,
        oldStatus: payment.status,
        newStatus: newStatus,
        oldAmount: payment.amount,
        newAmount: newAmount,
        clientName: payment.clientName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment status updated successfully",
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}

// Add partial payment to existing payment record
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
      paymentId,
      partialAmount,
      receivedDate,
      paymentMethod,
      paymentReference,
      notes,
    } = data;

    // Validation
    if (!paymentId || !partialAmount || partialAmount <= 0) {
      return NextResponse.json(
        { error: "Payment ID and valid partial amount are required" },
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

    // Find the payment
    const paymentIndex = project.income?.findIndex(
      (p) => p._id.toString() === paymentId
    );
    if (paymentIndex === -1 || paymentIndex === undefined) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = project.income[paymentIndex];
    const currentAmount = payment.amount || 0;
    const newAmount = currentAmount + parseFloat(partialAmount);
    const expectedAmount = payment.expectedAmount || payment.amount || 0;
    const newUncollectedAmount = Math.max(0, expectedAmount - newAmount);
    const newCollectionRate =
      expectedAmount > 0 ? (newAmount / expectedAmount) * 100 : 100;
    const isFullyCollected = newAmount >= expectedAmount;

    // Determine new status
    let newStatus = isFullyCollected ? "collected" : "partial";

    // Update payment
    const updatedPayment = {
      ...payment,
      amount: newAmount,
      uncollectedAmount: newUncollectedAmount,
      collectionRate: newCollectionRate,
      isFullyCollected,
      status: newStatus,
      receivedDate: receivedDate
        ? new Date(receivedDate)
        : payment.receivedDate,
      paymentMethod: paymentMethod || payment.paymentMethod,
      paymentReference: paymentReference || payment.paymentReference,
      notes: notes || payment.notes,
      updatedAt: new Date(),
      // Update risk assessment
      isOverdue:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date(),
      daysPastDue:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date()
          ? Math.ceil(
              (new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24)
            )
          : 0,
      riskLevel:
        newStatus !== "collected" &&
        payment.dueDate &&
        new Date(payment.dueDate) < new Date()
          ? Math.ceil(
              (new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24)
            ) > 30
            ? "high"
            : "medium"
          : "low",
    };

    // Update the project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`income.${paymentIndex}`]: updatedPayment,
          updatedAt: new Date(),
        },
      }
    );

    // Update financial status
    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          "financialStatus.totalIncome": parseFloat(partialAmount),
        },
        $set: {
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "ADD_PARTIAL_PAYMENT",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        paymentId,
        partialAmount: parseFloat(partialAmount),
        newTotalAmount: newAmount,
        clientName: payment.clientName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Partial payment added successfully",
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Error adding partial payment:", error);
    return NextResponse.json(
      { error: "Failed to add partial payment" },
      { status: 500 }
    );
  }
}
