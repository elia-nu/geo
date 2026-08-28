import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import { GPSValidation } from "../../../utils/gpsValidation.js";

// Haversine distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function parseDistanceToMeters(value) {
  try {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value === null || value === undefined) return 100;
    const str = String(value).trim().toLowerCase();
    const match = str.match(/^(\d+(?:\.\d+)?)(?:\s*(mm|cm|m|km))?$/);
    if (!match) {
      const asNumber = parseFloat(str);
      return Number.isFinite(asNumber) ? asNumber : 100;
    }
    const num = parseFloat(match[1]);
    const unit = match[2] || "m";
    switch (unit) {
      case "mm":
        return num / 1000;
      case "cm":
        return num / 100;
      case "m":
        return num;
      case "km":
        return num * 1000;
      default:
        return num;
    }
  } catch {
    return 100;
  }
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// GET /api/overtime/attendance - Fetch separate overtime attendance records
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const date = url.searchParams.get("date");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const status = url.searchParams.get("status"); // "in-progress", "completed", "all"
    const adminApprovalStatus = url.searchParams.get("adminApprovalStatus"); // "pending_review", "approved", "rejected", "all"
    const department = url.searchParams.get("department");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 50;

    let query = {};

    if (employeeId && employeeId.trim()) {
      const trimmedId = employeeId.trim();
      const possibleEmpIds = [trimmedId];
      if (ObjectId.isValid(trimmedId)) {
        possibleEmpIds.push(new ObjectId(trimmedId));
      }
      const matchedEmp = await db.collection("employees").findOne({
        $or: [
          ...(ObjectId.isValid(trimmedId) ? [{ _id: new ObjectId(trimmedId) }] : []),
          { employeeId: trimmedId },
          { empId: trimmedId },
          { "personalDetails.employeeId": trimmedId },
        ],
      });
      if (matchedEmp) {
        possibleEmpIds.push(
          matchedEmp._id.toString(),
          matchedEmp._id,
          matchedEmp.employeeId,
          matchedEmp.empId
        );
      }
      const validUniqueIds = [...new Set(possibleEmpIds.filter(Boolean))];
      query.employeeId = { $in: validUniqueIds };
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (adminApprovalStatus && adminApprovalStatus !== "all") {
      if (adminApprovalStatus === "pending_review") {
        query.$or = [
          { adminApprovalStatus: "pending_review" },
          { adminApprovalStatus: { $exists: false } },
          { adminApprovalStatus: null },
        ];
      } else {
        query.adminApprovalStatus = adminApprovalStatus;
      }
    }

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const [records, totalCount] = await Promise.all([
      db
        .collection("overtime_attendance")
        .find(query)
        .sort({ date: -1, checkInTime: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("overtime_attendance").countDocuments(query),
    ]);

    // Fetch employee details
    const employeeIds = [...new Set(records.map((r) => r.employeeId))];
    const validObjectIds = employeeIds
      .filter((id) => id && ObjectId.isValid(String(id)))
      .map((id) => (typeof id === "string" ? new ObjectId(id) : id));

    const employees = await db
      .collection("employees")
      .find({
        $or: [
          ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
          { employeeId: { $in: employeeIds.map(String) } },
          { empId: { $in: employeeIds.map(String) } },
        ],
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      const empData = {
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "General",
        designation: emp.designation || emp.personalDetails?.designation || "",
        employeeId: emp.employeeId || emp.empId || emp.personalDetails?.employeeId || emp._id.toString(),
      };
      employeeMap[emp._id.toString()] = empData;
      if (emp.employeeId) employeeMap[emp.employeeId] = empData;
      if (emp.empId) employeeMap[emp.empId] = empData;
    });

    let enhancedRecords = records.map((record) => ({
      ...record,
      adminApprovalStatus: record.adminApprovalStatus || "pending_review",
      employee: employeeMap[String(record.employeeId)] || {
        name: record.employeeName || "Unknown Employee",
        department: record.department || "General",
      },
    }));

    if (department && department !== "all") {
      enhancedRecords = enhancedRecords.filter(
        (r) =>
          r.employee?.department?.toLowerCase() === department.toLowerCase() ||
          r.department?.toLowerCase() === department.toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      enhancedRecords = enhancedRecords.filter(
        (r) =>
          r.employee?.name?.toLowerCase().includes(searchLower) ||
          r.employeeName?.toLowerCase().includes(searchLower) ||
          r.project?.toLowerCase().includes(searchLower) ||
          r.reason?.toLowerCase().includes(searchLower) ||
          r.checkInNotes?.toLowerCase().includes(searchLower) ||
          r.checkOutNotes?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: enhancedRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalRecords: totalCount,
        recordsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching overtime attendance records:", error);
    return NextResponse.json(
      { error: "Failed to fetch overtime attendance records", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/overtime/attendance - Record Overtime Check-In or Check-Out
export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      employeeId,
      action, // "check-in" | "check-out"
      latitude,
      longitude,
      accuracy,
      notes,
      photoUrl,
      faceVerified = false,
      requestId, // optional or linked approved request ID
    } = body;

    if (!employeeId || !action) {
      return NextResponse.json(
        { error: "Employee ID and action are required" },
        { status: 400 }
      );
    }

    if (!["check-in", "check-out"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'check-in' or 'check-out'" },
        { status: 400 }
      );
    }

    const today = getTodayDate();
    const currentTime = new Date();

    // 1. Get employee details
    let employee = null;
    const trimmedEmpId = String(employeeId).trim();
    if (ObjectId.isValid(trimmedEmpId)) {
      employee = await db
        .collection("employees")
        .findOne({ _id: new ObjectId(trimmedEmpId) });
    }
    if (!employee) {
      employee = await db
        .collection("employees")
        .findOne({
          $or: [
            { employeeId: trimmedEmpId },
            { empId: trimmedEmpId },
            { "personalDetails.employeeId": trimmedEmpId },
          ],
        });
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeName =
      employee.personalDetails?.name || employee.name || "Unknown";
    const department =
      employee.department || employee.personalDetails?.department || "General";
    const empCode =
      employee.employeeId || employee.empId || employee.personalDetails?.employeeId || employee._id.toString();

    const possibleEmpIds = [
      trimmedEmpId,
      employee._id.toString(),
      employee._id,
      employee.employeeId,
      employee.empId,
    ].filter(Boolean);

    // 2. Validate Approved Overtime Request for Today
    let requestQuery = {
      employeeId: { $in: possibleEmpIds },
      date: today,
      status: "approved",
    };

    if (requestId && ObjectId.isValid(requestId)) {
      requestQuery = {
        _id: new ObjectId(requestId),
        employeeId: { $in: possibleEmpIds },
        status: "approved",
      };
    }

    const approvedRequest = await db
      .collection("overtime_requests")
      .findOne(requestQuery);

    if (!approvedRequest) {
      return NextResponse.json(
        {
          error:
            "No approved overtime request found for today. You must submit an overtime request and get admin approval before checking in for overtime.",
          needsApproval: true,
        },
        { status: 403 }
      );
    }

    // 3. Geofence Location Validation
    let workLocations = [];
    if (employee.workLocations && Array.isArray(employee.workLocations)) {
      const workLocationIds = employee.workLocations
        .filter((id) => id && ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      workLocations = await db
        .collection("work_locations")
        .find({ _id: { $in: workLocationIds } })
        .toArray();
    }

    if (workLocations.length === 0) {
      const oldWorkLocation =
        employee.workLocation || employee.personalDetails?.workLocation;
      if (oldWorkLocation) {
        workLocations = [oldWorkLocation];
      }
    }

    let geofenceValidation = {
      isValid: false,
      distance: null,
      message: "No location provided",
      nearestLocation: null,
    };

    if (latitude && longitude && workLocations.length > 0) {
      let shortestDistance = Infinity;
      let nearestLocation = null;
      let foundValid = false;

      for (const workLocation of workLocations) {
        if (
          workLocation == null ||
          workLocation.latitude == null ||
          workLocation.longitude == null
        ) {
          continue;
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          parseFloat(workLocation.latitude),
          parseFloat(workLocation.longitude)
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestLocation = workLocation;
        }

        const radiusMeters = parseDistanceToMeters(workLocation.radius);
        if (distance <= radiusMeters) {
          foundValid = true;
        }
      }

      const nearestRadius = parseDistanceToMeters(
        (nearestLocation && nearestLocation.radius) || 500
      );

      geofenceValidation = {
        isValid: foundValid,
        distance: Math.round(shortestDistance),
        message: foundValid
          ? `Location verified! You are ${Math.round(shortestDistance)}m from ${
              nearestLocation?.name || "work location"
            }.`
          : `You are ${Math.round(shortestDistance)}m from ${
              nearestLocation?.name || "work location"
            }. Must be within ${Math.round(nearestRadius)}m.`,
        workLocationName:
          (nearestLocation && nearestLocation.name) || "Work Location",
        nearestLocation: nearestLocation,
      };

      if (!foundValid) {
        return NextResponse.json(
          {
            error: `You must be at one of your designated work locations to record overtime attendance. Nearest: ${
              nearestLocation?.name || "Work Location"
            } (${Math.round(shortestDistance)}m away)`,
            geofenceError: true,
            details: geofenceValidation,
          },
          { status: 403 }
        );
      }
    } else if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Location is required for overtime attendance recording" },
        { status: 400 }
      );
    }

    // 4. GPS Anti-Spoofing check
    const gpsValidation = GPSValidation.validateGPSIntegrity(
      latitude,
      longitude,
      accuracy,
      currentTime
    );

    if (!gpsValidation.isValid) {
      return NextResponse.json(
        {
          error: "GPS validation failed. Please verify your location.",
          gpsError: true,
        },
        { status: 403 }
      );
    }

    // 5. Handle Check-In vs Check-Out
    // Find active overtime record for today
    let overtimeRecord = await db.collection("overtime_attendance").findOne({
      employeeId: employeeId.toString(),
      date: today,
      requestId: approvedRequest._id.toString(),
    });

    if (action === "check-in") {
      if (overtimeRecord && overtimeRecord.checkInTime) {
        return NextResponse.json(
          { error: "Already checked in for overtime today" },
          { status: 400 }
        );
      }

      const checkInData = {
        employeeId: employeeId.toString(),
        employeeName,
        department,
        requestId: approvedRequest._id.toString(),
        requestedHours: approvedRequest.requestedHours || 0,
        approvedHours: approvedRequest.approvedHours || approvedRequest.requestedHours || 0,
        reason: approvedRequest.reason || "",
        project: approvedRequest.project || "",
        date: today,
        checkInTime: currentTime,
        checkInLocation: { latitude, longitude },
        checkInNotes: notes ? notes.trim() : "",
        checkInPhoto: photoUrl || null,
        faceVerified: !!faceVerified || !!photoUrl,
        geofenceValidation,
        gpsValidation,
        status: "in-progress",
        adminApprovalStatus: "pending_review",
        durationHours: 0,
        durationMinutes: 0,
        durationFormatted: "0h 0m",
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      let result;
      if (overtimeRecord) {
        await db
          .collection("overtime_attendance")
          .updateOne({ _id: overtimeRecord._id }, { $set: checkInData });
        result = { insertedId: overtimeRecord._id };
      } else {
        result = await db
          .collection("overtime_attendance")
          .insertOne(checkInData);
      }

      // Audit Log
      await createAuditLog({
        action: "EMPLOYEE_OVERTIME_CHECK_IN",
        entityType: "overtime_attendance",
        entityId: result.insertedId.toString(),
        userId: employeeId,
        userEmail: employee.personalDetails?.email || employee.email || "",
        metadata: {
          employeeName,
          date: today,
          checkInTime: currentTime,
          approvedHours: approvedRequest.approvedHours,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Overtime check-in recorded successfully",
        data: {
          _id: result.insertedId.toString(),
          ...checkInData,
        },
      });
    } else if (action === "check-out") {
      if (!overtimeRecord || !overtimeRecord.checkInTime) {
        return NextResponse.json(
          { error: "No active overtime check-in record found for today" },
          { status: 400 }
        );
      }

      if (overtimeRecord.checkOutTime) {
        return NextResponse.json(
          { error: "Already checked out from overtime today" },
          { status: 400 }
        );
      }

      // Calculate working duration
      const checkInTime = new Date(overtimeRecord.checkInTime);
      const diffMs = Math.max(0, currentTime.getTime() - checkInTime.getTime());
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const durationHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      const durationFormatted = `${hours}h ${mins}m`;

      const checkOutData = {
        checkOutTime: currentTime,
        checkOutLocation: { latitude, longitude },
        checkOutNotes: notes ? notes.trim() : "",
        checkOutPhoto: photoUrl || null,
        status: "completed",
        adminApprovalStatus: overtimeRecord.adminApprovalStatus || "pending_review",
        durationMinutes: totalMinutes,
        durationHours: durationHours,
        durationFormatted: durationFormatted,
        updatedAt: currentTime,
      };

      await db
        .collection("overtime_attendance")
        .updateOne({ _id: overtimeRecord._id }, { $set: checkOutData });

      const updatedRecord = { ...overtimeRecord, ...checkOutData };

      // Audit Log
      await createAuditLog({
        action: "EMPLOYEE_OVERTIME_CHECK_OUT",
        entityType: "overtime_attendance",
        entityId: overtimeRecord._id.toString(),
        userId: employeeId,
        userEmail: employee.personalDetails?.email || employee.email || "",
        metadata: {
          employeeName,
          date: today,
          checkOutTime: currentTime,
          durationHours,
          durationFormatted,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Overtime check-out recorded successfully (${durationFormatted} worked)`,
        data: updatedRecord,
      });
    }
  } catch (error) {
    console.error("Error recording overtime attendance:", error);
    return NextResponse.json(
      { error: "Failed to record overtime attendance", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/overtime/attendance - Admin Review / Approve / Reject Overtime Attendance
export async function PUT(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      attendanceId,
      adminApprovalStatus, // "approved" | "rejected" | "pending_review"
      approvedAttendanceHours,
      adminNotes,
      reviewerId,
      reviewerName,
    } = body;

    if (!attendanceId || !adminApprovalStatus) {
      return NextResponse.json(
        { error: "Attendance ID and admin approval status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending_review"].includes(adminApprovalStatus)) {
      return NextResponse.json(
        { error: "adminApprovalStatus must be 'approved', 'rejected', or 'pending_review'" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(attendanceId)) {
      return NextResponse.json(
        { error: "Invalid Attendance Record ID" },
        { status: 400 }
      );
    }

    const existingRecord = await db
      .collection("overtime_attendance")
      .findOne({ _id: new ObjectId(attendanceId) });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Overtime attendance record not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const finalApprovedHours =
      adminApprovalStatus === "approved"
        ? approvedAttendanceHours !== undefined && approvedAttendanceHours !== null
          ? parseFloat(approvedAttendanceHours)
          : existingRecord.durationHours || 0
        : 0;

    const updateData = {
      adminApprovalStatus,
      approvedAttendanceHours: finalApprovedHours,
      adminNotes: adminNotes ? adminNotes.trim() : "",
      reviewedBy: reviewerName || reviewerId || "Admin",
      reviewedAt: now,
      updatedAt: now,
    };

    await db
      .collection("overtime_attendance")
      .updateOne({ _id: new ObjectId(attendanceId) }, { $set: updateData });

    // Create Audit Log
    await createAuditLog({
      action:
        adminApprovalStatus === "approved"
          ? "ADMIN_APPROVE_OVERTIME_ATTENDANCE"
          : adminApprovalStatus === "rejected"
          ? "ADMIN_REJECT_OVERTIME_ATTENDANCE"
          : "ADMIN_UPDATE_OVERTIME_ATTENDANCE",
      entityType: "overtime_attendance",
      entityId: attendanceId,
      userId: reviewerId || "admin",
      metadata: {
        employeeId: existingRecord.employeeId,
        employeeName: existingRecord.employeeName,
        date: existingRecord.date,
        durationHours: existingRecord.durationHours,
        approvedAttendanceHours: finalApprovedHours,
        adminApprovalStatus,
        adminNotes,
      },
    });

    const updated = await db
      .collection("overtime_attendance")
      .findOne({ _id: new ObjectId(attendanceId) });

    return NextResponse.json({
      success: true,
      message: `Overtime attendance record ${adminApprovalStatus} successfully!`,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating overtime attendance approval status:", error);
    return NextResponse.json(
      { error: "Failed to update overtime attendance status", message: error.message },
      { status: 500 }
    );
  }
}
