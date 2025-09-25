import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { createAuditLog } from "../../../../utils/audit.js";

export async function POST(request) {
  try {
    console.log("Starting simple report generation...");
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

    // Generate simple report data
    const employees = new Set();
    let totalCheckIns = 0;
    let totalCheckOuts = 0;
    let totalWorkingHours = 0;
    let totalFaceVerified = 0;
    let totalLocationVerified = 0;

    processedRecords.forEach((record) => {
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

    const reportData = {
      type: reportType,
      period: { startDate, endDate },
      summary: {
        totalRecords: processedRecords.length,
        uniqueEmployees: employees.size,
        totalCheckIns,
        totalCheckOuts,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        totalFaceVerified,
        totalLocationVerified,
        averageWorkingHours:
          processedRecords.length > 0
            ? Math.round((totalWorkingHours / processedRecords.length) * 100) /
              100
            : 0,
      },
      records: processedRecords.slice(0, 10), // Limit to first 10 records for response
    };

    console.log("Generated report data:", reportData.summary);

    // Save report metadata to database
    const reportMetadata = {
      reportType,
      startDate,
      endDate,
      fileName: `${reportType}_attendance_${startDate}_to_${endDate}.json`,
      filePath: `/api/attendance/reports/simple`,
      generatedAt: new Date(),
      generatedBy: adminId,
      totalRecords: processedRecords.length,
      filters: {
        employeeId,
        department,
        includePhotos,
        includeLocationData,
      },
      summary: reportData.summary,
    };

    const reportResult = await db
      .collection("attendance_reports")
      .insertOne(reportMetadata);

    // Create audit log
    await createAuditLog({
      action: "GENERATE_SIMPLE_ATTENDANCE_REPORT",
      entityType: "attendance_reports",
      entityId: reportResult.insertedId.toString(),
      userId: adminId,
      userEmail: "admin@company.com",
      metadata: {
        reportType,
        startDate,
        endDate,
        totalRecords: processedRecords.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${
        reportType.charAt(0).toUpperCase() + reportType.slice(1)
      } attendance report generated successfully`,
      data: {
        reportId: reportResult.insertedId,
        fileName: reportMetadata.fileName,
        summary: reportData.summary,
        totalRecords: processedRecords.length,
        sampleRecords: reportData.records,
      },
    });
  } catch (error) {
    console.error("Error generating simple attendance report:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate simple attendance report",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
