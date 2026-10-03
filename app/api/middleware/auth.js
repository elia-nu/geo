import { getDb } from "../mongo";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Extract user from JWT token
export async function getCurrentUser(request) {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get("authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookie
      const cookies = request.headers.get("cookie");
      if (cookies) {
        const tokenMatch = cookies.match(/authToken=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }
    }

    // If no token found, try headers as fallback
    if (!token) {
      const userEmail = request.headers.get("x-user-email");
      const userId = request.headers.get("x-user-id");
      
      if (userId && userEmail) {
        return {
          userId,
          email: userEmail,
          role: request.headers.get("x-user-role") || "EMPLOYEE",
          permissions: [],
          authenticated: true,
        };
      }
    }

    // If still no token, return unauthenticated guest user
    // NOTE: Previously this defaulted to ADMIN which was a security hole.
    // Individual API routes that truly need backward-compat system access
    // should check for this and handle accordingly.
    if (!token) {
      return {
        userId: "guest",
        email: null,
        role: "GUEST",
        permissions: [],
        authenticated: false,
      };
    }

    // Verify and decode JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        userId: decoded.employeeId || decoded.userId || "unknown",
        email: decoded.email || null,
        role: decoded.role || "EMPLOYEE",
        permissions: decoded.permissions || [],
        department: decoded.department || null,
        name: decoded.name || null,
        authenticated: true,
      };
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      // Invalid/expired token — return unauthenticated
      return {
        userId: "guest",
        email: null,
        role: "GUEST",
        permissions: [],
        authenticated: false,
        tokenError: jwtError.message,
      };
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    return {
      userId: "guest",
      email: null,
      role: "GUEST",
      permissions: [],
      authenticated: false,
    };
  }
}

// Check if a user has a specific permission
export async function checkPermission(userId, permission, userRoleFromToken = null) {
  try {
    // ADMIN role always has all permissions
    if (userRoleFromToken === "ADMIN") {
      return true;
    }

    const db = await getDb();

    // Get user's role assignment from DB
    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    let roleName = userRole?.roleName || userRole?.role || userRoleFromToken;
    let effectivePerms = userRole?.permissions || [];

    // Always fetch fresh permissions from the role definition
    if (roleName) {
      const roleDoc = await db.collection("roles").findOne({ name: roleName, isActive: true });
      if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0) {
        effectivePerms = roleDoc.permissions;
      }
    }

    if (!userRole && (!effectivePerms || effectivePerms.length === 0)) {
      // Default employee permissions
      const defaultPerms = [
        "employee.read.own", "employee.update.own",
        "document.read.own", "document.create.own",
        "attendance.checkin", "leave.request", "task.read.own",
      ];
      return defaultPerms.includes(permission);
    }

    // ADMIN role or wildcard permissions
    if (roleName === "ADMIN") {
      return true;
    }

    if (effectivePerms.includes("*")) {
      return true;
    }

    // Check specific permission
    if (effectivePerms.includes(permission)) {
      return true;
    }

    // Cross-compatibility aliases for reports
    if (permission === "reports.payroll" || permission === "payroll.reports") {
      if (
        effectivePerms.includes("reports.payroll") ||
        effectivePerms.includes("payroll.reports") ||
        effectivePerms.includes("payroll.manage")
      ) {
        return true;
      }
    }

    if (permission === "reports.attendance" || permission === "attendance.reports") {
      if (
        effectivePerms.includes("reports.attendance") ||
        effectivePerms.includes("attendance.reports") ||
        effectivePerms.includes("attendance.manage")
      ) {
        return true;
      }
    }

    if (permission === "reports.project" || permission === "project.reports") {
      if (
        effectivePerms.includes("reports.project") ||
        effectivePerms.includes("project.reports") ||
        effectivePerms.includes("project.read")
      ) {
        return true;
      }
    }

    if (permission === "reports.leave" || permission === "leave.reports" || permission === "leave.manage") {
      if (
        effectivePerms.includes("reports.leave") ||
        effectivePerms.includes("leave.reports") ||
        effectivePerms.includes("leave.manage")
      ) {
        return true;
      }
    }

    if (permission === "reports.read") {
      if (
        effectivePerms.includes("reports.read") ||
        effectivePerms.some((p) => typeof p === "string" && p.startsWith("reports."))
      ) {
        return true;
      }
    }

    // Check for broader permission (e.g., "employee.read" covers "employee.read.own")
    const permParts = permission.split(".");
    if (permParts.length > 2) {
      const broaderPerm = permParts.slice(0, 2).join(".");
      if (effectivePerms.includes(broaderPerm)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    // On error, only grant if ADMIN from token (fail-closed)
    if (userRoleFromToken === "ADMIN") {
      return true;
    }
    return false;
  }
}

// Check multiple permissions at once (returns true if user has ANY of them)
export async function checkAnyPermission(userId, permissions, userRoleFromToken = null) {
  for (const perm of permissions) {
    if (await checkPermission(userId, perm, userRoleFromToken)) {
      return true;
    }
  }
  return false;
}

// Check multiple permissions at once (returns true if user has ALL of them)
export async function checkAllPermissions(userId, permissions, userRoleFromToken = null) {
  for (const perm of permissions) {
    if (!(await checkPermission(userId, perm, userRoleFromToken))) {
      return false;
    }
  }
  return true;
}

// Higher-order function that wraps an API handler with permission checking
export async function requirePermission(permission) {
  return async function middleware(request, handler) {
    try {
      const user = await getCurrentUser(request);

      if (!user.authenticated) {
        return new Response(
          JSON.stringify({
            error: "Authentication required",
            message: "Please log in to access this resource",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const hasPermission = await checkPermission(user.userId, permission, user.role);

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

// Helper: require authentication (any logged-in user)
export async function requireAuth(request) {
  const user = await getCurrentUser(request);
  if (!user.authenticated) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to access this resource",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }
  return { user, error: null };
}

// Helper function to check if user can access specific employee data
export async function canAccessEmployee(userId, employeeId, permission) {
  const hasGeneralPermission = await checkPermission(userId, permission);
  if (hasGeneralPermission) return true;

  // Check if user has permission to access their own data
  const hasOwnPermission = await checkPermission(userId, permission + ".own");
  if (hasOwnPermission) {
    // Check if the employeeId belongs to the current user
    return userId === employeeId;
  }

  return false;
}

// Audit logging with user context
export async function logWithUser(action, entityType, entityId, metadata = {}) {
  try {
    const { createAuditLog } = await import("../audit/route");

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

// Role hierarchy check — now supports dynamic roles from DB
export async function hasHigherRole(userRole, targetRole) {
  try {
    const db = await getDb();

    const [userRoleDef, targetRoleDef] = await Promise.all([
      db.collection("roles").findOne({ name: userRole, isActive: true }),
      db.collection("roles").findOne({ name: targetRole, isActive: true }),
    ]);

    const userLevel = userRoleDef?.level ?? 0;
    const targetLevel = targetRoleDef?.level ?? 0;

    return userLevel > targetLevel;
  } catch (error) {
    console.error("Error in role hierarchy check:", error);
    // Fallback to hardcoded hierarchy
    const fallback = { ADMIN: 100, HR_MANAGER: 80, HR_STAFF: 60, MANAGER: 50, PROJECT_MANAGER: 50, FINANCE: 40, EMPLOYEE: 10 };
    return (fallback[userRole] || 0) > (fallback[targetRole] || 0);
  }
}

// Get user's role and level
export async function getUserRole(userId) {
  try {
    const db = await getDb();

    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    return userRole ? (userRole.roleName || userRole.role) : "EMPLOYEE";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "EMPLOYEE";
  }
}

// Get full user permissions (combines role permissions)
export async function getUserPermissions(userId) {
  try {
    const db = await getDb();

    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    if (!userRole) {
      return {
        role: "EMPLOYEE",
        permissions: ["employee.read.own", "employee.update.own", "document.read.own", "document.create.own", "attendance.checkin", "leave.request", "task.read.own"],
        level: 10,
      };
    }

    const roleName = userRole.roleName || userRole.role;

    // Get role definition for level info
    const roleDef = await db.collection("roles").findOne({
      name: roleName,
      isActive: true,
    });

    return {
      role: roleName,
      permissions: userRole.permissions || [],
      level: roleDef?.level || 0,
      displayName: roleDef?.displayName || roleName,
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return {
      role: "EMPLOYEE",
      permissions: [],
      level: 10,
    };
  }
}
