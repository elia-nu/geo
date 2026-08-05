import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { readFile } from "fs/promises";
import { getDb } from "../../../../../mongo";

// GET /api/projects/[id]/documents/[documentId]/download
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id: projectId, documentId } = await params;
    const { searchParams } = new URL(request.url);
    const inline = searchParams.get("inline") === "true";

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

    if (!doc || !doc.filePath) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    const bytes = await readFile(doc.filePath);
    const res = new NextResponse(bytes, {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(
          doc.originalName || doc.fileName || "document"
        )}"`,
      },
    });
    return res;
  } catch (error) {
    console.error("Error downloading project document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download document" },
      { status: 500 }
    );
  }
}

