import nodemailer from "nodemailer";

// Email configuration - in production, use environment variables
// Log environment variables on module load for debugging
console.log("📧 Email Configuration Check:");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "NOT SET");
console.log("EMAIL_PORT:", process.env.EMAIL_PORT || "NOT SET");
console.log("EMAIL_USER:", process.env.EMAIL_USER || "NOT SET");
console.log(
  "EMAIL_PASSWORD:",
  process.env.EMAIL_PASSWORD ? "***SET***" : "NOT SET"
);

const emailConfig = {
  host: process.env.EMAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true" || false,
  auth: {
    user:
      process.env.EMAIL_USER || process.env.SMTP_USER || "your-email@gmail.com",
    pass:
      process.env.EMAIL_PASSWORD ||
      process.env.SMTP_PASSWORD ||
      "your-app-password",
  },
};

const createTransporter = () => {
  try {
    // Validate email config before creating transporter
    if (
      !emailConfig.auth.user ||
      emailConfig.auth.user === "your-email@gmail.com"
    ) {
      console.error("❌ EMAIL_USER is not set or is using default value");
      return null;
    }

    if (
      !emailConfig.auth.pass ||
      emailConfig.auth.pass === "your-app-password"
    ) {
      console.error("❌ EMAIL_PASSWORD is not set or is using default value");
      return null;
    }

    // Log email config (without password)
    console.log("📧 Email Configuration:", {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
      hasPassword: !!emailConfig.auth.pass,
    });

    const transporter = nodemailer.createTransport(emailConfig);

    // Verify connection (async, but don't block)
    transporter.verify(function (error, success) {
      if (error) {
        console.error("❌ Email transporter verification failed:", error);
        console.error("Error details:", {
          code: error.code,
          command: error.command,
          response: error.response,
        });
      } else {
        console.log("✅ Email transporter is ready to send messages");
      }
    });

    return transporter;
  } catch (error) {
    console.error("❌ Failed to create email transporter:", error);
    console.error("Error stack:", error.stack);
    return null;
  }
};

/**
 * Send task assignment email to employee
 */
export const sendTaskAssignmentEmail = async (employee, task, project) => {
  console.log("=== Sending Task Assignment Email ===");
  console.log("Employee:", {
    id: employee._id,
    name: employee.personalDetails?.name || employee.name,
    email: employee.personalDetails?.email || employee.email,
  });
  console.log("Task:", {
    id: task._id,
    title: task.title,
  });
  console.log("Project:", {
    id: project?._id,
    name: project?.name,
  });

  const transporter = createTransporter();
  if (!transporter) {
    console.error("Email transporter not available");
    return false;
  }

  const employeeEmail = employee.personalDetails?.email || employee.email;

  if (!employeeEmail) {
    console.warn(`No email found for employee: ${employee._id}`);
    return false;
  }

  console.log(`Preparing to send email to: ${employeeEmail}`);

  const employeeName =
    employee.personalDetails?.name || employee.name || "Employee";

  const priorityColors = {
    critical: "#dc3545",
    high: "#fd7e14",
    medium: "#ffc107",
    low: "#28a745",
  };

  const priorityColor = priorityColors[task.priority] || "#6c757d";

  const subject = `New Task Assignment: ${task.title}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .task-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .task-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .task-details { margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; background-color: ${priorityColor}; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
        .button:hover { background: #5568d3; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; }
        .description { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Task Assignment</h1>
          <p>You have been assigned to a new task</p>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          
          <p>You have been assigned to a new task. Please review the details below:</p>
          
          <div class="task-card">
            <div class="task-title">${task.title}</div>
            
            ${
              task.description
                ? `
            <div class="description">
              <strong>Description:</strong><br>
              ${task.description}
            </div>
            `
                : ""
            }
            
            <div class="task-details">
              <div class="detail-row">
                <span class="detail-label">Project:</span>
                <span class="detail-value">${project?.name || "N/A"}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value"><span class="priority-badge">${
                  task.priority
                }</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="status-badge">${task.status.replace(
                  "_",
                  " "
                )}</span></span>
              </div>
              ${
                task.startDate
                  ? `
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${new Date(
                  task.startDate
                ).toLocaleDateString()}</span>
              </div>
              `
                  : ""
              }
              ${
                task.dueDate
                  ? `
              <div class="detail-row">
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">${new Date(
                  task.dueDate
                ).toLocaleDateString()}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <p>Please log in to your employee portal to view full task details and start working on it.</p>
          
          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/employee-portal?section=tasks" class="button">View Task</a>
          </div>
          
          <p>If you have any questions, please contact your project manager or team lead.</p>
          
          <p>Best regards,<br>Project Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the Project Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Project Management System" <${emailConfig.auth.user}>`,
    to: employeeEmail,
    subject: subject,
    html: htmlContent,
  };

  console.log("Sending task assignment email to:", employeeEmail);
  console.log("Using email config:", {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user,
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Task assignment email sent successfully to ${employeeEmail}`
    );
    console.log("Email info:", {
      messageId: info.messageId,
      response: info.response,
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${employeeEmail}:`, error);
    console.error("Email error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return false;
  }
};

/**
 * Send project contractor document expiry email (with attachment).
 */
export const sendProjectDocumentExpiryEmail = async ({
  contractorName,
  contractorEmail,
  projectName,
  documentTitle,
  expiryDate,
  daysUntilExpiry,
  filePath,
  originalName,
}) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  if (!contractorEmail) return false;

  const isExpired = daysUntilExpiry <= 0;
  const subject = isExpired
    ? `Document expired: ${documentTitle}`
    : `Document expiring soon: ${documentTitle}`;

  const safeExpiry = expiryDate ? new Date(expiryDate) : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
        .container { max-width: 680px; margin: 0 auto; padding: 20px; }
        .header { background: ${isExpired ? "#DC2626" : "#F59E0B"}; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
        .content { background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB; border-top: 0; border-radius: 0 0 10px 10px; }
        .card { background: white; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; margin: 16px 0; }
        .muted { color: #6B7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">${isExpired ? "Document expired" : "Document expiry reminder"}</h2>
          <p style="margin:6px 0 0;">Project: ${projectName || "Project"}</p>
        </div>
        <div class="content">
          <p>Dear ${contractorName || "Contractor"},</p>
          <p>
            ${
              isExpired
                ? `The document <strong>${documentTitle}</strong> has expired.`
                : `This is a reminder that the document <strong>${documentTitle}</strong> will expire in <strong>${daysUntilExpiry}</strong> days.`
            }
          </p>

          <div class="card">
            <div><strong>Document</strong>: ${documentTitle}</div>
            <div><strong>Expiry date</strong>: ${
              safeExpiry ? safeExpiry.toLocaleDateString() : "—"
            }</div>
            <div class="muted" style="margin-top:8px;">The current copy is attached for your reference.</div>
          </div>

          <p>Please renew/update the document before the expiry date.</p>
          <p>Regards,<br/>Project Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let attachments = [];
  try {
    if (filePath) {
      const { readFile } = await import("fs/promises");
      const buf = await readFile(filePath);
      attachments = [
        {
          filename: originalName || "document",
          content: buf,
        },
      ];
    }
  } catch (e) {
    console.warn("Failed to attach document file:", e);
  }

  try {
    await transporter.sendMail({
      from: `"Project Management System" <${emailConfig.auth.user}>`,
      to: contractorEmail,
      subject,
      html,
      attachments,
    });
    return true;
  } catch (error) {
    console.error("Failed to send project document expiry email:", error);
    return false;
  }
};

/**
 * Send project assignment email to employee
 */
export const sendProjectAssignmentEmail = async (employee, project) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.error(
      "❌ Email transporter not available - check environment variables"
    );
    return false;
  }

  const employeeEmail = employee.personalDetails?.email || employee.email;

  if (!employeeEmail) {
    console.warn(`No email found for employee: ${employee._id}`);
    return false;
  }

  const employeeName =
    employee.personalDetails?.name || employee.name || "Employee";

  const subject = `New Project Assignment: ${project.name}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .project-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .project-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .project-details { margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
        .button:hover { background: #5568d3; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; }
        .description { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 New Project Assignment</h1>
          <p>You have been assigned to a new project</p>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          
          <p>You have been assigned to a new project. Please review the details below:</p>
          
          <div class="project-card">
            <div class="project-title">${project.name}</div>
            
            ${
              project.description
                ? `
            <div class="description">
              <strong>Description:</strong><br>
              ${project.description}
            </div>
            `
                : ""
            }
            
            <div class="project-details">
              ${
                project.startDate
                  ? `
              <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${new Date(
                  project.startDate
                ).toLocaleDateString()}</span>
              </div>
              `
                  : ""
              }
              ${
                project.endDate
                  ? `
              <div class="detail-row">
                <span class="detail-label">End Date:</span>
                <span class="detail-value">${new Date(
                  project.endDate
                ).toLocaleDateString()}</span>
              </div>
              `
                  : ""
              }
              ${
                project.status
                  ? `
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${project.status}</span>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <p>Please log in to your employee portal to view full project details and assigned tasks.</p>
          
          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/employee-portal?section=projects" class="button">View Project</a>
          </div>
          
          <p>If you have any questions, please contact your project manager.</p>
          
          <p>Best regards,<br>Project Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the Project Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Project Management System" <${emailConfig.auth.user}>`,
    to: employeeEmail,
    subject: subject,
    html: htmlContent,
  };

  console.log("Sending project assignment email to:", employeeEmail);
  console.log("Using email config:", {
    host: emailConfig.host,
    port: emailConfig.port,
    user: emailConfig.auth.user,
  });

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Project assignment email sent to ${employeeEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${employeeEmail}:`, error);
    return false;
  }
};

/**
 * Send contract expiry notification email to employee
 */
export const sendContractExpiryEmail = async (employee, daysUntilExpiry) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.error(
      "❌ Email transporter not available - check environment variables"
    );
    return false;
  }

  const employeeEmail = employee.personalDetails?.email || employee.email;

  if (!employeeEmail) {
    console.warn(`No email found for employee: ${employee._id}`);
    return false;
  }

  const employeeName =
    employee.personalDetails?.name || employee.name || "Employee";

  const contractExpiryDate =
    employee.personalDetails?.contractExpiryDate || employee.contractExpiryDate;
  if (!contractExpiryDate) {
    console.warn(`No contract expiry date found for employee: ${employee._id}`);
    return false;
  }

  const expiryDate = new Date(contractExpiryDate);
  const formattedExpiryDate = expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isExpired = daysUntilExpiry <= 0;
  const subject = isExpired
    ? `⚠️ Contract Expired: Action Required`
    : `⚠️ Contract Expiring Soon: ${daysUntilExpiry} Days Remaining`;

  const urgencyColor = isExpired
    ? "#dc3545"
    : daysUntilExpiry <= 7
    ? "#fd7e14"
    : "#ffc107";
  const urgencyText = isExpired
    ? "EXPIRED"
    : daysUntilExpiry <= 7
    ? "URGENT"
    : "WARNING";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${urgencyColor} 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .alert-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid ${urgencyColor}; }
        .alert-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .alert-details { margin: 15px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: 600; color: #666; }
        .detail-value { color: #333; }
        .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; background-color: ${urgencyColor}; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
        .button:hover { background: #5568d3; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 12px; }
        .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isExpired ? "⛔" : "⚠️"} Contract ${
    isExpired ? "Expired" : "Expiring Soon"
  }</h1>
          <p>${
            isExpired
              ? "Your contract has expired"
              : `Your contract expires in ${daysUntilExpiry} day${
                  daysUntilExpiry !== 1 ? "s" : ""
                }`
          }</p>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          
          <div class="alert-card">
            <div class="alert-title">Contract Expiry Notice</div>
            
            <div class="alert-details">
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value"><span class="urgency-badge">${urgencyText}</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Contract Expiry Date:</span>
                <span class="detail-value"><strong>${formattedExpiryDate}</strong></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Days Remaining:</span>
                <span class="detail-value">${
                  isExpired
                    ? '<strong style="color: #dc3545;">EXPIRED</strong>'
                    : `<strong>${daysUntilExpiry} day${
                        daysUntilExpiry !== 1 ? "s" : ""
                      }</strong>`
                }</span>
              </div>
            </div>
          </div>
          
          ${
            isExpired
              ? `
          <div class="warning-box">
            <strong>⚠️ Important:</strong> Your employment contract has expired. Please contact HR immediately to discuss contract renewal or extension options.
          </div>
          `
              : `
          <div class="warning-box">
            <strong>⚠️ Reminder:</strong> Your employment contract will expire in ${daysUntilExpiry} day${
                  daysUntilExpiry !== 1 ? "s" : ""
                }. Please contact HR to discuss contract renewal or extension options before the expiry date.
          </div>
          `
          }
          
          <p>Please take the following actions:</p>
          <ul>
            <li>Review your contract terms and conditions</li>
            <li>Contact the HR department to discuss renewal or extension</li>
            <li>Complete any required documentation for contract renewal</li>
            ${
              isExpired
                ? "<li><strong>URGENT:</strong> Schedule a meeting with HR as soon as possible</li>"
                : ""
            }
          </ul>
          
          <div style="text-align: center;">
            <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }/employee-portal" class="button">View Employee Portal</a>
          </div>
          
          <p>If you have any questions or concerns, please contact the HR department immediately.</p>
          
          <p>Best regards,<br>Human Resources Department</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from the HRM System.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"HRM System" <${emailConfig.auth.user}>`,
    to: employeeEmail,
    subject: subject,
    html: htmlContent,
  };

  console.log(`Sending contract expiry email to: ${employeeEmail}`);
  console.log(`Days until expiry: ${daysUntilExpiry}`);

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Contract expiry email sent successfully to ${employeeEmail}`
    );
    console.log("Email info:", {
      messageId: info.messageId,
      response: info.response,
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${employeeEmail}:`, error);
    console.error("Email error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    return false;
  }
};
