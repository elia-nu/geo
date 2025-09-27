import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import { GPSValidation } from "../../../utils/gpsValidation.js";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance * 1000; // Convert to meters
}

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// Get daily attendance records
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const date = url.searchParams.get("date") || getTodayDate();
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    let query = {};

    // Filter by employee if specified
    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Filter by date range or single date
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    } else if (date) {
      query.date = date;
    }

    console.log("Fetching daily attendance with query:", query);

    const attendanceRecords = await db
      .collection("daily_attendance")
      .find(query)
      .sort({ date: -1, checkInTime: -1 })
      .toArray();

    // Get employee details for each record
    const employeeIds = [
      ...new Set(attendanceRecords.map((record) => record.employeeId)),
    ];
    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeIds.map((id) => new ObjectId(id)) } })
      .toArray();

    // Create employee lookup map
    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "",
        designation: emp.designation || emp.personalDetails?.designation || "",
      };
    });

    // Enhance attendance records with employee details
    const enhancedRecords = attendanceRecords.map((record) => ({
      ...record,
      employee: employeeMap[record.employeeId] || { name: "Unknown Employee" },
    }));

    return NextResponse.json({
      success: true,
      data: enhancedRecords,
      count: enhancedRecords.length,
    });
  } catch (error) {
    console.error("Error fetching daily attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records", message: error.message },
      { status: 500 }
    );
  }
}

// Record check-in or check-out
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const {
      employeeId,
      action,
      latitude,
      longitude,
      notes,
      faceVerified = false,
      photo,
      photoUrl,
      accuracy,
    } = data;

    console.log("Processing attendance action:", {
      employeeId,
      action,
      hasLocation: !!(latitude && longitude),
    });

    // Validate required fields
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

    // Get employee details
    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(employeeId) });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const employeeName =
      employee.personalDetails?.name || employee.name || "Unknown";

    // Get employee's work locations (new system supports multiple locations)
    let workLocations = [];

    // Check for new workLocations array first
    if (employee.workLocations && Array.isArray(employee.workLocations)) {
      // Fetch the actual work location documents
      const workLocationIds = employee.workLocations.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
      workLocations = await db
        .collection("work_locations")
        .find({ _id: { $in: workLocationIds } })
        .toArray();
    }

    // Fallback to old single workLocation system
    if (workLocations.length === 0) {
      const oldWorkLocation =
        employee.workLocation || employee.personalDetails?.workLocation;
      if (oldWorkLocation) {
        workLocations = [oldWorkLocation];
      }
    }

    // Validate location if provided
    let geofenceValidation = {
      isValid: false,
      distance: null,
      message: "No location provided",
      nearestLocation: null,
    };

    if (latitude && longitude && workLocations.length > 0) {
      // Find the nearest work location
      let shortestDistance = Infinity;
      let nearestLocation = null;
      let isValid = false;

      for (const workLocation of workLocations) {
        const distance = calculateDistance(
          latitude,
          longitude,
          workLocation.latitude,
          workLocation.longitude
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestLocation = workLocation;
        }
      }

      const radius = nearestLocation.radius || 100; // Default 100 meters
      isValid = shortestDistance <= radius;

      geofenceValidation = {
        isValid,
        distance: Math.round(shortestDistance),
        message: isValid
          ? `Location verified! You are ${Math.round(shortestDistance)}m from ${
              nearestLocation.name
            }.`
          : `You are ${Math.round(shortestDistance)}m from ${
              nearestLocation.name
            }. Must be within ${radius}m.`,
        workLocationName: nearestLocation.name || "Work Location",
        nearestLocation: nearestLocation,
      };

      // Reject if not at any work location
      if (!isValid) {
        return NextResponse.json(
          {
            error: `You must be at one of your designated work locations to check in/out. Nearest location: ${
              nearestLocation.name
            } (${Math.round(shortestDistance)}m away)`,
            geofenceError: true,
            details: geofenceValidation,
          },
          { status: 403 }
        );
      }
    } else if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Location is required for attendance recording" },
        { status: 400 }
      );
    } else if (workLocations.length === 0) {
      return NextResponse.json(
        {
          error:
            "No work locations assigned to this employee. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    // GPS Spoofing Prevention Validation
    const gpsValidation = GPSValidation.validateGPSIntegrity(
      latitude,
      longitude,
      accuracy,
      new Date()
    );

    console.log("📍 GPS Validation:", {
      isValid: gpsValidation.isValid,
      riskScore: gpsValidation.riskScore,
      issues: gpsValidation.issues,
    });

    // Block attendance if GPS validation fails
    if (!gpsValidation.isValid) {
      return NextResponse.json(
        {
          error: "GPS validation failed. Please verify your location.",
          gpsError: true,
          gpsValidation: {
            isValid: gpsValidation.isValid,
            riskScore: gpsValidation.riskScore,
            issues: gpsValidation.issues,
            recommendations: gpsValidation.recommendations,
          },
        },
        { status: 403 }
      );
    }

    const today = getTodayDate();
    const currentTime = new Date();

    // Check for existing attendance record for today
    let attendanceRecord = await db
      .collection("daily_attendance")
      .findOne({ employeeId, date: today });

    if (action === "check-in") {
      if (attendanceRecord && attendanceRecord.checkInTime) {
        return NextResponse.json(
          { error: "Already checked in today" },
          { status: 400 }
        );
      }

      const checkInData = {
        employeeId,
        employeeName,
        date: today,
        checkInTime: currentTime,
        checkInLocation: latitude && longitude ? { latitude, longitude } : null,
        checkInNotes: notes || "",
        checkInPhoto: photoUrl || null,
        faceVerified,
        geofenceValidation,
        gpsValidation,
        status: "checked-in",
        workingHours: 0,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      if (attendanceRecord) {
        // Update existing record
        await db
          .collection("daily_attendance")
          .updateOne({ _id: attendanceRecord._id }, { $set: checkInData });
      } else {
        // Create new record
        const result = await db
          .collection("daily_attendance")
          .insertOne(checkInData);
        attendanceRecord = { _id: result.insertedId, ...checkInData };
      }

      // Create audit log
      await createAuditLog({
        action: "EMPLOYEE_CHECK_IN",
        entityType: "daily_attendance",
        entityId: attendanceRecord._id.toString(),
        userId: employeeId,
        userEmail: employee.personalDetails?.email || employee.email || "",
        metadata: {
          employeeName,
          date: today,
          checkInTime: currentTime,
          location: latitude && longitude ? "with location" : "no location",
          geofenceValidation: geofenceValidation.isValid ? "valid" : "invalid",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Check-in recorded successfully",
        data: attendanceRecord,
      });
    } else if (action === "check-out") {
      if (!attendanceRecord || !attendanceRecord.checkInTime) {
        return NextResponse.json(
          { error: "No check-in record found for today" },
          { status: 400 }
        );
      }

      if (attendanceRecord.checkOutTime) {
        return NextResponse.json(
          { error: "Already checked out today" },
          { status: 400 }
        );
      }

      // Calculate working hours
      const checkInTime = new Date(attendanceRecord.checkInTime);
      const workingHours = (currentTime - checkInTime) / (1000 * 60 * 60); // Convert to hours

      const checkOutData = {
        checkOutTime: currentTime,
        checkOutLocation:
          latitude && longitude ? { latitude, longitude } : null,
        checkOutNotes: notes || "",
        checkOutPhoto: photoUrl || null,
        faceVerified,
        geofenceValidation,
        gpsValidation,
        status: "checked-out",
        workingHours: Math.round(workingHours * 100) / 100, // Round to 2 decimal places
        updatedAt: currentTime,
      };

      // Update attendance record
      await db
        .collection("daily_attendance")
        .updateOne({ _id: attendanceRecord._id }, { $set: checkOutData });

      const updatedRecord = { ...attendanceRecord, ...checkOutData };

      // Create audit log
      await createAuditLog({
        action: "EMPLOYEE_CHECK_OUT",
        entityType: "daily_attendance",
        entityId: attendanceRecord._id.toString(),
        userId: employeeId,
        userEmail: employee.personalDetails?.email || employee.email || "",
        metadata: {
          employeeName,
          date: today,
          checkOutTime: currentTime,
          workingHours: Math.round(workingHours * 100) / 100,
          location: latitude && longitude ? "with location" : "no location",
          geofenceValidation: geofenceValidation.isValid ? "valid" : "invalid",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Check-out recorded successfully",
        data: updatedRecord,
      });
    }
  } catch (error) {
    console.error("Error recording attendance:", error);
    return NextResponse.json(
      { error: "Failed to record attendance", message: error.message },
      { status: 500 }
    );
  }
}

// Update attendance record (for corrections or supervisor edits)
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { attendanceId, updates, supervisorId, reason } = data;

    if (!attendanceId || !updates) {
      return NextResponse.json(
        { error: "Attendance ID and updates are required" },
        { status: 400 }
      );
    }

    // Get existing attendance record
    const existingRecord = await db
      .collection("daily_attendance")
      .findOne({ _id: new ObjectId(attendanceId) });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      lastModifiedBy: supervisorId,
      modificationReason: reason,
    };

    // Recalculate working hours if check-in or check-out times are updated
    if (updates.checkInTime || updates.checkOutTime) {
      const checkInTime = new Date(
        updates.checkInTime || existingRecord.checkInTime
      );
      const checkOutTime = new Date(
        updates.checkOutTime || existingRecord.checkOutTime
      );

      if (checkInTime && checkOutTime) {
        const workingMilliseconds = checkOutTime - checkInTime;
        const workingHours = workingMilliseconds / (1000 * 60 * 60);
        updateData.workingHours = Math.round(workingHours * 100) / 100;
      }
    }

    // Update the record
    await db
      .collection("daily_attendance")
      .updateOne({ _id: new ObjectId(attendanceId) }, { $set: updateData });

    // Create audit log for the update
    await createAuditLog({
      action: "UPDATE_ATTENDANCE",
      entityType: "attendance",
      entityId: attendanceId,
      userId: supervisorId || "system",
      userEmail: "system@company.com",
      metadata: {
        employeeId: existingRecord.employeeId,
        employeeName: existingRecord.employeeName,
        date: existingRecord.date,
        changes: updates,
        reason: reason || "Manual update",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Attendance record updated successfully",
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record", message: error.message },
      { status: 500 }
    );
  }
}
