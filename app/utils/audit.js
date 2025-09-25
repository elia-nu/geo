import { getDb } from "../api/mongo";

function generateAuditId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Utility function to create audit log (can be imported by other modules)
export async function createAuditLog({
  action,
  entityType,
  entityId,
  userId,
  userEmail,
  changes = null,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const db = await getDb();

    const auditLog = {
      id: generateAuditId(),
      action, // CREATE, UPDATE, DELETE, VIEW, EXPORT, etc.
      entityType, // employee, document, notification, etc.
      entityId,
      userId,
      userEmail,
      changes, // Object showing what changed (before/after)
      metadata, // Additional context
      ipAddress,
      userAgent,
      timestamp: new Date(),
    };

    await db.collection("audit_logs").insertOne(auditLog);
    return auditLog.id;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}
