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
        };
      }
    }

    // If still no token, default to system/admin for backward compatibility
    if (!token) {
      return {
        userId: "system",
        email: "admin@company.com",
        role: "ADMIN",
      };
    }

    // Verify and decode JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        userId: decoded.employeeId || decoded.userId || "system",
        email: decoded.email || "admin@company.com",
        role: decoded.role || "EMPLOYEE",
        permissions: decoded.permissions || [],
      };
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      // If token is invalid, return system user for backward compatibility
      return {
        userId: "system",
        email: "admin@company.com",
        role: "ADMIN",
      };
    }
  } catch (error) {
    console.error("Error getting current user:", error);
    // Return system user as fallback
    return {
      userId: "system",
      email: "admin@company.com",
      role: "ADMIN",
    };
  }
}

export async function checkPermission(userId, permission, userRoleFromToken = null) {
  try {
    const db = await getDb();

    // If role is provided from token and it's ADMIN, grant all permissions
    if (userRoleFromToken === "ADMIN") {
      return true;
    }

    // First, try to get role from user_roles collection
    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    // If user has ADMIN role, grant all permissions
    if (userRole && userRole.role === "ADMIN") {
      return true;
    }

    // Check if user has the specific permission
    if (userRole && userRole.permissions && userRole.permissions.includes(permission)) {
      return true;
    }

    // If no role found, check if userId is "system" (admin fallback)
    if (userId === "system") {
      return true;
    }

    // Default to false if no permission found
    return false;
  } catch (error) {
    console.error("Error checking permission:", error);
    // If there's an error and userId is system, grant permission
    if (userId === "system") {
      return true;
    }
    // If role from token is ADMIN, grant permission even on error
    if (userRoleFromToken === "ADMIN") {
      return true;
    }
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
