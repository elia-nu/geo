import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";
import {
  enrichIncomeRecord,
  refreshIncomeList,
} from "../../../../utils/incomeLifecycle";

// GET /api/reports/projects/cost-budget-performance
// Project Payment & Expected Income Report: Expected Income, Received Payments, Outstanding Receivables
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    let user = null;
    try {
      user = await getCurrentUser(request);
      if (user) {
        const hasPermission = await checkPermission(user.userId, "reports.project", user.role);
        if (!hasPermission && user.role !== "admin" && user.role !== "superadmin") {
          return NextResponse.json(
            { error: "Access denied. You don't have permission to view project reports." },
            { status: 403 }
          );
        }
      }
    } catch (_) {
      // Allow report generation if auth context is optional in dev/local session
    }

    const projectIdFilter = searchParams.get("projectId") || null;
    const paymentStatusFilter = searchParams.get("paymentStatus") || "all";
    const searchFilter = (searchParams.get("search") || "").trim().toLowerCase();

    const query = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      query._id = new ObjectId(projectIdFilter);
    }

    const rawProjects = await db
      .collection("projects")
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    const rows = [];
    const now = new Date();

    for (const p of rawProjects) {
      const projectName = p.name || "Unnamed Project";
      
      // Determine client name
      const incomeClients = Array.from(
        new Set((p.income || []).map((i) => i.clientName).filter(Boolean))
      );
      const clientName =
        p.clientName ||
        p.client ||
        (incomeClients.length > 0 ? incomeClients.join(", ") : "Not Specified");

      const startDate = p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : null;
      const endDate = p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : null;
      const currency = p.currency || p.budget?.currency || "ETB";

      // Process income lifecycle
      const rawIncome = Array.isArray(p.income) ? p.income : [];
      const { income: refreshedIncome } = refreshIncomeList(rawIncome);

      let totalExpectedIncome = 0;
      let totalReceivedIncome = 0;
      let totalOutstandingIncome = 0;
      let totalOverdueIncome = 0;

      const incomeBreakdown = refreshedIncome.map((inc) => {
        const enriched = enrichIncomeRecord(inc);
        const expected = Number(enriched.expectedAmount ?? enriched.amount ?? 0);
        const received = Number(enriched.totalPaid ?? (enriched.status === "collected" ? expected : enriched.amount) ?? 0);
        const outstanding = Math.max(0, expected - received);
        const isOverdue =
          enriched.isOverdue ||
          enriched.status === "overdue" ||
          (enriched.dueDate && new Date(enriched.dueDate) < now && outstanding > 0);

        totalExpectedIncome += expected;
        totalReceivedIncome += received;
        totalOutstandingIncome += outstanding;
        if (isOverdue) {
          totalOverdueIncome += outstanding;
        }

        return {
          id: inc._id ? inc._id.toString() : Math.random().toString(),
          title: inc.title || "Payment Milestone",
          clientName: inc.clientName || clientName,
          invoiceNumber: inc.invoiceNumber || "—",
          expectedAmount: Math.round(expected * 100) / 100,
          receivedAmount: Math.round(received * 100) / 100,
          outstandingAmount: Math.round(outstanding * 100) / 100,
          dueDate: inc.dueDate ? new Date(inc.dueDate).toISOString().split("T")[0] : null,
          receivedDate: inc.receivedDate ? new Date(inc.receivedDate).toISOString().split("T")[0] : null,
          status: enriched.status || "pending",
          isOverdue: Boolean(isOverdue),
          paymentMethod: inc.paymentMethod || "bank_transfer",
        };
      });

      // If no explicit income entries exist, check if budget / contract amount is defined
      if (rawIncome.length === 0 && (p.budget?.totalAmount || p.budget?.amount || p.contractAmount)) {
        const fallbackContract = Number(p.budget?.totalAmount || p.budget?.amount || p.contractAmount || 0);
        totalExpectedIncome = fallbackContract;
        totalOutstandingIncome = fallbackContract;
      }

      totalExpectedIncome = Math.round(totalExpectedIncome * 100) / 100;
      totalReceivedIncome = Math.round(totalReceivedIncome * 100) / 100;
      totalOutstandingIncome = Math.round(totalOutstandingIncome * 100) / 100;
      totalOverdueIncome = Math.round(totalOverdueIncome * 100) / 100;

      const collectionRate =
        totalExpectedIncome > 0
          ? Math.round((totalReceivedIncome / totalExpectedIncome) * 10000) / 100
          : 0;

      // Status classification
      let paymentStatus = "pending";
      let paymentStatusLabel = "Pending Payment";
      if (totalExpectedIncome === 0) {
        paymentStatus = "no_billing";
        paymentStatusLabel = "No Billing Set";
      } else if (totalOutstandingIncome <= 0 && totalReceivedIncome > 0) {
        paymentStatus = "fully_paid";
        paymentStatusLabel = "Fully Paid";
      } else if (totalOverdueIncome > 0) {
        paymentStatus = "overdue";
        paymentStatusLabel = "Overdue Balance";
      } else if (totalReceivedIncome > 0) {
        paymentStatus = "partial";
        paymentStatusLabel = "Partially Paid";
      }

      // Search filter check
      if (searchFilter) {
        const matchProject = projectName.toLowerCase().includes(searchFilter);
        const matchClient = clientName.toLowerCase().includes(searchFilter);
        if (!matchProject && !matchClient) continue;
      }

      // Payment status filter check
      if (paymentStatusFilter !== "all" && paymentStatus !== paymentStatusFilter) {
        continue;
      }

      rows.push({
        projectId: p._id.toString(),
        projectName,
        clientName,
        currency,
        startDate,
        endDate,
        status: p.status || "active",
        totalExpectedIncome,
        totalReceivedIncome,
        totalOutstandingIncome,
        totalOverdueIncome,
        collectionRate,
        paymentStatus,
        paymentStatusLabel,
        incomesCount: incomeBreakdown.length,
        incomeBreakdown,
      });
    }

    const summary = {
      totalProjects: rows.length,
      totalExpectedIncome: Math.round(rows.reduce((s, r) => s + r.totalExpectedIncome, 0) * 100) / 100,
      totalReceivedIncome: Math.round(rows.reduce((s, r) => s + r.totalReceivedIncome, 0) * 100) / 100,
      totalOutstandingIncome: Math.round(rows.reduce((s, r) => s + r.totalOutstandingIncome, 0) * 100) / 100,
      totalOverdueIncome: Math.round(rows.reduce((s, r) => s + r.totalOverdueIncome, 0) * 100) / 100,
      overallCollectionRate: 0,
      fullyPaidCount: rows.filter((r) => r.paymentStatus === "fully_paid").length,
      partialCount: rows.filter((r) => r.paymentStatus === "partial").length,
      pendingCount: rows.filter((r) => r.paymentStatus === "pending").length,
      overdueCount: rows.filter((r) => r.paymentStatus === "overdue").length,
    };

    summary.overallCollectionRate =
      summary.totalExpectedIncome > 0
        ? Math.round((summary.totalReceivedIncome / summary.totalExpectedIncome) * 10000) / 100
        : 0;

    if (user) {
      await createAuditLog({
        action: "VIEW",
        entityType: "report",
        entityId: "project_payment_income_performance",
        userId: user.userId,
        userEmail: user.email,
        metadata: { reportType: "project_payment_income_performance", count: rows.length },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      reportType: "project_payment_income_performance",
      generatedAt: new Date().toISOString(),
      filters: { projectId: projectIdFilter, paymentStatus: paymentStatusFilter, search: searchFilter },
      summary,
      rows,
    });
  } catch (error) {
    console.error("Error generating project payment & income performance report:", error);
    return NextResponse.json(
      { error: "Failed to generate project payment & income performance report", message: error.message },
      { status: 500 }
    );
  }
}
