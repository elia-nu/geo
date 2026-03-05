import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Get notifications for an employee (tasks and projects)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const type = searchParams.get("type"); // task_assignment, project_assignment, all
    const status = searchParams.get("status"); // unread, read, all
    const limit = parseInt(searchParams.get("limit")) || 50;

    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { error: "Valid employee ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Build query - check both userId (ObjectId) and employeeId (string) for compatibility
    let query = {
      $or: [
        { userId: new ObjectId(employeeId) },
        { employeeId: employeeId },
      ],
    };
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") {
      query.isRead = status === "read";
    }

    const notifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Get related task and project details
    const taskIds = notifications
      .filter((n) => n.taskId)
      .map((n) => n.taskId)
      .filter(Boolean);
    const projectIds = notifications
      .filter((n) => n.projectId)
      .map((n) => n.projectId)
      .filter(Boolean);

    const [tasks, projects] = await Promise.all([
      taskIds.length > 0
        ? db
            .collection("tasks")
            .find({ _id: { $in: taskIds } })
            .project({ _id: 1, title: 1, status: 1, priority: 1 })
            .toArray()
        : [],
      projectIds.length > 0
        ? db
            .collection("projects")
            .find({ _id: { $in: projectIds } })
            .project({ _id: 1, name: 1, status: 1 })
            .toArray()
        : [],
    ]);

    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));
    const projectMap = new Map(
      projects.map((project) => [project._id.toString(), project])
    );

    // Enrich notifications with task and project details
    const enrichedNotifications = notifications.map((notification) => ({
      ...notification,
      task: notification.taskId
        ? taskMap.get(notification.taskId.toString())
        : null,
      project: notification.projectId
        ? projectMap.get(notification.projectId.toString())
        : null,
    }));

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching employee notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PUT(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { notificationIds, employeeId, markAllAsRead = false } = data;

    if (!employeeId || !ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { error: "Valid employee ID is required" },
        { status: 400 }
      );
    }

    // Build query - check both userId (ObjectId) and employeeId (string) for compatibility
    let query = {
      $or: [
        { userId: new ObjectId(employeeId) },
        { employeeId: employeeId },
      ],
    };

    if (markAllAsRead) {
      // Mark all notifications as read for this employee
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

    const result = await db.collection("notifications").updateMany(query, {
      $set: {
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}

