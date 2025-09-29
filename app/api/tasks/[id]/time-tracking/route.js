import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";

// Get time entries for a task
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    // Fetch task with time entries and user details
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      { $unwind: { path: "$timeEntries", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "timeEntries.userId",
          foreignField: "_id",
          as: "timeEntries.user",
        },
      },
      {
        $addFields: {
          "timeEntries.user": { $arrayElemAt: ["$timeEntries.user", 0] },
        },
      },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          estimatedHours: { $first: "$estimatedHours" },
          actualHours: { $first: "$actualHours" },
          timeEntries: { $push: "$timeEntries" },
        },
      },
      {
        $addFields: {
          timeEntries: {
            $filter: {
              input: "$timeEntries",
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
    const timeEntries = task.timeEntries.map((entry) => ({
      _id: entry._id,
      userId: entry.userId,
      userName:
        entry.user?.personalDetails?.name || entry.user?.name || "Unknown User",
      description: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      date: entry.date,
      createdAt: entry.createdAt,
    }));

    const totalLoggedHours = timeEntries.reduce(
      (sum, entry) => sum + entry.duration,
      0
    );

    return NextResponse.json({
      success: true,
      timeTracking: {
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0,
        totalLoggedHours,
        timeEntries: timeEntries.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching task time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch task time entries" },
      { status: 500 }
    );
  }
}

// Add a time entry to a task
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { userId, description, startTime, endTime, duration, date } = data;

    if (!userId || (!duration && (!startTime || !endTime))) {
      return NextResponse.json(
        { error: "User ID and either duration or start/end time are required" },
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

    // Calculate duration if not provided
    let calculatedDuration = duration;
    if (!duration && startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = (end - start) / (1000 * 60 * 60); // Convert to hours
    }

    // Create time entry object
    const timeEntry = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      description: description || "",
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      duration: calculatedDuration,
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    };

    // Update task with time entry and recalculate actual hours
    const currentActualHours = task.actualHours || 0;
    const newActualHours = currentActualHours + calculatedDuration;

    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          timeEntries: timeEntry,
          activityLog: {
            action: "time_logged",
            userId: new ObjectId(userId),
            timestamp: new Date(),
            details: `Logged ${calculatedDuration} hours${
              description ? ": " + description : ""
            }`,
          },
        },
        $set: {
          actualHours: newActualHours,
          updatedAt: new Date(),
        },
      }
    );

    // Create audit log
    await createAuditLog({
      action: "LOG_TASK_TIME",
      entityType: "task",
      entityId: id,
      userId: userId,
      userEmail: "user@company.com",
      metadata: {
        taskTitle: task.title,
        hoursLogged: calculatedDuration,
        totalActualHours: newActualHours,
        description: description || "No description",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Time entry added successfully",
      timeEntry: {
        _id: timeEntry._id,
        duration: timeEntry.duration,
        description: timeEntry.description,
        date: timeEntry.date,
        createdAt: timeEntry.createdAt,
      },
      newActualHours,
    });
  } catch (error) {
    console.error("Error adding task time entry:", error);
    return NextResponse.json(
      { error: "Failed to add time entry" },
      { status: 500 }
    );
  }
}

// Update a time entry
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const { timeEntryId, description, startTime, endTime, duration, date } =
      data;

    if (!timeEntryId || !ObjectId.isValid(timeEntryId)) {
      return NextResponse.json(
        { error: "Valid time entry ID is required" },
        { status: 400 }
      );
    }

    // Get current task and time entry
    const task = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const timeEntry = task.timeEntries?.find(
      (entry) => entry._id.toString() === timeEntryId
    );

    if (!timeEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Calculate new duration if needed
    let newDuration = duration !== undefined ? duration : timeEntry.duration;
    if (startTime && endTime && duration === undefined) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      newDuration = (end - start) / (1000 * 60 * 60);
    }

    // Calculate difference in actual hours
    const hoursDifference = newDuration - timeEntry.duration;
    const newActualHours = (task.actualHours || 0) + hoursDifference;

    // Update the time entry
    const updateFields = {};
    if (description !== undefined)
      updateFields["timeEntries.$.description"] = description;
    if (startTime !== undefined)
      updateFields["timeEntries.$.startTime"] = new Date(startTime);
    if (endTime !== undefined)
      updateFields["timeEntries.$.endTime"] = new Date(endTime);
    if (newDuration !== timeEntry.duration)
      updateFields["timeEntries.$.duration"] = newDuration;
    if (date !== undefined) updateFields["timeEntries.$.date"] = new Date(date);

    updateFields["actualHours"] = newActualHours;
    updateFields["updatedAt"] = new Date();

    const result = await db.collection("tasks").updateOne(
      {
        _id: new ObjectId(id),
        "timeEntries._id": new ObjectId(timeEntryId),
      },
      {
        $set: updateFields,
        $push: {
          activityLog: {
            action: "time_entry_updated",
            userId: timeEntry.userId,
            timestamp: new Date(),
            details: `Time entry updated (${newDuration} hours)`,
          },
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Time entry updated successfully",
      newActualHours,
    });
  } catch (error) {
    console.error("Error updating task time entry:", error);
    return NextResponse.json(
      { error: "Failed to update time entry" },
      { status: 500 }
    );
  }
}
