import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

// Role definitions
const ROLES = {
  ADMIN: {
    name: "Administrator",
    permissions: [
      "employee.create",
      "employee.read",
      "employee.update",
      "employee.delete",
      "document.create",
      "document.read",
      "document.update",
      "document.delete",
      "reports.read",
      "reports.export",
      "audit.read",
      "settings.manage",
      "user.create",
      "user.update",
      "user.delete",
      "notifications.manage",
    ],
  },
  HR_MANAGER: {
    name: "HR Manager",
    permissions: [
      "employee.create",
      "employee.read",
      "employee.update",
      "document.create",
      "document.read",
      "document.update",
      "document.delete",
      "reports.read",
      "reports.export",
      "audit.read",
      "notifications.manage",
    ],
  },
  HR_STAFF: {
    name: "HR Staff",
    permissions: [
      "employee.read",
      "employee.update",
      "document.create",
      "document.read",
      "document.update",
      "reports.read",
    ],
  },
  EMPLOYEE: {
    name: "Employee",
    permissions: [
      "employee.read.own",
      "employee.update.own",
      "document.read.own",
      "document.create.own",
    ],
  },
};

// Create or update user role
export async function POST(request) {
  try {
    const { userId, email, role, assignedBy } = await request.json();

    if (!ROLES[role]) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const db = await getDb();

    const userRole = {
      userId,
      email,
      role,
      permissions: ROLES[role].permissions,
      assignedBy,
      assignedAt: new Date(),
      isActive: true,
    };

    // Upsert user role
    const result = await db
      .collection("user_roles")
      .updateOne({ userId }, { $set: userRole }, { upsert: true });

    return NextResponse.json({
      message: "User role assigned successfully",
      role: userRole,
    });
  } catch (error) {
    console.error("Error assigning user role:", error);
    return NextResponse.json(
      { error: "Failed to assign user role" },
      { status: 500 }
    );
  }
}

// Get user roles
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    const db = await getDb();

    let query = { isActive: true };
    if (userId) query.userId = userId;
    if (role) query.role = role;

    const userRoles = await db.collection("user_roles").find(query).toArray();

    return NextResponse.json({
      userRoles,
      availableRoles: ROLES,
    });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch user roles" },
      { status: 500 }
    );
  }
}

// Check user permissions
export async function PUT(request) {
  try {
    const { userId, permission } = await request.json();

    const db = await getDb();

    const userRole = await db.collection("user_roles").findOne({
      userId,
      isActive: true,
    });

    if (!userRole) {
      return NextResponse.json({
        hasPermission: false,
        message: "User role not found",
      });
    }

    const hasPermission = userRole.permissions.includes(permission);

    return NextResponse.json({
      hasPermission,
      userRole: userRole.role,
      permissions: userRole.permissions,
    });
  } catch (error) {
    console.error("Error checking user permission:", error);
    return NextResponse.json(
      { error: "Failed to check user permission" },
      { status: 500 }
    );
  }
}

// Deactivate user role
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db.collection("user_roles").updateOne(
      { userId },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "User role deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating user role:", error);
    return NextResponse.json(
      { error: "Failed to deactivate user role" },
      { status: 500 }
    );
  }
}
