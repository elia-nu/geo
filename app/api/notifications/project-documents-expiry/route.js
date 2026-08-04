import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../mongo";
import { sendProjectDocumentExpiryEmail } from "../../../utils/email";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a, b) {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// POST /api/notifications/project-documents-expiry?force=true
// Sends expiry reminders for project contractor documents 30 days before expiry.
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const db = await getDb();

    const today = startOfToday();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);

    const docs = await db
      .collection("project_documents")
      .find({
        status: "active",
        expiryDate: { $lte: thirtyDaysFromNow },
      })
      .toArray();

    if (!docs.length) {
      return NextResponse.json({
        success: true,
        message: "No project documents require expiry notifications",
        sent: 0,
        failed: 0,
      });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const doc of docs) {
      try {
        if (!doc.expiryDate) continue;
        if (!doc.contractorEmail) continue;

        const expiry = new Date(doc.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const daysUntilExpiry = daysBetween(expiry, today);

        // Requirement: "before a month from the expiry date" → 30 days
        if (!force && daysUntilExpiry !== 30) continue;

        // Avoid duplicate emails within 24 hours unless forced
        if (!force && doc.lastNotifiedAt) {
          const last = new Date(doc.lastNotifiedAt);
          if (today.getTime() - last.getTime() < 24 * 60 * 60 * 1000) {
            continue;
          }
        }

        const project =
          doc.projectId && ObjectId.isValid(doc.projectId)
            ? await db
                .collection("projects")
                .findOne({ _id: new ObjectId(doc.projectId) })
            : null;

        const emailSent = await sendProjectDocumentExpiryEmail({
          contractorName: doc.contractorName,
          contractorEmail: doc.contractorEmail,
          projectName: project?.name || "Project",
          documentTitle: doc.title,
          expiryDate: expiry,
          daysUntilExpiry,
          filePath: doc.filePath,
          originalName: doc.originalName || doc.fileName,
        });

        const now = new Date();

        await db.collection("project_documents").updateOne(
          { _id: doc._id },
          {
            $set: {
              lastNotifiedAt: emailSent ? now : doc.lastNotifiedAt || null,
              updatedAt: now,
            },
            $push: {
              notifications: {
                _id: new ObjectId(),
                type: "auto",
                sent: emailSent,
                sentAt: now,
              },
            },
          }
        );

        await db.collection("notifications").insertOne({
          _id: new ObjectId(),
          type: "project_document_expiry",
          title: emailSent
            ? "Project document expiry reminder sent"
            : "Project document expiry reminder failed",
          message: `Document "${doc.title}" for contractor ${
            doc.contractorEmail
          } expires on ${expiry.toISOString().slice(0, 10)}`,
          createdAt: now,
          updatedAt: now,
          isRead: false,
          status: emailSent ? "sent" : "failed",
          metadata: {
            projectId: doc.projectId,
            documentId: doc._id?.toString?.() || "",
            contractorEmail: doc.contractorEmail,
            daysUntilExpiry,
            expiryDate: expiry.toISOString().slice(0, 10),
            mode: "auto",
          },
        });

        results.push({
          documentId: doc._id?.toString?.() || "",
          projectId: doc.projectId,
          contractorEmail: doc.contractorEmail,
          daysUntilExpiry,
          sent: emailSent,
        });

        if (emailSent) sent++;
        else failed++;
      } catch (e) {
        failed++;
        console.error("Failed to process project document expiry:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Project document expiry notifications processed",
      sent,
      failed,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Error sending project document expiry notifications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send project document notifications" },
      { status: 500 }
    );
  }
}

