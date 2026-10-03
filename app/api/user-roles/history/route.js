import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// GET /api/user-roles/history — get role assignment history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roleName = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const db = await getDb();

    // Build query
    const query = {};
    if (userId) query.userId = userId;
    if (roleName) {
      query.$or = [{ previousRole: roleName }, { newRole: roleName }];
    }

    const history = await db
      .collection("role_history")
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Enrich with employee names
    const userIdSet = new Set(history.map((h) => h.userId));
    const assignerSet = new Set(
      history.map((h) => h.assignedBy || h.revokedBy).filter(Boolean)
    );
    const allIds = [...new Set([...userIdSet, ...assignerSet])];

    const employeeOids = allIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeOids } })
      .project({
        "personalDetails.name": 1,
        name: 1,
      })
      .toArray();

    const nameMap = {};
    for (const emp of employees) {
      nameMap[emp._id.toString()] =
        emp.personalDetails?.name || emp.name || "Unknown";
    }

    const enriched = history.map((h) => ({
      ...h,
      userName: nameMap[h.userId] || h.userEmail || h.userId,
      assignedByName: h.assignedBy
        ? nameMap[h.assignedBy] || h.assignedByEmail || h.assignedBy
        : null,
      revokedByName: h.revokedBy
        ? nameMap[h.revokedBy] || h.revokedByEmail || h.revokedBy
        : null,
    }));

    const total = await db.collection("role_history").countDocuments(query);

    return NextResponse.json({
      history: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching role history:", error);
    return NextResponse.json(
      { error: "Failed to fetch role history" },
      { status: 500 }
    );
  }
}
