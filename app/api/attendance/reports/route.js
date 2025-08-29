import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";

// Generate attendance reports (data only, no storage)
export async function POST(request) {
  try {
    console.log("Starting report generation...");
    const db = await getDb();
    const data = await request.json();
    console.log("Request data:", data);

    const {
      reportType, // "daily", "weekly", "monthly"
      startDate,
      endDate,
      employeeId, // optional filter
      department, // optional filter
      includePhotos = false,
      includeLocationData = true,
      adminId = "admin",
    } = data;

    // Validation
    if (!reportType || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Report type, start date, and end date are required" },
        { status: 400 }
      );
    }

    if (!["daily", "weekly", "monthly"].includes(reportType)) {
      return NextResponse.json(
        { error: "Report type must be 'daily', 'weekly', or 'monthly'" },
        { status: 400 }
      );
    }

    // Build query
    let query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    console.log("Building query:", query);
    // Get attendance records with employee and work location details
    const attendanceRecords = await db
      .collection("daily_attendance")
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "employees",
            let: { employeeId: "$employeeId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$employeeId"] } } },
            ],
            as: "employee",
          },
        },
        {
          $lookup: {
            from: "work_locations",
            let: { workLocationId: "$workLocationId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$workLocationId"] } } },
            ],
            as: "workLocation",
          },
        },
        {
          $addFields: {
            employee: { $arrayElemAt: ["$employee", 0] },
            workLocation: { $arrayElemAt: ["$workLocation", 0] },
          },
        },
        { $sort: { date: 1, checkInTime: 1 } },
      ])
      .toArray();

    console.log("Found attendance records:", attendanceRecords.length);
    // Process records
    const processedRecords = attendanceRecords.map((record) => ({
      _id: record._id,
      employeeId: record.employeeId,
      employeeName:
        record.employee?.personalDetails?.name ||
        record.employee?.name ||
        "Unknown Employee",
      employeeEmail:
        record.employee?.personalDetails?.email || record.employee?.email || "",
      department:
        record.employee?.department ||
        record.employee?.personalDetails?.department ||
        "",
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      workingHours: record.workingHours,
      workLocationName: record.workLocation?.name || "Unknown Location",
      checkInLocation: includeLocationData ? record.checkInLocation : null,
      checkOutLocation: includeLocationData ? record.checkOutLocation : null,
      faceVerified: record.faceVerified,
      checkInPhoto: includePhotos ? record.checkInPhoto : null,
      checkOutPhoto: includePhotos ? record.checkOutPhoto : null,
      checkInNotes: record.checkInNotes,
      checkOutNotes: record.checkOutNotes,
      adminApproval: record.adminApproval,
      approvalStatus: record.adminApproval?.status || "pending",
    }));

    console.log("Processing records:", processedRecords.length);
    // Generate report based on type
    let reportData;

    switch (reportType) {
      case "daily":
        reportData = generateDailyReport(processedRecords, startDate, endDate);
        break;
      case "weekly":
        reportData = generateWeeklyReport(processedRecords, startDate, endDate);
        break;
      case "monthly":
        reportData = generateMonthlyReport(
          processedRecords,
          startDate,
          endDate
        );
        break;
    }

    return NextResponse.json({
      success: true,
      message: `${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      } attendance report generated successfully`,
      data: {
        reportType,
        startDate,
        endDate,
        summary: reportData.summary,
        totalRecords: processedRecords.length,
        records: reportData.records,
        stats:
          reportData.dailyStats ||
          reportData.weeklyStats ||
          reportData.monthlyStats,
        filters: {
          employeeId,
          department,
          includePhotos,
          includeLocationData,
        },
      },
    });
  } catch (error) {
    console.error("Error generating attendance report:", error);
    return NextResponse.json(
      { error: "Failed to generate attendance report", message: error.message },
      { status: 500 }
    );
  }
}

// Helper functions for report generation
function generateDailyReport(records, startDate, endDate) {
  const employees = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    employees.add(record.employeeId);
    totalCheckIns++;

    if (record.checkOutTime) {
      totalCheckOuts++;
    }

    if (record.workingHours) {
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      totalLocationVerified++;
    }
  });

  return {
    type: "daily",
    period: { startDate, endDate },
    summary: {
      totalRecords: records.length,
      uniqueEmployees: employees.size,
      totalCheckIns,
      totalCheckOuts,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalFaceVerified,
      totalLocationVerified,
      averageWorkingHours:
        records.length > 0
          ? Math.round((totalWorkingHours / records.length) * 100) / 100
          : 0,
    },
    dailyStats: [
      {
        date: startDate,
        checkIns: totalCheckIns,
        checkOuts: totalCheckOuts,
        workingHours: Math.round(totalWorkingHours * 100) / 100,
        faceVerified: totalFaceVerified,
        locationVerified: totalLocationVerified,
        uniqueEmployees: employees.size,
      },
    ],
    records,
  };
}

function generateWeeklyReport(records, startDate, endDate) {
  const employees = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    employees.add(record.employeeId);
    totalCheckIns++;

    if (record.checkOutTime) {
      totalCheckOuts++;
    }

    if (record.workingHours) {
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      totalLocationVerified++;
    }
  });

  return {
    type: "weekly",
    period: { startDate, endDate },
    summary: {
      totalRecords: records.length,
      uniqueEmployees: employees.size,
      totalCheckIns,
      totalCheckOuts,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalFaceVerified,
      totalLocationVerified,
      averageWorkingHours:
        records.length > 0
          ? Math.round((totalWorkingHours / records.length) * 100) / 100
          : 0,
    },
    weeklyStats: [
      {
        weekStart: startDate,
        checkIns: totalCheckIns,
        checkOuts: totalCheckOuts,
        workingHours: Math.round(totalWorkingHours * 100) / 100,
        faceVerified: totalFaceVerified,
        locationVerified: totalLocationVerified,
        uniqueEmployees: employees.size,
        activeDays: 1,
      },
    ],
    records,
  };
}

function generateMonthlyReport(records, startDate, endDate) {
  const employees = new Set();
  const departments = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    employees.add(record.employeeId);
    if (record.department) departments.add(record.department);

    totalCheckIns++;

    if (record.checkOutTime) {
      totalCheckOuts++;
    }

    if (record.workingHours) {
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      totalLocationVerified++;
    }
  });

  return {
    type: "monthly",
    period: { startDate, endDate },
    summary: {
      totalRecords: records.length,
      uniqueEmployees: employees.size,
      uniqueDepartments: departments.size,
      totalCheckIns,
      totalCheckOuts,
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalFaceVerified,
      totalLocationVerified,
      averageWorkingHours:
        records.length > 0
          ? Math.round((totalWorkingHours / records.length) * 100) / 100
          : 0,
    },
    monthlyStats: [
      {
        monthKey: startDate.substring(0, 7),
        checkIns: totalCheckIns,
        checkOuts: totalCheckOuts,
        workingHours: Math.round(totalWorkingHours * 100) / 100,
        faceVerified: totalFaceVerified,
        locationVerified: totalLocationVerified,
        uniqueEmployees: employees.size,
        uniqueDepartments: departments.size,
        activeDays: 1,
      },
    ],
    records,
  };
}
