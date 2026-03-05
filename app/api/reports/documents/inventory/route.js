import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

// Document Inventory Report API
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    // Auth & permission
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

    // Filters
    const type = searchParams.get("type"); // contract, report, site_photo, approval_letter, etc.
    const ownerId = searchParams.get("ownerId");
    const department = searchParams.get("department");
    const status = searchParams.get("status"); // draft, approved, expired, archived
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Load documents with basic filters first
    const match = {};

    // Date range
    if (startDate && endDate) {
      match.uploadDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Type filter
    if (type && type.trim() !== "") {
      match.documentType = type;
    }

    // Owner filter (employeeId stored as string on documents)
    if (ownerId && ownerId.trim() !== "") {
      match.employeeId = ownerId;
    }

    const rawDocuments = await db
      .collection("documents")
      .find(match)
      .toArray();

    // Load employees to enrich owner info
    const employees = await db.collection("employees").find({}).toArray();
    const employeeMap = employees.reduce((map, emp) => {
      try {
        map[emp._id.toString()] = emp;
      } catch {
        // ignore
      }
      return map;
    }, {});

    const now = new Date();

    // Enrich and derive fields safely in JS
    const documents = rawDocuments.map((doc) => {
      const empKey =
        doc.employeeId && doc.employeeId.toString
          ? doc.employeeId.toString()
          : doc.employeeId
          ? String(doc.employeeId)
          : "";
      const owner = empKey ? employeeMap[empKey] : null;

      const ownerName =
        owner?.personalDetails?.name || owner?.name || "";
      const ownerEmail =
        owner?.personalDetails?.email || owner?.email || "";
      const ownerDepartment =
        owner?.personalDetails?.department ||
        owner?.department ||
        "Unassigned";

      const typeRaw = (doc.documentType || doc.type || "other").toString();
      const tLower = typeRaw.toLowerCase();
      let normalizedType = typeRaw || "other";
      if (tLower.includes("contract")) normalizedType = "contract";
      else if (tLower.includes("report")) normalizedType = "report";
      else if (tLower.includes("photo") || tLower.includes("image"))
        normalizedType = "site photo";
      else if (tLower.includes("approval"))
        normalizedType = "approval letter";

      // Compute derived status in JS
      const rawStatus = (doc.status || "active").toString().toLowerCase();
      let computedStatus = "approved";
      if (rawStatus === "draft") computedStatus = "draft";
      else if (rawStatus === "archived") computedStatus = "archived";
      else {
        const expiryRaw = doc.expiryDate || doc.expirationDate;
        if (expiryRaw) {
          try {
            const expiryDate =
              expiryRaw instanceof Date ? expiryRaw : new Date(expiryRaw);
            if (!isNaN(expiryDate.getTime()) && expiryDate < now) {
              computedStatus = "expired";
            }
          } catch {
            // ignore bad expiry, keep approved
          }
        }
      }

      return {
        _id: doc._id,
        documentId: doc._id?.toString?.() || "",
        title: doc.title || doc.originalName || "",
        originalName: doc.originalName || "",
        documentType: doc.documentType || "",
        normalizedType,
        employeeId: empKey,
        ownerName,
        ownerEmail,
        ownerDepartment,
        uploadDate: doc.uploadDate || null,
        expiryDate: doc.expiryDate || doc.expirationDate || null,
        status: computedStatus,
        rawStatus: doc.status || "",
        fileSize: doc.fileSize || null,
        mimeType: doc.mimeType || "",
        tags: doc.tags || [],
        createdAt: doc.createdAt || null,
        updatedAt: doc.updatedAt || null,
      };
    });

    // Apply department & status filters in JS
    const filteredDocuments = documents.filter((doc) => {
      if (department && department.trim() !== "") {
        if (doc.ownerDepartment !== department) return false;
      }
      if (status && status.trim() !== "") {
        if (doc.status !== status.toLowerCase()) return false;
      }
      return true;
    });

    // Build summaries
    const summary = {
      total: filteredDocuments.length,
      byType: {},
      byStatus: {},
      byDepartment: {},
      byOwner: {},
    };

    filteredDocuments.forEach((doc) => {
      const t = doc.normalizedType || "other";
      const s = doc.status || "approved";
      const dept = doc.ownerDepartment || "Unassigned";
      const owner = doc.ownerName || "Unknown";

      summary.byType[t] = (summary.byType[t] || 0) + 1;
      summary.byStatus[s] = (summary.byStatus[s] || 0) + 1;
      summary.byDepartment[dept] = (summary.byDepartment[dept] || 0) + 1;
      summary.byOwner[owner] = (summary.byOwner[owner] || 0) + 1;
    });

    // Audit log
    await createAuditLog({
      action: "VIEW",
      entityType: "report",
      entityId: "document_inventory",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "document_inventory",
        filters: {
          type,
          ownerId,
          department,
          status,
          startDate,
          endDate,
        },
        recordCount: filteredDocuments.length,
      },
    });

    return NextResponse.json({
      success: true,
      reportType: "document_inventory",
      generatedAt: new Date().toISOString(),
      filters: {
        type,
        ownerId,
        department,
        status,
        startDate,
        endDate,
      },
      summary,
      documents: filteredDocuments,
      totalRecords: filteredDocuments.length,
    });
  } catch (error) {
    console.error("Error generating document inventory report:", error);
    return NextResponse.json(
      {
        error: "Failed to generate document inventory report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

