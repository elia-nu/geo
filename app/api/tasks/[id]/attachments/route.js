import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Get all attachments for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Fetch task attachments
    const task = await db
      .collection("tasks")
      .findOne(
        { _id: new ObjectId(id) },
        { projection: { attachments: 1, title: 1 } }
      );

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      attachments: task.attachments || [],
    });
  } catch (error) {
    console.error("Error fetching task attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch task attachments" },
      { status: 500 }
    );
  }
}

// Upload attachments to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files");
    const uploadedBy = formData.get("uploadedBy");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!uploadedBy || !ObjectId.isValid(uploadedBy)) {
      return NextResponse.json(
        { error: "Valid uploadedBy user ID is required" },
        { status: 400 }
      );
    }

    const uploadedAttachments = [];
    const uploadDir = path.join(process.cwd(), "uploads", "task-attachments");

    // Ensure upload directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.log("Upload directory already exists or created");
    }

    // Process each file
    for (const file of files) {
      if (file.size === 0) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.name);
      const filename = `${id}_${timestamp}_${randomString}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);

      // Write file to disk
      await writeFile(filePath, buffer);

      // Create attachment object
      const attachment = {
        _id: new ObjectId(),
        filename,
        originalName: file.name,
        mimetype: file.type,
        size: file.size,
        uploadedBy: new ObjectId(uploadedBy),
        uploadedAt: new Date(),
        filePath: `uploads/task-attachments/${filename}`,
      };

      uploadedAttachments.push(attachment);
    }

    // Add attachments to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          attachments: { $each: uploadedAttachments },
          activityLog: {
            action: "attachments_added",
            userId: new ObjectId(uploadedBy),
            timestamp: new Date(),
            details: `${
              uploadedAttachments.length
            } file(s) uploaded: ${uploadedAttachments
              .map((a) => a.originalName)
              .join(", ")}`,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "UPLOAD_TASK_ATTACHMENTS",
      entityType: "task",
      entityId: id,
      userId: uploadedBy,
      userEmail: "user@company.com",
      metadata: {
        taskTitle: task.title,
        filesCount: uploadedAttachments.length,
        totalSize: uploadedAttachments.reduce((sum, att) => sum + att.size, 0),
        filenames: uploadedAttachments.map((att) => att.originalName),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${uploadedAttachments.length} file(s) uploaded successfully`,
      attachments: uploadedAttachments.map((att) => ({
        _id: att._id,
        filename: att.filename,
        originalName: att.originalName,
        mimetype: att.mimetype,
        size: att.size,
        uploadedAt: att.uploadedAt,
      })),
    });
  } catch (error) {
    console.error("Error uploading task attachments:", error);
    return NextResponse.json(
      { error: "Failed to upload attachments" },
      { status: 500 }
    );
  }
}

// Delete an attachment from a task
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get("attachmentId");

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid task ID or attachment ID" },
        { status: 400 }
      );
    }

    // Remove attachment from task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { attachments: { _id: new ObjectId(attachmentId) } },
        $push: {
          activityLog: {
            action: "attachment_removed",
            userId: null, // TODO: Get from auth context
            timestamp: new Date(),
            details: "Attachment removed",
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // TODO: Delete physical file from disk

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
