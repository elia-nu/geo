import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 4.3 Workforce Distribution by Site Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "reports.read",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to view work location reports.",
        },
        { status: 403 }
      );
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const departmentFilter = scanNull(searchParams.get("department"));
    const projectId = searchParams.get("projectId");
    const locationId = searchParams.get("locationId");

    // If date range provided, we compute presence based on daily_attendance
    let presentEmpIds = null;
    if (startDate && endDate) {
      const startStr = startDate;
      const endStr = endDate;
      const attQuery = {
        date: { $gte: startStr, $lte: endStr },
        checkInTime: { $exists: true },
      };
      const att = await db
        .collection("daily_attendance")
        .find(attQuery)
        .project({ employeeId: 1 })
        .toArray();
      presentEmpIds = new Set(
        att.map((r) =>
          r.employeeId && r.employeeId.toString
            ? r.employeeId.toString()
            : String(r.employeeId)
        )
      );
    }

    const [employees, locations, projects] = await Promise.all([
      db.collection("employees").find({}).toArray(),
      db.collection("work_locations").find({}).toArray(),
      db.collection("projects").find({}).toArray(),
    ]);

    // Map locations and projects
    const locById = new Map(
      locations.map((l) => [l._id.toString(), l])
    );
    const projectsByEmployee = new Map();
    projects.forEach((proj) => {
      if (!Array.isArray(proj.assignedEmployees)) return;
      proj.assignedEmployees.forEach((eid) => {
        const key = eid.toString();
        if (!projectsByEmployee.has(key)) projectsByEmployee.set(key, []);
        projectsByEmployee.get(key).push({
          id: proj._id.toString(),
          name: proj.name || "Unnamed Project",
        });
      });
    });

    const filterProjectId =
      projectId && ObjectId.isValid(projectId) ? projectId : null;
    const filterLocId =
      locationId && ObjectId.isValid(locationId) ? locationId : null;

    const siteMap = new Map();

    employees.forEach((emp) => {
      const empId = emp._id.toString();

      // Apply presence filter if required
      if (presentEmpIds && !presentEmpIds.has(empId)) return;

      const dept =
        emp.personalDetails?.department || emp.department || "Unassigned";
      if (departmentFilter && dept !== departmentFilter) return;

      const empProjects = projectsByEmployee.get(empId) || [];

      // If project filter set, skip employees not in that project
      if (
        filterProjectId &&
        !empProjects.some((p) => p.id === filterProjectId)
      ) {
        return;
      }

      // Determine which sites this employee is linked to
      const locIds = [];
      if (Array.isArray(emp.workLocations)) {
        emp.workLocations.forEach((lid) => {
          const idStr = lid && lid.toString ? lid.toString() : String(lid);
          if (idStr) locIds.push(idStr);
        });
      } else if (emp.workLocation) {
        const idStr = emp.workLocation.toString
          ? emp.workLocation.toString()
          : String(emp.workLocation);
        if (idStr) locIds.push(idStr);
      }

      if (locIds.length === 0) {
        // Try to match by name if workLocation is a name
        const name = emp.workLocation || emp.personalDetails?.workLocation;
        if (name) {
          const named = locations.find((l) => l.name === name);
          if (named) {
            locIds.push(named._id.toString());
          }
        }
      }

      if (locIds.length === 0) {
        // No associated location, skip from site-level stats
        return;
      }

      locIds.forEach((lid) => {
        if (filterLocId && lid !== filterLocId) return;

        const loc = locById.get(lid);
        const siteKey = lid;
        if (!siteMap.has(siteKey)) {
          siteMap.set(siteKey, {
            id: lid,
            name: loc?.name || "Unknown Location",
            address: loc?.address || "",
            latitude: loc?.latitude ?? null,
            longitude: loc?.longitude ?? null,
            radius: loc?.radius ?? null,
            status: loc?.status || "active",
            totalEmployees: 0,
            presentEmployees: 0,
            departments: new Map(), // dept -> Set of empIds
            projects: new Map(), // projectName -> Set of empIds
            employees: new Set(), // all empIds
            presentEmpSet: new Set(),
          });
        }

        const entry = siteMap.get(siteKey);
        entry.employees.add(empId);
        if (!departmentFilter) {
          // Always track dept breakdown, regardless of filter
          if (!entry.departments.has(dept)) {
            entry.departments.set(dept, new Set());
          }
          entry.departments.get(dept).add(empId);
        }

        empProjects.forEach((p) => {
          if (!entry.projects.has(p.name)) {
            entry.projects.set(p.name, new Set());
          }
          entry.projects.get(p.name).add(empId);
        });

        if (!presentEmpIds || presentEmpIds.has(empId)) {
          entry.presentEmpSet.add(empId);
        }
      });
    });

    const sites = [...siteMap.values()].map((s) => {
      const totalEmployees = s.employees.size;
      const presentEmployees = s.presentEmpSet.size;
      const utilization =
        totalEmployees > 0
          ? Math.round((presentEmployees / totalEmployees) * 10000) / 100
          : 0;

      const deptBreakdown = {};
      s.departments.forEach((set, name) => {
        deptBreakdown[name] = set.size;
      });
      const projectBreakdown = {};
      s.projects.forEach((set, name) => {
        projectBreakdown[name] = set.size;
      });

      return {
        id: s.id,
        name: s.name,
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        radius: s.radius,
        status: s.status,
        totalEmployees,
        presentEmployees,
        utilization,
        departments: deptBreakdown,
        projects: projectBreakdown,
      };
    });

    const summary = {
      totalSites: sites.length,
      totalEmployees: sites.reduce((sum, s) => sum + s.totalEmployees, 0),
      totalPresent: sites.reduce((sum, s) => sum + s.presentEmployees, 0),
    };
    summary.averageUtilization =
      sites.length > 0
        ? Math.round(
            (sites.reduce((sum, s) => sum + s.utilization, 0) / sites.length) *
              100
          ) / 100
        : 0;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "workforce_distribution_sites",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "workforce_distribution_sites",
        filters: {
          startDate,
          endDate,
          department: departmentFilter,
          projectId,
          locationId,
        },
        recordCount: sites.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "workforce_distribution_sites",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate,
        endDate,
        department: departmentFilter,
        projectId,
        locationId,
      },
      summary,
      sites,
      totalRecords: sites.length,
    });
  } catch (error) {
    console.error(
      "Error generating workforce distribution by site report:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to generate workforce distribution by site report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function scanNull(value) {
  if (!value) return null;
  return value.trim() === "" ? null : value.trim();
}

