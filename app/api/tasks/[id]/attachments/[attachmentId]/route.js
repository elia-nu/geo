import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";
import { unlink } from "fs/promises";
import { join } from "path";

// Delete an attachment
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id, attachmentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!ObjectId.isValid(id) || !ObjectId.isValid(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid task or attachment ID" },
        { status: 400 }
      );
    }

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Find the attachment
    const attachment = task.attachments?.find(
      (a) => a._id.toString() === attachmentId
    );
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to delete (same user or admin)
    if (attachment.uploadedBy && attachment.uploadedBy.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own attachments" },
        { status: 403 }
      );
    }

    // Delete the physical file
    try {
      const filePath = join(process.cwd(), "public", attachment.filePath);
      await unlink(filePath);
    } catch (fileError) {
      console.warn("Could not delete physical file:", fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Remove the attachment from task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { attachments: { _id: new ObjectId(attachmentId) } },
        $set: { updatedAt: new Date() },
        $push: {
          activityLog: {
            action: "attachment_deleted",
            userId: userId ? new ObjectId(userId) : null,
            timestamp: new Date(),
            details: `File deleted: ${attachment.originalName}`,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete attachment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

// Update attachment metadata (description, etc.)
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, attachmentId } = await params;
    const data = await request.json();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(attachmentId)) {
      return NextResponse.json(
        { error: "Invalid task or attachment ID" },
        { status: 400 }
      );
    }

    const { description, userId } = data;

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Find the attachment
    const attachment = task.attachments?.find(
      (a) => a._id.toString() === attachmentId
    );
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to update (same user or admin)
    if (attachment.uploadedBy && attachment.uploadedBy.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only update your own attachments" },
        { status: 403 }
      );
    }

    // Update the attachment
    const result = await db.collection("tasks").updateOne(
      {
        _id: new ObjectId(id),
        "attachments._id": new ObjectId(attachmentId),
      },
      {
        $set: {
          "attachments.$.description": description || "",
          "attachments.$.updatedAt": new Date(),
          updatedAt: new Date(),
        },
        $push: {
          activityLog: {
            action: "attachment_updated",
            userId: userId ? new ObjectId(userId) : null,
            timestamp: new Date(),
            details: `Attachment description updated: ${attachment.originalName}`,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update attachment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attachment updated successfully",
    });
  } catch (error) {
    console.error("Error updating attachment:", error);
    return NextResponse.json(
      { error: "Failed to update attachment" },
      { status: 500 }
    );
  }
}

