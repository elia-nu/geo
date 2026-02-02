import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Document Expiry & Compliance Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      user.userId,
      "reports.read",
      user.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Access denied. You don't have permission to view document reports.",
        },
        { status: 403 }
      );
    }

    const days =
      parseInt(searchParams.get("days") || "30", 10) > 0
        ? parseInt(searchParams.get("days") || "30", 10)
        : 30;
    const triggerAlerts = searchParams.get("triggerAlerts") === "true";

    // Target compliance-critical types
    const targetTypesRaw = searchParams.get("types");
    const defaultTypes = ["contract", "insurance", "certification"];
    const targetTypes = targetTypesRaw
      ? targetTypesRaw
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : defaultTypes;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + days);
    horizon.setHours(23, 59, 59, 999);

    // Load all documents that have an expiry and are of relevant types
    const documents = await db.collection("documents").find({}).toArray();

    // Load employees to enrich owner information
    const employees = await db.collection("employees").find({}).toArray();
    const employeeMap = employees.reduce((map, emp) => {
      try {
        map[emp._id.toString()] = emp;
      } catch (_) {
        // ignore
      }
      return map;
    }, {});

    const expiring = [];
    const expired = [];

    const normalizeType = (doc) => {
      const raw = (doc.documentType || doc.type || "").toString().toLowerCase();
      if (raw.includes("contract")) return "contract";
      if (raw.includes("insur")) return "insurance";
      if (raw.includes("cert")) return "certification";
      return raw || "other";
    };

    documents.forEach((doc) => {
      const normType = normalizeType(doc);
      if (!targetTypes.includes(normType)) return;

      const expiryRaw = doc.expiryDate || doc.expirationDate;
      if (!expiryRaw) return;

      let expiryDate;
      try {
        expiryDate =
          expiryRaw instanceof Date ? expiryRaw : new Date(expiryRaw);
        if (isNaN(expiryDate.getTime())) return;
      } catch (_) {
        return;
      }
      expiryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const empKey =
        doc.employeeId && doc.employeeId.toString
          ? doc.employeeId.toString()
          : doc.employeeId
          ? String(doc.employeeId)
          : "";
      const owner = empKey ? employeeMap[empKey] : null;
      const ownerName =
        owner?.personalDetails?.name || owner?.name || "Unknown";
      const ownerEmail =
        owner?.personalDetails?.email || owner?.email || "";
      const ownerDepartment =
        owner?.personalDetails?.department || owner?.department || "Unassigned";

      const baseInfo = {
        documentId: doc._id.toString(),
        title: doc.title || doc.originalName || "",
        type: normType,
        rawType: doc.documentType || doc.type || "",
        ownerId: empKey || null,
        ownerName,
        ownerEmail,
        ownerDepartment,
        expiryDate: expiryDate.toISOString(),
        daysUntilExpiry: diffDays,
        status: diffDays < 0 ? "expired" : "expiring",
      };

      if (diffDays < 0) {
        // Already expired (we limit to some reasonable past window, e.g. last 90 days)
        if (diffDays >= -90) {
          expired.push(baseInfo);
        }
      } else if (diffDays <= days) {
        // Expiring within horizon
        expiring.push(baseInfo);
      }
    });

    // Aggregate summary
    const summary = {
      totalExpiring: expiring.length,
      totalExpired: expired.length,
      byType: {},
      byDepartment: {},
    };

    const allRelevant = [...expiring, ...expired];
    allRelevant.forEach((item) => {
      const t = item.type || "other";
      const dept = item.ownerDepartment || "Unassigned";
      summary.byType[t] = (summary.byType[t] || 0) + 1;
      summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
    });

    // Optional auto-alerts for admins
    if (triggerAlerts && allRelevant.length > 0) {
      try {
        const notifications = allRelevant.map((item) => {
          const isExpired = item.status === "expired";
          const titlePrefix = isExpired ? "Document Expired" : "Document Expiring";
          const humanDate = new Date(item.expiryDate).toLocaleDateString();

          return {
            _id: new ObjectId(),
            type: "document_expiry_admin",
            title: `${titlePrefix}: ${item.title}`,
            message: isExpired
              ? `${item.type.toUpperCase()} for ${item.ownerName} in ${item.ownerDepartment} expired on ${humanDate}.`
              : `${item.type.toUpperCase()} for ${item.ownerName} in ${item.ownerDepartment} will expire on ${humanDate} (${item.daysUntilExpiry} days).`,
            actionUrl: "/hrm?section=document-reports",
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              documentId: item.documentId,
              ownerId: item.ownerId,
              ownerName: item.ownerName,
              ownerEmail: item.ownerEmail,
              department: item.ownerDepartment,
              type: item.type,
              expiryDate: item.expiryDate,
              daysUntilExpiry: item.daysUntilExpiry,
            },
          };
        });

        if (notifications.length > 0) {
          await db.collection("notifications").insertMany(notifications);
        }
      } catch (notifError) {
        console.error(
          "Error creating document expiry admin notifications:",
          notifError
        );
      }
    }

    // Audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "document_expiry_compliance",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "document_expiry_compliance",
        days,
        triggerAlerts,
        targetTypes,
        counts: {
          totalExpiring: summary.totalExpiring,
          totalExpired: summary.totalExpired,
        },
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "document_expiry_compliance",
      generatedAt: new Date().toISOString(),
      params: {
        days,
        triggerAlerts,
        targetTypes,
      },
      summary,
      expiring,
      expired,
      totalRecords: expiring.length + expired.length,
    });
  } catch (error) {
    console.error("Error generating document expiry & compliance report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate document expiry & compliance report",
        message: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

