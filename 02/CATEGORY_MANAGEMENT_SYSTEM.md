# Category Management System

This document describes the comprehensive category management system implemented for the HRM application, including project categories, task categories, budget allocation categories, and income categories.

## Overview

The category management system provides a centralized way to organize and categorize different entities in the system. Each category type has its own CRUD operations and can be managed through a unified UI.

## Category Types

### 1. Project Categories

- **Purpose**: Categorize projects for better organization and reporting
- **API Endpoint**: `/api/project-categories`
- **Database Collection**: `projectCategories`
- **Default Color**: Blue (#3B82F6)
- **Default Icon**: folder

### 2. Task Categories

- **Purpose**: Categorize tasks within projects
- **API Endpoint**: `/api/task-categories`
- **Database Collection**: `taskCategories`
- **Default Color**: Green (#10B981)
- **Default Icon**: check-square

### 3. Budget Allocation Categories

- **Purpose**: Categorize budget allocations for financial tracking
- **API Endpoint**: `/api/budget-allocation-categories`
- **Database Collection**: `budgetAllocationCategories`
- **Default Color**: Amber (#F59E0B)
- **Default Icon**: dollar-sign

### 4. Income Categories

- **Purpose**: Categorize income sources for financial reporting
- **API Endpoint**: `/api/income-categories`
- **Database Collection**: `incomeCategories`
- **Default Color**: Emerald (#059669)
- **Default Icon**: trending-up

## API Endpoints

### Common CRUD Operations

All category types support the following operations:

#### Create Category

```http
POST /api/{category-type}
Content-Type: application/json

{
  "name": "Category Name",
  "description": "Category description",
  "status": "active"
}
```

#### Get All Categories

```http
GET /api/{category-type}?page=1&limit=50&search=term&status=active
```

#### Get Single Category

```http
GET /api/{category-type}/{id}
```

#### Update Category

```http
PUT /api/{category-type}/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "active"
}
```

#### Delete Category

```http
DELETE /api/{category-type}/{id}
```

### Category Schema

```javascript
{
  "_id": "ObjectId",
  "name": "string (required)",
  "description": "string",
  "status": "string (active|inactive)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Integration with Existing Systems

### Project Integration

Projects now support both legacy `category` (string) and new `categoryId` (ObjectId) fields:

```javascript
// Project creation/update
{
  "name": "Project Name",
  "category": "general", // Legacy support
  "categoryId": "ObjectId", // New category reference
  // ... other fields
}
```

### Task Integration

Tasks now support both legacy `category` (string) and new `categoryId` (ObjectId) fields:

```javascript
// Task creation/update
{
  "title": "Task Title",
  "category": "general", // Legacy support
  "categoryId": "ObjectId", // New category reference
  // ... other fields
}
```

## UI Components

### Category Management Page

Access the category management interface at `/category-management`. This page provides:

- **Tabbed Interface**: Switch between different category types
- **Search & Filter**: Find categories by name, description, or status
- **CRUD Operations**: Create, read, update, and delete categories
- **Visual Design**: Color-coded categories with icons
- **Responsive Design**: Works on desktop and mobile devices

### Features

1. **Category Creation**: Add new categories with name and description
2. **Category Editing**: Modify existing categories
3. **Category Deletion**: Remove categories (with usage validation)
4. **Status Management**: Activate/deactivate categories
5. **Search & Filter**: Find categories by name, description, or status

## Database Collections

### projectCategories

```javascript
{
  "_id": ObjectId,
  "name": "Web Development",
  "description": "Web application projects",
  "status": "active",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### taskCategories

```javascript
{
  "_id": ObjectId,
  "name": "Frontend Development",
  "description": "Frontend development tasks",
  "status": "active",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### budgetAllocationCategories

```javascript
{
  "_id": ObjectId,
  "name": "Development Tools",
  "description": "Software and tools budget",
  "status": "active",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

### incomeCategories

```javascript
{
  "_id": ObjectId,
  "name": "Client Payments",
  "description": "Payments from clients",
  "status": "active",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

## Validation Rules

### Category Creation/Update

- **Name**: Required, unique within category type, trimmed
- **Description**: Optional, trimmed
- **Status**: Optional, defaults to "active"

### Category Deletion

- Categories cannot be deleted if they are in use by:
  - Projects (for project categories)
  - Tasks (for task categories)
  - Budget allocations (for budget allocation categories)
  - Income records (for income categories)

## Available Icons

The system supports the following icon options:

- folder, check-square, dollar-sign, trending-up
- briefcase, target, users, calendar
- file-text, settings, bar-chart, pie-chart
- activity, zap, star

## Available Colors

Predefined color options:

- Blue (#3B82F6), Green (#10B981), Amber (#F59E0B)
- Red (#EF4444), Purple (#8B5CF6), Cyan (#06B6D4)
- Lime (#84CC16), Orange (#F97316), Pink (#EC4899)
- Gray (#6B7280)

## Navigation

The category management system is accessible through:

- **Sidebar**: "Category Management" menu item
- **Direct URL**: `/category-management`

## Testing

Use the provided test script to verify API functionality:

```bash
node test-category-apis.js
```

This script tests all CRUD operations for each category type.

## Migration Notes

### Backward Compatibility

- Existing projects and tasks continue to work with string-based categories
- New projects and tasks can use either string categories or category IDs
- The system maintains both fields for seamless migration

### Future Enhancements

- Category hierarchies (parent-child relationships)
- Category templates
- Bulk category operations
- Category usage analytics
- Category-based permissions

## Security Considerations

- All API endpoints include proper validation
- Category deletion includes usage checks
- Audit logging for all category operations
- Input sanitization and validation

## Performance Considerations

- Pagination support for large category lists
- Indexed database queries
- Efficient aggregation pipelines
- Caching considerations for frequently accessed categories
