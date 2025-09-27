import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Get attendance documents
export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");
    const attendanceId = url.searchParams.get("attendanceId");
    const type = url.searchParams.get("type"); // "absence", "late", "early", "medical", "other"
    const status = url.searchParams.get("status"); // "pending", "approved", "rejected"
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    let query = {};

    // Filter by employee if specified
    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Filter by attendance record if specified
    if (attendanceId) {
      query.attendanceId = attendanceId;
    }

    // Filter by document type
    if (type) {
      query.type = type;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by date range
    if (startDate && endDate) {
      query.requestDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    console.log("Fetching attendance documents with query:", query);

    const documents = await db
      .collection("attendance_documents")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Get employee details for each document
    const employeeIds = [...new Set(documents.map((doc) => doc.employeeId))];
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

    // Enhance documents with employee details
    const enhancedDocuments = documents.map((doc) => ({
      ...doc,
      employee: employeeMap[doc.employeeId] || { name: "Unknown Employee" },
    }));

    return NextResponse.json({
      success: true,
      data: enhancedDocuments,
      count: enhancedDocuments.length,
    });
  } catch (error) {
    console.error("Error fetching attendance documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance documents", message: error.message },
      { status: 500 }
    );
  }
}

// Submit attendance document/request
export async function POST(request) {
  try {
    const db = await getDb();

    // Check if request is JSON or form data
    const contentType = request.headers.get("content-type");
    let employeeId,
      type,
      requestDate,
      reason,
      description,
      startDate,
      endDate,
      leaveType,
      attendanceId,
      files = [];

    if (contentType && contentType.includes("application/json")) {
      // Handle JSON request
      const jsonData = await request.json();
      employeeId = jsonData.employeeId;
      type = jsonData.type;
      requestDate = jsonData.requestDate;
      reason = jsonData.reason;
      description = jsonData.description;
      startDate = jsonData.startDate;
      endDate = jsonData.endDate;
      leaveType = jsonData.leaveType;
      attendanceId = jsonData.attendanceId;
    } else {
      // Handle form data request
      const formData = await request.formData();
      employeeId = formData.get("employeeId");
      type = formData.get("type");
      requestDate = formData.get("requestDate");
      reason = formData.get("reason");
      description = formData.get("description");
      startDate = formData.get("startDate");
      endDate = formData.get("endDate");
      leaveType = formData.get("leaveType");
      attendanceId = formData.get("attendanceId");
      files = formData.getAll("documents");
    }

    console.log("Processing attendance document submission:", {
      employeeId,
      type,
      requestDate,
      startDate,
      endDate,
      leaveType,
      filesCount: files.length,
    });

    // Validate required fields based on type
    if (!employeeId || !type || !reason) {
      return NextResponse.json(
        { error: "Employee ID, type, and reason are required" },
        { status: 400 }
      );
    }

    // For leave requests, validate start and end dates
    if (type === "leave" && (!startDate || !endDate)) {
      return NextResponse.json(
        { error: "Start date and end date are required for leave requests" },
        { status: 400 }
      );
    }

    // For other types, validate request date
    if (type !== "leave" && !requestDate) {
      return NextResponse.json(
        { error: "Request date is required for this type of request" },
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

    // Process uploaded files
    const uploadedFiles = [];
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "attendance-documents"
    );

    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const file of files) {
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const fileExtension = path.extname(file.name);
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}${fileExtension}`;
        const filePath = path.join(uploadDir, fileName);

        // Save file
        await writeFile(filePath, buffer);

        uploadedFiles.push({
          originalName: file.name,
          fileName: fileName,
          filePath: `/uploads/attendance-documents/${fileName}`,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date(),
        });
      }
    }

    // Create document record
    const documentData = {
      employeeId,
      employeeName,
      type,
      requestDate: type === "leave" ? startDate : requestDate, // For leave requests, use startDate as requestDate
      reason,
      description: description || "",
      startDate: startDate || null,
      endDate: endDate || null,
      leaveType: leaveType || null, // Add leaveType for leave requests
      attendanceId: attendanceId || null,
      files: uploadedFiles,
      status: "pending", // pending, approved, rejected
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert document record
    const result = await db
      .collection("attendance_documents")
      .insertOne(documentData);

    const documentId = result.insertedId;

    // Create audit log
    await createAuditLog({
      action: "SUBMIT_ATTENDANCE_DOCUMENT",
      entityType: "attendance_document",
      entityId: documentId.toString(),
      userId: employeeId,
      userEmail: employee.personalDetails?.email || employee.email || "",
      metadata: {
        employeeName,
        documentType: type,
        requestDate: type === "leave" ? startDate : requestDate,
        reason,
        leaveType: leaveType || null,
        startDate: startDate || null,
        endDate: endDate || null,
        filesCount: uploadedFiles.length,
        fileNames: uploadedFiles.map((f) => f.originalName),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document submitted successfully",
      data: {
        documentId: documentId.toString(),
        status: "pending",
        filesUploaded: uploadedFiles.length,
      },
    });
  } catch (error) {
    console.error("Error submitting attendance document:", error);
    return NextResponse.json(
      { error: "Failed to submit document", message: error.message },
      { status: 500 }
    );
  }
}

// Update document status (for supervisor approval/rejection)
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { documentId, status, supervisorId, supervisorNotes, reviewDate } =
      data;

    if (!documentId || !status || !supervisorId) {
      return NextResponse.json(
        { error: "Document ID, status, and supervisor ID are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved', 'rejected', or 'pending'" },
        { status: 400 }
      );
    }

    // Get existing document
    const existingDocument = await db
      .collection("attendance_documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update document
    const updateData = {
      status,
      supervisorId,
      supervisorNotes: supervisorNotes || "",
      reviewDate: reviewDate || new Date(),
      reviewedAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .collection("attendance_documents")
      .updateOne({ _id: new ObjectId(documentId) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "REVIEW_ATTENDANCE_DOCUMENT",
      entityType: "attendance_document",
      entityId: documentId,
      userId: supervisorId,
      userEmail: "supervisor@company.com",
      metadata: {
        employeeId: existingDocument.employeeId,
        employeeName: existingDocument.employeeName,
        documentType: existingDocument.type,
        previousStatus: existingDocument.status,
        newStatus: status,
        supervisorNotes: supervisorNotes || "",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Document ${status} successfully`,
    });
  } catch (error) {
    console.error("Error updating document status:", error);
    return NextResponse.json(
      { error: "Failed to update document status", message: error.message },
      { status: 500 }
    );
  }
}
