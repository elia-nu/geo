import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentData = formData.get("documentData");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const parsedDocumentData = documentData ? JSON.parse(documentData) : {};
    const db = await getDb();

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {}

    // Generate unique filename and save
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = join(uploadsDir, `${uniqueSuffix}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Fetch existing doc to delete old file
    const existing = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Replace metadata and file fields
    const updateData = {
      ...(parsedDocumentData || {}),
      fileName: `${uniqueSuffix}-${safeName}`,
      originalName: file.name,
      filePath,
      fileSize: buffer.length,
      mimeType: file.type,
      updatedAt: new Date(),
    };

    await db
      .collection("documents")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Delete old file if present
    if (existing.filePath && existing.filePath !== filePath) {
      try {
        await unlink(existing.filePath);
      } catch {
        // ignore if missing
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error replacing document file:", error);
    return NextResponse.json(
      { error: "Failed to replace document file" },
      { status: 500 }
    );
  }
}
