import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";
import {
  applyCollection,
  enrichIncomeRecord,
  refreshIncomeList,
  summarizeIncome,
} from "../../../../utils/incomeLifecycle.js";

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

    // Refresh overdue / partial / collected from amounts + due dates
    const { income: refreshed, changed } = refreshIncomeList(
      project.income || []
    );
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

    let payments = refreshed;

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

    const lifecycleSummary = summarizeIncome(payments);
    const totalExpected = lifecycleSummary.totalExpected;
    const totalCollected = lifecycleSummary.totalCollected;
    const totalUncollected = lifecycleSummary.totalUncollected;

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
        totalPending: lifecycleSummary.pendingExpected,
        totalPartial: lifecycleSummary.partialExpected - lifecycleSummary.partialReceived,
        totalOverdue: lifecycleSummary.overdueUncollected,
        pendingCount: lifecycleSummary.pendingCount,
        partialCount: lifecycleSummary.partialCount,
        collectedCount: lifecycleSummary.collectedCount,
        overdueCount: lifecycleSummary.overdueCount,
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
    const previousAmount = Number(payment.amount) || 0;

    let updatedPayment;
    if (status === "cancelled") {
      updatedPayment = enrichIncomeRecord({
        ...payment,
        status: "cancelled",
        receivedDate: receivedDate || payment.receivedDate,
        paymentMethod: paymentMethod || payment.paymentMethod,
        paymentReference: paymentReference || payment.paymentReference,
        notes: notes || payment.notes,
      });
      updatedPayment.status = "cancelled";
      updatedPayment.isOverdue = false;
    } else if (amount !== undefined) {
      updatedPayment = applyCollection(payment, {
        collectAmount: amount,
        receivedDate,
        paymentMethod,
        paymentReference,
        notes,
        setTotalAmount: true,
      });
    } else {
      updatedPayment = enrichIncomeRecord({
        ...payment,
        status,
        receivedDate: receivedDate || payment.receivedDate,
        paymentMethod: paymentMethod || payment.paymentMethod,
        paymentReference: paymentReference || payment.paymentReference,
        notes: notes || payment.notes,
      });
    }

    updatedPayment._id = payment._id;
    updatedPayment.createdAt = payment.createdAt;
    const newAmount = Number(updatedPayment.amount) || 0;
    const newStatus = updatedPayment.status;

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

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: {
          "financialStatus.totalIncome": newAmount - previousAmount,
        },
        $set: {
          "financialStatus.lastUpdated": new Date(),
        },
      }
    );

    await createAuditLog({
      action: "UPDATE_PAYMENT_STATUS",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: project.name,
        paymentId,
        oldStatus: payment.status,
        newStatus,
        oldAmount: previousAmount,
        newAmount,
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
      { error: error.message || "Failed to update payment status" },
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
    let updatedPayment;
    try {
      updatedPayment = applyCollection(payment, {
        collectAmount: partialAmount,
        receivedDate,
        paymentMethod,
        paymentReference,
        notes,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    updatedPayment._id = payment._id;
    updatedPayment.createdAt = payment.createdAt;
    const added = parseFloat(partialAmount);

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`income.${paymentIndex}`]: updatedPayment,
          updatedAt: new Date(),
          "financialStatus.lastUpdated": new Date(),
        },
        $inc: {
          "financialStatus.totalIncome": added,
        },
      }
    );

    await createAuditLog({
      action: "ADD_PARTIAL_PAYMENT",
      entityType: "project",
      entityId: id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: {
        projectName: project.name,
        paymentId,
        partialAmount: added,
        newTotalAmount: updatedPayment.amount,
        status: updatedPayment.status,
        clientName: payment.clientName,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        updatedPayment.status === "collected"
          ? "Payment fully collected"
          : "Partial payment recorded",
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
