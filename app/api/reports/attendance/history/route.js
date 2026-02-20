import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// 5.3 Employee Attendance History Report
// Full attendance trail per employee (locations, device/GPS metadata, timestamps)
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
            "Access denied. You don't have permission to view attendance reports.",
        },
        { status: 403 }
      );
    }

    const employeeIdParam = searchParams.get("employeeId");
    const startDate = scanNull(searchParams.get("startDate"));
    const endDate = scanNull(searchParams.get("endDate"));

    if (!employeeIdParam || employeeIdParam.trim() === "") {
      return NextResponse.json(
        {
          error: "employeeId is required for attendance history.",
        },
        { status: 400 }
      );
    }

    // Support both business employeeId and Mongo _id
    const trimmedId = employeeIdParam.trim();

    const employeesCol = db.collection("employees");
    let employee = null;
    let attendanceEmployeeId = trimmedId;

    // 1) Try Mongo _id if it's a valid ObjectId
    if (ObjectId.isValid(trimmedId)) {
      const byObjectId = await employeesCol.findOne({
        _id: new ObjectId(trimmedId),
      });
      if (byObjectId) {
        employee = byObjectId;
        attendanceEmployeeId = byObjectId._id.toString();
      }
    }

    // 2) Try business employeeId fields
    if (!employee) {
      const byBusinessId = await employeesCol.findOne({
        $or: [
          { employeeId: trimmedId },
          { "personalDetails.employeeId": trimmedId },
        ],
      });
      if (byBusinessId) {
        employee = byBusinessId;
        attendanceEmployeeId = byBusinessId._id.toString();
      }
    }

    // 3) If still not found, fall back to a minimal employee object
    //    so the user can still see raw attendance linked to that id.
    if (!employee) {
      employee = {
        _id: trimmedId,
        personalDetails: {},
        name: "Unknown",
      };
      attendanceEmployeeId = trimmedId;
    }

    // Match employeeId as string or ObjectId (daily_attendance may store either)
    const attQuery = {
      $or: [
        { employeeId: attendanceEmployeeId },
        ...(ObjectId.isValid(attendanceEmployeeId)
          ? [{ employeeId: new ObjectId(attendanceEmployeeId) }]
          : []),
      ],
    };
    if (startDate && endDate) {
      attQuery.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      attQuery.date = { $gte: startDate };
    } else if (endDate) {
      attQuery.date = { $lte: endDate };
    }

    const records = await db
      .collection("daily_attendance")
      .find(attQuery)
      .sort({ date: -1, checkInTime: -1 })
      .toArray();

    // Enrich with basic employee + work location info
    const workLocations = await db
      .collection("work_locations")
      .find({})
      .toArray();
    const workLocById = new Map(
      workLocations.map((l) => [l._id.toString(), l])
    );

    const history = records.map((rec) => {
      const checkInLoc = rec.checkInLocation || null;
      const checkOutLoc = rec.checkOutLocation || null;
      const gv = rec.geofenceValidation || null;
      const gps = rec.gpsValidation || null;

      let nearestWorkLocationName = null;
      if (gv?.nearestLocation?._id) {
        const lid = gv.nearestLocation._id.toString();
        nearestWorkLocationName =
          workLocById.get(lid)?.name || gv.nearestLocation.name || null;
      }

      return {
        date: rec.date,
        status: rec.status || "",
        checkInTime: rec.checkInTime || null,
        checkOutTime: rec.checkOutTime || null,
        workingHours: rec.workingHours ?? null,
        checkInLocation: checkInLoc,
        checkOutLocation: checkOutLoc,
        geofenceValidation: gv,
        gpsValidation: gps,
        nearestWorkLocationName,
        faceVerified: rec.faceVerified || false,
        checkInPhoto: rec.checkInPhoto || null,
        checkOutPhoto: rec.checkOutPhoto || null,
      };
    });

    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "employee_attendance_history",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_attendance_history",
        filters: {
          employeeId: employeeIdParam,
          startDate,
          endDate,
        },
        recordCount: history.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "employee_attendance_history",
      generatedAt: new Date().toISOString(),
      filters: {
        employeeId: employeeIdParam,
        startDate,
        endDate,
      },
      employee: {
        id: employee._id.toString(),
        name: employee.personalDetails?.name || employee.name || "Unknown",
        department:
          employee.personalDetails?.department ||
          employee.department ||
          "Unassigned",
        designation:
          employee.personalDetails?.designation ||
          employee.designation ||
          "",
      },
      records: history,
      totalRecords: history.length,
    });
  } catch (error) {
    console.error("Error generating employee attendance history report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate employee attendance history report",
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

