'use client';

import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

const ProjectMilestonesPage = ({ params }) => {
  const { id: projectId } = params;
  
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: null,
    status: 'not_started',
    progress: 0
  });

  // Fetch project and milestones on component mount
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
        
        // Extract milestones from project data
        if (projectData.project.milestones) {
          setMilestones(projectData.project.milestones);
        }
      } else {
        setError(projectData.error || 'Failed to fetch project details');
      }
    } catch (err) {
      setError('Error fetching project data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setCurrentMilestone(milestone);
      setFormData({
        title: milestone.title,
        description: milestone.description || '',
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
        status: milestone.status || 'not_started',
        progress: milestone.progress || 0
      });
    } else {
      setCurrentMilestone(null);
      setFormData({
        title: '',
        description: '',
        dueDate: null,
        status: 'not_started',
        progress: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'progress' ? Number(value) : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      dueDate: date
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        dueDate: formData.dueDate?.toISOString()
      };

      let url, method;
      
      if (currentMilestone) {
        // Update existing milestone
        url = `/api/projects/${projectId}/milestones/${currentMilestone._id}`;
        method = 'PUT';
      } else {
        // Create new milestone
        url = `/api/projects/${projectId}/milestones`;
        method = 'POST';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
        handleCloseDialog();
      } else {
        setError(data.error || 'Failed to save milestone');
      }
    } catch (err) {
      setError('Error saving milestone: ' + err.message);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchProjectData();
      } else {
        setError(data.error || 'Failed to delete milestone');
      }
    } catch (err) {
      setError('Error deleting milestone: ' + err.message);
    }
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
      <Box sx={{ p: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/projects" underline="hover" color="inherit">
            Projects
          </MuiLink>
          <MuiLink component={Link} href={`/projects/${projectId}`} underline="hover" color="inherit">
            {project.name}
          </MuiLink>
          <Typography color="text.primary">Milestones</Typography>
        </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Project Milestones
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Milestone
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {project.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip 
            label={formatStatus(project.status || 'not_started')} 
            color={getStatusColor(project.status || 'not_started')}
          />
          <Chip 
            label={`Progress: ${project.progress || 0}%`} 
            variant="outlined"
          />
        </Box>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2">
            Timeline: {project.startDate ? format(parseISO(project.startDate), 'MMM d, yyyy') : 'Not set'} - 
            {project.endDate ? format(parseISO(project.endDate), 'MMM d, yyyy') : 'Not set'}
          </Typography>
        </Box>
      </Paper>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {milestones.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="h6" color="textSecondary">
            No milestones found. Add your first milestone to track project progress.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {milestones.map((milestone) => (
                <TableRow key={milestone._id}>
                  <TableCell>
                    <Typography variant="subtitle2">{milestone.title}</Typography>
                    {milestone.description && (
                      <Typography variant="body2" color="text.secondary">
                        {milestone.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {milestone.dueDate 
                      ? format(parseISO(milestone.dueDate), 'MMM d, yyyy')
                      : 'Not set'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatStatus(milestone.status || 'not_started')} 
                      size="small" 
                      color={getStatusColor(milestone.status || 'not_started')}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 200 }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={milestone.progress || 0} 
                          sx={{ height: 8, borderRadius: 5 }}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="text.secondary">
                          {milestone.progress || 0}%
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(milestone)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteMilestone(milestone._id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Milestone Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentMilestone ? 'Edit Milestone' : 'Add New Milestone'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="title"
              label="Milestone Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={2}
              value={formData.description}
              onChange={handleInputChange}
            />
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={formData.dueDate}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
                slotProps={{
                  textField: { fullWidth: true, margin: 'normal' }
                }}
              />
            </LocalizationProvider>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleInputChange}
              >
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom>Progress: {formData.progress}%</Typography>
              <TextField
                fullWidth
                id="progress"
                name="progress"
                type="range"
                inputProps={{ min: 0, max: 100, step: 5 }}
                value={formData.progress}
                onChange={handleInputChange}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentMilestone ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </Layout>
  );
};

export default ProjectMilestonesPage;