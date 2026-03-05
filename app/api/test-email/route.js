import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { sendTaskAssignmentEmail } from "../../utils/email.js";

// Test endpoint to verify email configuration
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const taskId = searchParams.get("taskId");

    if (!employeeId || !taskId) {
      return NextResponse.json(
        {
          error: "employeeId and taskId are required",
          example: "/api/test-email?employeeId=xxx&taskId=xxx",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch employee
    const employee = await db
      .collection("employees")
      .findOne({ _id: new ObjectId(employeeId) });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Fetch task
    const task = await db
      .collection("tasks")
      .findOne({ _id: new ObjectId(taskId) });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch project
    const project = await db
      .collection("projects")
      .findOne({ _id: task.projectId });

    console.log("=== Testing Email Configuration ===");
    console.log("Environment variables:", {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? "***" : "NOT SET",
    });

    // Send test email
    const result = await sendTaskAssignmentEmail(employee, task, project);

    return NextResponse.json({
      success: result,
      message: result
        ? "Test email sent successfully. Check the employee's inbox."
        : "Failed to send test email. Check server logs for details.",
      employee: {
        id: employee._id,
        name: employee.personalDetails?.name || employee.name,
        email: employee.personalDetails?.email || employee.email,
      },
      task: {
        id: task._id,
        title: task.title,
      },
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

