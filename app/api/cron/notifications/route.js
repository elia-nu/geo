import { NextResponse } from "next/server";
import cron from "node-cron";

let cronJob = null;

// API endpoint to start/stop the notification cron job
export async function POST(request) {
  try {
    const { action } = await request.json();

    if (action === "start") {
      if (cronJob) {
        return NextResponse.json({ message: "Cron job is already running" });
      }

      // Schedule to run daily at 9:00 AM
      cronJob = cron.schedule("0 9 * * *", async () => {
        console.log("Running scheduled document expiry notifications...");

        try {
          // Call the email notification endpoint
          const response = await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/notifications/email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.log("Scheduled notifications sent:", result);
          } else {
            console.error("Failed to send scheduled notifications");
          }
        } catch (error) {
          console.error("Error in scheduled notification task:", error);
        }
      });

      cronJob.start();

      return NextResponse.json({
        message: "Notification cron job started - will run daily at 9:00 AM",
        schedule: "0 9 * * *",
      });
    } else if (action === "stop") {
      if (cronJob) {
        cronJob.destroy();
        cronJob = null;
        return NextResponse.json({ message: "Notification cron job stopped" });
      } else {
        return NextResponse.json({
          message: "No cron job is currently running",
        });
      }
    } else if (action === "status") {
      return NextResponse.json({
        running: cronJob !== null,
        schedule: cronJob ? "Daily at 9:00 AM" : null,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'start', 'stop', or 'status'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error managing cron job:", error);
    return NextResponse.json(
      { error: "Failed to manage notification cron job" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    running: cronJob !== null,
    schedule: cronJob ? "Daily at 9:00 AM" : null,
    message:
      "Use POST with action: 'start', 'stop', or 'status' to manage the cron job",
  });
}
