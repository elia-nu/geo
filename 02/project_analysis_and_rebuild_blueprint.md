# HRM & Geofence Management System: Project Analysis, Feature & Asset Blueprint

## Executive Summary
This document presents an exhaustive review of the **GEO / HR Management System** codebase (`d:\Projects\Prod\geo`). It provides:
1. **Screen & Feature Inventory**: A detailed breakdown of every screen, view, and feature in the system.
2. **Assets Inventory**: Media files, icons, custom components, third-party libraries, and underlying MongoDB data schemas.
3. **Project Evaluation & Pain Point Analysis**: Technical evaluation covering code structure, routing flaws, validation gaps, toast/notification fragmentation, styling inconsistencies, and hydration issues.
4. **Rebuild Recommendations & Blueprint**: Architectural recommendations to duplicate and upgrade all features in a new project featuring modern UI design, clean App Router deep links, Zod schema validation, unified Sonner toasts, and robust server state management.

---

## 1. Comprehensive Screen & Feature Inventory

The current application contains **14 core functional modules** spanning over 35 sub-views and 122 components.

### Module 1: Main HRM Dashboard & Executive Hub (`/hrm?section=dashboard`)
- **Key Features**:
  - High-level KPIs: Total Employees, Active Departments, Expiring Documents, Total Projects, Workforce Attendance rate.
  - Department breakdown visual charts (Employee distribution per department).
  - Work location summary & headcount widgets.
  - Quick action toolbar (Add Employee, Upload Document, Approve Leave, Create Project, Mark Attendance).
  - Recent activity feeds & pending notification drawer.
- **UI Components**: `Dashboard.js`, `EmployeeStatistics.js`, `DepartmentAnalytics.js`, `Sidebar.js`, `Navbar.js`.

---

### Module 2: Employee Database & Onboarding Stepper (`/hrm?section=employees`, `/employee-setup`)
- **Key Features**:
  - **Grid & Table View**: Card/table view of all employees with pagination, sorting, and search by name, email, department, designation, or skills.
  - **Multi-Step Onboarding Form (`StepperEmployeeForm.js` / `EmployeeSetupModal.js`)**:
    - *Step 1: Personal Details* (Full Name, Photo upload, DOB, Gender, Marital Status, Nationality).
    - *Step 2: Employment Info* (Employee ID, Department, Designation, Work Location, Role, Employment Type, Hire Date, Manager).
    - *Step 3: Financial & Payroll* (Basic Salary, Bank Account details, Tax Identification Number, Pension Number).
    - *Step 4: Qualifications & Skills* (Degrees, Certifications, Skill tags, Languages).
    - *Step 5: Emergency Contacts & Medical* (Blood Type, Emergency Contact Name/Phone/Relationship, Known Allergies/Conditions).
  - **Edit & Lifecycle Management (`EditStepperEmployeeForm.js`, `EditEmployeeDialog.js`)**:
    - Update employee status (Active, Inactive, Terminated, On Leave).
    - Photo upload preview and face detection integration (`FaceDetectionBox.js`).

---

### Module 3: Attendance Management & Daily Logs (`/attendance-daily`, `/admin-attendance`, `/hrm?section=daily-attendance`)
- **Key Features**:
  - **Daily Attendance View (`DailyAttendance.js`)**:
    - Real-time check-in and check-out recording.
    - Captures GPS coordinates (Latitude, Longitude), accuracy, timestamp, device metadata, and selfie image.
    - Automatic distance calculation against assigned work location geofence.
    - Status auto-assignment: Present, Late, Early Departure, Absent, Geofence Violation.
  - **Admin Attendance Oversight (`AdminAttendanceManagement.js`, `AllAttendance.js`)**:
    - Filter attendance logs by date range, department, employee, or site location.
    - Bulk attendance approval, manual attendance adjustment, override flags.
    - Photo verification viewer (`AttendancePhotoViewer.js`).
    - Attendance summary statistics & time log inspector.

---

### Module 4: Geofence & Work Location Management (`/geofence-management`, `/work-locations`)
- **Key Features**:
  - **Geofence Manager (`GeofenceManager.js`, `GeofenceMap.js`)**:
    - Define circular (center point + radius in meters) or polygonal geofence boundaries.
    - Interactive Leaflet / Map rendering for spatial boundary creation.
    - Assign geofences to specific work sites or projects.
    - Active status toggles & buffer radius configuration (e.g. 50m to 500m tolerance).
  - **Work Location Management (`WorkLocationsManagement.js`)**:
    - Site details (Location Name, Address, City, Region, Capacity).
    - Assign site managers and default shift hours.
    - Map coordinates picker & employee site assignment matrix.

---

### Module 5: Task Management & Kanban Board (`/task-management`)
- **Key Features**:
  - **Task View Modes (`TaskManagement.js`)**: Kanban Board (To Do, In Progress, In Review, Completed), Table List view, Gantt Timeline view.
  - **Subtask Manager (`SubtaskManager.js`)**: Breakdown tasks into checklist subtasks with progress tracking bar.
  - **Task Dependencies (`TaskDependencyManager.js`)**: Link predecessor and successor tasks (Finish-to-Start, Start-to-Start).
  - **Task Communication & Collaboration (`TaskCommunicationPanel.js`, `TaskComments.js`, `TaskAttachments.js`)**:
    - Rich text comment threads, mention team members, activity timeline.
    - Document/file attachment uploader per task.
  - **Task Audits & Dashboards (`TaskMonitoringDashboard.js`, `TaskProgressAudits.js`)**:
    - Monitor SLA bottlenecks, overdue tasks, workload distribution per user.

---

### Module 6: Project & Budget Management (`/projects`, `/project-budget`)
- **Key Features**:
  - **Projects Directory (`ProjectsManagement.js`, `/projects/[id]`)**:
    - Project status (Planning, Active, On Hold, Completed), progress percentage bar, project manager assignment.
    - Project milestones (`/projects/[id]/milestones`), team allocation (`/projects/[id]/team`), document links.
  - **Project Financial & Budget System (`ProjectFinancialManagement.js`, `BudgetManagement.js`)**:
    - Income tracking (`/project-budget/[id]/income/[incomeId]`), revenue category classification.
    - Expense allocation & budget category limits (Materials, Labor, Equipment, Overhead).
    - Budget variance tracking (Planned vs Actual expenditure), budget alerts (`/project-alerts`).

---

### Module 7: Integrated Payroll System (`/payroll`, `/hrm?section=payroll`)
- **Key Features**:
  - **Payroll Processor (`IntegratedPayrollSystem.js`)**:
    - Automated gross salary calculation incorporating daily attendance logs and approved leave days.
    - Allowances (Housing, Transport, Position) and Tax/Pension deduction calculations.
    - Generate monthly payroll runs with approval workflow (Draft -> Pending HR Review -> Approved -> Disbursed).
  - **Payslip & Export**:
    - Download PDF payslips per employee (`pdfkit` integration).
    - Export payroll reconciliation report to Excel (`xlsx`).

---

### Module 8: Leave Management & Entitlements (`/admin-leave-balance`, `/hrm?section=leave-balance`)
- **Key Features**:
  - **Leave Balance Overview (`LeaveBalance.js`, `AdminLeaveBalanceManagement.js`)**:
    - Annual leave entitlement tracking, sick leave, maternity/paternity leave, compassionate leave.
    - Real-time leave balance accrual calculations.
  - **Leave Approval Workflow (`ManagerLeaveApproval.js`)**:
    - Manager dashboard for pending leave requests with approve/reject buttons and comment fields.
  - **Leave Calendar (`LeaveCalendar.js`)**: Visual calendar displaying employee leave schedules to prevent under-staffing.

---

### Module 9: Document & Compliance Management (`/documents`, `/attendance-documents`)
- **Key Features**:
  - **Document Repository (`DocumentManager.js`, `UploadDocumentDialog.js`)**:
    - Category classification (Employment Contracts, IDs, Medical Records, Certifications).
    - Automated 30-day advance expiry tracking and visual status badges (Active, Expiring Soon, Expired).
    - Document previewer (`docx-preview`, PDF viewer) and secure file downloader.
  - **Compliance Audits**: Document inventory audit, contract expiration tester (`/test-contract-expiry`).

---

### Module 10: Ethiopian Calendar Integration (`EthiopianCalendar.js`)
- **Key Features**:
  - **Dual Calendar Conversion**: Seamless conversion between Ethiopian Calendar (Ge'ez date system: 13 months) and Gregorian Calendar.
  - **Holiday Integration (`EthiopianCalendarWithHolidays.js`)**: Pre-loaded national and public holidays for Ethiopia.
  - **Custom Date Picker Widget (`EthiopianDatePickerWidget.js`)**: Reusable Ethiopian date input picker.

---

### Module 11: Category Management (`/category-management`)
- **Key Features**:
  - Manage system-wide categories across modules: Budget Allocation Categories, Income Categories, Task Categories, Project Categories.

---

### Module 12: Employee Portal (Self-Service) (`/employee-portal`, `/employee-login`)
- **Key Features**:
  - Dedicated mobile-friendly view for non-admin employees.
  - Quick Attendance Check-in / Out with camera preview (`react-webcam`) and GPS capture.
  - Submit leave requests (`EmployeeLeaveRequest.js`) and check real-time leave status (`EmployeeRequestStatus.js`).
  - View assigned tasks (`EmployeeTasks.js`) and project involvement (`EmployeeProjects.js`).

---

### Module 13: Reports & Analytics Suite (20+ Specialized Reports)
- **Employee & Org Reports**: `EmployeeMasterReport`, `EmployeeAllocationReport`, `EmployeeLifecycleReport`, `OrganizationalStructureReport`, `RolePermissionAuditReport`, `DepartmentPerformanceReport`.
- **Document Reports**: `DocumentInventoryReport`, `DocumentExpiryComplianceReport`, `DocumentAccessAuditReport`.
- **Site & Geofence Reports**: `SiteLocationMasterReport`, `SiteAttendanceComplianceReport`, `WorkforceDistributionReport`.
- **Attendance & Leave Reports**: `DailyAttendanceSummaryReport`, `AttendanceTrendProductivityReport`, `AttendanceExceptionViolationReport`, `LeaveRequestSummaryReport`, `LeaveWorkforceImpactReport`, `LeaveBalanceEntitlementReport`.
- **Payroll & Financial Reports**: `PayrollSummaryReport`, `PayrollVarianceReport`, `PayrollReconciliationReport`, `PayrollCostByProjectReport`.
- **Project & Universal Reports**: `ProjectMasterSummaryReport`, `ProjectMilestoneProgressReport`, `ProjectRiskIssueTrackingReport`, `CrossSystemExecutiveReports`, `UniversalSystemReports`.

---

## 2. Complete Asset Inventory

### A. Media & File Assets
- `public/newlogo.png` - Primary brand logo.
- `public/4565.jpg` - Default avatar / background placeholder.
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` - Default icons.
- `public/uploads/` - Target storage directory for employee photos and PDF/DOCX documents.

### B. UI Icon & Visual Libraries
- `@mui/icons-material` - Material UI Icons (50+ used across forms and tables).
- `lucide-react` - Lucide icons used in navigation and status cards.
- `@heroicons/react` - Supporting icon set.
- `react-icons` - FontAwesome / Feather fallback icons.
- `recharts` - Bar charts, Pie charts, Area charts for executive reports.
- `@fullcalendar/core` - Calendar view for leave & task scheduling.

### C. Core Custom UI Components
- Reusable primitives in `app/components/ui/`: `button.js`, `card.js`, `input.js`, `select.js`, `badge.js`, `dialog.js`, `tabs.js`, `calendar.js`, `popover.js`, `textarea.js`.

### D. MongoDB Data Models & Collections
1. `employees`: Profile metadata, contact info, job title, department ID, location ID, salary info, emergency contacts, skills, document IDs, photo URL.
2. `attendance`: Employee ID, date, check-in time, check-out time, GPS coordinates (lat/lng), distance to site, selfie URL, status, geofence violation flag.
3. `geofences`: Site ID, geofence name, type (radius vs polygon), coordinates (center lat/lng, radius meters or polygon array), status.
4. `tasks`: Title, description, project ID, milestone ID, assignee IDs, priority (Low, Medium, High, Urgent), status (To Do, In Progress, Review, Completed), start date, due date, subtasks array, dependencies array.
5. `projects`: Project name, code, client, start/end dates, manager ID, budget, status, milestones array, team array.
6. `project_budget`: Project ID, total allocated budget, category budgets, income records array, expense records array.
7. `leave_requests`: Employee ID, leave type ID, start date, end date, total days, reason, manager approval status, HR approval status, approval comments.
8. `leave_balances`: Employee ID, year, annual total/used, sick total/used, maternity total/used.
9. `payroll`: Period (month/year), employee details, basic salary, allowances breakdown, deductions (tax, pension), net pay, payment status.
10. `documents`: Employee ID, document type, file name, file path, upload date, expiry date, status (Active, Expiring, Expired).
11. `departments` & `designations`: Structure definitions with code, title, parent department.
12. `categories`: Task categories, budget categories, income categories, document categories.

---

## 3. In-Depth Project Evaluation & Pain Points

| Evaluation Domain | Current Implementation Flaws | Rebuild Impact / Fix |
| :--- | :--- | :--- |
| **Component Architecture** | **Monolithic files**: `ProjectFinancialManagement.js` (189 KB), `TaskManagement.js` (93 KB), `EmployeeDatabase.js` (90 KB), `EditStepperEmployeeForm.js` (89 KB). Massive single-file components with state bloated by 30+ `useState` hooks. | Break down into small, domain-driven sub-components (<150 lines each). Use React Hook Form context. |
| **Routing Strategy** | **State-based tab switching**: `/hrm/page.js` imports 49 components and switches rendering based on `?section=...` query param instead of native pages. Deep linking, browser back/forward, and code splitting are broken. | Implement native Next.js 15 App Router dynamic sub-routes (`/employees`, `/employees/[id]`, `/tasks`, `/geofences`, `/projects/[id]`, `/payroll`). |
| **Toast & Alert UX** | **Fragmented feedback**: Codebase mixes `sweetalert2` dialogs, `react-toastify` containers, native browser `alert()`, and inline error strings. Users see inconsistent notifications. | Standardize on **Sonner** toast library with unified styling (Success, Error, Info, Warning) and custom confirmation modals. |
| **Validation & Types** | **No schema validation**: Manual string checks (`if (!formData.name) setError(...)`) repeated in every component. No TypeScript types or Zod schema validation, leading to runtime undefined errors. | Implement **Zod** validation schemas paired with **React Hook Form**. Enforce strict TypeScript interfaces across frontend and APIs. |
| **Styling & Design** | **Hybrid styling mess**: Tailwind CSS v4 mixed with inline JSX styles (`style={{ marginTop: '12px' }}`), Emotion `@emotion/styled`, MUI sx props, and raw `globals.css` rules. High UI visual mismatch across tabs. | Create a unified Design System using **Tailwind CSS v4** + **Shadcn UI** / **Radix Primitives** with consistent dark mode variables and typography. |
| **State & Hydration** | **Hydration warnings**: Direct `localStorage.getItem()` calls inside render body cause Next.js SSR hydration mismatches. Wrapped in custom `HydrationProvider` hacks. | Use **Zustand** for client UI state and **TanStack Query (React Query v5)** for server data fetching, caching, and optimistic updates. |
| **Auth & Security** | Token stored in `localStorage`, manually decoded with `atob(token.split('.')[1])`. API calls lack unified middleware authentication. Express setup script mixed into Next app. | Implement HTTP-only cookie session handling via NextAuth.js v5 or Jose JWT auth middleware. |

---

## 4. Strategic Recommendations for New Project Build

To build a state-of-the-art, high-performance duplicate of this project with superior UI/UX, follow this architecture:

### 1. Technology Stack
- **Framework**: Next.js 15 (App Router with React 19, Server Components & Server Actions).
- **Language**: TypeScript Strict Mode.
- **Styling & UI**: Tailwind CSS v4 + Shadcn UI (Radix Primitives) + Framer Motion animations.
- **Form & Validation**: React Hook Form + Zod Schema Validation (`@hookform/resolvers/zod`).
- **Notification System**: **Sonner** for clean, customizable toast notifications.
- **Server Data Caching**: **TanStack Query (React Query v5)** for API state, background polling, and optimistic UI mutations.
- **State Management**: **Zustand** for global UI preferences (Sidebar open/closed, filter states, active workspace).
- **Mapping & Charts**: **Leaflet / React-Leaflet** (or Mapbox) for Geofencing + **Recharts** for reports.
- **Database**: MongoDB with Mongoose / Prisma ORM for strong model typing.

### 2. Modern Route & Directory Structure
```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── employee-login/page.tsx
├── (dashboard)/
│   ├── layout.tsx                # Unified Shell (Sidebar, Header, Breadcrumbs, Toaster)
│   ├── dashboard/page.tsx        # Executive Dashboard
│   ├── employees/
│   │   ├── page.tsx              # Employee Grid & Table
│   │   ├── new/page.tsx          # Step-by-step Onboarding Form
│   │   └── [id]/
│   │       ├── page.tsx          # Employee Profile & Details
│   │       └── edit/page.tsx     # Edit Employee Form
│   ├── attendance/
│   │   ├── daily/page.tsx        # Real-time Check-in/Out
│   │   └── reports/page.tsx      # Admin Attendance Management
│   ├── geofences/
│   │   ├── page.tsx              # Geofence List & Interactive Map
│   │   └── locations/page.tsx    # Site Work Locations
│   ├── tasks/
│   │   ├── page.tsx              # Kanban / List / Gantt Board
│   │   └── [id]/page.tsx         # Task Details, Subtasks, Comments
│   ├── projects/
│   │   ├── page.tsx              # Projects Directory
│   │   └── [id]/
│   │       ├── page.tsx          # Project Overview
│   │       ├── budget/page.tsx   # Budget & Expense Management
│   │       └── milestones/page.tsx
│   ├── payroll/
│   │   ├── page.tsx              # Payroll Processing & Disbursal
│   │   └── payslips/page.tsx     # Payslip Generator
│   ├── leave/
│   │   ├── balance/page.tsx      # Leave Balances & Accrual
│   │   └── approvals/page.tsx    # Manager Approval Dashboard
│   ├── documents/page.tsx        # Document Repository & Expiry Tracking
│   ├── calendar/page.tsx         # Ethiopian & Gregorian Dual Calendar
│   └── reports/
│       ├── page.tsx              # Reports Hub
│       └── [reportType]/page.tsx # Dynamic Report Viewer (20+ types)
├── api/                          # Next.js Route Handlers
└── components/
    ├── ui/                       # Shadcn UI primitives (Button, Dialog, Select, Sonner Toast)
    ├── forms/                    # Zod-validated React Hook Form components
    └── maps/                     # Reusable Leaflet Geofence Map component
```

### 3. Key Improvement Strategies

#### A. Unified Zod Validation Pattern
Replace manual validation logic with reusable Zod schemas:
```typescript
// schemas/employee.schema.ts
import { z } from 'zod';

export const EmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  departmentId: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
  workLocationId: z.string().min(1, "Work location is required"),
  basicSalary: z.number().positive("Salary must be a positive number"),
  hireDate: z.date({ required_error: "Hire date is required" }),
  skills: z.array(z.string()).default([]),
});

export type EmployeeFormValues = z.infer<typeof EmployeeSchema>;
```

#### B. Standardized Sonner Toast System
Replace mixed `sweetalert2` and `react-toastify` calls with a clean Sonner provider:
```typescript
// components/providers/toast-provider.tsx
import { Toaster as SonnerToaster } from 'sonner';

export function ToastProvider() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: { borderRadius: '12px', padding: '16px' },
      }}
    />
  );
}

// Usage in any component/action:
import { toast } from 'sonner';

toast.success("Employee onboarded successfully!", {
  description: "Credentials sent to employee email.",
});
```

#### C. Clean Sub-route Deep Linking
Eliminate tab state strings. Every screen has a dedicated, bookmarkable URL, enabling seamless server component rendering, layout caching, and clean browser navigation.

---

## 5. Next Steps & Rebuild Roadmap
1. **Repository Setup**: Initialize a new Next.js 15 TypeScript project with Tailwind CSS v4, Shadcn UI, and Lucide Icons.
2. **Database & API Contracts**: Define Mongoose / Prisma schemas and Zod validators for all entities.
3. **Core Shell & Auth**: Build responsive App Router layout with navigation sidebar, header, role-based guard middleware, and Sonner toast provider.
4. **Phase 1 Modules**: Onboarding & Employee Database, Daily Attendance & Geofence Map.
5. **Phase 2 Modules**: Task Management (Kanban/Subtasks), Leave Management, Document Manager.
6. **Phase 3 Modules**: Project Budget Management, Integrated Payroll Processor, Ethiopian Dual Calendar.
7. **Phase 4 Suite**: Analytics Hub & 20+ specialized system reports.
