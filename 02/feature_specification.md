# GeofenceHRM — Complete Feature Specification (Reverse-Engineered)

> **Purpose**: This document describes what the system **currently does** as of the audit date. It is intended to allow a complete rebuild from scratch without ever looking at the old code. Known inconsistencies are catalogued in §10; they are observations, not judgements.

---

## Table of Contents

1. [Pages / Screens](#1-pages--screens)
2. [Routing Map](#2-routing-map)
3. [State Management](#3-state-management)
4. [Forms & Validation](#4-forms--validation)
5. [API Endpoints / Data Layer](#5-api-endpoints--data-layer)
6. [Notifications / Toasts / Alerts](#6-notifications--toasts--alerts)
7. [Business Logic & Edge Cases](#7-business-logic--edge-cases)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Data Models](#9-data-models)
10. [Known Inconsistencies / Tech Debt Observed](#10-known-inconsistencies--tech-debt-observed)

---

## 1. Pages / Screens

The system has **two distinct user experiences** — an **Admin HRM Dashboard** and an **Employee Portal** — plus authentication screens.

### 1.1 Authentication Screens

#### `/login` — Admin Login
- **Purpose**: Authenticate administrators into the HRM dashboard.
- **Access**: Public (unauthenticated).
- **Displays**: Company name "EF Architects and Engineers Consulting plc", logo (`/newlogo.png`), background image (`/4565.jpg`), Employee ID + Password fields.
- **Actions**: Submit credentials → on success (role=ADMIN), redirect to `/hrm/protected`. Non-ADMIN users see "Access denied" error and token is removed.

#### `/employee-login` — Employee Login
- **Purpose**: Authenticate employees into the Employee Portal.
- **Access**: Public (unauthenticated).
- **Displays**: Same background/logo styling, Employee ID + Password fields.
- **Actions**: Submit credentials → stores token as `employeeToken` and employee data as `employeeData` in localStorage → redirects to `/employee-portal`. No role restriction (any authenticated employee accepted).

#### `/unauthorized` — Access Denied
- **Purpose**: Show an "Access Denied" message for non-admin users who try to access admin routes.
- **Access**: Public.
- **Displays**: Shield icon, "Insufficient Permissions" message, instructions to contact admin.
- **Actions**: "Back to Login" button → redirects to `/login`.

### 1.2 Admin HRM Dashboard (ADMIN only)

The admin dashboard is a **single-page application** at `/hrm` (or `/hrm/protected`) that renders different components based on a `section` query parameter. All sections require `ADMIN` role (JWT-decoded client-side).

#### Dashboard (`?section=dashboard` or default)
- KPI summary cards: total employees, total departments, total documents, pending leave requests.
- Quick navigation links to other sections.

#### Organization
- **Departments** (`?section=departments`): CRUD departments (name, description, manager, budget, status). Includes employee count via aggregation.
- **Designations** (`?section=designations`): View/manage job titles. Derived from `departments.designations[]` array or fallback from `employees.designation`.

#### Employee Management
- **Employees** (`?section=employees`): Full employee database with search, filter, paginate. Multi-step stepper form to add/edit employees (89KB component). Features: photo upload, bulk operations, inline edit dialog.
- **Employee Location** (`?section=employee-location`): Assign/view employees' work locations on map.
- **Contracts** (`?section=contracts`): View/manage employee contracts with expiry tracking.

#### Document Management (`?section=documents`)
- Upload, view, download, delete documents (via file upload API with multer).
- Document preview (PDF, DOCX via `docx-preview`, images).
- Expiry date tracking with 30-day-ahead alerts in header notification bell.

#### Work Locations (`?section=work-locations`)
- CRUD work locations with geofenced boundaries (name, address, lat/lng, radius).
- Map visualization (uses embedded map/iframe).
- Assign employees to locations.

#### Attendance
- **Admin Management** (`?section=admin-attendance`): View/manage all attendance records, approve/reject, override entries.
- **All Attendance** (`?section=attendance-all`): Read-only view of all attendance records with employee details joined.
- **Attendance Reports** (`?section=attendance-reports`): Reporting and analytics on attendance data.

#### Payroll (`?section=payroll`)
- Integrated payroll calculator supporting Ethiopian Income Tax brackets.
- Deductions: Income tax, pension (employee 7% + employer 11%), other deductions.
- Allowances: transport, housing, position, hardship, etc.
- Monthly payroll calculation with working-day adjustments (Ethiopian calendar holidays excluded).
- Payroll run history and reconciliation.

#### Leave Management
- **Leave Approval** (`?section=leave-approval`): Admin view to approve/reject leave requests.
- **Leave Balances** (`?section=leave-balances`): Admin management of employee leave balances (annual, sick, maternity, paternity, bereavement, unpaid, study, special).

#### Project Management
- **Projects** (`?section=projects`): CRUD projects with category, dates, status, assigned employees, milestones, financial structure.
- **Category Management** (`?section=project-categories`): CRUD project and task categories.
- **Budget Management** (`?section=budget-management`): Budget allocation, expense tracking, income tracking with lifecycle states.

#### Calendar (`?section=calendar`)
- Ethiopian Calendar view using `kenat` library.
- Holiday display integrated.

#### Analytics & Reports
A large suite of report components, each accessible via `?section=<report-name>`:

| Section ID | Report |
|---|---|
| `attendance-management-reports` | Hub for attendance sub-reports |
| `employee-management-reports` | Hub for employee sub-reports |
| `organization-management-reports` | Hub for org sub-reports |
| `document-management-reports` | Hub for document sub-reports |
| `work-location-management-reports` | Hub for location sub-reports |
| `leave-reports` | Leave management reports hub |
| `payroll-reports` | Payroll reports hub |
| `project-reports` | Project reports hub |
| `executive-reports` | Cross-system executive reports (tabbed: system-health, compliance-audit, workforce-productivity-roi, executive-dashboard) |
| `universal-system-reports` | Universal reports (tabbed: completed-activities, workflow-bottlenecks, user-activity-security) |
| `employee-master-report` | Full employee master listing |
| `employee-allocation-report` | Employee allocation by project/location |
| `employee-lifecycle-report` | Hire-to-termination lifecycle data |
| `organizational-structure-report` | Org chart/structure report |
| `role-permission-audit-report` | Role and permission audit |
| `department-performance-report` | Department KPI report |
| `document-inventory-report` | All documents inventory |
| `document-expiry-compliance-report` | Expiry compliance |
| `site-location-master-report` | All work locations |
| `site-attendance-compliance-report` | Attendance by site |
| `workforce-distribution-report` | Employee distribution by site |
| `employee-stats` | Employee statistics (legacy) |
| `department-stats` | Department analytics (legacy) |
| `document-stats` | Document reports (legacy) |

### 1.3 Employee Portal (Any Authenticated Employee)

Located at `/employee-portal`. Uses `employeeToken` in localStorage. Separate sidebar (`EmployeeSidebar`). Polls notifications every 30 seconds.

| Section | Component | Description |
|---|---|---|
| `dashboard` | EmployeeDashboard | Personal overview, quick stats |
| `attendance` | DailyAttendance | Clock in/out with GPS + photo. Geofence validation against assigned work locations. |
| `attendance-history` | EmployeeAttendanceHistory | View own past attendance records |
| `leave-request` | EmployeeLeaveRequest | Submit leave requests |
| `leave-balance` | LeaveBalance | View own leave balances |
| `attendance-documents` | AttendanceDocuments | Upload/view attendance supporting documents |
| `request-status` | EmployeeRequestStatus | Track status of submitted requests |
| `projects` | EmployeeProjects | View assigned projects |
| `tasks` | EmployeeTasks | View and manage assigned tasks |
| `milestones` | EmployeeMilestones | View project milestones |

### 1.4 Standalone Feature Routes (Mostly Unused/Legacy)

Several Next.js route directories exist as separate pages but appear to be legacy or alternate entry points:

- `/employee-attendance` — standalone attendance page
- `/employee-setup` — standalone employee setup
- `/attendance-daily` — standalone daily attendance
- `/attendance-documents` — standalone attendance docs
- `/attendance-reports` — standalone reports
- `/admin-attendance` — standalone admin attendance
- `/admin-leave-balance` — standalone leave balance admin
- `/budget-management` — standalone budget page
- `/category-management` — standalone category page
- `/documents` — standalone document management
- `/employee-location` — standalone employee location
- `/geofence-management` — standalone geofence manager
- `/payroll` — standalone payroll
- `/projects` — standalone projects
- `/project-alerts` — standalone project alerts
- `/project-budget` — standalone project budget
- `/task-management` — standalone task management
- `/task-reports` — standalone task reports
- `/work-locations` — standalone work locations
- `/test-contract-expiry` — test page for contract expiry feature

---

## 2. Routing Map

### 2.1 Page Routes

| Path | Protected? | Auth Mechanism | Renders |
|---|---|---|---|
| `/` | No | — | Server-side redirect to `/login` |
| `/login` | No | — | Admin login form (`LoginPage`) |
| `/employee-login` | No | — | Employee login form (`EmployeeLoginPage`) |
| `/unauthorized` | No | — | Access denied page |
| `/hrm` | Yes (ADMIN) | Client-side JWT decode from `localStorage.authToken` | HRM Dashboard SPA — section via `?section=` query param |
| `/hrm/protected` | Yes (ADMIN) | Same as `/hrm` (duplicate) | **Identical** HRM Dashboard SPA — incomplete copy with fewer sections |
| `/employee-portal` | Yes (any employee) | Client-side check of `localStorage.employeeToken` | Employee Portal SPA — section via `?section=` query param |
| `/employee-attendance` | Varies | Standalone page | Attendance page |
| `/admin-attendance` | Varies | Standalone page | Admin attendance |
| `/budget-management` | Varies | Standalone page | Budget management |
| (20+ more standalone) | Varies | Most appear to have no auth check | Duplicate component rendering |

### 2.2 Section-Based Routing (SPA-Internal)

Both `/hrm` and `/hrm/protected` use `?section=<id>` to choose which component to render. The sidebar navigates via `router.push("/hrm?section=<id>")`.

**Tabbed reports** additionally use `?tab=<tab-id>` for `executive-reports` and `universal-system-reports`.

### 2.3 Observed Routing Inconsistencies

1. **Duplicate dashboard**: `/hrm` and `/hrm/protected` are near-identical pages with the same auth logic. `/hrm/protected` is the target after login, but `/hrm` has **more sections implemented**. The sidebar always links to `/hrm?section=...`.
2. **Standalone page routes** (e.g., `/task-management`, `/payroll`) exist as separate Next.js routes rendering the same components as HRM sections, with inconsistent or missing auth.
3. **Section ID mismatch**: Sidebar defines `id: "projects"` for submenu items but maps to `path: "/hrm?section=projects"`. The old commented-out sidebar had `id: "projects-list"` with special-case highlighting logic that no longer matches.
4. **Duplicate switch cases**: In `/hrm/page.js`, cases `document-inventory-report` and `document-expiry-compliance-report` appear **twice** (lines 187-191 and 198-201).
5. **Missing `onSectionChange` in submenu handler**: `handleSubmenuClick` calls `router.push` but does **not** call `onSectionChange`, so the state and URL can desync until the page re-reads `searchParams`.

---

## 3. State Management

### 3.1 Global Stores (Zustand)

| Store | Location | State | Readers | Writers |
|---|---|---|---|---|
| `useSidebarStore` | `components/useSidebarStore.js` | `isCollapsed: boolean` | `Layout.js`, `Sidebar.js`, `EmployeePortal` | `Layout.js`, `Sidebar.js` |

Also persisted to `localStorage.layout:isSidebarCollapsed` — both `Layout.js` and `Sidebar.js` independently read/write this, creating a potential race condition.

### 3.2 Auth State

Auth is managed via **localStorage tokens**, not a global store:

| Key | Used by | Contents |
|---|---|---|
| `authToken` | Admin login (`/login` page), `/hrm`, `/hrm/protected` | JWT containing `{employeeId, name, email, role, permissions, workLocations, exp}` |
| `employeeToken` | Employee login (`/employee-login`), `/employee-portal` | Same JWT (from same `/api/auth/login` endpoint) |
| `employeeData` | `/employee-portal` | Serialized employee object |
| `attendanceUser` | `ClientRoot.js` (legacy) | Plain username string (no JWT) |

> **Inconsistency**: There are **three separate auth mechanisms**: (1) `authToken` for admin, (2) `employeeToken` + `employeeData` for employee, and (3) `attendanceUser` for the legacy `ClientRoot`/`AttendancePage` flow. All three use `localStorage` and none use cookies or server-side sessions.

### 3.3 Per-Page State

Each major page (`/hrm`, `/hrm/protected`, `/employee-portal`) maintains its own local React state:

- `activeSection` (string) — which component to render
- `isAuthenticated` / `isAdmin` / `loading` / `user` (auth state)
- `error` (string)

This is **duplicated** across `/hrm/page.js` and `/hrm/protected/page.js` with slightly different section mappings.

### 3.4 Component-Level State

Most components are self-contained with local `useState`. They fetch their own data on mount via `useEffect`. There is **no shared data cache** or state management for:
- Employee list
- Department list
- Project list
- Attendance records

Each component independently fetches from the API, leading to redundant network requests when navigating between sections.

---

## 4. Forms & Validation

### 4.1 Login Forms

#### Admin Login (`/login/page.js`)
| Field | Validation | Location |
|---|---|---|
| `employeeId` | `required` (HTML) | Client-side |
| `password` | `required` (HTML) | Client-side |

**On error**: Inline red box + SweetAlert2 toast (top-right). **On success**: SweetAlert2 success toast + redirect.

#### Employee Login (`/employee-login/page.js`)
| Field | Validation | Location |
|---|---|---|
| `employeeId` | `trim().length > 0` | Client-side |
| `password` | `trim().length > 0` | Client-side |

**On error**: Inline message with 5-second auto-dismiss. **On success**: Inline success message + redirect after 1500ms.

#### Legacy Login (`LoginForm.js` — used by `ClientRoot.js`)
| Field | Validation | Location |
|---|---|---|
| `username` | `trim().length > 0` | Client-side only |
| `password` | `length > 0` | Client-side only |

**No server validation** — stores username directly to `localStorage.attendanceUser` with a 700ms simulated delay.

### 4.2 Project Forms (`formValidation.js`)

#### Project Form (`validateProjectForm`)
| Field | Rules |
|---|---|
| `name` | Required, 3–100 chars |
| `description` | Required, 10–500 chars |
| `startDate` | Required, not in past |
| `endDate` | Required, must be after startDate |
| `status` | Required, one of: `pending`, `in_progress`, `completed`, `cancelled`, `on_hold` |
| `category` | Required |
| `priority` | Required, one of: `low`, `medium`, `high`, `urgent` |

#### Budget Form (`validateBudgetForm`)
| Field | Rules |
|---|---|
| `totalAmount` | Required, valid money (up to 2 decimal places), 0.01–1B |
| `currency` | Required |
| `description` | Max 200 chars |
| `approvedBy` | Max 100 chars |
| `approvalDate` | If provided, not future |
| `budgetAllocations` | Sum must not exceed total budget |

#### Expense Form (`validateExpenseForm`)
| Field | Rules |
|---|---|
| `amount` | Required, valid money, max 10M |
| `title` | Required, 3–100 chars |
| `category` | Required |
| `expenseDate` | Required, not future |
| `receipt` | Max 100 chars |

#### Allocation Form (`validateAllocationForm`)
| Field | Rules |
|---|---|
| `name` | Required, 3–100 chars |
| `amount` | Required, valid money, max 1B. Cannot exceed available budget. Cannot be less than already spent. |
| `description` | Max 300 chars |
| `startDate` / `endDate` | If both provided, end ≥ start |
| `departmentId` | Required if type=department |
| `taskId` | Required if type=task |
| `activityId` | Required if type=activity |
| `milestoneId` | Required if type=milestone |

#### Income Form (`validateIncomeForm`)
| Field | Rules |
|---|---|
| `title` | Required, 3–100 chars |
| `amount` or `expectedAmount` | At least one required; valid money up to 1B |
| `receivedDate` | Required on edit, not future |
| `dueDate` | Required on edit |
| `clientName` | Required on edit, max 100 chars |

#### Milestone Form (`validateMilestoneForm`)
| Field | Rules |
|---|---|
| `title` | Required, 3–100 chars |
| `description` | Required, 10–500 chars |
| `dueDate` | Required, not in past |
| `status` | Required, one of: `pending`, `in_progress`, `completed`, `cancelled` |
| `progress` | If provided, 0–100 |

#### Task Form (`validateTaskForm`)
| Field | Rules |
|---|---|
| `title` | Required, 3–100 chars |
| `description` | Required, 10–1000 chars |
| `priority` | Required, one of: `low`, `medium`, `high`, `urgent` |
| `status` | Required, one of: `pending`, `in_progress`, `completed`, `blocked`, `cancelled` |
| `dueDate` | Required, not in past |
| `assignedTo` | Required, at least one member |

### 4.3 Employee Form (`StepperEmployeeForm.js` / `EditStepperEmployeeForm.js`)

~82KB–90KB multi-step stepper forms. Validation is mostly inline within the components. Fields include:

- Personal details (name, DOB, email, phone, address, gender, nationality, marital status, photo)
- Employment details (employee ID, department, designation, hire date, contract dates, salary)
- Work location assignment (multi-select from work_locations)
- Employment history, certifications, skills
- Health records (blood type, allergies, medical conditions)
- Password setup (on create)

### 4.4 Validation Inconsistencies

1. **No server-side validation on most endpoints**: The API routes for attendance, geofences, and legacy employee creation accept any shape of data.
2. **Project API** requires only `name`, `startDate`, `endDate` server-side, but the client validates many more fields.
3. **Login validates differently**: Admin login uses `required` HTML attribute; employee login does manual `trim().length > 0`; legacy login checks `trim()` and `boolean`.
4. **Money validation** is client-only via `formValidation.js` — the API trusts incoming amounts.
5. **Employee creation** has no email uniqueness check.

---

## 5. API Endpoints / Data Layer

### 5.1 Authentication

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | `{employeeId, password}` | `{success, data: {token, employee: {...}}}` | None | Admin login, Employee login |
| GET | `/api/auth/roles` | — | Role definitions and user roles list | None (should be admin) | Role management |
| POST | `/api/auth/roles` | `{userId, role, permissions}` | Assign role to user | None (should be admin) | Admin role assignment |

### 5.2 Employees

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/employee` | — | `{success, employees}` (raw data) | None | Various admin components |
| POST | `/api/employee` | Employee object | `{success, employeeId, data}` | None | Employee creation (stepper form) |
| GET | `/api/employee/[id]` | — | `{success, employee}` | None | Employee detail, portal |
| PUT | `/api/employee/[id]` | Updated fields | `{success}` | None | Employee edit |
| DELETE | `/api/employee/[id]` | — | `{success}` | None | Employee deletion |
| GET | `/api/employees` | — | `{success, employees}` (formatted with name normalization) | None | Dropdowns, lists |
| GET | `/api/employee/next-id` | — | Next employee ID | None | Employee creation form |
| POST | `/api/employee/stepper` | Multi-step employee data | Created employee | None | Stepper form |
| POST | `/api/employee/stepper-simple` | Simplified employee data | Created employee | None | Simplified form |
| POST | `/api/employee/bulk` | Array of employees | Bulk creation result | None | Bulk import |
| POST | `/api/employee/setup-password` | `{employeeId, password}` | Password set result | None | Employee setup |
| GET | `/api/employee/enhanced` | — | Enhanced employee list | None | Advanced views |
| POST | `/api/employee/migrate-users` | — | Migration result | None | One-time migration |

### 5.3 Attendance

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/attendance` | `?id=`, `?employeeId=`, `?startDate=`, `?endDate=`, `?collection=` | Attendance records (with employee details if `collection=daily_attendance`) | None | Reports, history |
| POST | `/api/attendance` | `{lat, lng, name, ...}` | `{success}` — validates geofence if location provided | None | Employee clock-in/out |
| PUT | `/api/attendance` | `{id, ...fields}` | `{success}` | None | Admin edit attendance |
| DELETE | `/api/attendance` | `?id=` | `{success}` | None | Admin delete attendance |
| GET | `/api/attendance/daily` | Query params | Daily attendance records | None | Daily view |
| POST | `/api/attendance/approve` | Approval data | Approval result | None | Admin approval |
| GET | `/api/attendance/reports` | Query params | Report data | None | Reports |
| POST | `/api/attendance/gps-validation` | GPS data | Validation result | None | GPS check |
| POST | `/api/attendance/photos` | Photo upload | Upload result | None | Photo attendance |
| GET | `/api/attendance/documents` | Query params | Attendance documents | None | Document view |
| GET | `/api/attendance/payroll-integration` | Query params | Payroll-relevant attendance data | None | Payroll module |

### 5.4 Leave

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/leave/balances` | `?employeeId=` | `{success, data: balance}` | None | Leave balance view |
| PUT | `/api/leave/balances` | `{employeeId, leaveType, adjustment, reason, adminId}` | Updated balance | None | Admin adjustment |
| GET | `/api/leave/balances/realtime` | `?employeeId=` | Real-time balance | None | Dashboard |
| GET | `/api/leave/balances/history` | `?employeeId=` | Balance change history | None | History view |
| GET | `/api/leave/balances/export` | `?employeeId=` | CSV/Excel export | None | Export feature |
| GET | `/api/leave/approval-routing` | Query params | Approval routing rules | None | Approval flow |

### 5.5 Documents

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/documents` | — | Array of document metadata (binary fields excluded) | None | Document list |
| POST | `/api/documents/upload` | FormData (file + metadata) | Upload result | None | Document upload |
| GET | `/api/documents/[id]` | — | Document detail/download | None | Document view |
| PUT | `/api/documents/[id]` | Updated metadata | Update result | None | Document edit |
| DELETE | `/api/documents/[id]` | — | Delete result | None | Document delete |
| GET | `/api/documents/expiring` | `?days=30` | Documents expiring within N days | None | Header bell notification |
| GET | `/api/documents/stats` | — | Document statistics | None | Reports |

### 5.6 Projects & Tasks

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| POST | `/api/projects` | `{name, description, category, categoryId, startDate, endDate, status, assignedEmployees, milestones}` | `{success, project}` | None | Project creation |
| GET | `/api/projects` | `?category=`, `?status=`, `?employeeId=`, `?includeEmployees=`, `?page=`, `?limit=` | `{success, projects, pagination}` | None | Project list |
| GET | `/api/projects/[id]` | — | Single project with details | None | Project detail |
| PUT | `/api/projects/[id]` | Updated fields | Update result | None | Project edit |
| DELETE | `/api/projects/[id]` | — | Delete result | None | Project delete |
| GET | `/api/projects/financial-reports` | Query params | Financial report data | None | Financial reports |
| GET | `/api/projects/reports` | Query params | Project report data | None | Project reports |
| POST | `/api/tasks` | `{title, description, projectId, ...}` | `{success, task}` + sends email | None | Task creation |
| GET | `/api/tasks` | Query params | Task list | None | Task list |
| GET | `/api/tasks/[id]` | — | Task detail | None | Task detail |
| PUT | `/api/tasks/[id]` | Updated fields | Update result | None | Task edit |
| DELETE | `/api/tasks/[id]` | — | Delete result | None | Task delete |
| POST | `/api/tasks/assign` | Assignment data | Assignment result + email | None | Task assignment |
| GET | `/api/tasks/dependencies` | `?taskId=` | Task dependencies | None | Dependency view |
| GET | `/api/tasks/reports` | Query params | Task report data | None | Reports |
| GET | `/api/tasks/progress-audits` | Query params | Progress audit trail | None | Audit view |
| GET | `/api/tasks/notifications` | Query params | Task notifications | None | Notification list |

### 5.7 Organization

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/departments` | `?projectId=`, `?includeEmployees=` | `{success, departments}` with employee counts | None | Department list |
| POST | `/api/departments` | `{name, description, projectId, managerId, budget, status}` | `{success, department}` | None | Department creation |
| GET/PUT/DELETE | `/api/departments/[id]` | — | CRUD operations | None | Department management |
| GET | `/api/designations` | — | `{success, designations}` (derived from departments or employees) | None | Designation dropdowns |

### 5.8 Work Locations & Geofences

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/work-locations` | — | `{success, locations}` with employee counts | None | Location list |
| POST | `/api/work-locations` | `{name, address, latitude, longitude, radius, description}` | `{success, location}` | None | Location creation |
| GET/PUT/DELETE | `/api/work-locations/[id]` | — | CRUD operations | None | Location management |
| GET | `/api/work-locations/stats` | — | Location statistics | None | Reports |
| GET | `/api/geofences` | `?name=` | Geofence(s) | None | Geofence lookup |
| POST | `/api/geofences` | `{name, lat, lng, radius}` | `{success}` | None | Geofence creation |
| PUT | `/api/geofences` | `{name, ...fields}` | `{success}` | None | Geofence update |
| DELETE | `/api/geofences` | `?name=` | `{success}` | None | Geofence delete |

### 5.9 Payroll

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| POST | `/api/payroll/calculate` | `{month, year, employeeIds}` | Payroll calculation results | None | Payroll page |

### 5.10 Categories

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET/POST | `/api/project-categories` | — | CRUD project categories | None | Category management |
| GET/PUT/DELETE | `/api/project-categories/[id]` | — | Single category ops | None | Category management |
| GET/POST | `/api/task-categories` | — | CRUD task categories | None | Category management |
| GET/PUT/DELETE | `/api/task-categories/[id]` | — | Single category ops | None | Category management |
| GET/POST | `/api/budget-allocation-categories` | — | CRUD budget allocation categories | None | Budget management |
| GET/PUT/DELETE | `/api/budget-allocation-categories/[id]` | — | Single category ops | None | Budget management |
| GET/POST | `/api/income-categories` | — | CRUD income categories | None | Income tracking |
| GET/PUT/DELETE | `/api/income-categories/[id]` | — | Single category ops | None | Income tracking |

### 5.11 Notifications & Cron

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/notifications/employee` | `?employeeId=`, `?status=`, `?limit=` | `{success, notifications, unreadCount}` | None | Employee portal |
| PUT | `/api/notifications/employee` | `{employeeId, notificationIds}` or `{employeeId, markAllAsRead}` | `{success}` | None | Mark as read |
| POST | `/api/notifications/contract-expiry` | — | Triggers contract expiry notifications | None | Cron/manual |
| POST | `/api/notifications/email` | Email data | Send email notification | None | System |
| GET | `/api/notifications/project-documents-expiry` | — | Project document expiry check | None | Cron |
| GET | `/api/cron/notifications` | — | Run scheduled notification checks | None | External cron trigger |

### 5.12 Reports & Other

| Method | Path | Request | Response | Auth | Used By |
|---|---|---|---|---|---|
| GET | `/api/reports/<domain>` | Various | Report data for: analytics, attendance, departments, documents, employees, executive, leave, organization, payroll, projects, work-locations | None | Report components |
| GET | `/api/ethiopian-calendar` | `?action=`, `?year=`, `?month=` | Calendar/holiday data | None | Calendar, payroll |
| POST | `/api/seed` | — | Seed database with initial data | None | Setup |
| GET | `/api/audit` | Query params | Audit log entries | None | Audit reports |
| GET | `/api/activities` | Query params | Activity/change log | None | Activity tracking |
| GET | `/api/project-alerts` | Query params | Project alerts | None | Alerts view |
| GET | `/api/face` | — | Face detection data | None | Face recognition feature |
| POST | `/api/test-email` | Test data | Test email sending | None | Testing |
| GET | `/api/test` | — | API test endpoint | None | Testing |
| GET | `/api/migrate` | — | Database migration | None | One-time ops |

> **Critical note**: **None of the API endpoints enforce authentication server-side.** The middleware file `api/middleware/auth.js` defines `getCurrentUser`, `checkPermission`, and `requirePermission`, but they are not applied as Next.js middleware or called by route handlers. If no token is found, `getCurrentUser` falls back to `{userId: "system", role: "ADMIN"}`.

---

## 6. Notifications / Toasts / Alerts

### 6.1 Toast/Alert Systems (Dual System)

The app has **two competing notification systems** installed:

1. **SweetAlert2** (`sweetalert2`) — Used via `app/utils/sweetAlert.js`. Renders modal-like toasts at `position: "top-end"`.
2. **React-Toastify** (`react-toastify`) — Installed with `ToastProvider.js` and `ClientToastWrapper.js`, each with different configurations. **Neither appears to be mounted in the root layout**, so react-toastify may not actually display.

### 6.2 SweetAlert2 Toast Messages

#### Authentication
| Trigger | Type | Title | Text |
|---|---|---|---|
| Admin login success | Success | "Welcome back!" | "Signing you in…" |
| Admin login — non-ADMIN role | Error | "Access Denied" | "Access denied. Admin role required to access HRM dashboard." |
| Admin login — API error | Error | "Login Failed" | `result.error` or "Login failed" |
| Admin login — network error | Error | "Connection Error" | "Network error. Please try again." |

#### Project/Financial Operations
| Trigger | Type | Title | Text |
|---|---|---|---|
| Budget created | Success | "Budget Created!" | "Project budget has been created successfully" |
| Budget updated | Success | "Budget Updated!" | "Project budget has been updated successfully" |
| Budget error | Error | "Budget Error" | `message` or "Failed to process budget request" |
| Expense added | Success | "Expense Added!" | "Expense has been added successfully" |
| Expense updated | Success | "Expense Updated!" | "Expense has been updated successfully" |
| Expense deleted | Success | "Expense Deleted!" | "Expense has been deleted successfully" |
| Allocation added | Success | "Allocation Added!" | "Budget allocation has been added successfully" |
| Allocation updated | Success | "Allocation Updated!" | "Budget allocation has been updated successfully" |
| Allocation deleted | Success | "Allocation Deleted!" | "Budget allocation has been deleted successfully" |
| Milestone created | Success | "Milestone Created!" | "Project milestone has been created successfully" |
| Milestone updated | Success | "Milestone Updated!" | "Project milestone has been updated successfully" |
| Milestone deleted | Success | "Milestone Deleted!" | "Project milestone has been deleted successfully" |
| Task created | Success | "Task Created!" | "Project task has been created successfully" |
| Task updated | Success | "Task Updated!" | "Project task has been updated successfully" |
| Task deleted | Success | "Task Deleted!" | "Project task has been deleted successfully" |
| Project created | Success | "Project Created!" | "New project has been created successfully" |
| Project updated | Success | "Project Updated!" | "Project has been updated successfully" |
| Project deleted | Success | "Project Deleted!" | "Project has been deleted successfully" |
| Team member added | Success | "Team Member Added!" | "Team member has been added to the project" |
| Team member removed | Success | "Team Member Removed!" | "Team member has been removed from the project" |

#### Confirmation Dialogs
| Trigger | Type | Title | Text |
|---|---|---|---|
| Generic confirm | Warning | "Are you sure?" | "This action cannot be undone" |
| Delete confirm | Warning | "Delete Item" | "Are you sure you want to delete this item? This action cannot be undone." |
| Validation errors | Error | "Validation Error" | "Please fix the following errors:" + bullet list |
| Generic input prompt | Info | Custom | Custom with input field |

### 6.3 Header Bell Notification (In-App)

- Shows count of documents expiring within 30 days.
- Dropdown shows up to 10 expiring documents with title and expiry date.
- Links to `/hrm?section=documents`.

### 6.4 Employee Portal Notifications

- Polled every 30 seconds from `/api/notifications/employee`.
- Notification bell with unread count badge.
- Dropdown with notification list, mark-as-read, mark-all-as-read.

### 6.5 Employee Login Messages

| Trigger | Type | Display |
|---|---|---|
| Empty fields | Error | "Please fill in all fields" (inline, 5s auto-dismiss) |
| API error response | Error | `result.error` or "Login failed" (inline, 5s auto-dismiss) |
| Network error | Error | "Network error. Please try again." (inline, 5s auto-dismiss) |
| Login success | Success | "Login successful! Redirecting..." (inline, 5s auto-dismiss) |

---

## 7. Business Logic & Edge Cases

### 7.1 Authentication & Authorization

- **Login supports multiple identifiers**: employee ID, email (case-insensitive regex), or phone/contact number. All are searched via `$or` against both flat fields and `personalDetails.*` nested fields.
- **Password checked in two locations**: `employee.password` or `employee.personalDetails.password` (bcrypt hash).
- **Work location gate**: Login is blocked (`403`) if the employee has no `workLocations[]` array and no legacy `workLocation` field. Message: "No work locations assigned. Please contact administrator."
- **JWT contains**: `employeeId`, `employeeIdCode`, `name`, `email`, `department`, `workLocations[]`, `workLocation` (legacy), `role`, `permissions[]`. Expires in 24 hours.
- **Role lookup**: Checked from `user_roles` collection by `userId` + `isActive: true`. If no role found, defaults to `"EMPLOYEE"`.
- **Admin check** is client-side only: JWT payload is decoded with `atob()` — no server-side middleware enforcement.
- **Auth middleware fallback**: If no token/header found, `getCurrentUser()` returns `{userId: "system", role: "ADMIN"}` — effectively **open access**.

### 7.2 Geofence Validation

- Uses **Haversine formula** to calculate distance between employee's GPS coordinates and geofence center.
- If distance > `geofence.radius` (in meters): attendance POST returns `403` with message including actual distance and allowed radius.
- GPS spoofing detection (`GPSValidation` class):
  - Invalid coordinates (lat outside ±90, lng outside ±180): risk score +50
  - Accuracy < 1m: risk score +20 ("suspiciously high")
  - Coordinates rounded to 3 decimal places match raw values: risk score +30 ("manually entered")
  - Teleportation: >1000km in <1 hour: risk score +80
- Distance function is **duplicated**: exists in both `attendance/route.js` and `gpsValidation.js`.

### 7.3 Ethiopian Calendar & Holidays

- Uses `kenat` library for Gregorian↔Ethiopian date conversion.
- Holidays computed per-year via `Kenat.isHoliday()` scanning or `Kenat.getHolidaysInMonth()`.
- Holiday results cached in-memory (`Map`) per Gregorian year.
- Working days exclude Saturday and Sunday (by UTC day-of-week).
- `calculateWorkingDaysExcludingHolidays()` additionally excludes holidays.

### 7.4 Payroll Calculation

Ethiopian Income Tax brackets (monthly):
| Bracket | Rate | Deduction |
|---|---|---|
| 0–2,000 | 0% | 0 |
| 2,001–4,000 | 15% | 300 |
| 4,001–7,000 | 20% | 500 |
| 7,001–10,000 | 25% | 850 |
| 10,001–14,000 | 30% | 1,350 |
| 14,001+ | 35% | 2,050 |

Formula: `Tax = (Gross × Rate) - Deduction`, with `Math.max(0, ...)`.

**Pension**: Employee 7%, Employer 11% of gross salary.

Payroll uses working days from Ethiopian calendar API or falls back to util-based calculation.

### 7.5 Leave Balance Logic

- **Leave types**: annual, sick, maternity, paternity, bereavement, unpaid, study, special.
- Initial balances created on first access based on employment date.
- Balances auto-calculated via `calculateLeaveBalances()` considering accrual and usage.
- Admin can manually adjust via PUT with `adjustment` amount and `reason`.
- Negative balance check: adjustment that would result in < 0 is rejected.
- **Income lifecycle states**: `pending` → `partial` → `collected` → `overdue` → `cancelled`.

### 7.6 Employee Data Shape Normalization

The `employees` collection has highly inconsistent document shapes. The API and components handle this with extensive fallback chains:
- Name: `personalDetails.name` → `name` → `personalDetails.fullName` → `fullName` → `firstName + lastName` → `"Employee " + id.slice(-6)`
- Email: `personalDetails.email` → `email`
- Department: `department` → `personalDetails.department`
- Designation: `designation` → `personalDetails.designation` → `position` → `personalDetails.position`

### 7.7 Audit Logging

All major CRUD operations create audit log entries via `createAuditLog()` with:
- `action` (CREATE, UPDATE, DELETE, LOGIN_SUCCESS, LOGIN_FAILURE, etc.)
- `entityType` (employee, project, department, auth, etc.)
- `entityId`, `userId`, `userEmail`
- `metadata` (contextual data)
- `ipAddress`, `userAgent`, `timestamp`

Audit user is hardcoded to `"admin"` / `"admin@company.com"` in most places (not extracted from actual request).

### 7.8 Role Hierarchy

Defined in `auth.js` middleware:
```
ADMIN (4) > HR_MANAGER (3) > HR_STAFF (2) > EMPLOYEE (1)
```

EMPLOYEE default permissions: `employee.read.own`, `employee.update.own`, `document.read.own`, `document.create.own`.

---

## 8. Third-Party Integrations

### 8.1 Database
- **MongoDB Atlas**: Connection via `mongodb` driver. URI hardcoded as fallback: `mongodb+srv://uercur_db_user:...@cluster0.vjsrjzh.mongodb.net/geo`. Database name: `geo`. Pool: min 1, max 10. Cached globally via `global._mongoClientPromise`.

### 8.2 Email (Nodemailer)
- **SMTP via Gmail** (or configurable). Config from env: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` (or `SMTP_*` variants).
- **Email templates**: Task assignment, project assignment, contract expiry, project document expiry.
- Returns `false` silently if config is invalid (default `"your-email@gmail.com"`).

### 8.3 Authentication
- **bcryptjs**: Password hashing (10 salt rounds).
- **jsonwebtoken**: JWT creation/verification. Secret: `JWT_SECRET` env or hardcoded `"your-secret-key"`.

### 8.4 Ethiopian Calendar
- **kenat** + **kenat-ui**: Ethiopian calendar conversion, holiday detection.

### 8.5 File Upload
- **multer**: File upload handling for documents and photos.

### 8.6 UI Libraries
- **MUI** (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`): Used in some components.
- **Lucide React**: Primary icon library.
- **Heroicons React**: Secondary icon library (imported but usage unclear).
- **React Icons**: Tertiary icon library.
- **Recharts**: Charting for dashboards and reports.
- **SweetAlert2**: Toast/modal notifications.
- **React-Toastify**: Alternative toast system (may not be mounted).
- **React-Webcam**: Camera access for attendance photos.
- **docx-preview**: DOCX file preview in browser.
- **xlsx**: Excel file generation for exports.
- **pdfkit**: Server-side PDF generation.
- **date-fns**: Date utilities.
- **uuid**: Unique ID generation.
- **TailwindCSS v4**: CSS framework.

### 8.7 Scheduled Tasks
- **node-cron**: Referenced in package.json. Contract expiry and document expiry notifications triggered via `/api/cron/notifications` endpoint (designed to be called by external scheduler).

---

## 9. Data Models

### 9.1 `employees` Collection

```
{
  _id: ObjectId,
  employeeId: String,           // Custom employee ID code
  name: String,                 // Flat name (legacy)
  firstName: String,            // (legacy)
  lastName: String,             // (legacy)
  fullName: String,             // (legacy)
  email: String,                // (legacy)
  contactNumber: String,        // (legacy)
  department: String,           // (legacy — string name)
  departmentId: ObjectId,       // (new — reference)
  designation: String,          // (legacy)
  position: String,             // (legacy)
  password: String,             // bcrypt hash (flat)
  workLocation: Object,         // (legacy single location)
  workLocations: [ObjectId],    // (new — array of work_location IDs)
  personalDetails: {
    name: String,
    fullName: String,
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    address: String,
    contactNumber: String,
    email: String,
    department: String,
    designation: String,
    position: String,
    password: String,           // bcrypt hash (nested duplicate)
    employeeId: String,
    workLocation: Object,
    contractExpiryDate: Date,
    hireDate: Date,
    salary: Number,
    gender: String,
    nationality: String,
    maritalStatus: String,
  },
  employmentHistory: [{company, position, startDate, endDate}],
  certifications: [{title, institution, dateObtained, expiryDate}],
  skills: [String],
  healthRecords: {bloodType, allergies: [String], medicalConditions: [String]},
  photo: String,                // URL or base64
  status: String,               // "active", etc.
  createdAt: Date,
  updatedAt: Date,
}
```

> **Note**: Employee data shape is highly inconsistent. Fields exist both at root level and nested inside `personalDetails`. Password is stored in both places.

### 9.2 `user_roles` Collection

```
{
  _id: ObjectId,
  userId: String,           // Employee _id as string
  email: String,
  role: String,             // "ADMIN", "HR_MANAGER", "HR_STAFF", "EMPLOYEE"
  permissions: [String],    // e.g., "employee.read", "document.create.own"
  assignedBy: String,
  assignedAt: Date,
  isActive: Boolean,
}
```

### 9.3 `departments` Collection

```
{
  _id: ObjectId,
  name: String,
  description: String,
  projectId: ObjectId | null,
  managerId: ObjectId | null,
  budget: Number,
  status: String,           // "active", "inactive"
  designations: [String],   // Job titles within department
  employeeCount: Number,    // Stored but also computed via aggregation
  createdAt: Date,
  updatedAt: Date,
}
```

### 9.4 `work_locations` Collection

```
{
  _id: ObjectId,
  name: String,
  address: String,
  latitude: Number,
  longitude: Number,
  radius: Number,           // Geofence radius in meters (default 100)
  description: String,
  status: String,           // "active"
  assignedEmployees: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
}
```

### 9.5 `geofences` Collection

```
{
  _id: ObjectId,
  name: String,             // Keyed by name (not ObjectId) for lookups
  lat: Number,
  lng: Number,
  radius: Number,           // meters
}
```

> **Note**: `geofences` and `work_locations` are **parallel systems** for the same concept. Geofences use `name` as key; work_locations use `_id`. Attendance POST validates against `geofences` by name, not `work_locations`.

### 9.6 `attendance` Collection (Legacy)

```
{
  _id: ObjectId,
  id: String,               // Custom string ID
  employeeId: String,
  name: String,             // Geofence name
  date: String,             // ISO date string
  lat: Number,
  lng: Number,
  geofenceValidated: Boolean,
  distanceFromCenter: Number,
  geofenceRadius: Number,
  ...other fields
}
```

### 9.7 `daily_attendance` Collection (New)

```
{
  _id: ObjectId,
  employeeId: String,       // Employee _id as string
  date: String,
  checkInTime: String,
  checkOutTime: String,
  ...other fields
}
```

### 9.8 `projects` Collection

```
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,             // Legacy string category
  categoryId: ObjectId | null,  // Reference to projectCategories
  startDate: Date,
  endDate: Date,
  status: String,               // "not_started", "pending", "in_progress", "completed", "cancelled", "on_hold"
  progress: Number,             // 0-100
  assignedEmployees: [ObjectId],
  milestones: [{
    _id: ObjectId,
    title: String,
    description: String,
    dueDate: Date,
    status: String,
    progress: Number,
    createdAt: Date,
  }],
  budget: Object | null,
  budgetAllocations: [Object],
  expenses: [Object],
  income: [Object],
  financialStatus: {
    totalBudget: Number,
    totalExpenses: Number,
    totalIncome: Number,
    budgetUtilization: Number,
    profitLoss: Number,
    lastUpdated: Date,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

### 9.9 `tasks` Collection

```
{
  _id: ObjectId,
  title: String,
  description: String,
  projectId: ObjectId,
  milestoneId: ObjectId | null,
  assignedTo: [ObjectId],
  assignedTeams: [ObjectId],
  priority: String,         // "low", "medium", "high", "urgent"
  status: String,           // "pending", "in_progress", "completed", "blocked", "cancelled"
  startDate: Date,
  dueDate: Date,
  estimatedHours: Number,
  actualHours: Number,
  progress: Number,
  tags: [String],
  dependencies: [ObjectId], // Other task IDs
  subtasks: [Object],
  category: String,
  categoryId: ObjectId | null,
  createdBy: String,
  createdAt: Date,
  updatedAt: Date,
}
```

### 9.10 `documents` Collection

```
{
  _id: ObjectId,
  title: String,
  originalName: String,
  fileName: String,
  filePath: String,
  fileType: String,
  fileSize: Number,
  expiryDate: Date | null,
  employeeId: ObjectId | null,
  uploadDate: Date,
  ...metadata
}
```

### 9.11 `leave_balances` Collection

```
{
  _id: ObjectId,
  employeeId: ObjectId,
  balances: {
    annual: { total, used, available, accrualRate },
    sick: { total, used, available },
    maternity: { ... },
    paternity: { ... },
    bereavement: { ... },
    unpaid: { ... },
    study: { ... },
    special: { ... },
  },
  history: [{ date, type, adjustment, reason, adminId }],
  createdAt: Date,
  updatedAt: Date,
}
```

### 9.12 `audit_logs` Collection

```
{
  _id: ObjectId,
  id: String,               // Custom string ID (date-based + random)
  action: String,
  entityType: String,
  entityId: String,
  userId: String,
  userEmail: String,
  changes: Object | null,
  metadata: Object | null,
  ipAddress: String | null,
  userAgent: String | null,
  timestamp: Date,
}
```

### 9.13 Category Collections

- `projectCategories`: `{_id, name, description, status, createdAt, updatedAt}`
- `taskCategories`: Same structure
- `budgetAllocationCategories`: Same structure
- `incomeCategories`: Same structure

---

## 10. Known Inconsistencies / Tech Debt Observed

### 10.1 Duplicate / Parallel Systems

| Issue | Details |
|---|---|
| **Two employee API routes** | `/api/employee` (POST + GET) and `/api/employees` (GET only with name normalization) serve overlapping purposes. Different response shapes. |
| **Two HRM dashboard pages** | `/hrm/page.js` (full, 394 lines) and `/hrm/protected/page.js` (subset, 217 lines) — duplicated auth logic, different section sets. Login redirects to `/hrm/protected` but sidebar links to `/hrm?section=...`. |
| **Two location/geofence systems** | `geofences` collection (keyed by `name`) and `work_locations` collection (keyed by `_id`). Attendance validates against geofences; employee assignments use work_locations. |
| **Two attendance collections** | `attendance` (legacy, keyed by string `id`) and `daily_attendance` (new, keyed by `employeeId`). |
| **Three auth mechanisms** | `authToken` (admin), `employeeToken` (employee portal), `attendanceUser` (legacy username). |
| **Two toast libraries** | SweetAlert2 (actively used) and React-Toastify (installed, configured in two wrapper components, but likely not mounted in root layout). |
| **Two ToastContainer configs** | `ToastProvider.js` (theme="colored", newestOnTop=true) vs `ClientToastWrapper.js` (newestOnTop=false). |
| **Three icon libraries** | Lucide React (primary), Heroicons React, React Icons — imported across different components. |
| **Duplicate distance function** | Haversine formula exists in `attendance/route.js`, `gpsValidation.js`. |
| **Duplicate switch cases** | `document-inventory-report` and `document-expiry-compliance-report` appear twice in `/hrm/page.js`. |

### 10.2 Employee Data Shape Chaos

- Fields exist at root level AND nested in `personalDetails` with no single source of truth.
- Password stored in both `employee.password` and `employee.personalDetails.password`.
- Name stored in 6+ possible field locations.
- Department referenced by string name, ObjectId, or `personalDetails.department`.
- The `/api/employees` route has a 20-line fallback chain just to derive a display name.

### 10.3 Security Concerns

| Issue | Details |
|---|---|
| **No server-side auth enforcement** | Zero API routes check for a valid JWT. Auth middleware exists but is never applied. |
| **Auth middleware falls back to ADMIN** | `getCurrentUser()` returns `{role: "ADMIN"}` when no token is found, defeating the purpose. |
| **MongoDB URI hardcoded** | Connection string with credentials in source code (`mongo.js` line 5-6). |
| **JWT secret hardcoded** | Default `"your-secret-key"` used when `JWT_SECRET` env var is missing. |
| **Password logged** | `console.log("password", password)` in login route (line 22). |
| **Password returned in response** | In development, generated password is returned in employee creation response. |
| **SMTP credentials with defaults** | Email config uses `"your-email@gmail.com"` / `"your-app-password"` as defaults. |

### 10.4 Dead Code & Stubs

| Item | Location |
|---|---|
| `LoginForm.js` (legacy) | Only used by `ClientRoot.js` — simulates login with setTimeout, no API call. |
| `ClientRoot.js` | Legacy attendance-only flow, references `AttendancePage` + `Navbarw` + `LoginForm`. Appears unused in routing. |
| `Navbar.js` | 657 bytes, basic navbar. Superseded by Layout header. |
| `Navbarw.js` | 5KB alternate navbar. Used only by `ClientRoot.js`. |
| `ClientOnly.js` | 369 bytes, simple hydration wrapper. Separate from `HydrationProvider`. |
| `GeofenceManager.js` + `GeofenceMap.js` | Components exist but no HRM section routes to them. |
| `FinancialDashboard.js` | 36KB component, not referenced in HRM section routing. |
| `financial/` subdirectory in components | Exists but not explored in section routing. |
| `WorkLocationsManagement.js.tmp` | 31KB temp file left in components directory. |
| ~15 standalone route directories | `/task-management`, `/payroll`, etc. — duplicate entry points with inconsistent auth. |
| Multiple root-level scripts | `create-admin-*.js`, `fix-admin-*.js`, `debug-*.js`, `test-*.js`, `migrate-*.js` — development/debug scripts committed to repo. |

### 10.5 Naming & Convention Conflicts

| Issue | Details |
|---|---|
| **API response shape** | Some routes return `{success, employees}`, others return bare arrays, others return `{success, data}`. |
| **Status enum values** | Projects use `"not_started"` / `"in_progress"` / `"on_hold"`. Tasks use `"pending"` / `"blocked"`. Not harmonized. Project form validation lists `"pending"` but project POST defaults to `"not_started"`. |
| **Date handling** | Mix of ISO strings, Date objects, and string comparisons (`$gte` on date strings vs Date objects). |
| **ID fields** | `id` (custom string) vs `_id` (ObjectId) used inconsistently. Geofences use `name` as key. |
| **Collection naming** | `daily_attendance` (snake_case), `leave_balances` (snake_case), `work_locations` (snake_case), `projectCategories` (camelCase), `taskCategories` (camelCase), `user_roles` (snake_case), `audit_logs` (snake_case). |
| **Import paths** | Some use `../../utils/audit.js` (with extension), others use `../../../utils/audit` (without). |
| **Hardcoded admin user** | Audit logs in project/department creation use `userId: "admin"`, `userEmail: "admin@company.com"` instead of extracting from request. |

### 10.6 Missing Features & Stubs

- Settings page renders "System settings coming soon..."
- Employee Setup section renders "component coming soon..."
- Employee Login section renders "component coming soon..."
- Daily Attendance admin section renders "component coming soon..."
- Attendance Documents admin section renders "component coming soon..."
- Legacy System section renders "component coming soon..."
- Organization Hierarchy renders "coming soon..."
- Search bar in header is non-functional (no search handler).
- Settings button in header has no handler.
- Sidebar `Notifications` menu item is commented out.
- Sidebar `Settings` menu item is commented out.
- Sidebar has a commented-out `Project Management` group with `Project Alerts` link.

### 10.7 Build & Infrastructure

- `express` is listed as a dependency but the app is a Next.js app (no Express server found).
- TypeScript configured (`tsconfig.json`, `next-env.d.ts`) but all source files are `.js`, not `.ts`.
- `react-toastify` CSS import exists in `ToastProvider.js` but `ToastProvider` is not used in the layout tree.
- `node-fetch` is a dependency but Next.js 15 has native `fetch`.
- `@fullcalendar/core` is installed but no FullCalendar component found (Ethiopian calendar uses custom implementation).

---

*End of specification. This document is exhaustive as of the audit date and should be sufficient to rebuild the entire system's functionality without referencing the original codebase.*
