import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 4.2 Site Attendance Compliance Report API
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

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");
    const department = scanNull(searchParams.get("department"));

    // Default to last 30 days if not specified
    const now = new Date();
    let startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    let endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // Pull relevant attendance records (daily_attendance stores date as YYYY-MM-DD string)
    const attendanceQuery = {
      date: { $gte: startStr, $lte: endStr },
    };
    const attendance = await db
      .collection("daily_attendance")
      .find(attendanceQuery)
      .toArray();

    // Load locations and map by id + name
    const locations = await db
      .collection("work_locations")
      .find({})
      .toArray();
    const locById = new Map(
      locations.map((l) => [l._id.toString(), l])
    );
    const locByName = new Map(
      locations
        .filter((l) => l.name)
        .map((l) => [l.name, l])
    );

    // Optional location filter
    const filterLocId =
      locationId && ObjectId.isValid(locationId) ? locationId : null;

    // Build department info map for employees if needed
    let deptByEmpId = new Map();
    if (department) {
      const emps = await db.collection("employees").find({}).toArray();
      deptByEmpId = new Map(
        emps.map((e) => [
          e._id.toString(),
          e.personalDetails?.department || e.department || "Unassigned",
        ])
      );
    }

    const siteMap = new Map();

    for (const rec of attendance) {
      const gv = rec.geofenceValidation || {};

      let locId = null;
      let locName = "Unknown";
      let baseLoc = null;

      if (gv.nearestLocation && gv.nearestLocation._id) {
        const id = gv.nearestLocation._id.toString();
        baseLoc = locById.get(id) || gv.nearestLocation;
        locId = id;
        locName = baseLoc?.name || gv.workLocationName || "Unknown";
      } else if (gv.workLocationName) {
        baseLoc = locByName.get(gv.workLocationName);
        locName = gv.workLocationName;
        if (baseLoc) {
          locId = baseLoc._id.toString();
        }
      }

      if (filterLocId && locId !== filterLocId) {
        continue;
      }

      if (department) {
        const empKey = rec.employeeId?.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId || "");
        const empDept = deptByEmpId.get(empKey) || "Unassigned";
        if (empDept !== department) continue;
      }

      const key = locId || `name:${locName}`;
      if (!siteMap.has(key)) {
        siteMap.set(key, {
          id: locId,
          name: locName,
          address: baseLoc?.address || "",
          latitude: baseLoc?.latitude ?? null,
          longitude: baseLoc?.longitude ?? null,
          radius: baseLoc?.radius ?? null,
          status: baseLoc?.status || "active",
          totalChecks: 0,
          compliant: 0,
          nonCompliant: 0,
          employees: new Set(),
        });
      }

      const entry = siteMap.get(key);
      entry.totalChecks += 1;

      if (gv && gv.isValid) {
        entry.compliant += 1;
      } else {
        entry.nonCompliant += 1;
      }

      const empKey =
        rec.employeeId && rec.employeeId.toString
          ? rec.employeeId.toString()
          : String(rec.employeeId || "");
      if (empKey) entry.employees.add(empKey);
    }

    const sites = [...siteMap.values()].map((s) => {
      const total = s.totalChecks || 0;
      const compliantRate =
        total > 0 ? Math.round((s.compliant / total) * 10000) / 100 : 0;
      const nonCompliantRate =
        total > 0 ? Math.round((s.nonCompliant / total) * 10000) / 100 : 0;
      return {
        ...s,
        employees: undefined,
        uniqueEmployees: s.employees.size,
        complianceRate: compliantRate,
        nonComplianceRate: nonCompliantRate,
      };
    });

    const summary = {
      totalSites: sites.length,
      totalChecks: sites.reduce((sum, s) => sum + s.totalChecks, 0),
      totalCompliant: sites.reduce((sum, s) => sum + s.compliant, 0),
      totalNonCompliant: sites.reduce((sum, s) => sum + s.nonCompliant, 0),
    };
    summary.overallComplianceRate =
      summary.totalChecks > 0
        ? Math.round((summary.totalCompliant / summary.totalChecks) * 10000) /
          100
        : 0;

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "site_attendance_compliance",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "site_attendance_compliance",
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          locationId,
          department,
        },
        recordCount: sites.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "site_attendance_compliance",
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        locationId,
        department,
      },
      summary,
      sites,
      totalRecords: sites.length,
    });
  } catch (error) {
    console.error("Error generating site attendance compliance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate site attendance compliance report",
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

