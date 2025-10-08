"use client";

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterListIcon,
  PlayArrow as ActiveIcon,
  CheckCircle as ResolvedIcon,
} from "@mui/icons-material";
import { useSearchParams, useRouter } from "next/navigation";

const ProjectAlertsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");

  const [alerts, setAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Filter state
  const [filters, setFilters] = useState({
    projectId: projectId || "",
    status: "",
    priority: "",
    alertType: "",
  });

  // Fetch alerts and projects on component mount
  useEffect(() => {
    fetchProjects();
    // Generate alerts first for freshest data (scoped to project when present)
    (async () => {
      try {
        const url = projectId
          ? `/api/project-alerts?projectId=${projectId}`
          : "/api/project-alerts";
        await fetch(url, { method: "PUT" });
      } catch (e) {
        console.warn("Alert generation failed", e);
      } finally {
        fetchAlerts();
      }
    })();
  }, [projectId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.alertType) params.append("alertType", filters.alertType);

      const response = await fetch(`/api/project-alerts?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts || []);
      } else {
        setError(data.error || "Failed to fetch alerts");
      }
    } catch (err) {
      setError("Error fetching alerts: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const handleOpenFilterDialog = () => {
    setOpenFilterDialog(true);
  };

  const handleCloseFilterDialog = () => {
    setOpenFilterDialog(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    fetchAlerts();
    handleCloseFilterDialog();
  };

  const handleClearFilters = () => {
    setFilters({
      projectId: "",
      status: "",
      priority: "",
      alertType: "",
    });

    // Update URL if needed
    if (projectId) {
      router.push("/project-alerts");
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      const url = projectId
        ? `/api/project-alerts?projectId=${projectId}`
        : "/api/project-alerts";
      const response = await fetch(url, { method: "PUT" });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: "Alerts generated successfully",
          severity: "success",
        });
        fetchAlerts();
      } else {
        setSnackbar({
          open: true,
          message: data.error || "Failed to generate alerts",
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error generating alerts: " + err.message,
        severity: "error",
      });
    }
  };

  const handleUpdateAlertStatus = async (alertId, status) => {
    try {
      const response = await fetch(`/api/project-alerts/${alertId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
        setSnackbar({
          open: true,
          message: "Alert updated successfully",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || "Failed to update alert",
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error updating alert: " + err.message,
        severity: "error",
      });
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/project-alerts/${alertId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
        setSnackbar({
          open: true,
          message: "Alert deleted successfully",
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || "Failed to delete alert",
          severity: "error",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Error deleting alert: " + err.message,
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const getAlertTypeIcon = (type) => {
    const t = (type || "").toLowerCase();
    if (
      t === "overdue_project" ||
      t === "missed_milestone" ||
      t === "overdue_task"
    )
      return <ErrorIcon color="error" />;
    if (
      t === "approaching_deadline" ||
      t === "approaching_milestone" ||
      t === "approaching_task_deadline"
    )
      return <WarningIcon color="warning" />;
    return <InfoIcon color="info" />;
  };

  const getAlertTypeColor = (type) => {
    const t = (type || "").toLowerCase();
    if (
      t === "overdue_project" ||
      t === "missed_milestone" ||
      t === "overdue_task"
    )
      return "error";
    if (
      t === "approaching_deadline" ||
      t === "approaching_milestone" ||
      t === "approaching_task_deadline"
    )
      return "warning";
    return "info";
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const formatAlertType = (type) => {
    const map = {
      approaching_deadline: "Approaching Project Deadline",
      overdue_project: "Overdue Project",
      approaching_milestone: "Approaching Milestone",
      missed_milestone: "Missed Milestone",
      approaching_task_deadline: "Approaching Task Deadline",
      overdue_task: "Overdue Task",
      low_progress: "Low Progress",
    };
    return map[(type || "").toLowerCase()] || type || "Alert";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && alerts.length === 0) {
    return (
      <Layout activeSection="projects">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Project Alerts
          </Typography>
          {projectId && projects.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {projects.find((p) => p._id === projectId)?.name || "Project"}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleOpenFilterDialog}
          >
            Filter
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAlerts}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="contained"
            startIcon={<NotificationsIcon />}
            onClick={handleGenerateAlerts}
          >
            Generate Alerts
          </Button>
          <Chip label={`Total: ${alerts.length}`} size="small" />
          <Chip
            label={`Active: ${
              alerts.filter((a) => a.status === "active").length
            }`}
            size="small"
          />
          <Chip
            label={`Resolved: ${
              alerts.filter((a) => a.status === "resolved").length
            }`}
            size="small"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Minimal summary above acts as KPI; drop decorative cards */}

        {alerts.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ textAlign: "center", py: 6, borderRadius: 2 }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              No alerts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Generate alerts to monitor project status.
            </Typography>
            <Button
              variant="contained"
              startIcon={<NotificationsIcon />}
              onClick={handleGenerateAlerts}
            >
              Generate Alerts
            </Button>
          </Paper>
        ) : (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: { xs: 800, md: 650 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Alert</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        display: { xs: "none", md: "table-cell" },
                      }}
                    >
                      Project
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        display: { xs: "none", sm: "table-cell" },
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        display: { xs: "none", lg: "table-cell" },
                      }}
                    >
                      Created
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert._id}>
                      <TableCell sx={{ py: 3, maxWidth: { xs: 200, sm: 300 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              backgroundColor:
                                getAlertTypeColor(alert.alertType) === "error"
                                  ? "#ffebee"
                                  : getAlertTypeColor(alert.alertType) ===
                                    "warning"
                                  ? "#fff3e0"
                                  : "#e3f2fd",
                              borderRadius: 2,
                              p: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 40,
                              height: 40,
                            }}
                          >
                            {getAlertTypeIcon(alert.alertType)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 500,
                                mb: 0.5,
                                wordBreak: "break-word",
                                lineHeight: 1.4,
                                fontSize: { xs: "0.875rem", sm: "1rem" },
                              }}
                            >
                              {alert.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Alert ID: {alert._id.slice(-8)}
                            </Typography>
                            <Box
                              sx={{
                                display: { xs: "block", md: "none" },
                                mt: 1,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Project: {alert.projectName || "Unknown"}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 3,
                          display: { xs: "none", md: "table-cell" },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {alert.projectName || "Unknown Project"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Chip
                          label={formatAlertType(alert.alertType)}
                          size="small"
                          variant="outlined"
                          color={getAlertTypeColor(alert.alertType)}
                          sx={{
                            fontWeight: 500,
                            borderRadius: 2,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Chip
                          label={alert.priority.toUpperCase()}
                          size="small"
                          variant="filled"
                          color={getPriorityColor(alert.priority)}
                          sx={{
                            fontWeight: 600,
                            borderRadius: 2,
                            minWidth: 70,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 3,
                          display: { xs: "none", sm: "table-cell" },
                        }}
                      >
                        <Chip
                          label={alert.status.toUpperCase()}
                          size="small"
                          variant="outlined"
                          color={
                            alert.status === "active" ? "warning" : "success"
                          }
                          sx={{
                            fontWeight: 500,
                            borderRadius: 2,
                            minWidth: 80,
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 3,
                          display: { xs: "none", lg: "table-cell" },
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(alert.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                        >
                          {alert.status === "active" && (
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleUpdateAlertStatus(alert._id, "resolved")
                              }
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteAlert(alert._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Filter Dialog (minimal) */}
        <Dialog
          open={openFilterDialog}
          onClose={handleCloseFilterDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Filter Alerts</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="project-label">Project</InputLabel>
                <Select
                  labelId="project-label"
                  id="projectId"
                  name="projectId"
                  value={filters.projectId}
                  label="Project"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Projects</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project._id} value={project._id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={filters.status}
                  label="Status"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  name="priority"
                  value={filters.priority}
                  label="Priority"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="alertType-label">Alert Type</InputLabel>
                <Select
                  labelId="alertType-label"
                  id="alertType"
                  name="alertType"
                  value={filters.alertType}
                  label="Alert Type"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="DELAY">Delay</MenuItem>
                  <MenuItem value="MILESTONE">Milestone</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClearFilters} variant="text">
              Clear
            </Button>
            <Button onClick={handleCloseFilterDialog}>Cancel</Button>
            <Button onClick={handleApplyFilters} variant="contained">
              Apply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default ProjectAlertsPage;
