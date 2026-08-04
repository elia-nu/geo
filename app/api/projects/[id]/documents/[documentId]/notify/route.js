import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../../mongo";
import { getCurrentUser } from "../../../../../middleware/auth";
import { createAuditLog } from "../../../../../../utils/audit";
import { sendProjectDocumentExpiryEmail } from "../../../../../../utils/email";

// POST /api/projects/[id]/documents/[documentId]/notify
// Manually notify contractor (same email as auto)
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request);
    const { id: projectId, documentId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project/document ID" },
        { status: 400 }
      );
    }

    const doc = await db.collection("project_documents").findOne({
      _id: new ObjectId(documentId),
      projectId,
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(projectId),
    });

    const expiryDate = new Date(doc.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    const sent = await sendProjectDocumentExpiryEmail({
      contractorName: doc.contractorName,
      contractorEmail: doc.contractorEmail,
      projectName: project?.name || "Project",
      documentTitle: doc.title,
      expiryDate,
      daysUntilExpiry,
      filePath: doc.filePath,
      originalName: doc.originalName || doc.fileName,
    });

    const now = new Date();

    await db.collection("project_documents").updateOne(
      { _id: new ObjectId(documentId), projectId },
      {
        $set: {
          lastNotifiedAt: sent ? now : doc.lastNotifiedAt || null,
          updatedAt: now,
        },
        $push: {
          notifications: {
            _id: new ObjectId(),
            type: "manual",
            sent,
            sentAt: now,
            sentBy: user?.userId || "system",
            sentByEmail: user?.email || "system@company.com",
          },
        },
      }
    );

    await createAuditLog({
      action: "EXPORT",
      entityType: "project_document",
      entityId: documentId,
      userId: user?.userId || "system",
      userEmail: user?.email || "system@company.com",
      metadata: {
        projectId,
        operation: "notify_contractor",
        sent,
        contractorEmail: doc.contractorEmail,
        expiryDate: doc.expiryDateISO || doc.expiryDate,
      },
    });

    return NextResponse.json({
      success: true,
      sent,
      message: sent ? "Notification email sent" : "Failed to send email",
    });
  } catch (error) {
    console.error("Error notifying contractor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to notify contractor" },
      { status: 500 }
    );
  }
}

