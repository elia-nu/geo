import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import nodemailer from "nodemailer";

// Email configuration - supports env vars and verified Gmail SMTP fallback
const emailConfig = {
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true" || false,
  auth: {
    user:
      process.env.EMAIL_USER || process.env.SMTP_USER || "bezaaa85@gmail.com",
    pass:
      process.env.EMAIL_PASSWORD ||
      process.env.SMTP_PASSWORD ||
      "tgkdfohrtchlqkym",
  },
};

const createTransporter = () => {
  try {
    return nodemailer.createTransport(emailConfig);
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return null;
  }
};

const sendExpiryNotification = async ({ recipientName, recipientEmail, document, daysUntilExpiry }) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  const subject = `Document Expiry Alert - ${document.title || document.originalName}`;
  const isExpired = daysUntilExpiry <= 0;
  const statusText = isExpired
    ? "has expired"
    : `expires in ${daysUntilExpiry} days`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${
          isExpired ? "#dc3545" : "#ffc107"
        }; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .alert-box { background: ${
          isExpired ? "#f8d7da" : "#fff3cd"
        }; border: 1px solid ${
    isExpired ? "#f5c6cb" : "#ffeaa7"
  }; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .document-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .footer { text-align: center; margin-top: 20px; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${
            isExpired ? "⚠️ Document Expired" : "🔔 Document Expiry Alert"
          }</h1>
        </div>
        <div class="content">
          <p>Dear ${recipientName},</p>
          
          <div class="alert-box">
            <strong>${
              isExpired ? "URGENT:" : "REMINDER:"
            }</strong> Your document "${document.title || document.originalName}" ${statusText}.
          </div>
          
          <div class="document-details">
            <h3>Document Details:</h3>
            <ul>
              <li><strong>Title:</strong> ${document.title || document.originalName}</li>
              <li><strong>Type:</strong> ${document.documentType || "Document"}</li>
              <li><strong>Expiry Date:</strong> ${new Date(
                document.expiryDate
              ).toLocaleDateString()}</li>
              <li><strong>Description:</strong> ${
                document.description || "N/A"
              }</li>
            </ul>
          </div>
          
          <p>
            ${
              isExpired
                ? "Please contact HR / Administrator immediately to renew or update this document to ensure compliance."
                : "Please take action to renew or update this document before it expires."
            }
          </p>
          
          <p>Best regards,<br>HR Management System</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the HR Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: emailConfig.auth.user,
    to: recipientEmail,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(
      `Failed to send email to ${recipientEmail}:`,
      error
    );
    return false;
  }
};

// API endpoint to send expiry notifications
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    const db = await getDb();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    // Find all documents with expiry date (supports both BSON Date and string ISO format)
    const allExpiringCandidates = await db
      .collection("documents")
      .find({
        $and: [
          { expiryDate: { $exists: true, $ne: null, $ne: "" } },
          {
            $or: [
              { expiryDate: { $lte: thirtyDaysFromNow } },
              { expiryDate: { $lte: thirtyDaysStr } },
            ],
          },
        ],
      })
      .toArray();

    if (allExpiringCandidates.length === 0) {
      return NextResponse.json({
        message: "No documents require expiry notifications",
        sent: 0,
        failed: 0,
        notifications: [],
      });
    }

    // Get all employees for fast lookup
    const employees = await db.collection("employees").find({}).toArray();
    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp;
    });

    let emailsSent = 0;
    let emailsFailed = 0;
    const notifications = [];

    for (const document of allExpiringCandidates) {
      // Determine recipient info: Employee or Client
      const employee = document.employeeId ? employeeMap[document.employeeId] : null;
      const recipientEmail =
        document.clientEmail ||
        document.email ||
        employee?.personalDetails?.email ||
        employee?.email;

      const recipientName =
        document.clientName ||
        employee?.personalDetails?.name ||
        employee?.name ||
        "Valued Contact";

      if (!recipientEmail) {
        console.warn(
          `No recipient email found for document: ${document.title || document._id}`
        );
        continue;
      }

      const expiryDate = new Date(document.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      // Only notify if expiring within 30 days or expired (up to 60 days overdue)
      // or if force mode is enabled
      const inNotificationRange = force || (daysUntilExpiry <= 30 && daysUntilExpiry >= -60);
      if (!inNotificationRange) {
        continue;
      }

      // 24-hour duplicate prevention check unless force mode is enabled
      if (!force) {
        const lastNotif = await db.collection("notifications").findOne({
          documentId: document._id,
          type: "document_expiry",
          status: "sent",
          sentAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (lastNotif) {
          console.log(
            `Document notification already sent within last 24h for: ${document.title}`
          );
          continue;
        }
      }

      const emailSent = await sendExpiryNotification({
        recipientName,
        recipientEmail,
        document,
        daysUntilExpiry,
      });

      if (emailSent) {
        emailsSent++;
        await db.collection("notifications").insertOne({
          employeeId: document.employeeId || null,
          documentId: document._id,
          type: "document_expiry",
          title: daysUntilExpiry <= 0 ? "Document Expired" : `Document Expiring in ${daysUntilExpiry} Days`,
          message: `Document "${document.title || document.originalName}" ${
            daysUntilExpiry <= 0
              ? "has expired"
              : `expires in ${daysUntilExpiry} days`
          }`,
          sentAt: new Date(),
          email: recipientEmail,
          recipientName,
          status: "sent",
          createdAt: new Date(),
        });
      } else {
        emailsFailed++;
        await db.collection("notifications").insertOne({
          employeeId: document.employeeId || null,
          documentId: document._id,
          type: "document_expiry",
          title: "Document Expiry Notification Failed",
          message: `Failed to send expiry notification for "${document.title || document.originalName}" to ${recipientEmail}`,
          sentAt: new Date(),
          email: recipientEmail,
          recipientName,
          status: "failed",
          createdAt: new Date(),
        });
      }

      notifications.push({
        recipientName,
        recipientEmail,
        documentTitle: document.title || document.originalName,
        daysUntilExpiry,
        emailSent,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Expiry notifications processed. Sent: ${emailsSent}, Failed: ${emailsFailed}`,
      sent: emailsSent,
      failed: emailsFailed,
      total: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error sending expiry notifications:", error);
    return NextResponse.json(
      { error: "Failed to send expiry notifications", details: error.message },
      { status: 500 }
    );
  }
}

// API endpoint to get notification history
export async function GET() {
  try {
    const db = await getDb();

    const notifications = await db
      .collection("notifications")
      .find({})
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
