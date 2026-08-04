import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../mongo";

// Get all documents (metadata only — exclude large binary payloads)
export async function GET() {
  try {
    const db = await getDb();
    const documents = await db
      .collection("documents")
      .find(
        {},
        {
          projection: {
            fileData: 0,
            content: 0,
            data: 0,
            buffer: 0,
            binary: 0,
          },
        }
      )
      .sort({ uploadDate: -1 })
      .toArray();
    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
