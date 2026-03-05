import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Document Access & Activity Audit Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Auth & permission
    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "audit.read",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to view audit reports.",
        },
        { status: 403 }
      );
    }

    // Filters
    const documentId = searchParams.get("documentId");
    const actorId = searchParams.get("actorId");
    const ownerId = searchParams.get("ownerId");
    const action = searchParams.get("action"); // view|download|update|delete
    const department = searchParams.get("department");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Map friendly actions to audit_log actions
    const actionMap = {
      view: "DOCUMENT_VIEW",
      download: "DOCUMENT_DOWNLOAD",
      update: "DOCUMENT_UPDATE",
      delete: "DOCUMENT_DELETE",
    };

    const baseMatch = {
      entityType: "document",
      action: {
        $in: [
          "DOCUMENT_VIEW",
          "DOCUMENT_DOWNLOAD",
          "DOCUMENT_UPDATE",
          "DOCUMENT_DELETE",
        ],
      },
    };

    if (documentId && ObjectId.isValid(documentId)) {
      baseMatch.entityId = documentId;
    }

    if (actorId && actorId.trim() !== "") {
      baseMatch.userId = actorId;
    }

    if (action && actionMap[action]) {
      baseMatch.action = actionMap[action];
    }

    if (startDate && endDate) {
      baseMatch.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Pull audit events
    const auditEvents = await db
      .collection("audit_logs")
      .find(baseMatch)
      .sort({ timestamp: -1 })
      .limit(2000)
      .toArray();

    if (auditEvents.length === 0) {
      return NextResponse.json({
        success: true,
        reportType: "document_access_audit",
        generatedAt: new Date().toISOString(),
        filters: {
          documentId,
          actorId,
          ownerId,
          action,
          department,
          type,
          startDate,
          endDate,
        },
        summary: {
          totalEvents: 0,
          byAction: {},
          byDocument: {},
          byUser: {},
          byDepartment: {},
        },
        events: [],
        totalRecords: 0,
      });
    }

    // Collect document and user references
    const documentIds = Array.from(
      new Set(
        auditEvents
          .map((e) => e.entityId)
          .filter((id) => id && ObjectId.isValid(id))
      )
    ).map((id) => new ObjectId(id));

    const actorIds = Array.from(
      new Set(auditEvents.map((e) => e.userId).filter(Boolean))
    );

    // Load documents and employees (owners)
    const [documents, employees] = await Promise.all([
      documentIds.length
        ? db
            .collection("documents")
            .find({ _id: { $in: documentIds } })
            .toArray()
        : [],
      db.collection("employees").find({}).toArray(),
    ]);

    const documentMap = new Map(
      documents.map((d) => [d._id.toString(), d])
    );
    const employeeMap = new Map(
      employees.map((e) => [e._id.toString(), e])
    );

    // Optional ownerId filter (by document owner)
    const ownerFilterId =
      ownerId && ownerId.trim() !== "" ? ownerId.trim() : null;

    // Normalize and enrich events
    const events = [];

    const reverseActionMap = {
      DOCUMENT_VIEW: "view",
      DOCUMENT_DOWNLOAD: "download",
      DOCUMENT_UPDATE: "update",
      DOCUMENT_DELETE: "delete",
    };

    for (const ev of auditEvents) {
      const doc = ev.entityId ? documentMap.get(ev.entityId) : null;
      const ownerKey =
        doc && doc.employeeId
          ? doc.employeeId.toString
            ? doc.employeeId.toString()
            : String(doc.employeeId)
          : null;
      const owner = ownerKey ? employeeMap.get(ownerKey) : null;

      const ownerDept =
        owner?.personalDetails?.department ||
        owner?.department ||
        "Unassigned";

      // Department filter (by owner department)
      if (department && department.trim() !== "" && ownerDept !== department) {
        continue;
      }

      // Owner filter
      if (ownerFilterId && ownerKey !== ownerFilterId) {
        continue;
      }

      const normalizedAction =
        reverseActionMap[ev.action] || ev.action?.toLowerCase() || "";

      // Type filter (by document type)
      const docTypeRaw = (doc?.documentType || doc?.type || "").toString();
      if (type && type.trim() !== "") {
        const tLower = type.toLowerCase();
        if (docTypeRaw.toLowerCase() !== tLower) continue;
      }

      events.push({
        id: ev._id?.toString?.() || ev.id || "",
        documentId: ev.entityId || "",
        documentTitle: doc?.title || doc?.originalName || "",
        documentType: docTypeRaw,
        ownerId: ownerKey,
        ownerName:
          owner?.personalDetails?.name || owner?.name || "Unknown",
        ownerEmail:
          owner?.personalDetails?.email || owner?.email || "",
        ownerDepartment: ownerDept,
        actorId: ev.userId || "",
        actorEmail: ev.userEmail || "",
        actorRole: ev.metadata?.userRole || "",
        action: normalizedAction,
        timestamp: ev.timestamp || ev.createdAt || null,
        ip: ev.ipAddress || ev.metadata?.ip || "",
        userAgent: ev.userAgent || ev.metadata?.userAgent || "",
        device: ev.metadata?.device || "",
      });
    }

    // Build summary
    const summary = {
      totalEvents: events.length,
      byAction: {},
      byDocument: {},
      byUser: {},
      byDepartment: {},
    };

    for (const ev of events) {
      const act = ev.action || "other";
      const docKey =
        ev.documentTitle || `${ev.documentId || "Unknown Document"}`;
      const userKey = ev.actorEmail || ev.actorId || "Unknown";
      const deptKey = ev.ownerDepartment || "Unassigned";

      summary.byAction[act] = (summary.byAction[act] || 0) + 1;
      summary.byDocument[docKey] = (summary.byDocument[docKey] || 0) + 1;
      summary.byUser[userKey] = (summary.byUser[userKey] || 0) + 1;
      summary.byDepartment[deptKey] =
        (summary.byDepartment[deptKey] || 0) + 1;
    }

    // Audit log for viewing the report
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "document_access_audit",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "document_access_audit",
        filters: {
          documentId,
          actorId,
          ownerId,
          action,
          department,
          type,
          startDate,
          endDate,
        },
        recordCount: events.length,
      },
      ipAddress: request.headers.get("x-forwarded-for") || null,
      userAgent: request.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      reportType: "document_access_audit",
      generatedAt: new Date().toISOString(),
      filters: {
        documentId,
        actorId,
        ownerId,
        action,
        department,
        type,
        startDate,
        endDate,
      },
      summary,
      events,
      totalRecords: events.length,
    });
  } catch (error) {
    console.error("Error generating document access & activity report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate document access & activity report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

