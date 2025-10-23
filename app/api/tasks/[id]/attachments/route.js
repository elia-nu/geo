import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Get all attachments for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Find the task
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get attachments with uploadedByName populated and consistent structure, sorted by uploadedAt descending (newest first)
    const attachments = (task.attachments || []).sort((a, b) => {
      const dateA = new Date(a.uploadedAt || a.createdAt || 0);
      const dateB = new Date(b.uploadedAt || b.createdAt || 0);
      return dateB - dateA; // Descending order (newest first)
    });
    const attachmentsWithNames = await Promise.all(
      attachments.map(async (attachment) => {
        let employeeName = attachment.uploadedByName || "Unknown";

        // If we have uploadedBy but no uploadedByName, fetch the employee
        if (attachment.uploadedBy && !attachment.uploadedByName) {
          const employee = await db.collection("employees").findOne({
            _id: new ObjectId(attachment.uploadedBy),
          });

          console.log("Attachment employee lookup:", {
            attachmentId: attachment._id,
            uploadedBy: attachment.uploadedBy,
            employeeFound: !!employee,
            employeeName: employee?.personalDetails?.name || employee?.name,
            employeeStructure: employee ? Object.keys(employee) : null,
          });

          // Extract employee name using multiple possible field structures
          if (employee) {
            employeeName =
              employee.personalDetails?.name ||
              employee.name ||
              employee.personalDetails?.fullName ||
              employee.fullName ||
              (employee.personalDetails?.firstName &&
              employee.personalDetails?.lastName
                ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
                : null) ||
              (employee.firstName && employee.lastName
                ? `${employee.firstName} ${employee.lastName}`
                : null) ||
              "Unknown";
          }
        }

        // Return consistent structure
        return {
          _id: attachment._id,
          originalName: attachment.originalName,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          mimeType: attachment.mimeType || attachment.fileType,
          size: attachment.size || attachment.fileSize,
          uploadedBy: attachment.uploadedBy,
          uploadedByName: employeeName,
          uploadedAt: attachment.uploadedAt,
          // Additional fields that might exist
          description: attachment.description || "",
          downloadCount: attachment.downloadCount || 0,
          isDeleted: attachment.isDeleted || false,
        };
      })
    );

    return NextResponse.json({
      success: true,
      attachments: attachmentsWithNames,
    });
  } catch (error) {
    console.error("Error fetching task attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch task attachments" },
      { status: 500 }
    );
  }
}

// Upload a new attachment to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Find the task
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const formUserId = formData.get("userId");
    const formUserName = formData.get("userName");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(
      process.cwd(),
      "public",
      "uploads",
      "task-attachments"
    );
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Get employee ID from request headers (passed from frontend)
    // Fallbacks: x-user-id header or formData userId
    const headerEmployeeId = request.headers.get("x-employee-id");
    const headerUserId = request.headers.get("x-user-id");
    const employeeId = headerEmployeeId || headerUserId || formUserId || null;

    // Resolve employee by either Mongo _id or business employeeId
    let employee = null;
    let resolvedAuthorId = null;
    if (employeeId) {
      if (ObjectId.isValid(employeeId)) {
        employee = await db.collection("employees").findOne({
          _id: new ObjectId(employeeId),
        });
        resolvedAuthorId = employee?._id || new ObjectId(employeeId);
      } else {
        // Try lookup by business employeeId
        employee = await db.collection("employees").findOne({ employeeId });
        resolvedAuthorId = employee?._id || null;
      }
    }

    // Extract employee name using multiple possible field structures
    let employeeName = formUserName || "Unknown";
    if (employee) {
      employeeName =
        employee.personalDetails?.name ||
        employee.name ||
        employee.personalDetails?.fullName ||
        employee.fullName ||
        (employee.personalDetails?.firstName &&
        employee.personalDetails?.lastName
          ? `${employee.personalDetails.firstName} ${employee.personalDetails.lastName}`
          : null) ||
        (employee.firstName && employee.lastName
          ? `${employee.firstName} ${employee.lastName}`
          : null) ||
        "Unknown";
    }

    // Create attachment record
    const newAttachment = {
      _id: new ObjectId(),
      originalName: file.name,
      fileName: fileName,
      filePath: `/uploads/task-attachments/${fileName}`,
      mimeType: file.type,
      size: file.size,
      ...(resolvedAuthorId
        ? { uploadedBy: new ObjectId(resolvedAuthorId) }
        : {}),
      uploadedByName: employeeName,
      uploadedAt: new Date(),
    };

    // Add attachment to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { attachments: newAttachment },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create audit log
    await createAuditLog({
      action: "UPLOAD_ATTACHMENT",
      entityType: "task",
      entityId: id,
      userId: resolvedAuthorId ? resolvedAuthorId.toString() : null,
      userEmail: "employee@company.com", // TODO: Get from auth context
      metadata: {
        taskTitle: task.title,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      attachment: newAttachment,
    });
  } catch (error) {
    console.error("Error uploading task attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload task attachment" },
      { status: 500 }
    );
  }
}
