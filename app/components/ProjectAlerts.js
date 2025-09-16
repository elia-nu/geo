"use client";

import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Info,
  AlertOctagon,
} from "lucide-react";

export default function ProjectAlerts({ projectId, userId }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [projectId, userId, searchTerm, typeFilter, severityFilter, statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (projectId) params.append("projectId", projectId);
      if (userId) params.append("recipientId", userId);
      if (typeFilter) params.append("type", typeFilter);
      if (severityFilter) params.append("severity", severityFilter);
      if (statusFilter) params.append("isResolved", statusFilter);

      const response = await fetch(`/api/projects/alerts?${params}`);
      const result = await response.json();

      if (result.success) {
        setAlerts(result.data);
      } else {
        console.error("Failed to fetch alerts:", result.error);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedAlerts.length === 0) {
      alert("Please select alerts to perform this action");
      return;
    }

    try {
      const response = await fetch("/api/projects/alerts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertIds: selectedAlerts,
          action: action,
          resolvedBy: userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSelectedAlerts([]);
        fetchAlerts();
      } else {
        alert("Failed to update alerts: " + result.error);
      }
    } catch (error) {
      console.error("Error updating alerts:", error);
      alert("Failed to update alerts");
    }
  };

  const handleSelectAlert = (alertId) => {
    setSelectedAlerts((prev) =>
      prev.includes(alertId)
        ? prev.filter((id) => id !== alertId)
        : [...prev, alertId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAlerts.length === alerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(alerts.map((alert) => alert._id));
    }
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      low: <Info className="h-4 w-4 text-blue-600" />,
      medium: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      high: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      critical: <AlertOctagon className="h-4 w-4 text-red-600" />,
    };
    return icons[severity] || <Info className="h-4 w-4 text-gray-600" />;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: "bg-blue-100 text-blue-800 border-blue-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      critical: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[severity] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getTypeColor = (type) => {
    const colors = {
      delay: "bg-red-100 text-red-800",
      milestone: "bg-blue-100 text-blue-800",
      budget: "bg-yellow-100 text-yellow-800",
      risk: "bg-orange-100 text-orange-800",
      update: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffInMinutes = Math.floor((now - alertDate) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const unreadAlerts = alerts.filter((alert) => !alert.isRead);
  const unresolvedAlerts = alerts.filter((alert) => !alert.isResolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Alerts</h1>
          <p className="text-gray-600 mt-1">
            Monitor project notifications and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts.length}
              </p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-blue-600">
                {unreadAlerts.length}
              </p>
            </div>
            <EyeOff className="h-8 w-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unresolved</p>
              <p className="text-2xl font-bold text-orange-600">
                {unresolvedAlerts.length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {
                  alerts.filter(
                    (alert) =>
                      alert.severity === "critical" && !alert.isResolved
                  ).length
                }
              </p>
            </div>
            <AlertOctagon className="h-8 w-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <option value="">All Types</option>
            <option value="delay">Delay</option>
            <option value="milestone">Milestone</option>
            <option value="budget">Budget</option>
            <option value="risk">Risk</option>
            <option value="update">Update</option>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="">All Status</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("mark_read")}
              disabled={selectedAlerts.length === 0}
            >
              <Eye className="h-4 w-4 mr-1" />
              Mark Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction("resolve")}
              disabled={selectedAlerts.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolve
            </Button>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={selectedAlerts.length === alerts.length}
              onChange={handleSelectAll}
              className="rounded"
            />
            <span className="text-sm text-gray-600">
              {selectedAlerts.length} of {alerts.length} selected
            </span>
            {selectedAlerts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlerts([])}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {alerts.map((alert) => (
          <Card
            key={alert._id}
            className={`p-6 ${
              !alert.isRead ? "border-l-4 border-l-blue-500" : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                checked={selectedAlerts.includes(alert._id)}
                onChange={() => handleSelectAlert(alert._id)}
                className="mt-1 rounded"
              />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getSeverityIcon(alert.severity)}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {alert.title}
                  </h3>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <Badge className={getTypeColor(alert.type)}>
                    {alert.type}
                  </Badge>
                  {alert.isResolved && (
                    <Badge className="bg-green-100 text-green-800">
                      Resolved
                    </Badge>
                  )}
                  {!alert.isRead && (
                    <Badge className="bg-blue-100 text-blue-800">Unread</Badge>
                  )}
                </div>

                <p className="text-gray-700 mb-3">{alert.message}</p>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>Project: {alert.projectName}</span>
                    {alert.milestoneName && (
                      <span>Milestone: {alert.milestoneName}</span>
                    )}
                    <span>Triggered: {getTimeAgo(alert.triggeredAt)}</span>
                  </div>

                  <div className="flex gap-2">
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction("mark_read")}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Mark Read
                      </Button>
                    )}
                    {!alert.isResolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBulkAction("resolve")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No alerts found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || typeFilter || severityFilter || statusFilter
              ? "Try adjusting your filters to see more alerts."
              : "You're all caught up! No alerts at the moment."}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </Card>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Alert</DialogTitle>
          </DialogHeader>
          <AlertForm
            projectId={projectId}
            onSuccess={() => {
              setShowCreateDialog(false);
              fetchAlerts();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Alert Form Component
function AlertForm({ projectId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    projectId: projectId || "",
    milestoneId: "",
    type: "update",
    severity: "medium",
    title: "",
    message: "",
    recipients: [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert("Failed to create alert: " + result.error);
      }
    } catch (error) {
      console.error("Error creating alert:", error);
      alert("Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Type *
          </label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <option value="delay">Delay</option>
            <option value="milestone">Milestone</option>
            <option value="budget">Budget</option>
            <option value="risk">Risk</option>
            <option value="update">Update</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity *
          </label>
          <Select
            value={formData.severity}
            onValueChange={(value) =>
              setFormData({ ...formData, severity: value })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message *
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          required
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Alert"}
        </Button>
      </div>
    </form>
  );
}

