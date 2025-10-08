import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

// Get document statistics
export async function GET() {
  try {
    const db = await getDb();

    // Get all documents to calculate stats properly
    const allDocuments = await db.collection("documents").find({}).toArray();

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    let totalDocuments = allDocuments.length;
    let expiringDocuments = 0;
    let expiredDocuments = 0;
    let activeDocuments = 0;

    allDocuments.forEach((doc) => {
      // Handle expiryDate - it could be a string or Date object
      let expiryDate = null;

      if (doc.expiryDate) {
        if (typeof doc.expiryDate === "string") {
          // Convert string date to Date object
          expiryDate = new Date(doc.expiryDate);
        } else if (doc.expiryDate instanceof Date) {
          expiryDate = doc.expiryDate;
        }
      }

      // Only count documents with valid expiry dates
      if (expiryDate && !isNaN(expiryDate.getTime())) {
        if (expiryDate < now) {
          expiredDocuments++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiringDocuments++;
        }
      }

      // Count active documents (not expired)
      if (!expiryDate || expiryDate >= now) {
        activeDocuments++;
      }
    });

    const stats = {
      total: totalDocuments,
      expiring: expiringDocuments,
      expired: expiredDocuments,
      active: activeDocuments,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching document statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch document statistics" },
      { status: 500 }
    );
  }
}
