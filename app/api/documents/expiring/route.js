import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

// Lightweight endpoint for header notifications — only docs expiring within N days.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(parseInt(searchParams.get("days") || "30", 10) || 30, 1),
      90
    );

    const db = await getDb();
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Pull only metadata for docs that have an expiry; filter in JS so both
    // Date and ISO-string expiryDate values are handled.
    const candidates = await db
      .collection("documents")
      .find(
        { expiryDate: { $exists: true, $ne: null } },
        {
          projection: {
            title: 1,
            originalName: 1,
            fileName: 1,
            expiryDate: 1,
            documentType: 1,
            status: 1,
            employeeId: 1,
          },
        }
      )
      .limit(500)
      .toArray();

    const documents = candidates
      .filter((doc) => {
        const expiry = new Date(doc.expiryDate);
        return !isNaN(expiry) && expiry >= now && expiry <= until;
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      .slice(0, 50);

    return NextResponse.json({ documents, count: documents.length });
  } catch (error) {
    console.error("Error fetching expiring documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch expiring documents" },
      { status: 500 }
    );
  }
}
