'use client';

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, parseISO } from 'date-fns';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    startDate: null,
    endDate: null
  });

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError('Error fetching projects: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMenu = (event, projectId) => {
    setAnchorEl(event.currentTarget);
    setSelectedProjectId(projectId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedProjectId(null);
  };

  const handleOpenDialog = (project = null) => {
    if (project) {
      setCurrentProject(project);
      setFormData({
        name: project.name,
        description: project.description,
        category: project.category,
        startDate: new Date(project.startDate),
        endDate: new Date(project.endDate)
      });
    } else {
      setCurrentProject(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        startDate: null,
        endDate: null
      });
    }
    setOpenDialog(true);
    handleCloseMenu();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString()
      };

      const url = currentProject 
        ? `/api/projects/${currentProject._id}` 
        : '/api/projects';
      
      const method = currentProject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
        handleCloseDialog();
      } else {
        setError(data.error || 'Failed to save project');
      }
    } catch (err) {
      setError('Error saving project: ' + err.message);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchProjects();
      } else {
        setError(data.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Error deleting project: ' + err.message);
    }
    
    handleCloseMenu();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not_started': return 'default';
      case 'in_progress': return 'primary';
      case 'completed': return 'success';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const formatStatus = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
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
      <Box sx={{ p: 3, backgroundColor: '#f5f7fa' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4,
          pb: 2,
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: '#1a3e72' }}>
            Projects Dashboard
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ 
              backgroundColor: '#1a3e72', 
              '&:hover': { backgroundColor: '#0d2b5c' },
              borderRadius: '8px',
              px: 3
            }}
          >
            New Project
          </Button>
        </Box>
        
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: 500 }}>
            Filter by status:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label="All"
              onClick={() => setStatusFilter('all')}
              color={statusFilter === 'all' ? 'primary' : 'default'}
              sx={{ 
                fontWeight: 500,
                backgroundColor: statusFilter === 'all' ? '#1a3e72' : undefined,
                color: statusFilter === 'all' ? 'white' : undefined,
                '&:hover': { opacity: 0.9 }
              }}
            />
            <Chip 
              label="Not Started"
              onClick={() => setStatusFilter('not_started')}
              color={statusFilter === 'not_started' ? 'primary' : 'default'}
              sx={{ 
                fontWeight: 500,
                backgroundColor: statusFilter === 'not_started' ? '#1a3e72' : undefined,
                color: statusFilter === 'not_started' ? 'white' : undefined,
                '&:hover': { opacity: 0.9 }
              }}
            />
            <Chip 
              label="In Progress"
              onClick={() => setStatusFilter('in_progress')}
              color={statusFilter === 'in_progress' ? 'primary' : 'default'}
              sx={{ 
                fontWeight: 500,
                backgroundColor: statusFilter === 'in_progress' ? '#1a3e72' : undefined,
                color: statusFilter === 'in_progress' ? 'white' : undefined,
                '&:hover': { opacity: 0.9 }
              }}
            />
            <Chip 
              label="Completed"
              onClick={() => setStatusFilter('completed')}
              color={statusFilter === 'completed' ? 'primary' : 'default'}
              sx={{ 
                fontWeight: 500,
                backgroundColor: statusFilter === 'completed' ? '#1a3e72' : undefined,
                color: statusFilter === 'completed' ? 'white' : undefined,
                '&:hover': { opacity: 0.9 }
              }}
            />
            <Chip 
              label="On Hold"
              onClick={() => setStatusFilter('on_hold')}
              color={statusFilter === 'on_hold' ? 'primary' : 'default'}
              sx={{ 
                fontWeight: 500,
                backgroundColor: statusFilter === 'on_hold' ? '#1a3e72' : undefined,
                color: statusFilter === 'on_hold' ? 'white' : undefined,
                '&:hover': { opacity: 0.9 }
              }}
            />
          </Box>
        </Box>

        {error && (
          <Box sx={{ mb: 2, p: 3, backgroundColor: '#ffebee', borderRadius: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}

        {projects.length === 0 && !loading ? (
          <Box sx={{ textAlign: 'center', py: 5, backgroundColor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" color="textSecondary">
              No projects found. Create your first project to get started.
            </Typography>
          </Box>
        ) : (
          <>
            {projects.filter(project => statusFilter === 'all' || project.status === statusFilter).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5, backgroundColor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography variant="h6" color="textSecondary">
                  No projects match the selected filter.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {projects
                  .filter(project => statusFilter === 'all' || project.status === statusFilter)
                  .map(project => (
              <Grid item xs={12} sm={6} md={4} key={project._id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2, 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: 2,
                    opacity: 0.03,
                    backgroundColor: getStatusColor(project.status || 'not_started') === 'success' ? '#4caf50' : 
                                    getStatusColor(project.status || 'not_started') === 'warning' ? '#ff9800' : 
                                    getStatusColor(project.status || 'not_started') === 'error' ? '#f44336' : '#2196f3',
                    zIndex: 0
                  }
                }}>
                  <Box sx={{ 
                    height: 8, 
                    backgroundColor: getStatusColor(project.status || 'not_started') === 'success' ? '#4caf50' : 
                                    getStatusColor(project.status || 'not_started') === 'warning' ? '#ff9800' : 
                                    getStatusColor(project.status || 'not_started') === 'error' ? '#f44336' : '#2196f3'
                  }} />
                  <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 1 }}>
                        {project.name}
                      </Typography>
                      <IconButton 
                        size="small"
                        onClick={(e) => handleOpenMenu(e, project._id)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      <Chip 
                        size="small" 
                        label={project.category || 'Uncategorized'}
                        sx={{ 
                          backgroundColor: '#e3f2fd', 
                          color: '#1a3e72',
                          fontWeight: 500
                        }} 
                      />
                      <Chip 
                        label={formatStatus(project.status || 'not_started')} 
                        size="small" 
                        color={getStatusColor(project.status || 'not_started')}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ 
                      mb: 2, 
                      color: '#555',
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {project.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Progress
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {project.progress || 0}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={project.progress || 0} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 5,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: (project.progress || 0) < 30 ? '#f44336' :
                                            (project.progress || 0) < 70 ? '#ff9800' : '#4caf50'
                          }
                        }}
                      />
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      p: 1,
                      backgroundColor: '#f5f7fa',
                      borderRadius: 1
                    }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                          Team Members
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PeopleIcon sx={{ fontSize: 16, mr: 0.5, color: '#1a3e72' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {project.assignedEmployees?.length || 0}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                          Start Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {project.startDate ? format(parseISO(project.startDate), 'MMM d, yyyy') : 'Not set'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                          End Date
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Not set'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ 
                    borderTop: '1px solid #f0f0f0', 
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1.5
                  }}>
                    <Button 
                      size="small" 
                      startIcon={<TimelineIcon />}
                      href={`/projects/${project._id}/milestones`}
                      sx={{ color: '#1a3e72' }}
                    >
                      Milestones
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<PeopleIcon />}
                      href={`/projects/${project._id}/team`}
                      sx={{ color: '#1a3e72' }}
                    >
                      Team
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<NotificationsIcon />}
                      href={`/project-alerts?projectId=${project._id}`}
                      sx={{ color: '#1a3e72' }}
                    >
                      Alerts
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
              </Grid>
            )}
          </>
        )}

      {/* Project Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          const project = projects.find(p => p._id === selectedProjectId);
          handleOpenDialog(project);
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteProject}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Project Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentProject ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                id="category"
                name="category"
                value={formData.category}
                label="Category"
                onChange={handleInputChange}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="development">Development</MenuItem>
                <MenuItem value="design">Design</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
                <MenuItem value="research">Research</MenuItem>
                <MenuItem value="operations">Operations</MenuItem>
              </Select>
            </FormControl>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <DatePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                />
                
                <DatePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  slotProps={{
                    textField: { fullWidth: true, margin: 'normal' }
                  }}
                  minDate={formData.startDate}
                />
              </Box>
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentProject ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Layout>
  );
};

export default ProjectsPage;