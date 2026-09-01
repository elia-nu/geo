import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get all comments for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

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

    // Return comments with author details
    const rawComments = task.comments || [];

    // Deduplicate comments from database by ID and by author+content+timestamp
    const seenCommentKeys = new Set();
    const comments = [];
    for (const c of rawComments) {
      const idKey = c._id ? String(c._id) : null;
      const timeBucket = c.createdAt ? Math.floor(new Date(c.createdAt).getTime() / 10000) : "0";
      const signatureKey = `${c.userId || c.authorId || c.userName || ""}_${c.content || ""}_${timeBucket}`;
      if (idKey && seenCommentKeys.has(idKey)) continue;
      if (seenCommentKeys.has(signatureKey)) continue;
      if (idKey) seenCommentKeys.add(idKey);
      seenCommentKeys.add(signatureKey);
      comments.push(c);
    }

    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        // Determine the employee ID to look up
        const employeeId = comment.userId || comment.authorId;
        let authorName = comment.userName || "Unknown";
        let userEmail = comment.userEmail || "";

        // If we have an employee ID but no userName, fetch the employee
        if (employeeId && !comment.userName) {
          const author = await db.collection("employees").findOne({
            _id: new ObjectId(employeeId),
          });

          console.log("Comment employee lookup:", {
            commentId: comment._id,
            employeeId: employeeId,
            employeeFound: !!author,
            employeeName: author?.personalDetails?.name || author?.name,
            employeeStructure: author ? Object.keys(author) : null,
          });

          // Extract name using multiple possible field structures
          if (author) {
            authorName =
              author.personalDetails?.name ||
              author.name ||
              author.personalDetails?.fullName ||
              author.fullName ||
              (author.personalDetails?.firstName &&
              author.personalDetails?.lastName
                ? `${author.personalDetails.firstName} ${author.personalDetails.lastName}`
                : null) ||
              (author.firstName && author.lastName
                ? `${author.firstName} ${author.lastName}`
                : null) ||
              "Unknown";

            userEmail = author.personalDetails?.email || author.email || "";
          }
        }

        // Return consistent structure for all comments
        return {
          ...comment,
          userId: employeeId?.toString() || null,
          userName: authorName,
          userEmail: userEmail,
          isEdited: comment.isEdited || false,
          mentions: comment.mentions || [],
          attachments: comment.attachments || [],
          // Keep the old structure for backward compatibility
          author: employeeId
            ? {
                _id: employeeId,
                name: authorName,
                email: userEmail,
              }
            : null,
        };
      })
    );

    // Newest comments first
    commentsWithAuthors.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return NextResponse.json({
      success: true,
      comments: commentsWithAuthors,
    });
  } catch (error) {
    console.error("Error fetching task comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch task comments" },
      { status: 500 }
    );
  }
}

// Add a new comment to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { content, type = "comment" } = data;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
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

    // Get employee ID from request headers (passed from frontend)
    const employeeId = request.headers.get("x-employee-id");
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    // Get employee details (accept both Mongo _id and business employeeId)
    let author = null;
    let resolvedAuthorId = null;
    if (ObjectId.isValid(employeeId)) {
      author = await db.collection("employees").findOne({
        _id: new ObjectId(employeeId),
      });
      resolvedAuthorId = author?._id || new ObjectId(employeeId);
    } else {
      // Try lookup by business employeeId field
      author = await db.collection("employees").findOne({ employeeId });
      resolvedAuthorId = author?._id || null;
    }

    // Extract name using multiple possible field structures
    let authorName = data.userName || "Unknown";
    let authorEmail = data.userEmail || "";
    if (author) {
      authorName =
        author.personalDetails?.name ||
        author.name ||
        author.personalDetails?.fullName ||
        author.fullName ||
        (author.personalDetails?.firstName && author.personalDetails?.lastName
          ? `${author.personalDetails.firstName} ${author.personalDetails.lastName}`
          : null) ||
        (author.firstName && author.lastName
          ? `${author.firstName} ${author.lastName}`
          : null) ||
        authorName;

      authorEmail =
        author.personalDetails?.email || author.email || authorEmail;
    }

    const targetUserId = resolvedAuthorId ? resolvedAuthorId.toString() : employeeId;

    // Check for recent duplicate comment (within last 15 seconds with same author and same content)
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    const existingDuplicate = (task.comments || []).find((c) => {
      const isSameContent = (c.content || "").trim() === content.trim();
      const isSameAuthor =
        String(c.userId || "") === String(targetUserId) ||
        String(c.authorId || "") === String(resolvedAuthorId || "") ||
        (c.userName && c.userName === authorName);
      const isRecent = c.createdAt && new Date(c.createdAt) >= fifteenSecondsAgo;
      return isSameContent && isSameAuthor && isRecent;
    });

    if (existingDuplicate) {
      const existingWithAuthor = {
        ...existingDuplicate,
        userId: targetUserId,
        userName: authorName,
        userEmail: authorEmail,
        author: author
          ? {
              _id: author._id,
              name: authorName,
              email: authorEmail,
            }
          : null,
      };

      return NextResponse.json({
        success: true,
        message: "Comment already posted",
        comment: existingWithAuthor,
      });
    }

    // Create new comment with user information included
    const newComment = {
      _id: new ObjectId(),
      content: content.trim(),
      type,
      authorId: resolvedAuthorId,
      userId: targetUserId,
      userName: authorName,
      userEmail: authorEmail,
      isEdited: false,
      mentions: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add comment to task
    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { comments: newComment },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    console.log("Comment created with user info:", {
      employeeId,
      authorId: newComment.authorId,
      authorFound: !!author,
      authorName: newComment.userName,
      authorEmail: newComment.userEmail,
    });

    // Return the comment with all user information already included
    const commentWithAuthor = {
      ...newComment,
      // Keep the old structure for backward compatibility
      author: author
        ? {
            _id: author._id,
            name: newComment.userName,
            email: newComment.userEmail,
          }
        : null,
    };

    // Create audit log
    await createAuditLog({
      action: "ADD_COMMENT",
      entityType: "task",
      entityId: id,
      userId: newComment.userId,
      userEmail: commentWithAuthor.author?.email || "employee@company.com",
      metadata: {
        taskTitle: task.title,
        commentType: type,
        commentLength: content.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Comment added successfully",
      comment: commentWithAuthor,
    });
  } catch (error) {
    console.error("Error adding task comment:", error);
    return NextResponse.json(
      { error: "Failed to add task comment" },
      { status: 500 }
    );
  }
}
