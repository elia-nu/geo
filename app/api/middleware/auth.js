import { getDb } from "../mongo";

// Mock authentication - replace with your actual auth system
export async function getCurrentUser(request) {
  // In a real application, you would extract the user from JWT token, session, etc.
  // For now, we'll use a header or default to system user
  const userEmail = request.headers.get("x-user-email") || "admin@company.com";
  const userId = request.headers.get("x-user-id") || "system";

  return {
    userId,
    email: userEmail,
    // You might also get name, department, etc. from your auth system
  };
}

export async function checkPermission(userId, permission) {
  try {
    const db = await getDb();

    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    if (!userRole) {
      // Default to employee permissions if no role found
      return false;
    }

    return userRole.permissions.includes(permission);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

export async function requirePermission(permission) {
  return async function middleware(request, handler) {
    try {
      const user = await getCurrentUser(request);
      const hasPermission = await checkPermission(user.userId, permission);

      if (!hasPermission) {
        return new Response(
          JSON.stringify({
            error: "Access denied",
            message: `Permission '${permission}' required`,
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Add user context to request for use in handlers
      request.user = user;
      return await handler(request);
    } catch (error) {
      console.error("Error in permission middleware:", error);
      return new Response(JSON.stringify({ error: "Authentication error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

// Helper function to check if user can access specific employee data
export async function canAccessEmployee(userId, employeeId, permission) {
  const hasGeneralPermission = await checkPermission(userId, permission);
  if (hasGeneralPermission) return true;

  // Check if user has permission to access their own data
  const hasOwnPermission = await checkPermission(userId, permission + ".own");
  if (hasOwnPermission) {
    // Check if the employeeId belongs to the current user
    // This would require linking users to employees in your system
    return userId === employeeId; // Simplified check
  }

  return false;
}

// Audit logging with user context
export async function logWithUser(action, entityType, entityId, metadata = {}) {
  try {
    const { createAuditLog } = await import("../audit/route");

    // In a real application, you would get the current user from context
    // For now, we'll use default values
    await createAuditLog({
      action,
      entityType,
      entityId,
      userId: "system",
      userEmail: "system@company.com",
      metadata,
    });
  } catch (error) {
    console.error("Error logging audit:", error);
  }
}

// Role hierarchy check
export function hasHigherRole(userRole, targetRole) {
  const roleHierarchy = {
    ADMIN: 4,
    HR_MANAGER: 3,
    HR_STAFF: 2,
    EMPLOYEE: 1,
  };

  return roleHierarchy[userRole] > roleHierarchy[targetRole];
}

// Get user's role level
export async function getUserRole(userId) {
  try {
    const db = await getDb();

    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    return userRole ? userRole.role : "EMPLOYEE"; // Default to employee
  } catch (error) {
    console.error("Error getting user role:", error);
    return "EMPLOYEE";
  }
}
