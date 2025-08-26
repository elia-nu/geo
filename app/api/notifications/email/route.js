import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import nodemailer from "nodemailer";

// Email configuration - in production, use environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "your-email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "your-app-password",
  },
};

const createTransporter = () => {
  try {
    return nodemailer.createTransporter(emailConfig);
  } catch (error) {
    console.error("Failed to create email transporter:", error);
    return null;
  }
};

const sendExpiryNotification = async (employee, document, daysUntilExpiry) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  const subject = `Document Expiry Alert - ${document.title}`;
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
          <p>Dear ${employee.personalDetails.name},</p>
          
          <div class="alert-box">
            <strong>${
              isExpired ? "URGENT:" : "REMINDER:"
            }</strong> Your document "${document.title}" ${statusText}.
          </div>
          
          <div class="document-details">
            <h3>Document Details:</h3>
            <ul>
              <li><strong>Title:</strong> ${document.title}</li>
              <li><strong>Type:</strong> ${document.documentType}</li>
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
                ? "Please contact HR immediately to renew or update this document to ensure compliance."
                : "Please take action to renew or update this document before it expires."
            }
          </p>
          
          <p>If you have any questions, please contact the HR department.</p>
          
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
    to: employee.personalDetails.email,
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error(
      `Failed to send email to ${employee.personalDetails.email}:`,
      error
    );
    return false;
  }
};

// API endpoint to send expiry notifications
export async function POST(request) {
  try {
    const db = await getDb();

    // Get documents expiring in the next 30 days or already expired
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDocuments = await db
      .collection("documents")
      .find({
        expiryDate: {
          $lte: thirtyDaysFromNow,
        },
      })
      .toArray();

    if (expiringDocuments.length === 0) {
      return NextResponse.json({
        message: "No documents require expiry notifications",
        sent: 0,
      });
    }

    // Get all employees
    const employees = await db.collection("employees").find({}).toArray();
    const employeeMap = employees.reduce((map, emp) => {
      map[emp._id.toString()] = emp;
      return map;
    }, {});

    let emailsSent = 0;
    let emailsFailed = 0;
    const notifications = [];

    for (const document of expiringDocuments) {
      const employee = employeeMap[document.employeeId];
      if (!employee || !employee.personalDetails.email) {
        console.warn(
          `No employee or email found for document: ${document.title}`
        );
        continue;
      }

      const expiryDate = new Date(document.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      // Only send notifications for documents expiring in 30, 14, 7, 3, 1 days or already expired
      const notificationDays = [30, 14, 7, 3, 1, 0, -1, -7, -30];
      if (!notificationDays.includes(daysUntilExpiry)) {
        continue;
      }

      const emailSent = await sendExpiryNotification(
        employee,
        document,
        daysUntilExpiry
      );

      if (emailSent) {
        emailsSent++;
        // Log notification in database
        await db.collection("notifications").insertOne({
          employeeId: document.employeeId,
          documentId: document._id,
          type: "document_expiry",
          message: `Document "${document.title}" ${
            daysUntilExpiry <= 0
              ? "has expired"
              : `expires in ${daysUntilExpiry} days`
          }`,
          sentAt: new Date(),
          email: employee.personalDetails.email,
          status: "sent",
        });
      } else {
        emailsFailed++;
        // Log failed notification
        await db.collection("notifications").insertOne({
          employeeId: document.employeeId,
          documentId: document._id,
          type: "document_expiry",
          message: `Failed to send expiry notification for "${document.title}"`,
          sentAt: new Date(),
          email: employee.personalDetails.email,
          status: "failed",
        });
      }

      notifications.push({
        employeeName: employee.personalDetails.name,
        documentTitle: document.title,
        daysUntilExpiry,
        emailSent,
      });
    }

    return NextResponse.json({
      message: `Expiry notifications processed`,
      sent: emailsSent,
      failed: emailsFailed,
      total: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error sending expiry notifications:", error);
    return NextResponse.json(
      { error: "Failed to send expiry notifications" },
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
      .sort({ sentAt: -1 })
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
