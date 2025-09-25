import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { unlink } from "fs/promises";

// Update document
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const db = await getDb();
    const result = await db
      .collection("documents")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// Delete document
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();

    // Get document to delete file
    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(params.id) });

    if (document && document.filePath) {
      // Delete file from filesystem
      try {
        await unlink(document.filePath);
      } catch (error) {
        // File might not exist, continue with deletion
        console.log("File not found for deletion:", document.filePath);
      }
    }

    const result = await db
      .collection("documents")
      .deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
