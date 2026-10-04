import { NextResponse } from "next/server";
import cron from "node-cron";

let cronJob = null;

async function executeExpiryNotifications(baseUrl) {
  const origin = baseUrl || process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://localhost:3000";
  const results = {
    projectDocs: null,
    documents: null,
    contracts: null,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Call document expiry notification endpoint
    try {
      const docResponse = await fetch(`${origin}/api/notifications/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (docResponse.ok) {
        results.documents = await docResponse.json();
        console.log("Document expiry notifications sent:", results.documents);
      } else {
        results.documents = { error: `HTTP ${docResponse.status}` };
      }
    } catch (e) {
      results.documents = { error: e.message };
    }

    // 2. Call contract expiry notification endpoint
    try {
      const contractResponse = await fetch(`${origin}/api/notifications/contract-expiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (contractResponse.ok) {
        results.contracts = await contractResponse.json();
        console.log("Contract expiry notifications sent:", results.contracts);
      } else {
        results.contracts = { error: `HTTP ${contractResponse.status}` };
      }
    } catch (e) {
      results.contracts = { error: e.message };
    }

    // 3. Call project contractor document expiry notification endpoint
    try {
      const projectDocResponse = await fetch(`${origin}/api/notifications/project-documents-expiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (projectDocResponse.ok) {
        results.projectDocs = await projectDocResponse.json();
        console.log("Project doc notifications sent:", results.projectDocs);
      } else {
        results.projectDocs = { error: `HTTP ${projectDocResponse.status}` };
      }
    } catch (e) {
      results.projectDocs = { error: e.message };
    }

    return results;
  } catch (error) {
    console.error("Error in batch notification task:", error);
    return { error: error.message };
  }
}

// API endpoint to manage/run the notification cron job
export async function POST(request) {
  try {
    const { action } = await request.json().catch(() => ({}));
    const origin = new URL(request.url).origin;

    if (action === "run" || action === "execute") {
      const results = await executeExpiryNotifications(origin);
      return NextResponse.json({
        success: true,
        message: "Notifications executed immediately",
        results,
      });
    }

    if (action === "start") {
      if (cronJob) {
        return NextResponse.json({
          message: "Cron job is already running",
          schedule: "0 9 * * * (Daily at 9:00 AM)",
          running: true,
        });
      }

      // Schedule to run daily at 9:00 AM
      cronJob = cron.schedule("0 9 * * *", async () => {
        console.log("Running scheduled notifications at 9:00 AM...");
        await executeExpiryNotifications(origin);
      });

      cronJob.start();

      return NextResponse.json({
        success: true,
        message: "Notification cron job started - will run daily at 9:00 AM",
        schedule: "0 9 * * *",
        running: true,
      });
    } else if (action === "stop") {
      if (cronJob) {
        cronJob.destroy();
        cronJob = null;
        return NextResponse.json({
          success: true,
          message: "Notification cron job stopped",
          running: false,
        });
      } else {
        return NextResponse.json({
          message: "No cron job is currently running",
          running: false,
        });
      }
    } else if (action === "status") {
      return NextResponse.json({
        running: cronJob !== null,
        schedule: cronJob ? "Daily at 9:00 AM (0 9 * * *)" : null,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'start', 'stop', 'status', or 'run'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error managing cron job:", error);
    return NextResponse.json(
      { error: "Failed to manage notification cron job", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const runNow = url.searchParams.get("run") === "true";

  if (runNow) {
    const results = await executeExpiryNotifications(url.origin);
    return NextResponse.json({
      success: true,
      message: "Notifications executed on-demand",
      results,
    });
  }

  return NextResponse.json({
    running: cronJob !== null,
    schedule: cronJob ? "Daily at 9:00 AM (0 9 * * *)" : null,
    message:
      "Use POST with action: 'start', 'stop', 'status', or 'run' (or GET ?run=true) to manage notifications",
  });
}
