import { NextResponse } from "next/server";
import { getDb } from "../mongo";

// Log audit events
export async function POST(request) {
  try {
    const auditData = await request.json();

    const db = await getDb();

    const auditLog = {
      ...auditData,
      timestamp: new Date(),
      id: generateAuditId(),
    };

    await db.collection("audit_logs").insertOne(auditLog);

    return NextResponse.json({
      message: "Audit log created successfully",
      auditId: auditLog.id,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { error: "Failed to create audit log" },
      { status: 500 }
    );
  }
}

// Get audit logs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = await getDb();

    // Build query
    let query = {};

    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;
    if (userId) query.userId = userId;

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const [auditLogs, totalCount] = await Promise.all([
      db
        .collection("audit_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("audit_logs").countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

function generateAuditId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
