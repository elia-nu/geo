import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { join } from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { getDb } from "../../../../mongo";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

function safeFilename(name) {
  return (name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
}

function toISODateOnly(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

// PUT /api/projects/[id]/documents/[documentId]
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (user && user.authenticated) {
      const hasPerm = await checkPermission(user.userId, "project.update", user.role);
      if (!hasPerm) {
        return NextResponse.json(
          { success: false, error: "Access denied: Missing 'project.update' permission" },
          { status: 403 }
        );
      }
    }

    const db = await getDb();
    const { id: projectId, documentId } = await params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project/document ID" },
        { status: 400 }
      );
    }

    let title, description, contractorName, contractorEmail, expiryDate, status, newFile = null;

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = formData.get("title");
      description = formData.get("description");
      contractorName = formData.get("contractorName");
      contractorEmail = formData.get("contractorEmail");
      expiryDate = formData.get("expiryDate");
      status = formData.get("status");
      const fileCandidate = formData.get("file");
      if (fileCandidate && typeof fileCandidate === "object" && fileCandidate.name) {
        newFile = fileCandidate;
      }
    } else {
      const body = await request.json();
      title = body?.title;
      description = body?.description;
      contractorName = body?.contractorName;
      contractorEmail = body?.contractorEmail;
      expiryDate = body?.expiryDate;
      status = body?.status;
    }

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

    if (newFile) {
      const uploadsDir = join(
        process.cwd(),
        "uploads",
        "project-documents",
        projectId
      );
      await mkdir(uploadsDir, { recursive: true });

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = safeFilename(newFile.name);
      const storedFileName = `${uniqueSuffix}-${safeName}`;
      const filePath = join(uploadsDir, storedFileName);

      const buffer = Buffer.from(await newFile.arrayBuffer());
      await writeFile(filePath, buffer);

      if (existing.filePath) {
        try {
          await unlink(existing.filePath);
        } catch {}
      }

      update.originalName = newFile.name;
      update.storedFileName = storedFileName;
      update.filePath = filePath;
      update.size = newFile.size;
      update.mimeType = newFile.type || "application/octet-stream";
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
    const user = await getCurrentUser(request);
    if (user && user.authenticated) {
      const hasPerm = await checkPermission(user.userId, "project.delete", user.role);
      if (!hasPerm) {
        return NextResponse.json(
          { success: false, error: "Access denied: Missing 'project.delete' permission" },
          { status: 403 }
        );
      }
    }

    const db = await getDb();
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

