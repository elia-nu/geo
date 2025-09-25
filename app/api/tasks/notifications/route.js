import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

// Get task notifications for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // assignment, deadline, comment, status_change
    const status = searchParams.get("status"); // unread, read, all
    const limit = parseInt(searchParams.get("limit")) || 50;

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Build query
    let query = { userId: new ObjectId(userId) };
    if (type) query.type = type;
    if (status && status !== "all") query.isRead = status === "read";

    const notifications = await db
      .collection("taskNotifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get related task details
    const taskIds = notifications.map((n) => n.taskId).filter(Boolean);
    const tasks = await db
      .collection("tasks")
      .find({ _id: { $in: taskIds } })
      .project({ _id: 1, title: 1, status: 1, priority: 1 })
      .toArray();

    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));

    // Enrich notifications with task details
    const enrichedNotifications = notifications.map((notification) => ({
      ...notification,
      task: taskMap.get(notification.taskId?.toString()),
    }));

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch (error) {
    console.error("Error fetching task notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Create task notifications
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      type, // assignment, deadline, comment, status_change, mention
      taskId,
      userIds, // array of user IDs to notify
      title,
      message,
      actionUrl,
      triggeredBy,
      metadata = {},
    } = data;

    if (
      !type ||
      !taskId ||
      !userIds ||
      !Array.isArray(userIds) ||
      userIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Type, task ID, and user IDs are required" },
        { status: 400 }
      );
    }

    // Validate task exists
    if (!ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate user IDs
    const validUserIds = userIds.filter((id) => ObjectId.isValid(id));
    if (validUserIds.length !== userIds.length) {
      return NextResponse.json(
        { error: "All user IDs must be valid ObjectIds" },
        { status: 400 }
      );
    }

    // Create notifications for each user
    const notifications = validUserIds.map((userId) => ({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      taskId: new ObjectId(taskId),
      type,
      title: title || generateNotificationTitle(type, task),
      message: message || generateNotificationMessage(type, task, metadata),
      actionUrl: actionUrl || `/tasks/${taskId}`,
      isRead: false,
      triggeredBy: triggeredBy ? new ObjectId(triggeredBy) : null,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Insert notifications
    const result = await db
      .collection("taskNotifications")
      .insertMany(notifications);

    // Create audit log
    await createAuditLog({
      action: "CREATE_TASK_NOTIFICATIONS",
      entityType: "task",
      entityId: taskId,
      userId: triggeredBy || "system",
      userEmail: "system@company.com",
      metadata: {
        taskTitle: task.title,
        notificationType: type,
        recipientCount: validUserIds.length,
        userIds: validUserIds,
      },
    });

    // TODO: Send push notifications, emails, etc.
    // await sendPushNotifications(notifications);
    // await sendEmailNotifications(notifications);

    return NextResponse.json({
      success: true,
      message: `${notifications.length} notifications created`,
      notificationIds: Object.values(result.insertedIds),
    });
  } catch (error) {
    console.error("Error creating task notifications:", error);
    return NextResponse.json(
      { error: "Failed to create notifications" },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { notificationIds, userId, markAllAsRead = false } = data;

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    let query = { userId: new ObjectId(userId) };

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      query.isRead = false;
    } else {
      // Mark specific notifications as read
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json(
          { error: "Notification IDs array is required" },
          { status: 400 }
        );
      }

      const validNotificationIds = notificationIds.filter((id) =>
        ObjectId.isValid(id)
      );
      if (validNotificationIds.length === 0) {
        return NextResponse.json(
          { error: "At least one valid notification ID is required" },
          { status: 400 }
        );
      }

      query._id = { $in: validNotificationIds.map((id) => new ObjectId(id)) };
    }

    const result = await db.collection("taskNotifications").updateMany(query, {
      $set: {
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

// Delete notifications
export async function DELETE(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const notificationId = searchParams.get("notificationId");
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    let query = { userId: new ObjectId(userId) };

    if (deleteAll) {
      // Delete all notifications for this user
      const result = await db.collection("taskNotifications").deleteMany(query);
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} notifications deleted`,
      });
    } else {
      // Delete specific notification
      if (!notificationId || !ObjectId.isValid(notificationId)) {
        return NextResponse.json(
          { error: "Valid notification ID is required" },
          { status: 400 }
        );
      }

      query._id = new ObjectId(notificationId);
      const result = await db.collection("taskNotifications").deleteOne(query);

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification deleted",
      });
    }
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}

// Helper functions
function generateNotificationTitle(type, task) {
  switch (type) {
    case "assignment":
      return `New Task Assigned: ${task.title}`;
    case "deadline":
      return `Task Due Soon: ${task.title}`;
    case "comment":
      return `New Comment on: ${task.title}`;
    case "status_change":
      return `Task Status Updated: ${task.title}`;
    case "mention":
      return `You were mentioned in: ${task.title}`;
    default:
      return `Task Update: ${task.title}`;
  }
}

function generateNotificationMessage(type, task, metadata) {
  switch (type) {
    case "assignment":
      return `You have been assigned to task "${task.title}"`;
    case "deadline":
      const daysUntilDue = metadata.daysUntilDue || 0;
      return `Task "${task.title}" is due ${
        daysUntilDue === 0 ? "today" : `in ${daysUntilDue} days`
      }`;
    case "comment":
      return `${metadata.commenterName || "Someone"} commented on task "${
        task.title
      }"`;
    case "status_change":
      return `Task "${task.title}" status changed from ${metadata.previousStatus} to ${metadata.newStatus}`;
    case "mention":
      return `${metadata.mentionerName || "Someone"} mentioned you in task "${
        task.title
      }"`;
    default:
      return `Task "${task.title}" has been updated`;
  }
}
