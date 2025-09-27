import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Get all comments for a task
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
        { projection: { comments: 1, title: 1 } }
      );

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Populate comment author details
    const commentsWithAuthors = await Promise.all(
      (task.comments || []).map(async (comment) => {
        if (comment.userId && ObjectId.isValid(comment.userId)) {
          const user = await db.collection("employees").findOne(
            { _id: new ObjectId(comment.userId) },
            {
              projection: {
                name: 1,
                "personalDetails.name": 1,
                "personalDetails.email": 1,
                email: 1,
              },
            }
          );

          return {
            ...comment,
            author: user
              ? {
                  name: user.personalDetails?.name || user.name || "Unknown",
                  email: user.personalDetails?.email || user.email || "",
                }
              : { name: "Unknown", email: "" },
          };
        }
        return {
          ...comment,
          author: { name: "System", email: "" },
        };
      })
    );

    return NextResponse.json({
      success: true,
      comments: commentsWithAuthors,
    });
  } catch (error) {
    console.error("Error fetching task comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// Add a new comment to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { content, userId, userName, userEmail } = data;

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

    const newComment = {
      _id: new ObjectId(),
      content: content.trim(),
      userId: userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null,
      userName: userName || "Unknown",
      userEmail: userEmail || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
      mentions: [], // For future @mention functionality
      attachments: [], // For comment-specific attachments
    };

    // First, ensure comments array exists
    await db
      .collection("tasks")
      .updateOne(
        { _id: new ObjectId(id), comments: { $exists: false } },
        { $set: { comments: [] } }
      );

    // Add comment to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          updatedAt: new Date(),
        },
        $push: {
          comments: newComment,
          activityLog: {
            action: "comment_added",
            userId: newComment.userId,
            timestamp: new Date(),
            details: `Comment added: "${content.substring(0, 50)}${
              content.length > 50 ? "..." : ""
            }"`,
          },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}
