import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// GET /api/overtime/requests - Fetch overtime requests
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const status = url.searchParams.get("status"); // "pending", "approved", "rejected", "all"
    const date = url.searchParams.get("date");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
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

    const [requests, totalCount] = await Promise.all([
      db
        .collection("overtime_requests")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("overtime_requests").countDocuments(query),
    ]);

    // Fetch employee details
    const employeeIds = [...new Set(requests.map((r) => r.employeeId))];
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
        employeeId: emp.employeeId || emp.empId || emp._id.toString(),
      };
      employeeMap[emp._id.toString()] = empData;
      if (emp.employeeId) employeeMap[emp.employeeId] = empData;
      if (emp.empId) employeeMap[emp.empId] = empData;
    });

    let enhancedRequests = requests.map((req) => ({
      ...req,
      employee: employeeMap[String(req.employeeId)] || {
        name: req.employeeName || "Unknown Employee",
        department: req.department || "General",
      },
    }));

    // Filter by department or search term if specified
    if (department && department !== "all") {
      enhancedRequests = enhancedRequests.filter(
        (r) =>
          r.employee?.department?.toLowerCase() === department.toLowerCase() ||
          r.department?.toLowerCase() === department.toLowerCase()
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      enhancedRequests = enhancedRequests.filter(
        (r) =>
          r.employee?.name?.toLowerCase().includes(searchLower) ||
          r.employeeName?.toLowerCase().includes(searchLower) ||
          r.reason?.toLowerCase().includes(searchLower) ||
          r.project?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: enhancedRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalRecords: totalCount,
        recordsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching overtime requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch overtime requests", message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/overtime/requests - Submit a new overtime request
export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      employeeId,
      date,
      startTime,
      endTime,
      requestedHours,
      reason,
      project,
      notes,
    } = body;

    if (!employeeId || !date || !reason) {
      return NextResponse.json(
        { error: "Employee ID, date, and reason are required" },
        { status: 400 }
      );
    }

    // Validate employee existence
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

    // Calculate hours if start & end time provided and requestedHours not explicitly passed
    let calculatedHours = parseFloat(requestedHours) || 0;
    if ((!calculatedHours || calculatedHours <= 0) && startTime && endTime) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // handle overnight overtime
      calculatedHours = Math.round((diffMinutes / 60) * 100) / 100;
    }

    if (calculatedHours <= 0) {
      calculatedHours = 1; // default fallback
    }

    const now = new Date();
    const overtimeRequestData = {
      employeeId: employee._id.toString(),
      empId: empCode,
      employeeName,
      department,
      date,
      startTime: startTime || "",
      endTime: endTime || "",
      requestedHours: calculatedHours,
      approvedHours: null,
      reason: reason.trim(),
      project: project ? project.trim() : "",
      notes: notes ? notes.trim() : "",
      status: "pending", // "pending", "approved", "rejected"
      supervisorId: null,
      supervisorNotes: "",
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection("overtime_requests")
      .insertOne(overtimeRequestData);

    // Create Audit Log
    await createAuditLog({
      action: "SUBMIT_OVERTIME_REQUEST",
      entityType: "overtime_request",
      entityId: result.insertedId.toString(),
      userId: employeeId,
      userEmail: employee.personalDetails?.email || employee.email || "",
      metadata: {
        employeeName,
        date,
        requestedHours: calculatedHours,
        reason,
        project,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Overtime request submitted successfully",
      data: {
        _id: result.insertedId.toString(),
        ...overtimeRequestData,
      },
    });
  } catch (error) {
    console.error("Error creating overtime request:", error);
    return NextResponse.json(
      { error: "Failed to submit overtime request", message: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/overtime/requests - Approve or Reject an overtime request
export async function PUT(request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      requestId,
      status, // "approved" | "rejected"
      approvedHours,
      supervisorId,
      supervisorNotes,
    } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved', 'rejected', or 'pending'" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { error: "Invalid Request ID" },
        { status: 400 }
      );
    }

    const existingRequest = await db
      .collection("overtime_requests")
      .findOne({ _id: new ObjectId(requestId) });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Overtime request not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const finalApprovedHours =
      status === "approved"
        ? parseFloat(approvedHours) || existingRequest.requestedHours || 0
        : 0;

    const updateData = {
      status,
      approvedHours: finalApprovedHours,
      supervisorId: supervisorId || "admin",
      supervisorNotes: supervisorNotes ? supervisorNotes.trim() : "",
      reviewedAt: now,
      updatedAt: now,
    };

    await db
      .collection("overtime_requests")
      .updateOne({ _id: new ObjectId(requestId) }, { $set: updateData });

    // Send in-app notification to the employee
    try {
      await db.collection("notifications").insertOne({
        userId: ObjectId.isValid(existingRequest.employeeId)
          ? new ObjectId(existingRequest.employeeId)
          : null,
        employeeId: existingRequest.employeeId,
        type: "overtime_status",
        title: `Overtime Request ${status.toUpperCase()}`,
        message:
          status === "approved"
            ? `Your overtime request for ${existingRequest.date} (${finalApprovedHours} hrs) has been approved. You can now check in for overtime on that date.`
            : `Your overtime request for ${existingRequest.date} was rejected.${
                supervisorNotes ? ` Reason: ${supervisorNotes}` : ""
              }`,
        actionUrl: "/employee-portal?section=overtime",
        isRead: false,
        createdAt: now,
      });
    } catch (notifErr) {
      console.error("Failed to create overtime notification:", notifErr);
    }

    // Create Audit Log
    await createAuditLog({
      action: "REVIEW_OVERTIME_REQUEST",
      entityType: "overtime_request",
      entityId: requestId,
      userId: supervisorId || "admin",
      userEmail: "admin@company.com",
      metadata: {
        employeeId: existingRequest.employeeId,
        employeeName: existingRequest.employeeName,
        date: existingRequest.date,
        previousStatus: existingRequest.status,
        newStatus: status,
        approvedHours: finalApprovedHours,
        supervisorNotes: supervisorNotes || "",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Overtime request ${status} successfully`,
      data: {
        requestId,
        status,
        approvedHours: finalApprovedHours,
      },
    });
  } catch (error) {
    console.error("Error updating overtime request:", error);
    return NextResponse.json(
      { error: "Failed to update overtime request", message: error.message },
      { status: 500 }
    );
  }
}
