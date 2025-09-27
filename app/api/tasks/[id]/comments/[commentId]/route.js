import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { ObjectId } from "mongodb";

// Update a comment
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id, commentId } = await params;
    const data = await request.json();

    if (!ObjectId.isValid(id) || !ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { error: "Invalid task or comment ID" },
        { status: 400 }
      );
    }

    const { content, userId } = data;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
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

    // Find the comment
    const comment = task.comments?.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user has permission to edit (same user or admin)
    if (comment.userId && comment.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update the comment
    const result = await db.collection("tasks").updateOne(
      {
        _id: new ObjectId(id),
        "comments._id": new ObjectId(commentId),
      },
      {
        $set: {
          "comments.$.content": content.trim(),
          "comments.$.updatedAt": new Date(),
          "comments.$.isEdited": true,
          updatedAt: new Date(),
        },
        $push: {
          activityLog: {
            action: "comment_updated",
            userId: userId ? new ObjectId(userId) : null,
            timestamp: new Date(),
            details: `Comment updated: "${content.substring(0, 50)}${
              content.length > 50 ? "..." : ""
            }"`,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// Delete a comment
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id, commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!ObjectId.isValid(id) || !ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { error: "Invalid task or comment ID" },
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

    // Find the comment
    const comment = task.comments?.find((c) => c._id.toString() === commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if user has permission to delete (same user or admin)
    if (comment.userId && comment.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Remove the comment
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { comments: { _id: new ObjectId(commentId) } },
        $set: { updatedAt: new Date() },
        $push: {
          activityLog: {
            action: "comment_deleted",
            userId: userId ? new ObjectId(userId) : null,
            timestamp: new Date(),
            details: "Comment deleted",
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

