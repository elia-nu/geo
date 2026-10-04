"use client";
import React, { useState, useEffect, useMemo } from "react";
import { 
  FileText, Search, Filter, Download, CheckCircle, XCircle, Clock, Eye, 
  Loader2, AlertCircle, Calendar, User, Building2, X, ChevronDown, Check
} from "lucide-react";
import Pagination from "./ui/Pagination";
import ImageWithLoading from "./ImageWithLoading";

export default function AdminAttendanceDocuments() {
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchDocuments();
    fetchDepartments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendance/documents");
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      const docs = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.documents)
        ? data.documents
        : Array.isArray(data)
        ? data
        : [];
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      const data = await res.json();
      const depts = Array.isArray(data.departments)
        ? data.departments
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setDepartments(depts);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const handleAction = async (documentId, status, notes = "") => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/attendance/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          status,
          supervisorId: "admin",
          supervisorNotes: notes,
          reviewDate: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error(`Failed to ${status} document`);
      
      setSuccess(`Document successfully ${status}`);
      setDetailsModalOpen(false);
      setApproveModalOpen(false);
      setRejectModalOpen(false);
      setRejectionReason("");
      setSelectedDoc(null);
      
      // Refresh list
      fetchDocuments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for document types
  const getDocTypeLabel = (type) => {
    const types = {
      absence: "Absence Request",
      late: "Late Arrival",
      early: "Early Departure",
      medical: "Medical Certificate",
      other: "Other Document"
    };
    return types[type] || type;
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    }
  };

  // Filtered & Paginated Data
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchStatus = statusFilter === "all" || doc.status?.toLowerCase() === statusFilter.toLowerCase();
      const empName = doc.employeeName || doc.employee?.name || "";
      const dept = doc.department || doc.employee?.department || "";
      const matchDept =
        departmentFilter === "all" ||
        dept.toLowerCase() === departmentFilter.toLowerCase() ||
        doc.departmentId === departmentFilter;
      const matchSearch =
        searchTerm === "" ||
        empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.reason || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDocTypeLabel(doc.type).toLowerCase().includes(searchTerm.toLowerCase());

      let matchDate = true;
      if (dateRange.start && dateRange.end) {
        const docDate = new Date(doc.requestDate || doc.date || doc.createdAt);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        matchDate = docDate >= start && docDate <= end;
      }

      return matchStatus && matchDept && matchSearch && matchDate;
    });
  }, [documents, statusFilter, departmentFilter, searchTerm, dateRange]);

  const stats = useMemo(() => {
    return {
      total: documents.length,
      pending: documents.filter(d => (!d.status || d.status.toLowerCase() === 'pending')).length,
      approved: documents.filter(d => d.status?.toLowerCase() === 'approved').length,
      rejected: documents.filter(d => d.status?.toLowerCase() === 'rejected').length
    };
  }, [documents]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocs.slice(start, start + itemsPerPage);
  }, [filteredDocs, currentPage]);

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);

  const exportCSV = () => {
    if (filteredDocs.length === 0) return;
    
    const headers = ['Employee', 'Type', 'Date', 'Reason', 'Status', 'Submitted At', 'Reviewer Notes'];
    const csvData = filteredDocs.map(doc => [
      `"${doc.employeeName || ''}"`,
      `"${getDocTypeLabel(doc.type)}"`,
      `"${new Date(doc.date || doc.createdAt).toLocaleDateString()}"`,
      `"${(doc.reason || '').replace(/"/g, '""')}"`,
      `"${doc.status || 'Pending'}"`,
      `"${new Date(doc.createdAt).toLocaleString()}"`,
      `"${(doc.supervisorNotes || '').replace(/"/g, '""')}"`
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_documents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openApprove = (doc) => {
    setSelectedDoc(doc);
    setApproveModalOpen(true);
  };

  const openReject = (doc) => {
    setSelectedDoc(doc);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const openDetails = (doc) => {
    setSelectedDoc(doc);
    setDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Toast Notifications */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 pb-24 pt-8 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-400" />
                Review Attendance Documents
              </h1>
              <p className="text-slate-300 mt-2">
                Manage and review attendance justifications, medical certificates, and other employee submissions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 -mt-12 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Review</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Approved</p>
              <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Rejected</p>
              <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-6">
            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-full lg:w-auto overflow-x-auto">
              {['all', 'pending', 'approved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                    statusFilter === status 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {status} {status === 'pending' && stats.pending > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">{stats.pending}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <div className="relative flex-grow sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, reason..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id || d} value={d.name || d}>{d.name || d}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type & Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Files</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium">Loading documents...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Filter className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900 mb-1">No documents found</p>
                        <p>Try adjusting your filters or search terms.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase overflow-hidden shrink-0">
                            {doc.employeeAvatar ? (
                              <img src={doc.employeeAvatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              doc.employeeName ? doc.employeeName.substring(0, 2) : <User className="w-5 h-5" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{doc.employeeName || 'Unknown Employee'}</div>
                            <div className="text-xs text-slate-500">{doc.department || 'No Department'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{getDocTypeLabel(doc.type)}</div>
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(doc.date || doc.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 line-clamp-2 max-w-xs" title={doc.reason || doc.description}>
                          {doc.reason || doc.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {doc.files && doc.files.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            <FileText className="w-3 h-3 mr-1.5" />
                            {doc.files.length} file(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openDetails(doc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {(!doc.status || doc.status.toLowerCase() === 'pending') && (
                            <>
                              <button
                                onClick={() => openApprove(doc)}
                                className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openReject(doc)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {detailsModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Document Details
              </h3>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Employee Info</h4>
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase overflow-hidden shrink-0">
                      {selectedDoc.employeeAvatar ? (
                        <img src={selectedDoc.employeeAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        selectedDoc.employeeName ? selectedDoc.employeeName.substring(0, 2) : <User className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{selectedDoc.employeeName}</p>
                      <p className="text-sm text-slate-500">{selectedDoc.department || 'Department N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Request Info</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <dt className="text-slate-500">Type:</dt>
                    <dd className="font-medium text-slate-900">{getDocTypeLabel(selectedDoc.type)}</dd>
                    
                    <dt className="text-slate-500">Date:</dt>
                    <dd className="font-medium text-slate-900">{new Date(selectedDoc.date || selectedDoc.createdAt).toLocaleDateString()}</dd>
                    
                    <dt className="text-slate-500">Status:</dt>
                    <dd>{getStatusBadge(selectedDoc.status)}</dd>
                    
                    <dt className="text-slate-500">Submitted:</dt>
                    <dd className="font-medium text-slate-900">{new Date(selectedDoc.createdAt).toLocaleString()}</dd>
                  </dl>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Reason / Description</h4>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedDoc.reason || selectedDoc.description || 'No description provided.'}</p>
                </div>
              </div>

              {selectedDoc.status !== 'pending' && selectedDoc.supervisorNotes && (
                <div className={`mb-8 rounded-xl p-4 border ${selectedDoc.status === 'approved' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                  <h4 className={`text-sm font-semibold uppercase tracking-wider mb-2 ${selectedDoc.status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
                    Reviewer Notes
                  </h4>
                  <p className={`text-sm ${selectedDoc.status === 'approved' ? 'text-green-900' : 'text-red-900'}`}>
                    {selectedDoc.supervisorNotes}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Attached Files</h4>
                {selectedDoc.files && selectedDoc.files.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedDoc.files.map((file, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-32 bg-slate-100 relative group flex items-center justify-center">
                          {file.fileType && file.fileType.startsWith('image/') ? (
                            <ImageWithLoading
                              src={file.filePath || file.url}
                              alt={file.originalName}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <FileText className="w-12 h-12 text-slate-300" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={file.filePath || file.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition-colors">
                              <Download className="w-5 h-5" />
                            </a>
                          </div>
                        </div>
                        <div className="p-3 border-t border-slate-100">
                          <p className="text-sm font-medium text-slate-900 truncate" title={file.originalName}>{file.originalName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(file.fileSize / 1024 / 1024).toFixed(2)} MB • {file.fileType || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-sm">No files attached to this request.</p>
                )}
              </div>
            </div>

            {(!selectedDoc.status || selectedDoc.status.toLowerCase() === 'pending') && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => openReject(selectedDoc)}
                  disabled={actionLoading}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => openApprove(selectedDoc)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                >
                  Approve Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Approve Document?</h3>
              <p className="text-slate-500 text-center text-sm mb-6">
                Are you sure you want to approve this {getDocTypeLabel(selectedDoc.type).toLowerCase()} from <span className="font-medium text-slate-700">{selectedDoc.employeeName}</span>?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setApproveModalOpen(false)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(selectedDoc._id || selectedDoc.id, "approved")}
                  disabled={actionLoading}
                  className="flex-1 flex justify-center items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-70"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Yes, Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject Document
              </h3>
              <button 
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-500 text-sm mb-4">
                Please provide a reason for rejecting this document from <span className="font-medium text-slate-700">{selectedDoc.employeeName || selectedDoc.employee?.name}</span>. This will be visible to the employee.
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm min-h-[120px] resize-y mb-2"
                required
              />
              {rejectionReason.trim().length === 0 && (
                <p className="text-xs text-red-500 flex items-center mt-1">
                  <AlertCircle className="w-3 h-3 mr-1" /> A rejection reason is required
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedDoc._id || selectedDoc.id, "rejected", rejectionReason)}
                disabled={actionLoading || rejectionReason.trim().length === 0}
                className="flex-1 flex justify-center items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
