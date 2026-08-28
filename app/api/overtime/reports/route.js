import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { formatWorkingHours } from "../../../utils/timeUtils";

// GET /api/overtime/reports - Aggregated Overtime Analytics with Detailed Session Logs
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const department = url.searchParams.get("department");
    const employeeId = url.searchParams.get("employeeId");
    const search = url.searchParams.get("search");
    const approvalStatus = url.searchParams.get("approvalStatus");

    let requestQuery = {};
    let attendanceQuery = {};

    // Filter by Employee ID / Code if provided
    if (employeeId && employeeId.trim()) {
      const trimmedId = employeeId.trim();
      const possibleEmpIds = [trimmedId];

      if (ObjectId.isValid(trimmedId)) {
        possibleEmpIds.push(new ObjectId(trimmedId));
      }

      // Look up employee by employeeId / empId code
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
      requestQuery.employeeId = { $in: validUniqueIds };
      attendanceQuery.employeeId = { $in: validUniqueIds };
    }

    // Filter by Date Range
    if (startDate && endDate) {
      requestQuery.date = { $gte: startDate, $lte: endDate };
      attendanceQuery.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      requestQuery.date = { $gte: startDate };
      attendanceQuery.date = { $gte: startDate };
    } else if (endDate) {
      requestQuery.date = { $lte: endDate };
      attendanceQuery.date = { $lte: endDate };
    }

    // Filter by Department
    if (department && department !== "all") {
      requestQuery.department = department;
      attendanceQuery.department = department;
    }

    // Filter by Approval Status
    if (approvalStatus && approvalStatus !== "all") {
      attendanceQuery.adminApprovalStatus = approvalStatus;
      requestQuery.status = approvalStatus;
    }

    const [allRequests, allAttendance] = await Promise.all([
      db.collection("overtime_requests").find(requestQuery).sort({ date: -1, createdAt: -1 }).toArray(),
      db.collection("overtime_attendance").find(attendanceQuery).sort({ date: -1, checkInTime: -1 }).toArray(),
    ]);

    // Fetch employee details to map IDs, names, codes
    const allEmpIdsRaw = [
      ...new Set([
        ...allRequests.map((r) => r.employeeId),
        ...allAttendance.map((a) => a.employeeId),
      ].filter(Boolean)),
    ];

    const validObjectIds = allEmpIdsRaw
      .filter((id) => id && ObjectId.isValid(String(id)))
      .map((id) => (typeof id === "string" ? new ObjectId(id) : id));

    const employees = await db
      .collection("employees")
      .find({
        $or: [
          ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
          { employeeId: { $in: allEmpIdsRaw.map(String) } },
          { empId: { $in: allEmpIdsRaw.map(String) } },
        ],
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      const empCode =
        emp.employeeId ||
        emp.empId ||
        emp.personalDetails?.employeeId ||
        emp._id.toString();

      const empData = {
        _id: emp._id.toString(),
        employeeId: empCode,
        empId: empCode,
        name: emp.personalDetails?.name || emp.name || "Unknown Employee",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "General",
        designation: emp.designation || emp.personalDetails?.designation || "",
      };

      employeeMap[emp._id.toString()] = empData;
      if (emp.employeeId) employeeMap[emp.employeeId] = empData;
      if (emp.empId) employeeMap[emp.empId] = empData;
    });

    // Enhance and filter by search query if present
    let filteredRequests = allRequests.map((req) => {
      const emp =
        employeeMap[String(req.employeeId)] || {
          employeeId: req.employeeId || "—",
          empId: req.employeeId || "—",
          name: req.employeeName || "Unknown Employee",
          department: req.department || "General",
        };
      return {
        ...req,
        empId: emp.empId || emp.employeeId,
        employeeName: emp.name,
        department: emp.department,
      };
    });

    let filteredAttendance = allAttendance.map((att) => {
      const emp =
        employeeMap[String(att.employeeId)] || {
          employeeId: att.employeeId || "—",
          empId: att.employeeId || "—",
          name: att.employeeName || "Unknown Employee",
          department: att.department || "General",
        };

      const durationHours = parseFloat(att.durationHours) || 0;
      const durationFormatted = formatWorkingHours(durationHours > 0 ? durationHours : att);

      return {
        ...att,
        empId: emp.empId || emp.employeeId,
        employeeName: emp.name,
        department: emp.department,
        adminApprovalStatus: att.adminApprovalStatus || "pending_review",
        durationHours: Math.round(durationHours * 100) / 100,
        durationFormatted,
        approvedAttendanceHours: att.approvedAttendanceHours !== undefined ? att.approvedAttendanceHours : att.approvedHours,
        approvedAt: att.adminReviewedAt || att.reviewedAt || att.approvedAt || null,
        approvedBy: att.adminReviewedBy || att.reviewedBy || att.approvedBy || null,
      };
    });

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filteredRequests = filteredRequests.filter(
        (r) =>
          r.employeeName?.toLowerCase().includes(s) ||
          r.empId?.toLowerCase().includes(s) ||
          r.project?.toLowerCase().includes(s) ||
          r.reason?.toLowerCase().includes(s)
      );
      filteredAttendance = filteredAttendance.filter(
        (a) =>
          a.employeeName?.toLowerCase().includes(s) ||
          a.empId?.toLowerCase().includes(s) ||
          a.project?.toLowerCase().includes(s) ||
          a.checkInNotes?.toLowerCase().includes(s) ||
          a.checkOutNotes?.toLowerCase().includes(s)
      );
    }

    // Compute request stats
    const totalRequests = filteredRequests.length;
    const pendingRequests = filteredRequests.filter((r) => r.status === "pending").length;
    const approvedRequests = filteredRequests.filter((r) => r.status === "approved").length;
    const rejectedRequests = filteredRequests.filter((r) => r.status === "rejected").length;

    const totalRequestedHours = Math.round(
      filteredRequests.reduce((sum, r) => sum + (parseFloat(r.requestedHours) || 0), 0) * 100
    ) / 100;

    const totalApprovedHours = Math.round(
      filteredRequests
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + (parseFloat(r.approvedHours) || parseFloat(r.requestedHours) || 0), 0) * 100
    ) / 100;

    // Compute actual attendance worked stats
    const totalCompletedSessions = filteredAttendance.filter((a) => a.status === "completed").length;
    const activeSessions = filteredAttendance.filter((a) => a.status === "in-progress").length;

    const totalActualWorkedHours = Math.round(
      filteredAttendance.reduce((sum, a) => sum + (parseFloat(a.durationHours) || 0), 0) * 100
    ) / 100;

    const formattedTotalDuration = formatWorkingHours(totalActualWorkedHours);

    // Group by Employee
    const employeeBreakdownMap = {};
    filteredAttendance.forEach((att) => {
      const empKey = att.empId || att.employeeId || "unknown";
      if (!employeeBreakdownMap[empKey]) {
        employeeBreakdownMap[empKey] = {
          employeeId: att.employeeId,
          empId: empKey,
          employeeName: att.employeeName,
          department: att.department,
          sessionsCount: 0,
          totalDurationHours: 0,
          approvedHoursTotal: 0,
          sessions: [],
        };
      }
      employeeBreakdownMap[empKey].sessionsCount += 1;
      employeeBreakdownMap[empKey].totalDurationHours += parseFloat(att.durationHours) || 0;
      employeeBreakdownMap[empKey].approvedHoursTotal += parseFloat(att.approvedAttendanceHours) || 0;
      employeeBreakdownMap[empKey].sessions.push(att);
    });

    const employeeSummary = Object.values(employeeBreakdownMap)
      .map((emp) => ({
        ...emp,
        totalDurationHours: Math.round(emp.totalDurationHours * 100) / 100,
        approvedHoursTotal: Math.round(emp.approvedHoursTotal * 100) / 100,
        durationFormatted: formatWorkingHours(emp.totalDurationHours),
      }))
      .sort((a, b) => b.totalDurationHours - a.totalDurationHours);

    // Group by Department
    const deptMap = {};
    filteredAttendance.forEach((att) => {
      const dept = att.department || "General";
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          sessionsCount: 0,
          totalDurationHours: 0,
        };
      }
      deptMap[dept].sessionsCount += 1;
      deptMap[dept].totalDurationHours += parseFloat(att.durationHours) || 0;
    });

    const departmentSummary = Object.values(deptMap).map((d) => ({
      ...d,
      totalDurationHours: Math.round(d.totalDurationHours * 100) / 100,
      durationFormatted: formatWorkingHours(d.totalDurationHours),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          totalRequestedHours,
          totalApprovedHours,
          totalActualWorkedHours,
          totalCompletedSessions,
          activeSessions,
          formattedTotalDuration,
        },
        employeeSummary,
        departmentSummary,
        detailedSessions: filteredAttendance,
        recentRequests: filteredRequests,
      },
    });
  } catch (error) {
    console.error("Error generating overtime report:", error);
    return NextResponse.json(
      { error: "Failed to generate overtime report", message: error.message },
      { status: 500 }
    );
  }
}
