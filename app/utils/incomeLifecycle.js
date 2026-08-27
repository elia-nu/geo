/**
 * Shared income / expected-payment lifecycle helpers.
 *
 * Flow:
 * 1. Create expected income with dueDate → pending (or overdue if already past due)
 * 2. Collect money → partial (if under expected) or collected (if full)
 * 3. If due date has passed and not fully collected → overdue
 */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const INCOME_STATUSES = [
  "pending",
  "partial",
  "collected",
  "overdue",
  "cancelled",
];

export const PAYMENT_FREQUENCIES = [
  { value: "lump_sum", label: "Lump Sum" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

/**
 * Calculate the next recurring payment date for monthly or quarterly plans.
 */
export function getNextScheduledDate({
  frequency = "lump_sum",
  recurringDay = 1,
  startDate = null,
  dueDate = null,
  nextPaymentDate = null,
  totalPaid = 0,
  installmentAmount = 0,
  totalProjectAmount = 0,
}) {
  if (nextPaymentDate) {
    const parsed = parseDate(nextPaymentDate);
    if (parsed) return parsed;
  }

  if (frequency === "lump_sum" || !frequency) {
    return parseDate(dueDate);
  }

  const start = parseDate(startDate) || parseDate(dueDate) || new Date();
  const day = Math.min(31, Math.max(1, parseInt(recurringDay, 10) || start.getDate() || 1));
  const installment = Number(installmentAmount) || (Number(totalProjectAmount) > 0 ? Number(totalProjectAmount) / 12 : 0);
  const paid = Number(totalPaid) || 0;

  // Number of installments already covered
  const installmentsCovered = installment > 0 ? Math.floor(paid / installment) : 0;
  const stepMonths = frequency === "quarterly" ? 3 : 1;

  const targetDate = new Date(start);
  targetDate.setMonth(targetDate.getMonth() + installmentsCovered * stepMonths);
  // Clamp day to valid month day
  const maxDaysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  targetDate.setDate(Math.min(day, maxDaysInMonth));
  targetDate.setHours(0, 0, 0, 0);

  return targetDate;
}

/**
 * Derive lifecycle status from amounts + due date + recurring schedules.
 */
export function deriveIncomeStatus({
  amount = 0,
  expectedAmount = 0,
  dueDate = null,
  nextPaymentDate = null,
  frequency = "lump_sum",
  status = null,
}) {
  if (status === "cancelled") return "cancelled";

  const received = Number(amount) || 0;
  const expected = Number(expectedAmount) || 0;
  const today = startOfToday();
  const isFullyCollected = expected > 0 ? received >= expected : received > 0;

  if (isFullyCollected) return "collected";

  // Check effective due date: if recurring schedule has nextPaymentDate, check if that next payment date is past
  const effectiveDueDate = parseDate(nextPaymentDate) || parseDate(dueDate);
  const isPastDue = effectiveDueDate ? effectiveDueDate < today : false;

  if (received > 0 && expected > 0 && received < expected) {
    return isPastDue ? "overdue" : "partial";
  }
  if (isPastDue) return "overdue";
  return "pending";
}

/**
 * Compute derived tracking fields and status for an income record.
 */
export function enrichIncomeRecord(income = {}) {
  const expectedAmount = Number(
    income.expectedAmount ?? income.totalProjectAmount ?? income.amount ?? 0
  );
  const amount = Number(income.amount ?? income.totalPaid ?? 0);
  const dueDate = parseDate(income.dueDate);
  const receivedDate = parseDate(income.receivedDate);
  const startDate = parseDate(income.startDate) || parseDate(income.receivedDate) || parseDate(income.dueDate);
  const frequency = income.frequency || (income.paymentMethod === "monthly_payment" ? "monthly" : income.paymentMethod === "advance_payment" || income.paymentMethod === "lump_sum" ? "lump_sum" : "lump_sum");
  const recurringDay = parseInt(income.recurringDay, 10) || (startDate ? startDate.getDate() : 1);
  const durationMonths = parseInt(income.durationMonths || income.duration, 10) || (frequency === "monthly" ? 12 : frequency === "quarterly" ? 12 : 1);
  const installmentAmount = Number(income.installmentAmount) || (frequency === "monthly" ? expectedAmount / (durationMonths || 12) : frequency === "quarterly" ? expectedAmount / ((durationMonths || 12) / 3) : expectedAmount);

  const now = new Date();

  // Next scheduled payment date for recurring cycles
  const computedNextDate = getNextScheduledDate({
    frequency,
    recurringDay,
    startDate,
    dueDate,
    nextPaymentDate: income.nextPaymentDate,
    totalPaid: amount,
    installmentAmount,
    totalProjectAmount: expectedAmount,
  });

  const nextPaymentDate = computedNextDate;
  const nextPaymentAmount =
    Number(income.nextPaymentAmount) > 0
      ? Number(income.nextPaymentAmount)
      : Math.min(expectedAmount - amount > 0 ? expectedAmount - amount : 0, installmentAmount > 0 ? installmentAmount : expectedAmount);

  const uncollectedAmount = Math.max(0, expectedAmount - amount);
  const outstandingAmount = uncollectedAmount;
  const totalProjectAmount = expectedAmount;
  const totalPaid = amount;

  const collectionRate =
    expectedAmount > 0 ? (amount / expectedAmount) * 100 : amount > 0 ? 100 : 0;
  const isFullyCollected =
    expectedAmount > 0 ? amount >= expectedAmount : amount > 0;

  const status = deriveIncomeStatus({
    amount,
    expectedAmount,
    dueDate,
    nextPaymentDate,
    frequency,
    status: income.status,
  });

  const effectiveDueDate = nextPaymentDate || dueDate;
  const isOverdue =
    status !== "collected" &&
    status !== "cancelled" &&
    !!effectiveDueDate &&
    effectiveDueDate < startOfToday();

  const daysPastDue =
    isOverdue && effectiveDueDate
      ? Math.ceil((now - effectiveDueDate) / (1000 * 60 * 60 * 24))
      : 0;

  const daysUntilDue =
    effectiveDueDate && effectiveDueDate >= startOfToday()
      ? Math.ceil((effectiveDueDate - now) / (1000 * 60 * 60 * 24))
      : null;

  const paymentType =
    expectedAmount === amount
      ? "full_payment"
      : amount < expectedAmount
      ? amount > 0
        ? "partial_payment"
        : "expected"
      : "overpayment";

  const riskLevel =
    status === "collected" || status === "cancelled"
      ? "low"
      : daysPastDue > 30
      ? "high"
      : daysPastDue > 0 || status === "overdue"
      ? "medium"
      : "low";

  return {
    ...income,
    frequency,
    recurringDay,
    durationMonths,
    installmentAmount: Number.isFinite(installmentAmount) ? installmentAmount : 0,
    startDate: startDate || null,
    amount,
    totalPaid,
    expectedAmount,
    totalProjectAmount,
    uncollectedAmount,
    outstandingAmount,
    nextPaymentDate: isFullyCollected ? null : nextPaymentDate,
    nextPaymentAmount: isFullyCollected ? 0 : Number.isFinite(nextPaymentAmount) ? nextPaymentAmount : 0,
    collectionRate: Math.round(collectionRate * 100) / 100,
    isFullyCollected,
    status,
    dueDate,
    receivedDate: amount > 0 ? receivedDate || now : null,
    isOverdue,
    daysPastDue,
    daysUntilDue,
    paymentType,
    riskLevel,
    updatedAt: new Date(),
  };
}

/**
 * Apply a collection (partial or full) onto an existing income record.
 * `collectAmount` is the new payment received now (added to current amount).
 */
export function applyCollection(
  income,
  {
    collectAmount,
    receivedDate,
    paymentMethod,
    paymentReference,
    invoiceNumber,
    nextPaymentDate,
    nextPaymentAmount,
    notes,
    setTotalAmount = false,
  } = {}
) {
  const add = Number(collectAmount);
  if (!Number.isFinite(add) || add <= 0) {
    throw new Error("Collection amount must be a positive number");
  }

  const current = Number(income.amount) || 0;
  const nextAmount = setTotalAmount ? add : current + add;

  const historyItem = {
    amount: add,
    date: receivedDate || new Date(),
    paymentMethod: paymentMethod || income.paymentMethod || "bank_transfer",
    paymentReference: paymentReference || "",
    invoiceNumber: invoiceNumber || "",
    notes: notes || "",
    createdAt: new Date(),
  };

  const existingHistory = Array.isArray(income.paymentHistory)
    ? income.paymentHistory
    : [];

  return enrichIncomeRecord({
    ...income,
    amount: nextAmount,
    totalPaid: nextAmount,
    receivedDate: receivedDate || new Date(),
    paymentMethod: paymentMethod || income.paymentMethod || "bank_transfer",
    invoiceNumber:
      invoiceNumber !== undefined ? invoiceNumber : income.invoiceNumber,
    paymentReference:
      paymentReference !== undefined
        ? paymentReference
        : income.paymentReference,
    nextPaymentDate:
      nextPaymentDate !== undefined
        ? nextPaymentDate
        : income.nextPaymentDate || null,
    nextPaymentAmount:
      nextPaymentAmount !== undefined
        ? Number(nextPaymentAmount) || 0
        : income.nextPaymentAmount || 0,
    notes: notes !== undefined ? notes : income.notes,
    paymentHistory: [...existingHistory, historyItem],
  });
}

/**
 * Build a new expected-income (or already-collected) record payload.
 */
export function buildIncomeRecord(data = {}) {
  const expectedAmount = Number(
    data.expectedAmount ?? data.totalProjectAmount ?? data.amount ?? 0
  );
  const amount = data.amount != null && data.amount !== ""
    ? Number(data.amount)
    : Number(data.totalPaid) || 0;

  const base = {
    _id: data._id,
    title: data.title,
    description: data.description || "",
    amount: Number.isFinite(amount) ? amount : 0,
    totalPaid: Number.isFinite(amount) ? amount : 0,
    expectedAmount: Number.isFinite(expectedAmount) ? expectedAmount : 0,
    totalProjectAmount: Number.isFinite(expectedAmount) ? expectedAmount : 0,
    dueDate: data.dueDate || null,
    receivedDate: data.receivedDate || null,
    paymentMethod: data.paymentMethod || "advance_payment",
    frequency: data.frequency || "lump_sum",
    recurringDay: data.recurringDay ? parseInt(data.recurringDay, 10) : null,
    durationMonths: data.durationMonths ? parseInt(data.durationMonths, 10) : null,
    installmentAmount: data.installmentAmount ? Number(data.installmentAmount) : 0,
    startDate: data.startDate || null,
    clientName: data.clientName || "",
    projectName: data.projectName || "",
    nextPaymentDate: data.nextPaymentDate || null,
    nextPaymentAmount: Number(data.nextPaymentAmount) || 0,
    categoryId: data.categoryId || "",
    categoryName: data.categoryName || "",
    invoiceNumber: data.invoiceNumber || "",
    paymentReference: data.paymentReference || "",
    notes: data.notes || "",
    status: data.status || "pending",
    paymentHistory: Array.isArray(data.paymentHistory) ? data.paymentHistory : [],
    createdAt: data.createdAt || new Date(),
  };

  return enrichIncomeRecord(base);
}

/**
 * Refresh overdue/partial/collected status for a list (e.g. on GET).
 * Returns { income, changed } where changed is true if any status flipped.
 */
export function refreshIncomeList(incomeList = []) {
  let changed = false;
  const income = incomeList.map((item) => {
    const enriched = enrichIncomeRecord(item);
    if (
      enriched.status !== item.status ||
      enriched.isOverdue !== item.isOverdue ||
      enriched.uncollectedAmount !== item.uncollectedAmount
    ) {
      changed = true;
    }
    return enriched;
  });
  return { income, changed };
}

export function summarizeIncome(incomeList = []) {
  const { income } = refreshIncomeList(incomeList);

  const totalExpected = income.reduce(
    (sum, i) => sum + (Number(i.expectedAmount || i.totalProjectAmount) || 0),
    0
  );
  const totalCollected = income.reduce(
    (sum, i) => sum + (Number(i.amount || i.totalPaid) || 0),
    0
  );
  const totalUncollected = Math.max(0, totalExpected - totalCollected);

  const byStatus = (status) =>
    income.filter((i) => i.status === status);

  const sumExpected = (list) =>
    list.reduce((s, i) => s + (Number(i.expectedAmount || i.totalProjectAmount) || 0), 0);
  const sumReceived = (list) =>
    list.reduce((s, i) => s + (Number(i.amount || i.totalPaid) || 0), 0);

  const pending = byStatus("pending");
  const partial = byStatus("partial");
  const collected = byStatus("collected");
  const overdue = byStatus("overdue");

  return {
    income,
    totalExpected,
    totalProjectAmount: totalExpected,
    totalCollected,
    totalPaid: totalCollected,
    totalUncollected,
    outstandingAmount: totalUncollected,
    collectionRate:
      totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
    pendingCount: pending.length,
    pendingExpected: sumExpected(pending),
    partialCount: partial.length,
    partialReceived: sumReceived(partial),
    partialExpected: sumExpected(partial),
    collectedCount: collected.length,
    collectedAmount: sumReceived(collected),
    overdueCount: overdue.length,
    overdueExpected: sumExpected(overdue),
    overdueUncollected: overdue.reduce(
      (s, i) => s + (Number(i.uncollectedAmount) || 0),
      0
    ),
  };
}
