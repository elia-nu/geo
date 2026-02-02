import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { sendContractExpiryEmail } from "../../../utils/email";
import { ObjectId } from "mongodb";

/**
 * Check for expiring contracts and send notifications
 * This endpoint checks for contracts expiring in 13-15 days (2 weeks window)
 * Query params: ?force=true to send notifications regardless of date (for testing)
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true"; // Force send for testing
    
    const db = await getDb();

    // Calculate date 14 days from now (2 weeks before expiry)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    twoWeeksFromNow.setHours(23, 59, 59, 999);

    // Also check for contracts that have already expired (within last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    console.log("Checking for expiring contracts...");
    console.log("Two weeks from now:", twoWeeksFromNow.toISOString());
    console.log("Seven days ago:", sevenDaysAgo.toISOString());

    // Find employees with contractual employment type and contract expiry dates
    // Using $and to properly combine conditions
    const employees = await db
      .collection("employees")
      .find({
        $and: [
          {
            $or: [
              { "personalDetails.employeeType": "Contractual" },
              { employeeType: "Contractual" },
            ],
          },
          {
            $or: [
              { "personalDetails.contractExpiryDate": { $exists: true, $ne: null, $ne: "" } },
              { contractExpiryDate: { $exists: true, $ne: null, $ne: "" } },
            ],
          },
        ],
      })
      .toArray();

    console.log(`Found ${employees.length} contractual employees`);
    
    // Log employee details for debugging
    if (employees.length > 0) {
      console.log("Contractual employees found:");
      employees.forEach((emp) => {
        const expiryDate = emp.personalDetails?.contractExpiryDate || emp.contractExpiryDate;
        const employeeType = emp.personalDetails?.employeeType || emp.employeeType;
        console.log(`  - ${emp.personalDetails?.name || emp.name}: Type=${employeeType}, Expiry=${expiryDate}`);
      });
    }

    if (employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No contractual employees found",
        sent: 0,
        failed: 0,
      });
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    const notifications = [];

    for (const employee of employees) {
      try {
        // Get contract expiry date from either structure
        const contractExpiryDate =
          employee.personalDetails?.contractExpiryDate ||
          employee.contractExpiryDate;

        if (!contractExpiryDate) {
          console.warn(
            `No contract expiry date found for employee: ${employee._id}`
          );
          continue;
        }

        const expiryDate = new Date(contractExpiryDate);
        expiryDate.setHours(0, 0, 0, 0);

        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        console.log(
          `Employee ${employee.personalDetails?.name || employee.name}: Contract expires in ${daysUntilExpiry} days (${contractExpiryDate})`
        );

        // Only send notification if:
        // 1. Contract expires in 13-15 days (2 weeks window for flexibility)
        // 2. Contract has expired within the last 7 days
        // 3. Contract expires today or within next 7 days (for testing)
        // 4. Force mode enabled (for testing)
        const shouldNotify = force || 
          (daysUntilExpiry >= 13 && daysUntilExpiry <= 15) ||
          (daysUntilExpiry <= 0 && daysUntilExpiry >= -7) ||
          (daysUntilExpiry >= 0 && daysUntilExpiry <= 7);

        if (!shouldNotify) {
          console.log(
            `Skipping employee ${employee._id}: ${daysUntilExpiry} days until expiry (not in notification window)`
          );
          continue;
        }
        
        if (force) {
          console.log(
            `Force mode: Sending notification for employee ${employee._id} (${daysUntilExpiry} days until expiry)`
          );
        }

        // Check if notification was already sent for this employee and expiry date (only if not in force mode)
        if (!force) {
          const existingNotification = await db
            .collection("notifications")
            .findOne({
              $or: [
                { userId: employee._id },
                { employeeId: employee._id.toString() },
              ],
              type: "contract_expiry",
              "metadata.daysUntilExpiry": daysUntilExpiry,
              "metadata.expiryDate": contractExpiryDate,
              createdAt: {
                $gte: new Date(today.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            });

          if (existingNotification) {
            console.log(
              `Notification already sent for employee ${employee._id} for ${daysUntilExpiry} days`
            );
            continue;
          }
        }

        // Send email notification
        console.log(
          `Attempting to send email to ${employee.personalDetails?.email || employee.email} for contract expiry`
        );
        const emailSent = await sendContractExpiryEmail(
          employee,
          daysUntilExpiry
        );

        console.log(
          `Email send result for ${employee.personalDetails?.name || employee.name}: ${emailSent}`
        );

        // Create notification for employee dashboard (regardless of email success)
        const employeeNotification = {
          _id: new ObjectId(),
          userId: employee._id, // Use ObjectId for userId to match employee notifications API
          employeeId: employee._id.toString(), // Also keep as string for reference
          type: "contract_expiry",
          title: daysUntilExpiry <= 0
            ? "Contract Expired"
            : `Contract Expiring in ${daysUntilExpiry} Days`,
          message: daysUntilExpiry <= 0
            ? `Your employment contract expired on ${expiryDate.toLocaleDateString()}. Please contact HR immediately.`
            : `Your employment contract will expire on ${expiryDate.toLocaleDateString()} (${daysUntilExpiry} days remaining). Please contact HR to discuss renewal.`,
          actionUrl: "/employee-portal",
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            expiryDate: contractExpiryDate,
            daysUntilExpiry: daysUntilExpiry,
            employeeType: "Contractual",
          },
        };

        try {
          await db.collection("notifications").insertOne(employeeNotification);
          console.log(
            `✅ Notification created for employee ${employee.personalDetails?.name || employee.name}`
          );
        } catch (notifError) {
          console.error(
            `❌ Failed to create notification for employee ${employee._id}:`,
            notifError
          );
        }

        if (emailSent) {
          emailsSent++;

          // Create notification for admin dashboard
          const adminNotification = {
            _id: new ObjectId(),
            type: "contract_expiry_admin",
            title: daysUntilExpiry <= 0
              ? `Contract Expired: ${employee.personalDetails?.name || employee.name}`
              : `Contract Expiring: ${employee.personalDetails?.name || employee.name}`,
            message: daysUntilExpiry <= 0
              ? `Employee ${employee.personalDetails?.name || employee.name} (${employee.personalDetails?.email || employee.email}) contract expired on ${expiryDate.toLocaleDateString()}.`
              : `Employee ${employee.personalDetails?.name || employee.name} (${employee.personalDetails?.email || employee.email}) contract expires on ${expiryDate.toLocaleDateString()} (${daysUntilExpiry} days remaining).`,
            actionUrl: `/hrm?section=employees`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              employeeId: employee._id.toString(),
              employeeName: employee.personalDetails?.name || employee.name,
              employeeEmail: employee.personalDetails?.email || employee.email,
              expiryDate: contractExpiryDate,
              daysUntilExpiry: daysUntilExpiry,
              employeeType: "Contractual",
            },
          };

          await db.collection("notifications").insertOne(adminNotification);

          notifications.push({
            employeeName: employee.personalDetails?.name || employee.name,
            employeeEmail: employee.personalDetails?.email || employee.email,
            expiryDate: contractExpiryDate,
            daysUntilExpiry: daysUntilExpiry,
            status: "sent",
          });

          console.log(
            `✅ Notification sent for employee ${employee.personalDetails?.name || employee.name}: ${daysUntilExpiry} days until expiry`
          );
        } else {
          emailsFailed++;

          // Log failed notification
          await db.collection("notifications").insertOne({
            employeeId: employee._id.toString(),
            type: "contract_expiry",
            title: "Failed to send contract expiry notification",
            message: `Failed to send contract expiry notification for ${employee.personalDetails?.name || employee.name}`,
            createdAt: new Date(),
            status: "failed",
            metadata: {
              expiryDate: contractExpiryDate,
              daysUntilExpiry: daysUntilExpiry,
            },
          });

          notifications.push({
            employeeName: employee.personalDetails?.name || employee.name,
            employeeEmail: employee.personalDetails?.email || employee.email,
            expiryDate: contractExpiryDate,
            daysUntilExpiry: daysUntilExpiry,
            status: "failed",
          });

          console.error(
            `❌ Failed to send notification for employee ${employee.personalDetails?.name || employee.name}`
          );
        }
      } catch (error) {
        console.error(
          `Error processing employee ${employee._id}:`,
          error
        );
        emailsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Contract expiry notifications processed. Sent: ${emailsSent}, Failed: ${emailsFailed}`,
      sent: emailsSent,
      failed: emailsFailed,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Error in contract expiry notification endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process contract expiry notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check contract expiry status
 */
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "14");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(23, 59, 59, 999);

    const employees = await db
      .collection("employees")
      .find({
        $or: [
          { "personalDetails.employeeType": "Contractual" },
          { employeeType: "Contractual" },
        ],
        $or: [
          { "personalDetails.contractExpiryDate": { $exists: true, $ne: null } },
          { contractExpiryDate: { $exists: true, $ne: null } },
        ],
      })
      .toArray();

    const expiringContracts = [];

    for (const employee of employees) {
      const contractExpiryDate =
        employee.personalDetails?.contractExpiryDate ||
        employee.contractExpiryDate;

      if (!contractExpiryDate) continue;

      const expiryDate = new Date(contractExpiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= days && daysUntilExpiry >= -7) {
        expiringContracts.push({
          employeeId: employee._id.toString(),
          employeeName: employee.personalDetails?.name || employee.name,
          employeeEmail: employee.personalDetails?.email || employee.email,
          expiryDate: contractExpiryDate,
          daysUntilExpiry: daysUntilExpiry,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: expiringContracts.length,
      contracts: expiringContracts,
    });
  } catch (error) {
    console.error("Error fetching contract expiry status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch contract expiry status",
      },
      { status: 500 }
    );
  }
}

