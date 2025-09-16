# Project Tracking System

A comprehensive project management and tracking system built for the Geo HRM application. This system provides real-time project monitoring, milestone tracking, automated alerts, and interactive dashboards.

## 🚀 Features

### Core Functionality

- **Project Management**: Create, manage, and categorize multiple projects with detailed information
- **Milestone Tracking**: Define and track key milestones with progress monitoring
- **Real-time Dashboard**: Interactive dashboards with live project progress updates
- **Automated Alerts**: Smart notifications for delays, missed milestones, and critical updates
- **Team Collaboration**: Assign team members and track responsibilities
- **Budget Monitoring**: Track project budgets and cost overruns
- **Timeline Management**: Visual timeline with dependencies and critical path analysis

### Advanced Features

- **Project Categorization**: Organize projects by type (development, marketing, research, etc.)
- **Priority Management**: Set and track project priorities (low, medium, high, critical)
- **Status Tracking**: Monitor project status (planning, active, on-hold, completed, cancelled)
- **Progress Analytics**: Detailed progress reports and analytics
- **Alert System**: Automated alerts for overdue items, budget overruns, and milestone completions
- **Filtering & Search**: Advanced filtering and search capabilities
- **Role-based Access**: Different access levels based on user roles

## 📁 File Structure

### API Endpoints

```
app/api/
├── projects/
│   ├── route.js                    # Project CRUD operations
│   ├── [id]/route.js              # Individual project operations
│   ├── milestones/
│   │   ├── route.js               # Milestone CRUD operations
│   │   └── [id]/route.js          # Individual milestone operations
│   ├── alerts/
│   │   └── route.js               # Alert management
│   └── dashboard/
│       └── route.js               # Dashboard data aggregation
└── cron/
    └── project-alerts/
        └── route.js               # Automated alert processing
```

### Frontend Components

```
app/components/
├── ProjectDashboard.js            # Main dashboard with analytics
├── ProjectManagement.js           # Project CRUD interface
├── MilestoneTracker.js            # Milestone management
├── ProjectAlerts.js               # Alert management interface
└── ui/                            # Reusable UI components
```

### Pages

```
app/
├── project-tracking/
│   └── page.js                    # Main project tracking page
└── api/
    └── mongo.js                   # Database schemas and connection
```

## 🗄️ Database Schema

### Projects Collection

```javascript
{
  _id: ObjectId,
  name: String,                    // Project name
  description: String,             // Project description
  category: String,                // Project category
  status: String,                  // planning, active, on-hold, completed, cancelled
  priority: String,                // low, medium, high, critical
  startDate: Date,                 // Planned start date
  endDate: Date,                   // Planned end date
  actualStartDate: Date,           // Actual start date
  actualEndDate: Date,             // Actual end date
  progress: Number,                // 0-100
  budget: Number,                  // Project budget
  actualCost: Number,              // Actual cost spent
  projectManager: String,          // Employee ID of project manager
  teamMembers: [String],           // Array of Employee IDs
  client: String,                  // Client name
  scope: String,                   // Project scope
  deliverables: [String],          // Project deliverables
  risks: [String],                 // Identified risks
  dependencies: [String],          // Array of Project IDs
  tags: [String],                  // Project tags
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,               // Employee ID
  lastModifiedBy: String           // Employee ID
}
```

### Milestones Collection

```javascript
{
  _id: ObjectId,
  projectId: String,               // Project ID
  name: String,                    // Milestone name
  description: String,             // Milestone description
  dueDate: Date,                   // Due date
  actualCompletionDate: Date,      // Actual completion date
  status: String,                  // pending, in-progress, completed, overdue
  progress: Number,                // 0-100
  dependencies: [String],          // Array of Milestone IDs
  assignedTo: String,              // Employee ID
  deliverables: [String],          // Milestone deliverables
  notes: String,                   // Additional notes
  createdAt: Date,
  updatedAt: Date,
  createdBy: String                // Employee ID
}
```

### Project Alerts Collection

```javascript
{
  _id: ObjectId,
  projectId: String,               // Project ID
  milestoneId: String,             // Milestone ID (optional)
  type: String,                    // delay, milestone, budget, risk, update
  severity: String,                // low, medium, high, critical
  title: String,                   // Alert title
  message: String,                 // Alert message
  isRead: Boolean,                 // Read status
  isResolved: Boolean,             // Resolved status
  triggeredAt: Date,               // When alert was triggered
  resolvedAt: Date,                // When alert was resolved
  resolvedBy: String,              // Employee ID who resolved
  recipients: [String],            // Array of Employee IDs
  metadata: Object                 // Additional context data
}
```

## 🔧 API Endpoints

### Projects

- `GET /api/projects` - List projects with filtering and pagination
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details with milestones and alerts
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project and related data

### Milestones

- `GET /api/projects/milestones` - List milestones with filtering
- `POST /api/projects/milestones` - Create new milestone
- `GET /api/projects/milestones/[id]` - Get milestone details
- `PUT /api/projects/milestones/[id]` - Update milestone
- `DELETE /api/projects/milestones/[id]` - Delete milestone

### Alerts

- `GET /api/projects/alerts` - List alerts with filtering
- `POST /api/projects/alerts` - Create new alert
- `PUT /api/projects/alerts` - Bulk update alerts (mark read, resolve)

### Dashboard

- `GET /api/projects/dashboard` - Get dashboard analytics and statistics

### Automated Alerts

- `GET /api/cron/project-alerts` - Process automated alerts (cron job)

## 🎯 Usage Guide

### Creating a Project

1. Navigate to the Project Tracking page
2. Click "New Project" button
3. Fill in project details:
   - Name and description
   - Category and priority
   - Start and end dates
   - Budget and team members
   - Scope and deliverables
4. Save the project

### Managing Milestones

1. Go to the Milestones tab
2. Click "New Milestone"
3. Select the project
4. Define milestone details:
   - Name and description
   - Due date and assignee
   - Deliverables and dependencies
5. Track progress using the progress bar

### Monitoring Alerts

1. Check the Alerts tab for notifications
2. Filter by type, severity, or status
3. Mark alerts as read or resolved
4. Create custom alerts when needed

### Dashboard Analytics

1. View the Dashboard tab for overview
2. Monitor key statistics:
   - Total projects and completion rates
   - Active projects and overdue items
   - Recent milestones and alerts
3. Use charts to analyze project distribution

## 🔔 Automated Alerts

The system automatically generates alerts for:

### Overdue Milestones

- Triggers when milestone due date passes
- Severity based on days overdue
- Notifies project manager and team members

### Upcoming Milestones

- Alerts 3 days before due date
- Helps with proactive planning
- Medium severity notification

### Overdue Projects

- Triggers when project end date passes
- Severity based on days overdue
- Critical for project management

### Budget Overruns

- Alerts when budget utilization exceeds 90%
- Critical alert when budget is exceeded
- Helps with cost control

## 🎨 UI Components

### ProjectDashboard

- Statistics cards with key metrics
- Recent projects and milestones
- Upcoming and overdue items
- Analytics charts and graphs

### ProjectManagement

- Project grid with filtering
- Create/edit project forms
- Project details view
- Bulk operations

### MilestoneTracker

- Milestone list with progress bars
- Quick progress updates
- Filtering and search
- Milestone details and notes

### ProjectAlerts

- Alert list with severity indicators
- Bulk actions (mark read, resolve)
- Alert creation form
- Statistics overview

## 🔐 Permissions

### Admin Role

- Full access to all project features
- Can create, edit, and delete projects
- Can manage all milestones and alerts
- Access to all analytics and reports

### HR Manager Role

- Read access to projects and milestones
- Can view alerts and notifications
- Limited to assigned projects

### Employee Role

- Read access to assigned projects
- Can update milestone progress
- Can view relevant alerts

## 🚀 Getting Started

### 1. Database Setup

The system automatically creates the necessary collections when first used. Run the seed script to populate sample data:

```bash
node app/api/seed.js
```

### 2. Access the System

Navigate to `/project-tracking` in your application to access the project tracking system.

### 3. Create Your First Project

1. Click "New Project" in the Projects tab
2. Fill in the project details
3. Add initial milestones
4. Assign team members

### 4. Set Up Automated Alerts

Configure a cron job to run the automated alert system:

```bash
# Run every hour
0 * * * * curl http://localhost:3000/api/cron/project-alerts
```

## 📊 Sample Data

The seed script creates sample projects including:

- Website Redesign Project (Active)
- Mobile App Development (Planning)
- Marketing Campaign Q2 (Active)

Each project includes sample milestones and demonstrates the full functionality of the system.

## 🔧 Customization

### Adding New Project Categories

Update the category options in the project form components and API validation.

### Custom Alert Types

Add new alert types in the alert schema and update the automated alert system.

### Additional Analytics

Extend the dashboard API to include custom metrics and charts.

## 🐛 Troubleshooting

### Common Issues

1. **Projects not loading**: Check database connection and collection names
2. **Alerts not triggering**: Verify cron job is running and API endpoint is accessible
3. **Permission errors**: Ensure user roles are properly configured
4. **Progress not updating**: Check milestone progress updates are being saved

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=project-tracking:*
```

## 📈 Future Enhancements

- **Gantt Charts**: Visual timeline representation
- **Resource Management**: Team capacity and workload tracking
- **Time Tracking**: Integration with time tracking systems
- **Document Management**: File attachments for projects and milestones
- **Reporting**: Advanced reporting and export capabilities
- **Integration**: API integrations with external project management tools
- **Mobile App**: Native mobile application for project tracking
- **Notifications**: Email and push notifications for alerts
- **Templates**: Project and milestone templates for quick setup

## 📝 License

This project tracking system is part of the Geo HRM application and follows the same licensing terms.

