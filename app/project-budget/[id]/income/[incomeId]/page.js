"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../../../components/Layout";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import {
  formatCurrency,
  currencyTitle,
} from "../../../../utils/currency";
import {
  showErrorToast,
  showSuccessToast,
  showValidationErrors,
} from "../../../../utils/sweetAlert";
import {
  validateCollectPaymentForm,
  hasFormErrors,
} from "../../../../utils/formValidation";
import {
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const PAYMENT_TYPES = [
  { value: "advance_payment", label: "Advance Payment" },
  { value: "monthly_payment", label: "Monthly Payment" },
  { value: "milestone_payment", label: "Milestone Payment" },
  { value: "installment", label: "Installment" },
  { value: "lump_sum", label: "Lump Sum" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const statusBadge = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  partial: "bg-sky-50 text-sky-800 border-sky-200",
  collected: "bg-emerald-50 text-emerald-800 border-emerald-200",
  overdue: "bg-rose-50 text-rose-800 border-rose-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

const formatDate = (date) => {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPaymentType = (value) => {
  const match = PAYMENT_TYPES.find((t) => t.value === value);
  return match?.label || value || "—";
};

const DetailRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
    <dt className="sm:w-48 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words font-medium">{children}</dd>
  </div>
);

const IncomeDetailPage = ({ params }) => {
  const { id: projectId, incomeId } = use(params);
  const [projectName, setProjectName] = useState("");
  const [income, setIncome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCollect, setShowCollect] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectForm, setCollectForm] = useState({
    collectAmount: "",
    receivedDate: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    nextPaymentDate: "",
    nextPaymentAmount: "",
    notes: "",
  });
  const [collectErrors, setCollectErrors] = useState({});

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const [incomeRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/income/${incomeId}`),
        fetch(`/api/projects/${projectId}`),
      ]);
      const incomeData = await incomeRes.json();
      const projectData = await projectRes.json();

      if (!incomeData.success) {
        setError(incomeData.error || "Failed to load income");
        setIncome(null);
        return;
      }

      setIncome(incomeData.income);
      if (projectData.success) {
        setProjectName(projectData.project?.name || "");
      }
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load income");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome();
  }, [projectId, incomeId]);

  const totalProjectAmount = Number(
    income?.totalProjectAmount || income?.expectedAmount || income?.amount || 0
  );
  const totalPaid = Number(income?.totalPaid !== undefined ? income.totalPaid : income?.amount || 0);
  const remaining = Math.max(0, totalProjectAmount - totalPaid);
  const collectionRate =
    totalProjectAmount > 0 ? (totalPaid / totalProjectAmount) * 100 : 0;

  const canCollect =
    income &&
    income.status !== "collected" &&
    income.status !== "cancelled" &&
    (remaining > 0 || totalPaid === 0);

  const openCollect = () => {
    if (!income) return;
    setCollectForm({
      collectAmount: remaining > 0 ? remaining.toFixed(2) : "",
      receivedDate: new Date().toISOString().split("T")[0],
      invoiceNumber: income.invoiceNumber || "",
      paymentMethod: income.paymentMethod || "bank_transfer",
      paymentReference: "",
      nextPaymentDate: income.nextPaymentDate ? new Date(income.nextPaymentDate).toISOString().split("T")[0] : "",
      nextPaymentAmount: income.nextPaymentAmount || "",
      notes: "",
    });
    setCollectErrors({});
    setShowCollect(true);
  };

  const handleCollect = async () => {
    const errors = validateCollectPaymentForm(collectForm, {
      remainingAmount: remaining > 0 ? remaining : Infinity,
    });
    if (hasFormErrors(errors)) {
      setCollectErrors(errors);
      showValidationErrors(errors);
      return;
    }

    setCollectErrors({});
    setCollecting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/income/${incomeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "collect",
            ...collectForm,
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to collect payment");
      }
      showSuccessToast("Payment Collected!", "Income record updated.");
      setShowCollect(false);
      setIncome(data.income);
    } catch (err) {
      showErrorToast("Collection Failed", err.message);
    } finally {
      setCollecting(false);
    }
  };

  if (loading) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500 animate-pulse">
              Loading income details…
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !income) {
    return (
      <Layout activeSection="budget-management">
        <div className="flex justify-center items-center min-h-[70vh] px-4">
          <div className="text-center max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-lg text-red-700 font-medium">
              {error || "Income record not found"}
            </p>
            <Link
              href={`/project-budget/${projectId}`}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <ArrowBackIcon className="text-base" />
              Back to Budget
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="budget-management">
      <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen min-w-0 space-y-5">
        <nav>
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-slate-500">
            <li>
              <Link
                href="/projects"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Projects
              </Link>
            </li>
            <li className="text-slate-300 px-1">/</li>
            <li className="min-w-0">
              <Link
                href={`/projects/${projectId}`}
                className="text-blue-600 hover:text-blue-800 truncate inline-block max-w-[10rem] sm:max-w-xs align-bottom"
              >
                {projectName || "Project"}
              </Link>
            </li>
            <li className="text-slate-300 px-1">/</li>
            <li>
              <Link
                href={`/project-budget/${projectId}`}
                className="text-blue-600 hover:text-blue-800"
              >
                Budget
              </Link>
            </li>
            <li className="text-slate-300 px-1">/</li>
            <li className="text-slate-800 font-medium truncate max-w-[12rem]">
              {income.title}
            </li>
          </ol>
        </nav>

        {/* Title and actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {income.title}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border capitalize ${
                  statusBadge[income.status] || statusBadge.pending
                }`}
              >
                {income.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Client: <strong className="text-slate-800">{income.clientName || "Direct"}</strong> · Project: {projectName || income.projectName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCollect && (
              <button
                onClick={openCollect}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
              >
                Collect Payment
              </button>
            )}
            <Link
              href={`/project-budget/${projectId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ArrowBackIcon className="text-base" />
              Back to Budget
            </Link>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Project Amount
            </p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(totalProjectAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Contract value</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Amount Paid
            </p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalPaid)}
            </p>
            <p className="text-xs text-emerald-600/80 mt-0.5">
              {collectionRate.toFixed(1)}% collected
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Outstanding / Unpaid
            </p>
            <p className="mt-1 text-lg sm:text-xl font-bold text-amber-700 tabular-nums">
              {formatCurrency(remaining)}
            </p>
            <p className="text-xs text-amber-600/80 mt-0.5">Remaining balance</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Next Expected Payment
            </p>
            <p className="mt-1 text-base sm:text-lg font-bold text-blue-700 tabular-nums">
              {income.nextPaymentAmount ? formatCurrency(income.nextPaymentAmount) : "—"}
            </p>
            <p className="text-xs text-blue-600/80 mt-0.5">
              {income.nextPaymentDate ? `Due: ${formatDate(income.nextPaymentDate)}` : "Date not scheduled"}
            </p>
          </div>
        </div>

        {/* Collection Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
            <span className="font-semibold text-slate-800">
              Collection Progress: {collectionRate.toFixed(1)}%
            </span>
            <span className="text-slate-500">
              {formatCurrency(totalPaid)} of {formatCurrency(totalProjectAmount)}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                collectionRate >= 100
                  ? "bg-emerald-500"
                  : collectionRate >= 50
                  ? "bg-blue-600"
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Project & Client Details
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Core contract and payment schedule information
            </p>
            <dl>
              <DetailRow label="Client Name">
                {income.clientName || "—"}
              </DetailRow>
              <DetailRow label="Project Name">
                {projectName || income.projectName || "—"}
              </DetailRow>
              <DetailRow label="Total Project Amount">
                {formatCurrency(totalProjectAmount)}
              </DetailRow>
              <DetailRow label="Payment Plan">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-xs">
                  {income.frequency === "monthly"
                    ? "Monthly Recurring"
                    : income.frequency === "quarterly"
                    ? "Quarterly Recurring"
                    : "Lump Sum (One-time)"}
                </span>
              </DetailRow>
              {income.frequency !== "lump_sum" && (
                <>
                  <DetailRow label="Payment Day">
                    Day {income.recurringDay || "15"} of each {income.frequency === "monthly" ? "month" : "quarter"}
                  </DetailRow>
                  <DetailRow label="Schedule Duration">
                    {income.durationMonths || 12} Months
                  </DetailRow>
                  <DetailRow label="Installment Rate">
                    {formatCurrency(income.installmentAmount || 0)} / {income.frequency === "monthly" ? "month" : "quarter"}
                  </DetailRow>
                </>
              )}
              <DetailRow label="Collection Method">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                  <CreditCardIcon className="w-3.5 h-3.5" />
                  {formatPaymentType(income.paymentMethod)}
                </span>
              </DetailRow>
              <DetailRow label="Next Scheduled Date">
                <span className={income.isOverdue ? "text-rose-600 font-bold" : "text-slate-900"}>
                  {formatDate(income.nextPaymentDate || income.dueDate)}
                </span>
                {income.isOverdue && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                    {income.daysPastDue} days overdue
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Next Payment Amount">
                {income.nextPaymentAmount ? formatCurrency(income.nextPaymentAmount) : "—"}
              </DetailRow>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Receipt & Collection Details
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Payment references, transaction info, and notes
            </p>
            <dl>
              <DetailRow label="Total Amount Paid">
                <span className="text-emerald-600 font-bold">
                  {formatCurrency(totalPaid)}
                </span>
              </DetailRow>
              <DetailRow label="Outstanding / Unpaid">
                <span className="text-amber-700 font-bold">
                  {formatCurrency(remaining)}
                </span>
              </DetailRow>
              <DetailRow label="Last Received Date">
                {formatDate(income.receivedDate)}
              </DetailRow>
              <DetailRow label="Invoice Number">
                {income.invoiceNumber || "—"}
              </DetailRow>
              <DetailRow label="Payment Reference">
                {income.paymentReference || "—"}
              </DetailRow>
              <DetailRow label="Description">
                {income.description || "—"}
              </DetailRow>
              <DetailRow label="Notes">
                {income.notes || "—"}
              </DetailRow>
            </dl>
          </section>
        </div>

        {/* Collection History if available */}
        {Array.isArray(income.paymentHistory) && income.paymentHistory.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Payment & Collection History
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                      Amount Collected
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Method
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Reference / Invoice
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {income.paymentHistory.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                        {formatDate(h.date)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(h.amount)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                        {formatPaymentType(h.paymentMethod)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                        {h.paymentReference || h.invoiceNumber || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {h.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Collect Modal */}
      {showCollect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Collect Payment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Outstanding balance: {formatCurrency(remaining)}
              </p>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount Received Now *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={collectForm.collectAmount}
                  onChange={(e) =>
                    setCollectForm((p) => ({
                      ...p,
                      collectAmount: e.target.value,
                    }))
                  }
                  disabled={collecting}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                {collectErrors.collectAmount && (
                  <p className="text-xs text-rose-600 mt-1">
                    {collectErrors.collectAmount}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    value={collectForm.receivedDate}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        receivedDate: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={collectForm.paymentMethod}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        paymentMethod: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {PAYMENT_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Next Payment Date
                  </label>
                  <input
                    type="date"
                    value={collectForm.nextPaymentDate}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        nextPaymentDate: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Next Payment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={collectForm.nextPaymentAmount}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        nextPaymentAmount: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    value={collectForm.paymentReference}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        paymentReference: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Ref / Transaction ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={collectForm.invoiceNumber}
                    onChange={(e) =>
                      setCollectForm((p) => ({
                        ...p,
                        invoiceNumber: e.target.value,
                      }))
                    }
                    disabled={collecting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="INV-001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={collectForm.notes}
                  onChange={(e) =>
                    setCollectForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  disabled={collecting}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional collection notes"
                />
              </div>
            </div>
            <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => !collecting && setShowCollect(false)}
                disabled={collecting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCollect}
                disabled={collecting || !collectForm.collectAmount}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-50"
              >
                {collecting ? "Saving…" : "Record Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default IncomeDetailPage;
