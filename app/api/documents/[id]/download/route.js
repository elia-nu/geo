import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { readFile } from "fs/promises";
import { ObjectId } from "mongodb";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const document = await db.collection("documents").findOne({
      _id: new ObjectId(id),
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    try {
      // Read the file from the filesystem
      const fileBuffer = await readFile(document.filePath);

      // Create response with appropriate headers
      const response = new NextResponse(fileBuffer);

      response.headers.set(
        "Content-Type",
        document.mimeType || "application/octet-stream"
      );
      // Allow inline preview when requested
      const { searchParams } = new URL(request.url);
      const inline = searchParams.get("inline");
      const dispositionType = inline ? "inline" : "attachment";
      response.headers.set(
        "Content-Disposition",
        `${dispositionType}; filename="${document.originalName}"`
      );
      response.headers.set("Content-Length", document.fileSize.toString());

      // Log download activity
      await db.collection("document_downloads").insertOne({
        documentId: new ObjectId(id),
        employeeId: document.employeeId,
        downloadedAt: new Date(),
        fileName: document.originalName,
        fileSize: document.fileSize,
      });

      return response;
    } catch (fileError) {
      console.error("Error reading file:", fileError);
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error downloading document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}
