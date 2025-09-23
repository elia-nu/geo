'use client';

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
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
  TextField,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Badge,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useSearchParams, useRouter } from 'next/navigation';

const ProjectAlertsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  
  const [alerts, setAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Filter state
  const [filters, setFilters] = useState({
    projectId: projectId || '',
    status: '',
    priority: '',
    alertType: ''
  });

  // Fetch alerts and projects on component mount
  useEffect(() => {
    fetchProjects();
    fetchAlerts();
  }, [projectId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.alertType) params.append('alertType', filters.alertType);
      
      const response = await fetch(`/api/project-alerts?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.alerts || []);
      } else {
        setError(data.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      setError('Error fetching alerts: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
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
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    fetchAlerts();
    handleCloseFilterDialog();
  };

  const handleClearFilters = () => {
    setFilters({
      projectId: '',
      status: '',
      priority: '',
      alertType: ''
    });
    
    // Update URL if needed
    if (projectId) {
      router.push('/project-alerts');
    }
  };

  const handleGenerateAlerts = async () => {
    try {
      const response = await fetch('/api/project-alerts', {
        method: 'PUT'
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({
          open: true,
          message: 'Alerts generated successfully',
          severity: 'success'
        });
        fetchAlerts();
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to generate alerts',
          severity: 'error'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error generating alerts: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleUpdateAlertStatus = async (alertId, status) => {
    try {
      const response = await fetch(`/api/project-alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
        setSnackbar({
          open: true,
          message: 'Alert updated successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to update alert',
          severity: 'error'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error updating alert: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/project-alerts/${alertId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchAlerts();
        setSnackbar({
          open: true,
          message: 'Alert deleted successfully',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to delete alert',
          severity: 'error'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Error deleting alert: ' + err.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'DELAY': return <WarningIcon color="warning" />;
      case 'MILESTONE': return <InfoIcon color="info" />;
      case 'CRITICAL': return <ErrorIcon color="error" />;
      default: return <NotificationsIcon />;
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'DELAY': return 'warning';
      case 'MILESTONE': return 'info';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const formatAlertType = (type) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && alerts.length === 0) {
    return (
      <Layout activeSection="projects">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout activeSection="projects">
      <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Project Alerts
          {projectId && projects.length > 0 && (
            <Typography variant="subtitle1" component="span" sx={{ ml: 1 }}>
              for {projects.find(p => p._id === projectId)?.name || 'Project'}
            </Typography>
          )}
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<FilterListIcon />}
            onClick={handleOpenFilterDialog}
            sx={{ mr: 1 }}
          >
            Filter
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={fetchAlerts}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<NotificationsIcon />}
            onClick={handleGenerateAlerts}
          >
            Generate Alerts
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Total Alerts</Typography>
                  <Badge badgeContent={alerts.length} color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">High Priority</Typography>
                  <Badge 
                    badgeContent={alerts.filter(a => a.priority === 'high').length} 
                    color="error" 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Active Alerts</Typography>
                  <Badge 
                    badgeContent={alerts.filter(a => a.status === 'active').length} 
                    color="warning" 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Resolved</Typography>
                  <Badge 
                    badgeContent={alerts.filter(a => a.status === 'resolved').length} 
                    color="success" 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {alerts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" color="textSecondary">
            No alerts found. Generate alerts to monitor project status.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Alert</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert._id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getAlertTypeIcon(alert.alertType)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {alert.message}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {alert.projectName || 'Unknown Project'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatAlertType(alert.alertType)} 
                      size="small" 
                      color={getAlertTypeColor(alert.alertType)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.priority} 
                      size="small" 
                      color={getPriorityColor(alert.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={alert.status} 
                      size="small" 
                      color={alert.status === 'active' ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(alert.createdAt)}
                  </TableCell>
                  <TableCell align="right">
                    {alert.status === 'active' && (
                      <Tooltip title="Mark as resolved">
                        <IconButton 
                          size="small" 
                          color="success"
                          onClick={() => handleUpdateAlertStatus(alert._id, 'resolved')}
                          sx={{ mr: 1 }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete alert">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteAlert(alert._id)}
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
      )}

      {/* Filter Dialog */}
      <Dialog open={openFilterDialog} onClose={handleCloseFilterDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Alerts</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
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
                {projects.map(project => (
                  <MenuItem key={project._id} value={project._id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="normal">
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
            
            <FormControl fullWidth margin="normal">
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
            
            <FormControl fullWidth margin="normal">
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
          <Button onClick={handleClearFilters}>Clear Filters</Button>
          <Button onClick={handleCloseFilterDialog}>Cancel</Button>
          <Button onClick={handleApplyFilters} variant="contained">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    </Layout>
  );
};

export default ProjectAlertsPage;