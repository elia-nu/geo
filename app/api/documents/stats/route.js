import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

// Get document statistics
export async function GET() {
  try {
    const db = await getDb();

    const totalDocuments = await db.collection("documents").countDocuments();
    const expiringDocuments = await db.collection("documents").countDocuments({
      expiryDate: {
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        $gte: new Date(),
      },
    });
    const expiredDocuments = await db.collection("documents").countDocuments({
      expiryDate: { $lt: new Date() },
    });

    const stats = {
      total: totalDocuments,
      expiring: expiringDocuments,
      expired: expiredDocuments,
      active: totalDocuments - expiredDocuments,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch document statistics" },
      { status: 500 }
    );
  }
}
