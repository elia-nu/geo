import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { unlink } from "fs/promises";
import { getDb } from "../../../../mongo";
import { getCurrentUser } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

function toISODateOnly(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

// PUT /api/projects/[id]/documents/[documentId]
export async function PUT(request, { params }) {
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

    const body = await request.json();
    const {
      title,
      description,
      contractorName,
      contractorEmail,
      expiryDate,
      status,
    } = body || {};

    const update = {
      updatedAt: new Date(),
    };

    if (title !== undefined) update.title = (title || "").toString();
    if (description !== undefined)
      update.description = (description || "").toString();
    if (contractorName !== undefined)
      update.contractorName = (contractorName || "").toString();
    if (contractorEmail !== undefined)
      update.contractorEmail = (contractorEmail || "").toString();
    if (status !== undefined) update.status = status || "active";

    if (expiryDate !== undefined) {
      const d = expiryDate ? new Date(expiryDate) : null;
      if (!d || Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid expiry date" },
          { status: 400 }
        );
      }
      update.expiryDate = d;
      update.expiryDateISO = toISODateOnly(d);
    }

    const existing = await db.collection("project_documents").findOne({
      _id: new ObjectId(documentId),
      projectId,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    await db.collection("project_documents").updateOne(
      { _id: new ObjectId(documentId), projectId },
      { $set: update }
    );

    await createAuditLog({
      action: "UPDATE",
      entityType: "project_document",
      entityId: documentId,
      userId: user?.userId || "system",
      userEmail: user?.email || "system@company.com",
      changes: {
        before: {
          title: existing.title,
          contractorName: existing.contractorName,
          contractorEmail: existing.contractorEmail,
          expiryDate: existing.expiryDateISO || existing.expiryDate,
          status: existing.status,
        },
        after: {
          title: update.title ?? existing.title,
          contractorName: update.contractorName ?? existing.contractorName,
          contractorEmail: update.contractorEmail ?? existing.contractorEmail,
          expiryDate:
            update.expiryDateISO ?? existing.expiryDateISO ?? existing.expiryDate,
          status: update.status ?? existing.status,
        },
      },
      metadata: { projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating project document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update project document" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/documents/[documentId]
export async function DELETE(request, { params }) {
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

    const existing = await db.collection("project_documents").findOne({
      _id: new ObjectId(documentId),
      projectId,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    await db.collection("project_documents").deleteOne({
      _id: new ObjectId(documentId),
      projectId,
    });

    if (existing.filePath) {
      try {
        await unlink(existing.filePath);
      } catch {
        // ignore
      }
    }

    await createAuditLog({
      action: "DELETE",
      entityType: "project_document",
      entityId: documentId,
      userId: user?.userId || "system",
      userEmail: user?.email || "system@company.com",
      metadata: {
        projectId,
        title: existing.title,
        contractorEmail: existing.contractorEmail,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project document" },
      { status: 500 }
    );
  }
}

