import { getDb } from "../api/mongo.js";

export function generateAuditId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getClientIp(request) {
  if (!request || !request.headers) return null;
  const forwarded = request.headers.get?.("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get?.("x-real-ip") || null;
}

export function getUserAgent(request) {
  if (!request || !request.headers) return null;
  return request.headers.get?.("user-agent") || null;
}

/**
 * Universal audit log creator.
 * Compatible with existing createAuditLog({ action, entityType, entityId, userId, userEmail, ... })
 * and extends support for user object, request context, role, name, status, and metadata.
 */
export async function createAuditLog({
  action,
  entityType,
  entityId = null,
  userId = null,
  userEmail = null,
  userName = null,
  userRole = null,
  changes = null,
  metadata = null,
  status = "SUCCESS",
  ipAddress = null,
  userAgent = null,
  request = null,
  user = null,
}) {
  try {
    const db = await getDb();

    let finalIp = ipAddress;
    let finalUserAgent = userAgent;
    let finalUserId = userId;
    let finalEmail = userEmail;
    let finalName = userName;
    let finalRole = userRole;

    // If explicit user object passed
    if (user) {
      finalUserId = user.userId || user.employeeId || finalUserId;
      finalEmail = user.email || finalEmail;
      finalName = user.name || finalName;
      finalRole = user.role || finalRole;
    }

    // If request provided, extract IP, userAgent, and user if not already set or if default admin
    if (request) {
      if (!finalIp) finalIp = getClientIp(request);
      if (!finalUserAgent) finalUserAgent = getUserAgent(request);

      if (
        !finalUserId ||
        finalUserId === "admin" ||
        finalUserId === "system" ||
        !finalEmail ||
        finalEmail === "admin@company.com" ||
        finalEmail === "system@company.com"
      ) {
        try {
          const reqUser =
            request.user ||
            (await (await import("../api/middleware/auth.js")).getCurrentUser(request));
          if (reqUser && reqUser.authenticated) {
            finalUserId = reqUser.userId || finalUserId;
            finalEmail = reqUser.email || finalEmail;
            finalName = reqUser.name || finalName;
            finalRole = reqUser.role || finalRole;
          }
        } catch (_) {
          // Keep existing values on failure
        }
      }
    }

    const auditLog = {
      id: generateAuditId(),
      action, // e.g., CREATE, UPDATE, DELETE, VIEW, EXPORT, APPROVE, REJECT, CHECK_IN, CHECK_OUT, ACCESS_DENIED
      entityType, // e.g., employee, document, project, task, attendance, leave, payroll, role, work_location, geofence, department, designation, budget
      entityId: entityId !== null && entityId !== undefined ? String(entityId) : null,
      userId: finalUserId || "system",
      userEmail: finalEmail || null,
      userName: finalName || null,
      userRole: finalRole || null,
      status: status || "SUCCESS",
      changes, // { before, after }
      metadata: metadata || null,
      ipAddress: finalIp,
      userAgent: finalUserAgent,
      timestamp: new Date(),
    };

    await db.collection("audit_logs").insertOne(auditLog);
    return auditLog.id;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

/**
 * High-level helper for API routes:
 * logActivity({ request, user, action, entityType, entityId, changes, metadata, status, error })
 */
export async function logActivity({
  request = null,
  user = null,
  action,
  entityType,
  entityId = null,
  changes = null,
  metadata = null,
  status = null,
  error = null,
}) {
  try {
    const determinedStatus = status || (error ? "FAILED" : "SUCCESS");
    const mergedMetadata = error
      ? { ...(metadata || {}), error: error.message || String(error) }
      : metadata;

    return await createAuditLog({
      action,
      entityType,
      entityId,
      user,
      changes,
      metadata: mergedMetadata,
      status: determinedStatus,
      request,
    });
  } catch (err) {
    console.error("Failed in logActivity:", err);
    return null;
  }
}
