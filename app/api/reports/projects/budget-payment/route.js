import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";
import {
  enrichIncomeRecord,
  refreshIncomeList,
  summarizeIncome,
  refreshInstallmentStatuses,
  summarizeInstallments,
} from "../../../../utils/incomeLifecycle";

// GET /api/reports/projects/budget-payment
// Comprehensive Project Budget & Payment Detailed Report
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    let user = null;
    try {
      user = await getCurrentUser(request);
      if (user) {
        const hasPermission = await checkPermission(user.userId, "reports.read", user.role);
        if (!hasPermission && user.role !== "admin" && user.role !== "superadmin") {
          return NextResponse.json(
            { error: "Access denied. You don't have permission to view project reports." },
            { status: 403 }
          );
        }
      }
    } catch (_) {
      // Allow report generation if auth token context is optional in dev / local session
    }

    const projectIdFilter = searchParams.get("projectId") || null;
    const clientNameFilter = searchParams.get("clientName") || null;
    const paymentStatusFilter = searchParams.get("paymentStatus") || "all";
    const budgetStatusFilter = searchParams.get("budgetStatus") || "all";
    const startDateFilter = searchParams.get("startDate") || null;
    const endDateFilter = searchParams.get("endDate") || null;
    const searchFilter = searchParams.get("search") || null;

    const query = {};
    if (projectIdFilter && ObjectId.isValid(projectIdFilter)) {
      query._id = new ObjectId(projectIdFilter);
    }

    const rawProjects = await db.collection("projects").find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();

    const now = new Date();
    const projectRows = [];
    const allInstallmentsLedger = [];

    for (const p of rawProjects) {
      const projectName = p.name || "Unnamed Project";
      const clientName = p.clientName || p.client || "Internal / Not Specified";
      const projectCategory = p.category || p.department || "General";
      const projectStatus = p.status || "active";
      const projectCurrency = p.currency || p.budget?.currency || "ETB";
      const startDate = p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : null;
      const endDate = p.endDate ? new Date(p.endDate).toISOString().split("T")[0] : null;

      // 1. Budget details
      const totalBudget = Number(p.budget?.totalAmount ?? p.budget?.amount ?? 0);
      const budgetBreakdown = Array.isArray(p.budget?.breakdown)
        ? p.budget.breakdown.map((b) => ({
            category: b.category || b.name || "Allocation",
            amount: Number(b.amount || 0),
            notes: b.notes || "",
          }))
        : [];
      const budgetNotes = p.budget?.notes || "";

      // 2. Expenses details
      const rawExpenses = Array.isArray(p.expenses) ? p.expenses : [];
      const totalExpenses = rawExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const expensesCount = rawExpenses.length;

      // 3. Income & Payments details (with lifecycle refresh)
      const rawIncome = Array.isArray(p.income) ? p.income : [];
      const { income: refreshedIncome } = refreshIncomeList(rawIncome);

      let totalExpectedIncome = 0;
      let totalCollectedIncome = 0;
      let totalUncollectedIncome = 0;
      let totalOverdueIncome = 0;
      let overdueInstallmentCount = 0;

      const enrichedIncomeList = refreshedIncome.map((inc, incIdx) => {
        const enriched = enrichIncomeRecord(inc);
        const incExpected = Number(enriched.expectedAmount || 0);
        const incCollected = Number(enriched.totalPaid || enriched.amount || 0);
        const incUncollected = Math.max(0, incExpected - incCollected);
        const isOverdue = enriched.isOverdue || enriched.status === "overdue";

        totalExpectedIncome += incExpected;
        totalCollectedIncome += incCollected;
        totalUncollectedIncome += incUncollected;
        if (isOverdue) {
          totalOverdueIncome += incUncollected;
        }

        // Process installments schedule
        let installmentsSchedule = [];
        if (Array.isArray(enriched.installments) && enriched.installments.length > 0) {
          const { installments: refreshedInst } = refreshInstallmentStatuses(enriched.installments);
          installmentsSchedule = refreshedInst.map((inst, instIdx) => {
            const instAmount = Number(inst.amount) || 0;
            const isPaid = inst.status === "paid";
            const isInstOverdue = inst.status === "overdue";
            if (isInstOverdue) overdueInstallmentCount++;

            const ledgerEntry = {
              projectId: p._id.toString(),
              projectName,
              clientName,
              incomeId: enriched._id || `inc-${incIdx}`,
              incomeTitle: enriched.title || `Payment Plan #${incIdx + 1}`,
              installmentNumber: inst.installmentNumber || instIdx + 1,
              dueDate: inst.dueDate || null,
              amount: instAmount,
              collectedAmount: isPaid ? instAmount : (Number(inst.paidAmount) || 0),
              remainingAmount: isPaid ? 0 : instAmount - (Number(inst.paidAmount) || 0),
              status: inst.status || "upcoming",
              paidDate: inst.paidDate || null,
              paymentMethod: enriched.paymentMethod || "installment",
              currency: projectCurrency,
            };

            allInstallmentsLedger.push(ledgerEntry);

            return ledgerEntry;
          });
        } else {
          // If no installment array, create single schedule entry
          const singleLedgerEntry = {
            projectId: p._id.toString(),
            projectName,
            clientName,
            incomeId: enriched._id || `inc-${incIdx}`,
            incomeTitle: enriched.title || "Direct Payment",
            installmentNumber: 1,
            dueDate: enriched.dueDate || null,
            amount: incExpected,
            collectedAmount: incCollected,
            remainingAmount: incUncollected,
            status: enriched.status || "pending",
            paidDate: enriched.receivedDate || null,
            paymentMethod: enriched.paymentMethod || "lump_sum",
            currency: projectCurrency,
          };
          if (enriched.isOverdue) overdueInstallmentCount++;
          allInstallmentsLedger.push(singleLedgerEntry);
        }

        return {
          _id: enriched._id || `inc-${incIdx}`,
          title: enriched.title || `Payment Source #${incIdx + 1}`,
          clientName: enriched.clientName || clientName,
          expectedAmount: incExpected,
          collectedAmount: incCollected,
          uncollectedAmount: incUncollected,
          status: enriched.status || "pending",
          isOverdue,
          daysPastDue: enriched.daysPastDue || 0,
          daysUntilDue: enriched.daysUntilDue ?? null,
          paymentMethod: enriched.paymentMethod || "lump_sum",
          paymentFrequency: enriched.frequency || "lump_sum",
          dueDate: enriched.dueDate || null,
          receivedDate: enriched.receivedDate || null,
          nextPaymentDate: enriched.nextPaymentDate || null,
          nextPaymentAmount: enriched.nextPaymentAmount || 0,
          installmentsCount: installmentsSchedule.length,
          installments: installmentsSchedule,
          invoiceNumber: enriched.invoiceNumber || "",
          notes: enriched.notes || "",
        };
      });

      // 4. Financial Status Calculations
      const budgetUtilization = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 10000) / 100 : 0;
      const budgetRemaining = Math.round((totalBudget - totalExpenses) * 100) / 100;
      const collectionRate = totalExpectedIncome > 0 ? Math.round((totalCollectedIncome / totalExpectedIncome) * 10000) / 100 : totalCollectedIncome > 0 ? 100 : 0;
      const netCashFlow = Math.round((totalCollectedIncome - totalExpenses) * 100) / 100;
      const projectedProfit = Math.round((totalExpectedIncome - totalBudget) * 100) / 100;
      const realizedProfit = Math.round((totalCollectedIncome - totalExpenses) * 100) / 100;

      // 5. Status Badges
      let budgetHealth = "Within Budget";
      if (totalBudget === 0) {
        budgetHealth = "No Budget Defined";
      } else if (totalExpenses > totalBudget) {
        budgetHealth = "Over Budget";
      } else if (budgetUtilization >= 85) {
        budgetHealth = "Near Limit";
      }

      let paymentHealth = "Pending";
      if (totalExpectedIncome === 0 && totalCollectedIncome > 0) {
        paymentHealth = "Fully Collected";
      } else if (totalExpectedIncome > 0 && totalCollectedIncome >= totalExpectedIncome) {
        paymentHealth = "Fully Collected";
      } else if (totalOverdueIncome > 0) {
        paymentHealth = "Payment Overdue";
      } else if (totalCollectedIncome > 0) {
        paymentHealth = "Partially Collected";
      } else {
        paymentHealth = "Pending Collection";
      }

      const projectData = {
        projectId: p._id.toString(),
        projectName,
        clientName,
        category: projectCategory,
        status: projectStatus,
        currency: projectCurrency,
        startDate,
        endDate,
        // Budget
        totalBudget: Math.round(totalBudget * 100) / 100,
        budgetBreakdown,
        budgetNotes,
        budgetUtilization,
        budgetRemaining,
        budgetHealth,
        // Expenses
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        expensesCount,
        // Income / Payments
        totalExpectedIncome: Math.round(totalExpectedIncome * 100) / 100,
        totalCollectedIncome: Math.round(totalCollectedIncome * 100) / 100,
        totalUncollectedIncome: Math.round(totalUncollectedIncome * 100) / 100,
        totalOverdueIncome: Math.round(totalOverdueIncome * 100) / 100,
        collectionRate,
        overdueInstallmentCount,
        paymentHealth,
        incomeRecords: enrichedIncomeList,
        // Net Cash & Profitability
        netCashFlow,
        projectedProfit,
        realizedProfit,
      };

      projectRows.push(projectData);
    }

    // 6. Apply In-Memory Query Filters
    let filteredProjects = [...projectRows];

    if (clientNameFilter && clientNameFilter.trim()) {
      const c = clientNameFilter.trim().toLowerCase();
      filteredProjects = filteredProjects.filter((p) =>
        p.clientName?.toLowerCase().includes(c)
      );
    }

    if (paymentStatusFilter && paymentStatusFilter !== "all") {
      filteredProjects = filteredProjects.filter((p) => {
        if (paymentStatusFilter === "collected") return p.paymentHealth === "Fully Collected";
        if (paymentStatusFilter === "partial") return p.paymentHealth === "Partially Collected";
        if (paymentStatusFilter === "overdue") return p.paymentHealth === "Payment Overdue";
        if (paymentStatusFilter === "pending") return p.paymentHealth === "Pending Collection";
        return true;
      });
    }

    if (budgetStatusFilter && budgetStatusFilter !== "all") {
      filteredProjects = filteredProjects.filter((p) => {
        if (budgetStatusFilter === "within") return p.budgetHealth === "Within Budget";
        if (budgetStatusFilter === "near_limit") return p.budgetHealth === "Near Limit";
        if (budgetStatusFilter === "over_budget") return p.budgetHealth === "Over Budget";
        return true;
      });
    }

    if (startDateFilter || endDateFilter) {
      filteredProjects = filteredProjects.filter((p) => {
        if (startDateFilter && p.startDate && p.startDate < startDateFilter) return false;
        if (endDateFilter && p.endDate && p.endDate > endDateFilter) return false;
        return true;
      });
    }

    if (searchFilter && searchFilter.trim()) {
      const s = searchFilter.trim().toLowerCase();
      filteredProjects = filteredProjects.filter(
        (p) =>
          p.projectName?.toLowerCase().includes(s) ||
          p.clientName?.toLowerCase().includes(s) ||
          p.category?.toLowerCase().includes(s) ||
          p.incomeRecords?.some((inc) =>
            inc.title?.toLowerCase().includes(s) ||
            inc.invoiceNumber?.toLowerCase().includes(s)
          )
      );
    }

    // 7. Aggregate Overall KPI Totals
    const totalProjects = filteredProjects.length;
    const totalBudgetSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalBudget, 0) * 100) / 100;
    const totalExpectedIncomeSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalExpectedIncome, 0) * 100) / 100;
    const totalCollectedIncomeSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalCollectedIncome, 0) * 100) / 100;
    const totalUncollectedIncomeSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalUncollectedIncome, 0) * 100) / 100;
    const totalOverdueIncomeSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalOverdueIncome, 0) * 100) / 100;
    const totalExpensesSum = Math.round(filteredProjects.reduce((s, p) => s + p.totalExpenses, 0) * 100) / 100;
    const netCashFlowSum = Math.round((totalCollectedIncomeSum - totalExpensesSum) * 100) / 100;
    const overallCollectionRate = totalExpectedIncomeSum > 0
      ? Math.round((totalCollectedIncomeSum / totalExpectedIncomeSum) * 10000) / 100
      : totalCollectedIncomeSum > 0 ? 100 : 0;
    const overallBudgetUtilization = totalBudgetSum > 0
      ? Math.round((totalExpensesSum / totalBudgetSum) * 10000) / 100
      : 0;

    const totalOverdueInstallmentsCount = filteredProjects.reduce((s, p) => s + p.overdueInstallmentCount, 0);

    // Filter installments ledger to match filtered projects
    const matchedProjectIds = new Set(filteredProjects.map((p) => p.projectId));
    const filteredInstallmentsLedger = allInstallmentsLedger.filter((inst) =>
      matchedProjectIds.has(inst.projectId)
    );

    if (user?.userId) {
      await createAuditLog({
        action: "VIEW",
        entityType: "report",
        entityId: "project_budget_payment_report",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "project_budget_payment_report",
          projectsCount: filteredProjects.length,
          totalBudget: totalBudgetSum,
          totalCollected: totalCollectedIncomeSum,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reportType: "project_budget_payment_detailed",
      generatedAt: new Date().toISOString(),
      filters: {
        projectId: projectIdFilter,
        clientName: clientNameFilter,
        paymentStatus: paymentStatusFilter,
        budgetStatus: budgetStatusFilter,
        startDate: startDateFilter,
        endDate: endDateFilter,
        search: searchFilter,
      },
      summary: {
        totalProjects,
        totalBudget: totalBudgetSum,
        totalExpectedIncome: totalExpectedIncomeSum,
        totalCollectedIncome: totalCollectedIncomeSum,
        totalUncollectedIncome: totalUncollectedIncomeSum,
        totalOverdueIncome: totalOverdueIncomeSum,
        totalExpenses: totalExpensesSum,
        netCashFlow: netCashFlowSum,
        overallCollectionRate,
        overallBudgetUtilization,
        totalOverdueInstallmentsCount,
      },
      projects: filteredProjects,
      installmentsLedger: filteredInstallmentsLedger,
    });
  } catch (error) {
    console.error("Error generating Project Budget & Payment report:", error);
    return NextResponse.json(
      { error: "Failed to generate project budget & payment report", message: error.message },
      { status: 500 }
    );
  }
}
