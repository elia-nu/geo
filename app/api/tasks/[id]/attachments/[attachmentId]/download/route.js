import { NextResponse } from "next/server";
import { getDb } from "../../../../../mongo";
import { ObjectId } from "mongodb";
import { readFile } from "fs/promises";
import { join } from "path";

// Download a task attachment
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id, attachmentId } = params;

    // Validate ObjectIds
    if (!ObjectId.isValid(id) || !ObjectId.isValid(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid task or attachment ID" },
        { status: 400 }
      );
    }

    // Find the task
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Find the attachment
    const attachment = task.attachments?.find(
      (att) => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Read the file from disk
    const filePath = join(process.cwd(), "public", attachment.filePath);

    try {
      const fileBuffer = await readFile(filePath);

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": attachment.mimeType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${attachment.originalName}"`,
          "Content-Length": attachment.size.toString(),
        },
      });
    } catch (fileError) {
      console.error("Error reading file:", fileError);
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error downloading task attachment:", error);
    return NextResponse.json(
      { error: "Failed to download task attachment" },
      { status: 500 }
    );
  }
}
