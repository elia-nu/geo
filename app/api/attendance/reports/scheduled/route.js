import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { createAuditLog } from "../../../audit/route";
import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";

// Generate scheduled reports (daily, weekly, monthly)
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      scheduleType, // "daily", "weekly", "monthly"
      adminId = "system",
      includePhotos = false,
      includeLocationData = true,
    } = data;

    // Validation
    if (
      !scheduleType ||
      !["daily", "weekly", "monthly"].includes(scheduleType)
    ) {
      return NextResponse.json(
        { error: "Schedule type must be 'daily', 'weekly', or 'monthly'" },
        { status: 400 }
      );
    }

    // Calculate date range based on schedule type
    let startDate, endDate, fileName;
    const today = new Date();

    switch (scheduleType) {
      case "daily":
        startDate = format(subDays(today, 1), "yyyy-MM-dd");
        endDate = format(subDays(today, 1), "yyyy-MM-dd");
        fileName = `daily_attendance_${startDate}.pdf`;
        break;
      case "weekly":
        startDate = format(startOfWeek(subDays(today, 7)), "yyyy-MM-dd");
        endDate = format(endOfWeek(subDays(today, 7)), "yyyy-MM-dd");
        fileName = `weekly_attendance_${startDate}_to_${endDate}.pdf`;
        break;
      case "monthly":
        startDate = format(startOfMonth(subDays(today, 30)), "yyyy-MM-dd");
        endDate = format(endOfMonth(subDays(today, 30)), "yyyy-MM-dd");
        fileName = `monthly_attendance_${startDate.substring(0, 7)}.pdf`;
        break;
    }

    // Build query
    const query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

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

    // Generate report data
    let reportData;
    switch (scheduleType) {
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

    // Generate PDF
    const pdfBuffer = await generatePDFReport(
      reportData,
      scheduleType,
      startDate,
      endDate
    );

    // Save PDF to file system
    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "reports",
      "scheduled"
    );
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    // Save report metadata to database
    const reportMetadata = {
      reportType: scheduleType,
      startDate,
      endDate,
      fileName,
      filePath: `/uploads/reports/scheduled/${fileName}`,
      generatedAt: new Date(),
      generatedBy: adminId,
      totalRecords: processedRecords.length,
      filters: {
        includePhotos,
        includeLocationData,
      },
      summary: reportData.summary,
      isScheduled: true,
    };

    const reportResult = await db
      .collection("attendance_reports")
      .insertOne(reportMetadata);

    // Create audit log
    await createAuditLog({
      action: "GENERATE_SCHEDULED_ATTENDANCE_REPORT",
      entityType: "attendance_reports",
      entityId: reportResult.insertedId.toString(),
      userId: adminId,
      userEmail: "system@company.com",
      metadata: {
        scheduleType,
        startDate,
        endDate,
        fileName,
        totalRecords: processedRecords.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Scheduled ${scheduleType} attendance report generated successfully`,
      data: {
        reportId: reportResult.insertedId,
        fileName,
        filePath: `/uploads/reports/scheduled/${fileName}`,
        downloadUrl: `/api/attendance/reports/download/${fileName}`,
        summary: reportData.summary,
        totalRecords: processedRecords.length,
      },
    });
  } catch (error) {
    console.error("Error generating scheduled attendance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate scheduled attendance report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper functions (same as in main reports route)
function generateDailyReport(records, startDate, endDate) {
  const dailyStats = {};
  const employees = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    const date = record.date;
    if (!dailyStats[date]) {
      dailyStats[date] = {
        checkIns: 0,
        checkOuts: 0,
        workingHours: 0,
        faceVerified: 0,
        locationVerified: 0,
        employees: new Set(),
      };
    }

    employees.add(record.employeeId);
    dailyStats[date].employees.add(record.employeeId);
    dailyStats[date].checkIns++;
    totalCheckIns++;

    if (record.checkOutTime) {
      dailyStats[date].checkOuts++;
      totalCheckOuts++;
    }

    if (record.workingHours) {
      dailyStats[date].workingHours += record.workingHours;
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      dailyStats[date].faceVerified++;
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      dailyStats[date].locationVerified++;
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
    dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      checkIns: stats.checkIns,
      checkOuts: stats.checkOuts,
      workingHours: Math.round(stats.workingHours * 100) / 100,
      faceVerified: stats.faceVerified,
      locationVerified: stats.locationVerified,
      uniqueEmployees: stats.employees.size,
    })),
    records,
  };
}

function generateWeeklyReport(records, startDate, endDate) {
  const weeklyStats = {};
  const employees = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    const weekStart = format(startOfWeek(new Date(record.date)), "yyyy-MM-dd");
    if (!weeklyStats[weekStart]) {
      weeklyStats[weekStart] = {
        checkIns: 0,
        checkOuts: 0,
        workingHours: 0,
        faceVerified: 0,
        locationVerified: 0,
        employees: new Set(),
        days: new Set(),
      };
    }

    employees.add(record.employeeId);
    weeklyStats[weekStart].employees.add(record.employeeId);
    weeklyStats[weekStart].days.add(record.date);
    weeklyStats[weekStart].checkIns++;
    totalCheckIns++;

    if (record.checkOutTime) {
      weeklyStats[weekStart].checkOuts++;
      totalCheckOuts++;
    }

    if (record.workingHours) {
      weeklyStats[weekStart].workingHours += record.workingHours;
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      weeklyStats[weekStart].faceVerified++;
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      weeklyStats[weekStart].locationVerified++;
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
    weeklyStats: Object.entries(weeklyStats).map(([weekStart, stats]) => ({
      weekStart,
      checkIns: stats.checkIns,
      checkOuts: stats.checkOuts,
      workingHours: Math.round(stats.workingHours * 100) / 100,
      faceVerified: stats.faceVerified,
      locationVerified: stats.locationVerified,
      uniqueEmployees: stats.employees.size,
      activeDays: stats.days.size,
    })),
    records,
  };
}

function generateMonthlyReport(records, startDate, endDate) {
  const monthlyStats = {};
  const employees = new Set();
  const departments = new Set();
  let totalCheckIns = 0;
  let totalCheckOuts = 0;
  let totalWorkingHours = 0;
  let totalFaceVerified = 0;
  let totalLocationVerified = 0;

  records.forEach((record) => {
    const monthKey = format(new Date(record.date), "yyyy-MM");
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        checkIns: 0,
        checkOuts: 0,
        workingHours: 0,
        faceVerified: 0,
        locationVerified: 0,
        employees: new Set(),
        departments: new Set(),
        days: new Set(),
      };
    }

    employees.add(record.employeeId);
    if (record.department) departments.add(record.department);

    monthlyStats[monthKey].employees.add(record.employeeId);
    if (record.department)
      monthlyStats[monthKey].departments.add(record.department);
    monthlyStats[monthKey].days.add(record.date);
    monthlyStats[monthKey].checkIns++;
    totalCheckIns++;

    if (record.checkOutTime) {
      monthlyStats[monthKey].checkOuts++;
      totalCheckOuts++;
    }

    if (record.workingHours) {
      monthlyStats[monthKey].workingHours += record.workingHours;
      totalWorkingHours += record.workingHours;
    }

    if (record.faceVerified) {
      monthlyStats[monthKey].faceVerified++;
      totalFaceVerified++;
    }

    if (record.checkInLocation) {
      monthlyStats[monthKey].locationVerified++;
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
    monthlyStats: Object.entries(monthlyStats).map(([monthKey, stats]) => ({
      monthKey,
      checkIns: stats.checkIns,
      checkOuts: stats.checkOuts,
      workingHours: Math.round(stats.workingHours * 100) / 100,
      faceVerified: stats.faceVerified,
      locationVerified: stats.locationVerified,
      uniqueEmployees: stats.employees.size,
      uniqueDepartments: stats.departments.size,
      activeDays: stats.days.size,
    })),
    records,
  };
}

async function generatePDFReport(reportData, reportType, startDate, endDate) {
  return new Promise((resolve) => {
    // Create PDF document with font fallback options
    const doc = new PDFDocument({
      margin: 50,
      autoFirstPage: true,
      bufferPages: true,
    });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Handle font loading errors gracefully
    try {
      doc.font("Helvetica");
    } catch (error) {
      console.log("Font loading error, using default font:", error.message);
      // Continue with default font
    }

    // Header
    doc.fontSize(24).text("Scheduled Attendance Report", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(16)
      .text(
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        { align: "center" }
      );
    doc
      .fontSize(12)
      .text(`Period: ${startDate} - ${endDate}`, { align: "center" });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown();
    const summary = reportData.summary;
    doc.fontSize(10).text(`Total Records: ${summary.totalRecords}`);
    doc.text(`Unique Employees: ${summary.uniqueEmployees}`);
    doc.text(`Total Check-ins: ${summary.totalCheckIns}`);
    doc.text(`Total Check-outs: ${summary.totalCheckOuts}`);
    doc.text(`Total Working Hours: ${summary.totalWorkingHours}`);
    doc.text(`Face Verified: ${summary.totalFaceVerified}`);
    doc.text(`Location Verified: ${summary.totalLocationVerified}`);
    doc.text(`Average Working Hours: ${summary.averageWorkingHours}`);
    doc.moveDown(2);

    // Footer
    doc.addPage();
    doc
      .fontSize(10)
      .text(`Scheduled report generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });
    doc.text("This is an automated report for compliance and record-keeping.", {
      align: "center",
    });

    doc.end();
  });
}
