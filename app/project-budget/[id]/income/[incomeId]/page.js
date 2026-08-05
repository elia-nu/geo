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

const PAYMENT_TYPES = [
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
    <dt className="sm:w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="text-sm text-slate-900 min-w-0 break-words">{children}</dd>
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

  const remaining = Math.max(
    0,
    (Number(income?.expectedAmount) || 0) - (Number(income?.amount) || 0)
  );

  const canCollect =
    income &&
    income.status !== "collected" &&
    income.status !== "cancelled" &&
    remaining > 0;

  const openCollect = () => {
    if (!income) return;
    setCollectForm({
      collectAmount: remaining > 0 ? remaining.toFixed(2) : "",
      receivedDate: new Date().toISOString().split("T")[0],
      invoiceNumber: income.invoiceNumber || "",
      paymentMethod: income.paymentMethod || "bank_transfer",
      paymentReference: "",
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
            collectAmount: collectForm.collectAmount,
            receivedDate: collectForm.receivedDate,
            invoiceNumber: collectForm.invoiceNumber,
            paymentMethod: collectForm.paymentMethod,
            paymentReference: collectForm.paymentReference,
            notes: collectForm.notes,
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
              {error || "Income not found"}
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

  const expected = Number(income.expectedAmount) || 0;
  const received = Number(income.amount) || 0;

  return (
    <Layout activeSection="budget-management">
      <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 min-h-screen min-w-0">
        <nav className="mb-4">
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
            <li className="text-slate-800 font-medium truncate max-w-[10rem]">
              Income
            </li>
          </ol>
        </nav>

        <div className="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {income.title}
              </h1>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-md border capitalize ${
                  statusBadge[income.status] || statusBadge.pending
                }`}
              >
                {income.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Income details for {projectName || "this project"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCollect && (
              <button
                onClick={openCollect}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
              >
                Collect Payment
              </button>
            )}
            <Link
              href={`/project-budget/${projectId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
            >
              <ArrowBackIcon className="text-base" />
              Back to Budget
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Expected", value: expected, color: "text-slate-900" },
            { label: "Received", value: received, color: "text-emerald-700" },
            { label: "Remaining", value: remaining, color: "text-amber-700" },
            {
              label: "Days Past Due",
              value: income.daysPastDue || 0,
              color: "text-rose-700",
              isCurrency: false,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p
                className={`mt-1 text-lg font-semibold ${card.color}`}
                title={
                  card.isCurrency === false
                    ? undefined
                    : currencyTitle(card.value)
                }
              >
                {card.isCurrency === false
                  ? card.value
                  : formatCurrency(card.value)}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Payment Details
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Expected income and collection information
            </p>
            <dl>
              <DetailRow label="Client">
                {income.clientName || "—"}
              </DetailRow>
              <DetailRow label="Category">
                {income.categoryName || "—"}
              </DetailRow>
              <DetailRow label="Due Date">{formatDate(income.dueDate)}</DetailRow>
              <DetailRow label="Received Date">
                {formatDate(income.receivedDate)}
              </DetailRow>
              <DetailRow label="Invoice Number">
                {income.invoiceNumber || "—"}
              </DetailRow>
              <DetailRow label="Payment Type">
                {formatPaymentType(income.paymentMethod)}
              </DetailRow>
              <DetailRow label="Payment Reference">
                {income.paymentReference || "—"}
              </DetailRow>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Notes & Description
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Additional context for this income record
            </p>
            <dl>
              <DetailRow label="Description">
                {income.description || "—"}
              </DetailRow>
              <DetailRow label="Notes">{income.notes || "—"}</DetailRow>
              <DetailRow label="Created">
                {formatDate(income.createdAt)}
              </DetailRow>
              <DetailRow label="Status">
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md border capitalize ${
                    statusBadge[income.status] || statusBadge.pending
                  }`}
                >
                  {income.status}
                </span>
              </DetailRow>
            </dl>
          </section>
        </div>
      </div>

      {showCollect && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => !collecting && setShowCollect(false)}
          />
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Collect Payment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Remaining {formatCurrency(remaining)}
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="e.g., INV-2026-001"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Type
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  placeholder="Transaction / receipt ref"
                />
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => !collecting && setShowCollect(false)}
                disabled={collecting}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={collecting || !collectForm.collectAmount}
                className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {collecting ? "Collecting…" : "Record Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default IncomeDetailPage;
