import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import { getDb } from "../../../mongo";
import { getCurrentUser } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

function safeFilename(name) {
  return (name || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
}

function toISODateOnly(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

// GET /api/projects/[id]/documents
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id: projectId } = await params;

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const docs = await db
      .collection("project_documents")
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray();

    const serialized = docs.map((d) => ({
      ...d,
      _id: d._id?.toString?.() || d._id,
    }));

    return NextResponse.json({ success: true, documents: serialized });
  } catch (error) {
    console.error("Error fetching project documents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project documents" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/documents
// multipart/form-data: file + contractorName + contractorEmail + expiryDate + title + description
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const user = await getCurrentUser(request);
    const { id: projectId } = await params;

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const contractorName = (formData.get("contractorName") || "").toString();
    const contractorEmail = (formData.get("contractorEmail") || "").toString();
    const expiryDateRaw = (formData.get("expiryDate") || "").toString();
    const title = (formData.get("title") || "").toString();
    const description = (formData.get("description") || "").toString();

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!contractorName.trim() || !contractorEmail.trim() || !expiryDateRaw) {
      return NextResponse.json(
        {
          success: false,
          error: "Contractor name, contractor email, and expiry date are required",
        },
        { status: 400 }
      );
    }

    const expiryDate = new Date(expiryDateRaw);
    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid expiry date" },
        { status: 400 }
      );
    }

    const uploadsDir = join(
      process.cwd(),
      "uploads",
      "project-documents",
      projectId
    );
    await mkdir(uploadsDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = safeFilename(file.name);
    const storedFileName = `${uniqueSuffix}-${safeName}`;
    const filePath = join(uploadsDir, storedFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const doc = {
      projectId,
      title: title.trim() || file.name,
      description: description || "",
      contractorName: contractorName.trim(),
      contractorEmail: contractorEmail.trim(),
      expiryDate,
      expiryDateISO: toISODateOnly(expiryDate),
      fileName: storedFileName,
      originalName: file.name,
      filePath,
      fileSize: buffer.length,
      mimeType: file.type || "application/octet-stream",
      status: "active",
      lastNotifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.userId || "system",
      createdByEmail: user?.email || "system@company.com",
    };

    const result = await db.collection("project_documents").insertOne(doc);

    await createAuditLog({
      action: "CREATE",
      entityType: "project_document",
      entityId: result.insertedId.toString(),
      userId: user?.userId || "system",
      userEmail: user?.email || "system@company.com",
      metadata: {
        projectId,
        contractorEmail: doc.contractorEmail,
        expiryDate: doc.expiryDateISO,
      },
    });

    return NextResponse.json(
      {
        success: true,
        document: { ...doc, _id: result.insertedId.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project document" },
      { status: 500 }
    );
  }
}

