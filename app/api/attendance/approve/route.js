import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Approve or reject attendance records
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      attendanceId,
      action, // "approve" or "reject"
      adminId,
      adminNotes = "",
      rejectionReason = "",
    } = data;

    // Validation
    if (!attendanceId || !action || !adminId) {
      return NextResponse.json(
        { error: "Attendance ID, action, and admin ID are required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the attendance record
    const attendanceRecord = await db.collection("daily_attendance").findOne({
      _id: new ObjectId(attendanceId),
    });

    if (!attendanceRecord) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    // Get employee details
    const employee = await db.collection("employees").findOne({
      _id: attendanceRecord.employeeId,
    });

    const employeeName =
      employee?.personalDetails?.name || employee?.name || "Unknown Employee";

    // Prepare update data
    const updateData = {
      adminApproval: {
        status: action === "approve" ? "approved" : "rejected",
        adminId: adminId,
        adminNotes: adminNotes,
        rejectionReason: action === "reject" ? rejectionReason : "",
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
      updatedAt: new Date(),
    };

    // Update the attendance record
    const result = await db
      .collection("daily_attendance")
      .updateOne({ _id: new ObjectId(attendanceId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update attendance record" },
        { status: 500 }
      );
    }

    // Create audit log
    await createAuditLog({
      action: action === "approve" ? "APPROVE_ATTENDANCE" : "REJECT_ATTENDANCE",
      entityType: "daily_attendance",
      entityId: attendanceId,
      userId: adminId,
      userEmail: "admin@company.com", // Replace with actual admin email
      metadata: {
        employeeName: employeeName,
        employeeId: attendanceRecord.employeeId,
        date: attendanceRecord.date,
        checkInTime: attendanceRecord.checkInTime,
        checkOutTime: attendanceRecord.checkOutTime,
        workingHours: attendanceRecord.workingHours,
        adminNotes: adminNotes,
        rejectionReason: rejectionReason,
        previousStatus: attendanceRecord.adminApproval?.status || "pending",
      },
    });

    // Get the updated record
    const updatedRecord = await db.collection("daily_attendance").findOne({
      _id: new ObjectId(attendanceId),
    });

    return NextResponse.json({
      success: true,
      message: `Attendance ${action}d successfully`,
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error updating attendance approval:", error);
    return NextResponse.json(
      { error: "Failed to update attendance approval", message: error.message },
      { status: 500 }
    );
  }
}

// Get pending attendance records for admin review
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);

    const status = url.searchParams.get("status") || "pending"; // pending, approved, rejected, all
    const employeeId = url.searchParams.get("employeeId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 20;

    // Build query
    let query = {};

    // Filter by approval status
    if (status === "pending") {
      query["$or"] = [
        { "adminApproval.status": { $exists: false } },
        { "adminApproval.status": "pending" },
      ];
    } else if (status !== "all") {
      query["adminApproval.status"] = status;
    }

    // Filter by employee
    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const skip = (page - 1) * limit;

    // Get attendance records with employee details
    const attendanceRecords = await db
      .collection("daily_attendance")
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "employees",
            let: { employeeId: "$employeeId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", { $toObjectId: "$$employeeId" }],
                  },
                },
              },
            ],
            as: "employee",
          },
        },
        {
          $lookup: {
            from: "work_locations",
            let: { workLocationId: "$workLocationId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", { $toObjectId: "$$workLocationId" }],
                  },
                },
              },
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
        { $sort: { date: -1, checkInTime: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    // Get total count for pagination
    const totalCount = await db
      .collection("daily_attendance")
      .countDocuments(query);

    // Process records to include employee names and clean data
    const processedRecords = attendanceRecords.map((record) => ({
      ...record,
      employeeName: record.employeeName || "Unknown Employee",
      employeeEmail:
        record.employee?.personalDetails?.email || record.employee?.email || "",
      department:
        record.employee?.department ||
        record.employee?.personalDetails?.department ||
        "",
      workLocationName: record.workLocation?.name || "Unknown Location",
      approvalStatus: record.adminApproval?.status || "pending",
    }));

    return NextResponse.json({
      success: true,
      data: processedRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        recordsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance records for approval:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance records", message: error.message },
      { status: 500 }
    );
  }
}
