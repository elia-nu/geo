import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 4.1 Site Location Master Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Role-based access
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

    const status = searchParams.get("status"); // active / inactive / all
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Base query on work_locations
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Load locations with basic data and assigned employees
    const locations = await db
      .collection("work_locations")
      .find(query)
      .toArray();

    // Load employees and projects for linking
    const [employees, projects] = await Promise.all([
      db.collection("employees").find({}).toArray(),
      db.collection("projects").find({}).toArray(),
    ]);

    // Optional project filter: build set of employeeIds assigned to that project
    let projectEmployeeIds = null;
    if (projectId && ObjectId.isValid(projectId)) {
      const p = await db
        .collection("projects")
        .findOne({ _id: new ObjectId(projectId) });
      if (p && Array.isArray(p.assignedEmployees)) {
        projectEmployeeIds = new Set(
          p.assignedEmployees.map((id) =>
            typeof id === "string" ? id : id.toString()
          )
        );
      } else {
        projectEmployeeIds = new Set();
      }
    }

    // Build maps for convenience
    const employeeById = new Map(
      employees.map((e) => [e._id.toString(), e])
    );
    const projectsByEmployee = new Map();
    projects.forEach((proj) => {
      if (!Array.isArray(proj.assignedEmployees)) return;
      proj.assignedEmployees.forEach((empId) => {
        const key = empId.toString();
        if (!projectsByEmployee.has(key)) projectsByEmployee.set(key, []);
        projectsByEmployee.get(key).push({
          id: proj._id.toString(),
          name: proj.name || "Unnamed Project",
        });
      });
    });

    // Enrich locations
    const enriched = [];

    for (const loc of locations) {
      const locId = loc._id.toString();
      const assignedEmpIds = Array.isArray(loc.assignedEmployees)
        ? loc.assignedEmployees.map((id) =>
            typeof id === "string" ? id : id.toString()
          )
        : [];

      // Derive employees at this site (by assignedEmployees and by employee.workLocations / workLocation)
      const employeesAt = new Set(assignedEmpIds);
      employees.forEach((emp) => {
        const empId = emp._id.toString();
        if (
          (Array.isArray(emp.workLocations) &&
            emp.workLocations.some(
              (wid) => wid && wid.toString() === locId
            )) ||
          (emp.workLocation &&
            (emp.workLocation.toString
              ? emp.workLocation.toString() === locId
              : String(emp.workLocation) === locId) ||
            emp.workLocation === loc.name)
        ) {
          employeesAt.add(empId);
        }
      });

      // Apply optional project filter: keep only locations with at least one employee in that project
      if (projectEmployeeIds) {
        const hasProjectEmp = [...employeesAt].some((id) =>
          projectEmployeeIds.has(id)
        );
        if (!hasProjectEmp) {
          continue;
        }
      }

      // Aggregate project links from employees at this site
      const projectSet = new Map(); // id -> name
      employeesAt.forEach((empId) => {
        const links = projectsByEmployee.get(empId);
        if (!links) return;
        links.forEach((p) => {
          projectSet.set(p.id, p.name);
        });
      });

      enriched.push({
        id: locId,
        name: loc.name || "Unnamed Location",
        address: loc.address || "",
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        radius: loc.radius ?? null,
        status: loc.status || "active",
        description: loc.description || "",
        createdAt: loc.createdAt || null,
        updatedAt: loc.updatedAt || null,
        employeeCount: employeesAt.size,
        projectLinks: [...projectSet.entries()].map(([id, name]) => ({
          id,
          name,
        })),
      });
    }

    // Build summary
    const summary = {
      totalLocations: enriched.length,
      active: enriched.filter((l) => l.status === "active").length,
      inactive: enriched.filter((l) => l.status !== "active").length,
      totalEmployees: enriched.reduce(
        (sum, l) => sum + (l.employeeCount || 0),
        0
      ),
      byStatus: {},
    };
    enriched.forEach((loc) => {
      const s = loc.status || "unknown";
      summary.byStatus[s] = (summary.byStatus[s] || 0) + 1;
    });

    // Audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "site_location_master",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "site_location_master",
        filters: { status, projectId, startDate, endDate },
        recordCount: enriched.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "site_location_master",
      generatedAt: new Date().toISOString(),
      filters: { status, projectId, startDate, endDate },
      summary,
      locations: enriched,
      totalRecords: enriched.length,
    });
  } catch (error) {
    console.error("Error generating site location master report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate site location master report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

