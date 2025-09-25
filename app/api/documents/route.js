import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../mongo";

// Get all documents
export async function GET() {
  try {
    const db = await getDb();
    const documents = await db.collection("documents").find().toArray();
    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
