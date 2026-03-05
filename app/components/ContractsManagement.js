"use client";
import React, { useState, useEffect } from "react";
import {
  FileText,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
} from "lucide-react";

export default function ContractsManagement() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, expiring, expired, active
  const [sendingNotifications, setSendingNotifications] = useState({});
  const [notificationResult, setNotificationResult] = useState(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/notifications/contract-expiry/test");
      const data = await response.json();

      if (data.success) {
        // Transform the data to show contracts
        const contractsData = data.employees.map((emp) => ({
          employeeId: emp.employeeId,
          employeeName: emp.name,
          employeeEmail: emp.email,
          employeeType: emp.employeeType,
          contractExpiryDate: emp.contractExpiryDate,
          daysUntilExpiry: emp.daysUntilExpiry,
          status: emp.status,
          shouldNotify: emp.shouldNotify,
        }));
        setContracts(contractsData);
      } else {
        setError(data.error || "Failed to fetch contracts");
      }
    } catch (err) {
      console.error("Error fetching contracts:", err);
      setError("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationForContract = async (contract) => {
    try {
      setSendingNotifications((prev) => ({ ...prev, [contract.employeeId]: true }));
      setNotificationResult(null);
      
      const response = await fetch(
        `/api/notifications/contract-expiry?force=true`,
        { method: "POST" }
      );
      const data = await response.json();

      if (data.success) {
        setNotificationResult({
          type: "success",
          message: `Notifications sent! Sent: ${data.sent}, Failed: ${data.failed}`,
        });
        // Refresh contracts after a short delay
        setTimeout(() => {
          fetchContracts();
        }, 1000);
      } else {
        setNotificationResult({
          type: "error",
          message: data.error || "Failed to send notifications",
        });
      }
    } catch (err) {
      console.error("Error sending notification:", err);
      setNotificationResult({
        type: "error",
        message: "Failed to send notification",
      });
    } finally {
      setSendingNotifications((prev) => ({ ...prev, [contract.employeeId]: false }));
    }
  };

  const getStatusBadge = (daysUntilExpiry, shouldNotify) => {
    if (daysUntilExpiry === null) return null;

    if (daysUntilExpiry < 0) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </span>
      );
    } else if (daysUntilExpiry <= 7) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Urgent ({daysUntilExpiry} days)
        </span>
      );
    } else if (daysUntilExpiry <= 15) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Expiring Soon ({daysUntilExpiry} days)
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Active ({daysUntilExpiry} days)
        </span>
      );
    }
  };

  const getCardColor = (daysUntilExpiry) => {
    if (daysUntilExpiry === null) return "border-gray-200 bg-white";
    if (daysUntilExpiry < 0) return "border-red-300 bg-red-50";
    if (daysUntilExpiry <= 7) return "border-orange-300 bg-orange-50";
    if (daysUntilExpiry <= 15) return "border-yellow-300 bg-yellow-50";
    return "border-green-300 bg-green-50";
  };

  const filteredContracts = contracts.filter((contract) => {
    // Search filter
    const matchesSearch =
      contract.employeeName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      contract.employeeEmail
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (contract.contractExpiryDate &&
        contract.contractExpiryDate.includes(searchTerm));

    // Status filter
    let matchesStatus = true;
    if (filterStatus === "expired") {
      matchesStatus = contract.daysUntilExpiry !== null && contract.daysUntilExpiry < 0;
    } else if (filterStatus === "expiring") {
      matchesStatus =
        contract.daysUntilExpiry !== null &&
        contract.daysUntilExpiry >= 0 &&
        contract.daysUntilExpiry <= 15;
    } else if (filterStatus === "active") {
      matchesStatus =
        contract.daysUntilExpiry !== null && contract.daysUntilExpiry > 15;
    }

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    expired: contracts.filter(
      (c) => c.daysUntilExpiry !== null && c.daysUntilExpiry < 0
    ).length,
    expiring: contracts.filter(
      (c) =>
        c.daysUntilExpiry !== null &&
        c.daysUntilExpiry >= 0 &&
        c.daysUntilExpiry <= 15
    ).length,
    active: contracts.filter(
      (c) => c.daysUntilExpiry !== null && c.daysUntilExpiry > 15
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading contracts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Contract Management</h2>
          <p className="text-gray-600 mt-1">
            Monitor and manage employee contracts
          </p>
        </div>
        <button
          onClick={fetchContracts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Contracts</p>
              <p className="text-2xl font-bold text-black">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-black">{stats.active}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-black">{stats.expiring}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-black">{stats.expired}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Notification Result */}
      {notificationResult && (
        <div
          className={`rounded-lg p-4 ${
            notificationResult.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="font-semibold">{notificationResult.message}</p>
          <button
            onClick={() => setNotificationResult(null)}
            className="mt-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or expiry date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {filteredContracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            {contracts.length === 0
              ? "No contractual employees found"
              : "No contracts match your filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContracts.map((contract) => (
            <div
              key={contract.employeeId}
              className={`bg-white rounded-lg shadow-lg p-6 border-2 ${getCardColor(
                contract.daysUntilExpiry
              )} transition-all hover:shadow-xl`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {contract.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-black">
                      {contract.employeeName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {contract.employeeType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{contract.employeeEmail}</span>
                </div>
                {contract.contractExpiryDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Expires:{" "}
                      {new Date(contract.contractExpiryDate).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  {getStatusBadge(contract.daysUntilExpiry, contract.shouldNotify)}
                  {contract.daysUntilExpiry !== null &&
                    contract.daysUntilExpiry >= 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <TrendingDown className="w-3 h-3" />
                        {contract.daysUntilExpiry} days left
                      </div>
                    )}
                </div>
                {(contract.daysUntilExpiry === null ||
                  contract.daysUntilExpiry <= 15) && (
                  <button
                    onClick={() => sendNotificationForContract(contract)}
                    disabled={sendingNotifications[contract.employeeId]}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingNotifications[contract.employeeId] ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Notification
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

