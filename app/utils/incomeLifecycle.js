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

/**
 * Derive lifecycle status from amounts + due date.
 * Explicit cancelled is preserved.
 */
export function deriveIncomeStatus({
  amount = 0,
  expectedAmount = 0,
  dueDate = null,
  status = null,
}) {
  if (status === "cancelled") return "cancelled";

  const received = Number(amount) || 0;
  const expected = Number(expectedAmount) || 0;
  const due = parseDate(dueDate);
  const today = startOfToday();
  const isPastDue = due ? due < today : false;
  const isFullyCollected = expected > 0 ? received >= expected : received > 0;

  if (isFullyCollected) return "collected";
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
    income.expectedAmount ?? income.amount ?? 0
  );
  const amount = Number(income.amount ?? 0);
  const dueDate = parseDate(income.dueDate);
  const receivedDate = parseDate(income.receivedDate);
  const now = new Date();

  const uncollectedAmount = Math.max(0, expectedAmount - amount);
  const collectionRate =
    expectedAmount > 0 ? (amount / expectedAmount) * 100 : amount > 0 ? 100 : 0;
  const isFullyCollected =
    expectedAmount > 0 ? amount >= expectedAmount : amount > 0;

  const status = deriveIncomeStatus({
    amount,
    expectedAmount,
    dueDate,
    status: income.status,
  });

  const isOverdue =
    status !== "collected" &&
    status !== "cancelled" &&
    !!dueDate &&
    dueDate < startOfToday();

  const daysPastDue =
    isOverdue && dueDate
      ? Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24))
      : 0;

  const daysUntilDue =
    dueDate && dueDate >= startOfToday()
      ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
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
    amount,
    expectedAmount,
    uncollectedAmount,
    collectionRate: Math.round(collectionRate * 100) / 100,
    isFullyCollected,
    status,
    dueDate,
    receivedDate: amount > 0 ? receivedDate || now : receivedDate,
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

  return enrichIncomeRecord({
    ...income,
    amount: nextAmount,
    receivedDate: receivedDate || new Date(),
    paymentMethod: paymentMethod || income.paymentMethod || "bank_transfer",
    invoiceNumber:
      invoiceNumber !== undefined ? invoiceNumber : income.invoiceNumber,
    paymentReference:
      paymentReference !== undefined
        ? paymentReference
        : income.paymentReference,
    notes: notes !== undefined ? notes : income.notes,
  });
}

/**
 * Build a new expected-income (or already-collected) record payload.
 */
export function buildIncomeRecord(data = {}) {
  const expectedAmount = Number(
    data.expectedAmount ?? data.amount ?? 0
  );
  const amount = data.amount != null && data.amount !== ""
    ? Number(data.amount)
    : 0;

  const base = {
    _id: data._id,
    title: data.title,
    description: data.description || "",
    amount: Number.isFinite(amount) ? amount : 0,
    expectedAmount: Number.isFinite(expectedAmount) ? expectedAmount : 0,
    dueDate: data.dueDate || null,
    receivedDate: data.receivedDate || null,
    paymentMethod: data.paymentMethod || "bank_transfer",
    clientName: data.clientName || "",
    categoryId: data.categoryId || "",
    categoryName: data.categoryName || "",
    invoiceNumber: data.invoiceNumber || "",
    paymentReference: data.paymentReference || "",
    notes: data.notes || "",
    status: data.status || "pending",
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
    (sum, i) => sum + (Number(i.expectedAmount) || 0),
    0
  );
  const totalCollected = income.reduce(
    (sum, i) => sum + (Number(i.amount) || 0),
    0
  );
  const totalUncollected = Math.max(0, totalExpected - totalCollected);

  const byStatus = (status) =>
    income.filter((i) => i.status === status);

  const sumExpected = (list) =>
    list.reduce((s, i) => s + (Number(i.expectedAmount) || 0), 0);
  const sumReceived = (list) =>
    list.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const pending = byStatus("pending");
  const partial = byStatus("partial");
  const collected = byStatus("collected");
  const overdue = byStatus("overdue");

  return {
    income,
    totalExpected,
    totalCollected,
    totalUncollected,
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
