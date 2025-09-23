"use client";

import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
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
  Breadcrumbs,
  Link as MuiLink,
  Avatar,
  Autocomplete,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import Link from "next/link";

const ProjectTeamPage = ({ params }) => {
  const { id: projectId } = params;

  const [project, setProject] = useState(null);
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Fetch project and team data on component mount
  useEffect(() => {
    fetchProjectData();
    fetchAvailableEmployees();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      const projectData = await projectResponse.json();

      if (projectData.success) {
        setProject(projectData.project);

        // Fetch assigned employees
        const teamResponse = await fetch(
          `/api/projects/${projectId}/assign-employees`
        );
        const teamData = await teamResponse.json();

        if (teamData.success) {
          setAssignedEmployees(teamData.assignedEmployees || []);
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

  const fetchAvailableEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      const data = await response.json();

      if (data.success) {
        setAvailableEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error fetching available employees:", err);
    }
  };

  const handleOpenDialog = () => {
    setSelectedEmployees([]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleEmployeeSelection = (event, newValue) => {
    setSelectedEmployees(newValue);
  };

  const handleAssignEmployees = async () => {
    if (selectedEmployees.length === 0) {
      handleCloseDialog();
      return;
    }

    try {
      const employeeIds = selectedEmployees.map((emp) => emp._id);

      const response = await fetch(
        `/api/projects/${projectId}/assign-employees`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeIds }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
        handleCloseDialog();
      } else {
        setError(data.error || "Failed to assign employees");
      }
    } catch (err) {
      setError("Error assigning employees: " + err.message);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/assign-employees`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employeeId }),
        }
      );

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
      } else {
        setError(data.error || "Failed to remove employee");
      }
    } catch (err) {
      setError("Error removing employee: " + err.message);
    }
  };

  // Filter out already assigned employees from the available list
  const getFilteredEmployees = () => {
    const assignedIds = assignedEmployees.map((emp) => emp._id);
    return availableEmployees.filter((emp) => !assignedIds.includes(emp._id));
  };

  if (loading) {
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

  if (!project) {
    return (
      <Layout activeSection="projects">
        <Box sx={{ p: 3 }}>
          <Typography color="error">
            Project not found or you don't have permission to view it.
          </Typography>
          <Button
            component={Link}
            href="/projects"
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 2 }}
          >
            Back to Projects
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <Box sx={{ p: 3, backgroundColor: "#f5f7fa", minHeight: "100vh" }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <MuiLink
            component={Link}
            href="/projects"
            underline="hover"
            color="inherit"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <ArrowBackIcon sx={{ mr: 0.5, fontSize: 20 }} />
            Projects
          </MuiLink>
          <MuiLink
            component={Link}
            href={`/projects/${projectId}`}
            underline="hover"
            color="inherit"
          >
            {project.name}
          </MuiLink>
          <Typography color="text.primary">Team</Typography>
        </Breadcrumbs>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
            pb: 2,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 600, color: "#1a3e72" }}
          >
            Project Team
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              backgroundColor: "#1a3e72",
              "&:hover": { backgroundColor: "#0d2b5c" },
              borderRadius: "8px",
              px: 3,
            }}
          >
            Assign Employees
          </Button>
        </Box>

        <Paper
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: 600, color: "#1a3e72", mb: 0 }}
            >
              {project.name}
            </Typography>
            <Chip
              label={project.status || "Active"}
              color={
                project.status === "completed"
                  ? "success"
                  : project.status === "on_hold"
                  ? "warning"
                  : "primary"
              }
              sx={{ ml: 2 }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: "#555" }}>
            {project.description}
          </Typography>
        </Paper>

        {error && (
          <Box
            sx={{ mb: 2, p: 3, backgroundColor: "#ffebee", borderRadius: 2 }}
          >
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {assignedEmployees.length === 0 ? (
          <Paper
            sx={{
              textAlign: "center",
              py: 5,
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <PersonIcon sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              No employees assigned to this project yet.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ mt: 2 }}
            >
              Assign Employees
            </Button>
          </Paper>
        ) : (
          <Paper
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <Box
              sx={{
                p: 2,
                backgroundColor: "#1a3e72",
                color: "white",
                display: "flex",
                alignItems: "center",
              }}
            >
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Team Members ({assignedEmployees.length})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: "#f5f7fa" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignedEmployees.map((employee) => (
                    <TableRow
                      key={employee._id}
                      sx={{
                        "&:hover": { backgroundColor: "#f5f7fa" },
                        transition: "background-color 0.2s",
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            sx={{
                              mr: 2,
                              bgcolor: "#1a3e72",
                              width: 40,
                              height: 40,
                            }}
                          >
                            {employee.name ? (
                              employee.name.charAt(0)
                            ) : (
                              <PersonIcon />
                            )}
                          </Avatar>
                          <Typography>
                            {employee.name || "Unknown Employee"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={employee.position || "N/A"}
                          size="small"
                          sx={{
                            backgroundColor: "#e3f2fd",
                            color: "#1a3e72",
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell>{employee.department || "N/A"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Remove from project">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveEmployee(employee._id)}
                            sx={{
                              "&:hover": {
                                backgroundColor: "#ffebee",
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Assign Employees Dialog */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Assign Employees to Project</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                multiple
                id="employee-selection"
                options={getFilteredEmployees()}
                getOptionLabel={(option) =>
                  option.name || "Unknown Employee"
                }
                value={selectedEmployees}
                onChange={handleEmployeeSelection}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Select Employees"
                    placeholder="Search employees"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Avatar sx={{ mr: 2, width: 24, height: 24 }}>
                        {option.name ? (
                          option.name.charAt(0)
                        ) : (
                          <PersonIcon fontSize="small" />
                        )}
                      </Avatar>
                      <Box>
                        <Typography variant="body2">
                          {option.name || "Unknown Employee"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.position || "N/A"} • {option.department || "N/A"}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleAssignEmployees} variant="contained">
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ProjectTeamPage;
