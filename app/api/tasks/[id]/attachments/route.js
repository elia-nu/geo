import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Get all attachments for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

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
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// Upload a new attachment to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const formData = await request.formData();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const file = formData.get("file");
    const userId = formData.get("userId");
    const userName = formData.get("userName");
    const description = formData.get("description") || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
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

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create attachment record
    const attachment = {
      _id: new ObjectId(),
      originalName: file.name,
      fileName: fileName,
      filePath: `/uploads/task-attachments/${fileName}`,
      fileSize: file.size,
      fileType: file.type,
      description: description.trim(),
      uploadedBy:
        userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null,
      uploadedByName: userName || "Unknown",
      uploadedAt: new Date(),
      downloadCount: 0,
      isDeleted: false,
    };

    // First, ensure attachments array exists
    await db
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(id), attachments: { $exists: false } },
        { $set: { attachments: [] } }
      );

    // Add attachment to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { updatedAt: new Date() },
        $push: {
          attachments: attachment,
          activityLog: {
            action: "attachment_added",
            userId: attachment.uploadedBy,
            timestamp: new Date(),
            details: `File uploaded: ${file.name}`,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to add attachment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      attachment: attachment,
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
