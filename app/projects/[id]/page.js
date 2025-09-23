"use client";

import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  Link as MuiLink,
} from "@mui/material";
import {
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { format, parseISO } from "date-fns";

const ProjectDetailPage = ({ params }) => {
  const { id: projectId } = params;

  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch project data on component mount
  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);
        
        // Set milestones from project data if available
        if (projectData.project.milestones && projectData.project.milestones.length > 0) {
          setMilestones(projectData.project.milestones);
        }

        // Fetch assigned employees
        const teamResponse = await fetch(
          `/api/projects/${projectId}/assign-employees`
        );
        const teamData = await teamResponse.json();

        if (teamData.success) {
          setAssignedEmployees(teamData.assignedEmployees || []);
        }

        // Fetch project alerts
        try {
          const alertsResponse = await fetch(`/api/project-alerts?projectId=${projectId}`);
          const alertsData = await alertsResponse.json();
          
          if (alertsData.success) {
            setAlerts(alertsData.alerts || []);
          }
        } catch (alertErr) {
          console.error("Error fetching project alerts:", alertErr);
        }
      } else {
        setError(projectData.error || "Failed to fetch project details");
      }
    } catch (err) {
      setError("Error fetching project data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "primary";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "warning":
        return <WarningIcon color="warning" />;
      case "success":
        return <CheckCircleIcon color="success" />;
      case "info":
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <Typography variant="h6">Loading project details...</Typography>
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Box>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <Typography variant="h6">Project not found</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/projects" underline="hover">
            Projects
          </MuiLink>
          <Typography color="text.primary">{project.name}</Typography>
        </Breadcrumbs>

        {/* Project Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {project.name}
            </Typography>
            <Chip
              label={project.status || "Active"}
              color={getStatusColor(project.status)}
              size="small"
            />
          </Box>
          <Button
            variant="contained"
            component={Link}
            href={`/projects/${projectId}/team`}
            startIcon={<PeopleIcon />}
          >
            Manage Team
          </Button>
        </Box>

        {/* Project Description */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body1">{project.description}</Typography>
        </Paper>

        {/* Project Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Task
                </Typography>
                <Typography variant="h5" component="div">
                  5
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Budget
                </Typography>
                <Typography variant="h5" component="div">
                  $ 500,00
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total Expense
                </Typography>
                <Typography variant="h5" component="div">
                  $ 150,00
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Duration
                </Typography>
                <Typography variant="h5" component="div">
                  {project.startDate && project.endDate
                    ? `${format(
                        parseISO(project.startDate),
                        "MMM dd, yyyy"
                      )} - ${format(parseISO(project.endDate), "MMM dd, yyyy")}`
                    : "Not specified"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Team Members Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h2">
                  <PeopleIcon
                    sx={{ verticalAlign: "middle", mr: 1 }}
                    color="primary"
                  />
                  Team Members
                </Typography>
                <Button
                  component={Link}
                  href={`/projects/${projectId}/team`}
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                >
                  View All
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {assignedEmployees.length > 0 ? (
                <List>
                  {assignedEmployees.slice(0, 3).map((employee) => (
                    <ListItem key={employee._id}>
                      <ListItemAvatar>
                        <Avatar>
                          {employee.name ? employee.name.charAt(0) : "U"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={employee.name}
                        secondary={employee.position || employee.department || ""}
                      />
                      <Chip
                        label={employee.department || "Department"}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No team members assigned to this project.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Milestones Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h2">
                  <TimelineIcon
                    sx={{ verticalAlign: "middle", mr: 1 }}
                    color="primary"
                  />
                  Milestones
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  variant="outlined"
                >
                  Add
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {milestones && milestones.length > 0 ? (
                <List>
                  {milestones.map((milestone) => (
                    <ListItem key={milestone._id} sx={{ display: "block", mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle1">
                          {milestone.title}
                        </Typography>
                        <Chip
                          label={milestone.status}
                          color={getStatusColor(milestone.status)}
                          size="small"
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <CalendarIcon
                          fontSize="small"
                          sx={{ mr: 1, color: "text.secondary" }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Due: {format(new Date(milestone.dueDate), "MMM dd, yyyy")}
                        </Typography>
                      </Box>
                      <Box sx={{ width: "100%" }}>
                        <LinearProgress
                          variant="determinate"
                          value={milestone.progress || 0}
                          sx={{ height: 8, borderRadius: 5 }}
                        />
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ mt: 0.5, textAlign: "right" }}
                        >
                          {milestone.progress || 0}% Complete
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No milestones defined for this project.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Alerts Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h2">
                  <NotificationsIcon
                    sx={{ verticalAlign: "middle", mr: 1 }}
                    color="primary"
                  />
                  Project Alerts
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {alerts.length > 0 ? (
                <List>
                  {alerts.map((alert) => (
                    <ListItem key={alert._id}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "transparent" }}>
                          {getAlertIcon(alert.alertType || alert.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={alert.message}
                        secondary={format(parseISO(alert.createdAt || alert.date), "MMM dd, yyyy")}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No alerts for this project.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Activity Log Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h2">
                  Activity Log
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Activity logs will be displayed here.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default ProjectDetailPage;