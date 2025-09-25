import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Get all comments for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Fetch task with comments and user details
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "comments.userId",
          foreignField: "_id",
          as: "comments.user",
        },
      },
      {
        $addFields: {
          "comments.user": { $arrayElemAt: ["$comments.user", 0] },
        },
      },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          comments: { $push: "$comments" },
        },
      },
      {
        $addFields: {
          comments: {
            $filter: {
              input: "$comments",
              cond: { $ne: ["$$this", {}] },
            },
          },
        },
      },
    ];

    const result = await db.collection("tasks").aggregate(pipeline).toArray();

    if (result.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = result[0];
    const comments = task.comments.map((comment) => ({
      _id: comment._id,
      content: comment.content,
      userId: comment.userId,
      userName:
        comment.user?.personalDetails?.name ||
        comment.user?.name ||
        "Unknown User",
      userEmail:
        comment.user?.personalDetails?.email || comment.user?.email || "",
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      attachments: comment.attachments || [],
      mentions: comment.mentions || [],
    }));

    return NextResponse.json({
      success: true,
      comments: comments.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      ),
    });
  } catch (error) {
    console.error("Error fetching task comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch task comments" },
      { status: 500 }
    );
  }
}

// Add a comment to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { content, userId, attachments = [], mentions = [] } = data;

    if (!content || !userId) {
      return NextResponse.json(
        { error: "Content and user ID are required" },
        { status: 400 }
      );
    }

    // Validate user ID
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Check if task exists
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Process mentions
    const processedMentions = mentions.map((mentionId) =>
      typeof mentionId === "string" ? new ObjectId(mentionId) : mentionId
    );

    // Create comment object
    const comment = {
      _id: new ObjectId(),
      content,
      userId: new ObjectId(userId),
      attachments: attachments.map((attachment) => ({
        _id: new ObjectId(),
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimetype: attachment.mimetype,
        size: attachment.size,
        uploadedAt: new Date(),
      })),
      mentions: processedMentions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add comment to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          comments: comment,
          activityLog: {
            action: "comment_added",
            userId: new ObjectId(userId),
            timestamp: new Date(),
            details: `Comment added: ${content.substring(0, 100)}${
              content.length > 100 ? "..." : ""
            }`,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "ADD_TASK_COMMENT",
      entityType: "task",
      entityId: id,
      userId: userId,
      userEmail: "user@company.com",
      metadata: {
        taskTitle: task.title,
        commentPreview: content.substring(0, 100),
        mentionsCount: processedMentions.length,
        attachmentsCount: attachments.length,
      },
    });

    // TODO: Send notifications to mentioned users
    // TODO: Send notifications to task assignees

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      comment: {
        _id: comment._id,
        content: comment.content,
        userId: comment.userId,
        createdAt: comment.createdAt,
        attachments: comment.attachments,
        mentions: comment.mentions,
      },
    });
  } catch (error) {
    console.error("Error adding task comment:", error);
    return NextResponse.json(
      { error: "Failed to add task comment" },
      { status: 500 }
    );
  }
}
