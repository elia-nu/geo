import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const documentData = formData.get("documentData");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const parsedDocumentData = JSON.parse(documentData);
    const db = await getDb();

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = join(uploadsDir, `${uniqueSuffix}-${fileName}`);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const document = {
      ...parsedDocumentData,
      fileName: `${uniqueSuffix}-${fileName}`,
      originalName: file.name,
      filePath: filePath,
      fileSize: buffer.length,
      mimeType: file.type,
      uploadDate: new Date(),
      status: "active",
    };

    const result = await db.collection("documents").insertOne(document);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
