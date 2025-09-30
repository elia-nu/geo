import { NextResponse } from "next/server";
import { getDb } from "../mongo";

export async function GET() {
  try {
    const db = await getDb();

    // Prefer persisted designations stored on departments
    const agg = await db
      .collection("departments")
      .aggregate([
        { $match: { designations: { $exists: true, $ne: [] } } },
        { $unwind: "$designations" },
        { $match: { designations: { $nin: [null, ""] } } },
        { $group: { _id: "$designations" } },
        { $project: { _id: 0, name: "$_id" } },
        { $sort: { name: 1 } },
      ])
      .toArray();

    let designations = agg.map((d) => d.name);

    // Fallback to deriving from employees if departments have none
    if (designations.length === 0) {
      const distinctFromRoot = await db
        .collection("employees")
        .distinct("designation", { designation: { $nin: [null, ""] } });
      const nested = await db
        .collection("employees")
        .distinct("personalDetails.designation", {
          "personalDetails.designation": { $nin: [null, ""] },
        });
      const set = new Set([...(distinctFromRoot || []), ...(nested || [])]);
      designations = Array.from(set)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)));
    }

    return NextResponse.json({
      success: true,
      designations,
      total: designations.length,
    });
  } catch (error) {
    console.error("Error fetching designations:", error);
    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 }
    );
  }
}
