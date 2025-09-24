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
  Snackbar,
  Skeleton
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterListIcon,
  Dashboard as DashboardIcon,
  PriorityHigh as PriorityHighIcon,
  PlayArrow as ActiveIcon,
  CheckCircle as ResolvedIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { Fade, Slide, Zoom } from '@mui/material';
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
      <Fade in timeout={800}>
        <Box sx={{ 
          p: 3,
          transition: 'all 0.3s ease-in-out'
        }}>
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: { xs: 2, sm: 3, md: 4 },
          mb: 4,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            zIndex: 0
          }} 
        />
        <Box 
          sx={{ 
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            zIndex: 0
          }} 
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'flex-start' }, 
            mb: 2,
            gap: { xs: 2, sm: 0 }
          }}>
            <Box>
              <Typography 
                variant={{ xs: 'h4', sm: 'h3' }}
                component="h1" 
                sx={{ 
                  fontWeight: 700,
                  mb: 1,
                  background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Project Alerts
              </Typography>
              {projectId && projects.length > 0 && (
                <Typography 
                  variant={{ xs: 'body1', sm: 'h6' }}
                  sx={{ 
                    opacity: 0.9,
                    fontWeight: 400
                  }}
                >
                  {projects.find(p => p._id === projectId)?.name || 'Project'}
                </Typography>
              )}
              <Typography variant="body1" sx={{ opacity: 0.8, mt: 1 }}>
                Monitor and manage project alerts in real-time
              </Typography>
            </Box>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1, 
              width: { xs: '100%', sm: 'auto' },
              '& > *': {
                flex: { xs: '1', sm: 'none' }
              }
            }}>
              <Button 
                variant="outlined" 
                startIcon={<FilterListIcon />}
                onClick={handleOpenFilterDialog}
                fullWidth={{ xs: true, sm: false }}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Filter
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchAlerts}
                disabled={loading}
                fullWidth={{ xs: true, sm: false }}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button 
                variant="contained" 
                startIcon={<NotificationsIcon />}
                onClick={handleGenerateAlerts}
                fullWidth={{ xs: true, sm: false }}
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Generate Alerts
                </Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                  Generate
                </Box>
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Slide direction="up" in timeout={600}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
          {loading ? (
            // Loading skeleton for statistics cards
            Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={6} sm={6} md={3} key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    borderRadius: 3,
                    height: { xs: 120, sm: 140 }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Skeleton variant="text" width={60} height={40} />
                    </Box>
                    <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="60%" height={16} />
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <>
              <Grid item xs={6} sm={6} md={3}>
                <Card 
                  elevation={0}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)'
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 2,
                        p: { xs: 1, sm: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: { xs: 1, sm: 0 }
                      }}>
                        <DashboardIcon sx={{ fontSize: { xs: 20, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant={{ xs: 'h4', sm: 'h3' }}
                        sx={{ 
                          fontWeight: 700,
                          background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {alerts.length}
                      </Typography>
                    </Box>
                    <Typography 
                      variant={{ xs: 'body2', sm: 'h6' }}
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5,
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      Total Alerts
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.8,
                        textAlign: { xs: 'center', sm: 'left' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      All project alerts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card 
                  elevation={0}
                  sx={{ 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(240, 147, 251, 0.4)'
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 2,
                        p: { xs: 1, sm: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: { xs: 1, sm: 0 }
                      }}>
                        <PriorityHighIcon sx={{ fontSize: { xs: 20, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant={{ xs: 'h4', sm: 'h3' }}
                        sx={{ 
                          fontWeight: 700,
                          background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {alerts.filter(a => a.priority === 'high').length}
                      </Typography>
                    </Box>
                    <Typography 
                      variant={{ xs: 'body2', sm: 'h6' }}
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5,
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      High Priority
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.8,
                        textAlign: { xs: 'center', sm: 'left' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Critical alerts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card 
                  elevation={0}
                  sx={{ 
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(79, 172, 254, 0.4)'
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 2,
                        p: { xs: 1, sm: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: { xs: 1, sm: 0 }
                      }}>
                        <ActiveIcon sx={{ fontSize: { xs: 20, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant={{ xs: 'h4', sm: 'h3' }}
                        sx={{ 
                          fontWeight: 700,
                          background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {alerts.filter(a => a.status === 'active').length}
                      </Typography>
                    </Box>
                    <Typography 
                      variant={{ xs: 'body2', sm: 'h6' }}
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5,
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      Active Alerts
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.8,
                        textAlign: { xs: 'center', sm: 'left' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Pending resolution
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={6} md={3}>
                <Card 
                  elevation={0}
                  sx={{ 
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(67, 233, 123, 0.4)'
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 2,
                        p: { xs: 1, sm: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: { xs: 1, sm: 0 }
                      }}>
                        <ResolvedIcon sx={{ fontSize: { xs: 20, sm: 28 } }} />
                      </Box>
                      <Typography 
                        variant={{ xs: 'h4', sm: 'h3' }}
                        sx={{ 
                          fontWeight: 700,
                          background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {alerts.filter(a => a.status === 'resolved').length}
                      </Typography>
                    </Box>
                    <Typography 
                      variant={{ xs: 'body2', sm: 'h6' }}
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5,
                        textAlign: { xs: 'center', sm: 'left' }
                      }}
                    >
                      Resolved
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        opacity: 0.8,
                        textAlign: { xs: 'center', sm: 'left' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Completed alerts
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
          </Grid>
        </Box>
      </Slide>

      {alerts.length === 0 ? (
        <Paper 
          elevation={0} 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="h5" color="textSecondary" sx={{ mb: 2, fontWeight: 600 }}>
            No alerts found
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Generate alerts to monitor project status and stay informed about important updates.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<NotificationsIcon />}
            onClick={handleGenerateAlerts}
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 4,
              py: 1.5
            }}
          >
            Generate Your First Alert
          </Button>
        </Paper>
      ) : (
        <Slide direction="up" in timeout={800}>
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
              }
            }}
          >
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: { xs: 800, md: 650 } }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2, minWidth: 250 }}>Alert</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2, display: { xs: 'none', md: 'table-cell' } }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2, display: { xs: 'none', sm: 'table-cell' } }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2, display: { xs: 'none', lg: 'table-cell' } }}>Created</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', py: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeleton for table rows
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Skeleton variant="rounded" width={40} height={40} />
                          <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 0.5 }} />
                            <Skeleton variant="text" width="40%" height={16} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Skeleton variant="text" width={100} height={20} />
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Skeleton variant="rounded" width={80} height={24} />
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Skeleton variant="rounded" width={70} height={24} />
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Skeleton variant="rounded" width={70} height={24} />
                      </TableCell>
                      <TableCell sx={{ py: 3 }}>
                        <Skeleton variant="text" width={80} height={20} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 3 }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Skeleton variant="rounded" width={32} height={32} />
                          <Skeleton variant="rounded" width={32} height={32} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  alerts.map((alert, index) => (
                    <TableRow 
                      key={alert._id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'scale(1.001)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        },
                        transition: 'all 0.2s ease-in-out',
                        borderLeft: `4px solid ${alert.priority === 'high' ? '#f44336' : alert.priority === 'medium' ? '#ff9800' : '#2196f3'}`,
                        backgroundColor: index % 2 === 0 ? 'transparent' : 'grey.25'
                      }}
                    >
                    <TableCell sx={{ py: 3, maxWidth: { xs: 200, sm: 300 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ 
                          backgroundColor: getAlertTypeColor(alert.alertType) === 'error' ? '#ffebee' : 
                                          getAlertTypeColor(alert.alertType) === 'warning' ? '#fff3e0' : '#e3f2fd',
                          borderRadius: 2,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 40,
                          height: 40
                        }}>
                          {getAlertTypeIcon(alert.alertType)}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: 500,
                              mb: 0.5,
                              wordBreak: 'break-word',
                              lineHeight: 1.4,
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Alert ID: {alert._id.slice(-8)}
                          </Typography>
                          <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Project: {alert.projectName || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 3, display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {alert.projectName || 'Unknown Project'}
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
                          borderRadius: 2
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
                          minWidth: 70
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3, display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip 
                        label={alert.status.toUpperCase()} 
                        size="small" 
                        variant="outlined"
                        color={alert.status === 'active' ? 'warning' : 'success'}
                        sx={{ 
                          fontWeight: 500,
                          borderRadius: 2,
                          minWidth: 80
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 3, display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(alert.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1, 
                        justifyContent: 'flex-end',
                        alignItems: { xs: 'flex-end', sm: 'center' }
                      }}>
                        <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 1 }}>
                          <Chip 
                            label={alert.status.toUpperCase()} 
                            size="small" 
                            variant="outlined"
                            color={alert.status === 'active' ? 'warning' : 'success'}
                            sx={{ 
                              fontWeight: 500,
                              borderRadius: 2,
                              fontSize: '0.75rem'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {alert.status === 'active' && (
                            <Tooltip title="Mark as resolved" arrow>
                              <IconButton 
                                size="small" 
                                onClick={() => handleUpdateAlertStatus(alert._id, 'resolved')}
                                sx={{ 
                                  backgroundColor: 'success.light',
                                  color: 'success.contrastText',
                                  '&:hover': {
                                    backgroundColor: 'success.main',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <CheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete alert" arrow>
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteAlert(alert._id)}
                              sx={{ 
                                backgroundColor: 'error.light',
                                color: 'error.contrastText',
                                '&:hover': {
                                  backgroundColor: 'error.main',
                                  transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Slide>
      )}

      {/* Filter Dialog */}
      <Dialog 
        open={openFilterDialog} 
        onClose={handleCloseFilterDialog} 
        maxWidth="md" 
        fullWidth
        TransitionComponent={Zoom}
        transitionDuration={400}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            transition: 'all 0.3s ease-in-out'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 3
        }}>
          <FilterListIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Filter Alerts
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Customize your alert view with advanced filters
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="project-label" sx={{ fontWeight: 500 }}>Project</InputLabel>
                <Select
                  labelId="project-label"
                  id="projectId"
                  name="projectId"
                  value={filters.projectId}
                  label="Project"
                  onChange={handleFilterChange}
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#667eea'
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DashboardIcon fontSize="small" />
                      All Projects
                    </Box>
                  </MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project._id} value={project._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          backgroundColor: 'primary.main' 
                        }} />
                        {project.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label" sx={{ fontWeight: 500 }}>Status</InputLabel>
                <Select
                  labelId="status-label"
                  id="status"
                  name="status"
                  value={filters.status}
                  label="Status"
                  onChange={handleFilterChange}
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#667eea'
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotificationsIcon fontSize="small" />
                      All Statuses
                    </Box>
                  </MenuItem>
                  <MenuItem value="active">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ActiveIcon fontSize="small" color="warning" />
                      Active
                    </Box>
                  </MenuItem>
                  <MenuItem value="resolved">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ResolvedIcon fontSize="small" color="success" />
                      Resolved
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="priority-label" sx={{ fontWeight: 500 }}>Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priority"
                  name="priority"
                  value={filters.priority}
                  label="Priority"
                  onChange={handleFilterChange}
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#667eea'
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUpIcon fontSize="small" />
                      All Priorities
                    </Box>
                  </MenuItem>
                  <MenuItem value="high">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PriorityHighIcon fontSize="small" color="error" />
                      High
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon fontSize="small" color="warning" />
                      Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="low">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" color="info" />
                      Low
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="alertType-label" sx={{ fontWeight: 500 }}>Alert Type</InputLabel>
                <Select
                  labelId="alertType-label"
                  id="alertType"
                  name="alertType"
                  value={filters.alertType}
                  label="Alert Type"
                  onChange={handleFilterChange}
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#667eea'
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotificationsIcon fontSize="small" />
                      All Types
                    </Box>
                  </MenuItem>
                  <MenuItem value="DELAY">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon fontSize="small" color="warning" />
                      Delay
                    </Box>
                  </MenuItem>
                  <MenuItem value="MILESTONE">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" color="info" />
                      Milestone
                    </Box>
                  </MenuItem>
                  <MenuItem value="CRITICAL">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorIcon fontSize="small" color="error" />
                      Critical
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          
          {/* Filter Summary */}
          <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(102, 126, 234, 0.1)', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Active Filters
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {filters.projectId && (
                <Chip 
                  label={`Project: ${projects.find(p => p._id === filters.projectId)?.name || 'Unknown'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.status && (
                <Chip 
                  label={`Status: ${filters.status}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.priority && (
                <Chip 
                  label={`Priority: ${filters.priority}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {filters.alertType && (
                <Chip 
                  label={`Type: ${filters.alertType}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {!filters.projectId && !filters.status && !filters.priority && !filters.alertType && (
                <Typography variant="body2" color="text.secondary">
                  No filters applied - showing all alerts
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <Button 
            onClick={handleClearFilters}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              px: 3,
              borderColor: 'grey.300',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'grey.400',
                backgroundColor: 'grey.50'
              }
            }}
          >
            Clear All
          </Button>
          <Button 
            onClick={handleCloseFilterDialog}
            sx={{ 
              borderRadius: 2,
              px: 3,
              color: 'text.secondary'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApplyFilters} 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              px: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
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
      </Fade>
    </Layout>
  );
};

export default ProjectAlertsPage;