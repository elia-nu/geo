import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";

export async function GET() {
  try {
    const db = await getDb();

    // Test database connection
    const attendanceCount = await db
      .collection("daily_attendance")
      .countDocuments();
    const employeeCount = await db.collection("employees").countDocuments();
    const workLocationCount = await db
      .collection("work_locations")
      .countDocuments();

    // Test a simple aggregation
    const testQuery = {
      date: {
        $gte: "2025-08-27",
        $lte: "2025-08-27",
      },
    };

    const testRecords = await db
      .collection("daily_attendance")
      .aggregate([
        { $match: testQuery },
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
          $addFields: {
            employee: { $arrayElemAt: ["$employee", 0] },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      message: "Attendance reporting system test successful",
      data: {
        attendanceCount,
        employeeCount,
        workLocationCount,
        testRecordsCount: testRecords.length,
        testRecords: testRecords.slice(0, 2), // Show first 2 records
      },
    });
  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
