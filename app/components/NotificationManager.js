"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Bell,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Eye,
  Filter,
} from "lucide-react";

export default function NotificationManager() {
  const [notifications, setNotifications] = useState([]);
  const [cronStatus, setCronStatus] = useState({
    running: false,
    schedule: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchNotifications();
    fetchCronStatus();
  }, [page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/notifications/email?page=${page}&limit=20${
          filter !== "all" ? `&status=${filter}` : ""
        }`
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const response = await fetch("/api/cron/notifications");
      if (response.ok) {
        const data = await response.json();
        setCronStatus(data);
      }
    } catch (error) {
      console.error("Error fetching cron status:", error);
    }
  };

  const handleCronAction = async (action) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/cron/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message);
        await fetchCronStatus();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to manage cron job");
      }
    } catch (error) {
      console.error("Error managing cron job:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendManualNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/notifications/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(
          `${result.message}. Sent: ${result.sent}, Failed: ${result.failed}`
        );
        await fetchNotifications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send notifications");
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "document_expiry":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Notification Management
          </h2>
          <p className="text-gray-600">
            Manage automated email notifications and view delivery history
          </p>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automated Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Automated Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Daily Email Alerts</p>
                <p className="text-sm text-gray-600">
                  {cronStatus.running
                    ? `Running - ${cronStatus.schedule}`
                    : "Not running"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {cronStatus.running ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Play className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    <Pause className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() =>
                  handleCronAction(cronStatus.running ? "stop" : "start")
                }
                disabled={loading}
                className={
                  cronStatus.running
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }
              >
                {cronStatus.running ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>

              <Button
                onClick={() => fetchCronStatus()}
                variant="outline"
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Manual Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Send immediate notifications for documents expiring within the
              next 30 days.
            </p>

            <Button
              onClick={sendManualNotifications}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Now
            </Button>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Checks for documents expiring in 30, 14, 7, 3, 1 days</p>
              <p>• Sends alerts for expired documents</p>
              <p>• Skips employees without valid email addresses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-600" />
              Notification History
            </CardTitle>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">
                Loading notifications...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate">
                          {notification.message}
                        </p>
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        To: {notification.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(notification.sentAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
