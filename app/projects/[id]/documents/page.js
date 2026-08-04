"use client";

import { useEffect, useMemo, useState, use } from "react";
import Layout from "../../../components/Layout";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import {
  closeDialog,
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../../utils/sweetAlert";

export default function ProjectDocumentsPage({ params }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    contractorName: "",
    contractorEmail: "",
    expiryDate: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);
      const [pRes, dRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/documents`),
      ]);

      const pData = await pRes.json();
      const dData = await dRes.json();

      if (pData.success) setProject(pData.project);
      else throw new Error(pData.error || "Failed to load project");

      if (dData.success) setDocuments(dData.documents || []);
      else throw new Error(dData.error || "Failed to load documents");
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const expiringSoonCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (documents || []).filter((d) => {
      if (!d?.expiryDate) return false;
      const ed = new Date(d.expiryDate);
      ed.setHours(0, 0, 0, 0);
      const days = Math.ceil((ed - today) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;
  }, [documents]);

  function openAdd() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      contractorName: "",
      contractorEmail: "",
      expiryDate: "",
    });
    setFile(null);
    setOpenDialog(true);
  }

  function openEdit(doc) {
    setEditing(doc);
    setForm({
      title: doc.title || "",
      description: doc.description || "",
      contractorName: doc.contractorName || "",
      contractorEmail: doc.contractorEmail || "",
      expiryDate: doc.expiryDate
        ? new Date(doc.expiryDate).toISOString().split("T")[0]
        : "",
    });
    setFile(null);
    setOpenDialog(true);
  }

  function closeDialog() {
    setOpenDialog(false);
    setEditing(null);
    setSaving(false);
  }

  async function saveDocument() {
    try {
      setSaving(true);
      setError(null);

      if (!form.contractorName.trim() || !form.contractorEmail.trim() || !form.expiryDate) {
        throw new Error("Contractor name, contractor email, and expiry date are required.");
      }

      if (editing) {
        const res = await fetch(`/api/projects/${projectId}/documents/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            contractorName: form.contractorName,
            contractorEmail: form.contractorEmail,
            expiryDate: form.expiryDate,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to update document");
      } else {
        if (!file) throw new Error("Please attach a document file.");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("contractorName", form.contractorName);
        fd.append("contractorEmail", form.contractorEmail);
        fd.append("expiryDate", form.expiryDate);

        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to add document");
      }

      await fetchAll();
      closeDialog();
    } catch (e) {
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeDocument(doc) {
    if (!confirm("Remove this document? This will delete the uploaded file.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/documents/${doc._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to delete document");
      await fetchAll();
    } catch (e) {
      setError(e?.message || "Failed to delete");
    }
  }

  async function notify(doc) {
    try {
      setError(null);
      showLoadingToast("Sending email...", "Notifying contractor");
      const res = await fetch(
        `/api/projects/${projectId}/documents/${doc._id}/notify`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!data.success || !data.sent) {
        throw new Error(data.error || data.message || "Failed to send email");
      }
      await fetchAll();
      closeDialog();
      showSuccessToast(
        "Notification sent",
        `Email sent to ${doc.contractorEmail || "contractor"}`
      );
    } catch (e) {
      const msg = e?.message || "Failed to send";
      setError(msg);
      closeDialog();
      showErrorToast("Notify failed", msg);
    }
  }

  if (loading) {
    return (
      <Layout activeSection="projects">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout activeSection="projects">
        <div className="p-6">
          <p className="text-red-600 mb-4">
            Project not found or you don't have permission to view it.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowBackIcon className="mr-2" />
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/projects" className="hover:text-blue-600 transition-colors">
            Projects
          </Link>
          <span className="text-gray-400">›</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-blue-600 transition-colors"
          >
            {project.name}
          </Link>
          <span className="text-gray-400">›</span>
          <span className="text-black font-medium">Documents</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-black">Project Documents</h1>
            <p className="text-sm text-gray-600 mt-1">
              {documents.length} document(s) • {expiringSoonCount} expiring within 30 days
            </p>
          </div>
          <button
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            onClick={openAdd}
          >
            <AddIcon className="mr-2 h-4 w-4" />
            Add Document
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg">
              No documents found. Add your first project document.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expiry
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-black">{d.title}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {d.originalName}
                      </div>
                      {d.description ? (
                        <div className="text-sm text-gray-500 mt-1">{d.description}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-black">{d.contractorName}</div>
                      <div className="text-sm text-gray-600">{d.contractorEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                      {d.expiryDate ? format(parseISO(d.expiryDate), "MMM d, yyyy") : "—"}
                      {d.lastNotifiedAt ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Last notified: {format(parseISO(d.lastNotifiedAt), "MMM d, yyyy")}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-1">Not notified yet</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <a
                          className="text-gray-700 hover:text-black p-1 rounded-md hover:bg-gray-100 transition-colors"
                          href={`/api/projects/${projectId}/documents/${d._id}/download?inline=true`}
                          target="_blank"
                          rel="noreferrer"
                          title="View"
                        >
                          <VisibilityIcon className="h-4 w-4" />
                        </a>
                        <button
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                          onClick={() => notify(d)}
                          title="Notify contractor"
                        >
                          <NotificationsIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(d)}
                          title="Edit"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          onClick={() => removeDocument(d)}
                          title="Remove"
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {openDialog && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div
              className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity"
              onClick={closeDialog}
              aria-hidden="true"
            ></div>

            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 relative z-10">
              <span
                className="hidden sm:inline-block sm:align-middle sm:h-screen"
                aria-hidden="true"
              >
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-10">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-black">
                      {editing ? "Edit Document" : "Add Document"}
                    </h3>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={closeDialog}
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!saving) saveDocument();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={form.title}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, title: e.target.value }))
                        }
                        placeholder="e.g. Contractor Agreement"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contractor Name *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={form.contractorName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, contractorName: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contractor Email *
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={form.contractorEmail}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, contractorEmail: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document Expiry Date *
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={form.expiryDate}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, expiryDate: e.target.value }))
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={form.description}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, description: e.target.value }))
                        }
                      />
                    </div>

                    {!editing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Attach Document *
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-gray-700"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supported: PDF, DOC/DOCX, JPG/PNG (as configured in your system).
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6 -mx-4 -mb-4 sm:-mx-6 sm:-mb-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : editing ? "Update" : "Add"}
                      </button>
                      <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                        onClick={closeDialog}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

