import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../middleware/auth";
import { getAllPermissionKeys } from "./permissions/route";

// GET /api/roles — list all roles
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const withUserCount = searchParams.get("withUserCount") === "true";

    const query = includeInactive ? {} : { isActive: true };
    const roles = await db
      .collection("roles")
      .find(query)
      .sort({ level: -1, displayName: 1 })
      .toArray();

    // Optionally attach user count per role
    if (withUserCount) {
      const userCounts = await db
        .collection("user_roles")
        .aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$roleName", count: { $sum: 1 } } },
        ])
        .toArray();
      const countMap = {};
      for (const uc of userCounts) {
        countMap[uc._id] = uc.count;
      }
      for (const role of roles) {
        role.userCount = countMap[role.name] || 0;
      }
    }

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST /api/roles — create a new role
export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "role.manage", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. 'role.manage' permission required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, displayName, description, level, permissions } = body;

    // Validation
    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Role name and display name are required" },
        { status: 400 }
      );
    }

    // Validate name format (uppercase, underscores, no spaces)
    const nameRegex = /^[A-Z][A-Z0-9_]{1,49}$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        {
          error:
            "Role name must be uppercase letters, numbers, and underscores (e.g. HR_MANAGER). 2-50 characters.",
        },
        { status: 400 }
      );
    }

    // Validate level
    const roleLevel = typeof level === "number" ? level : 1;
    if (roleLevel < 0 || roleLevel > 100) {
      return NextResponse.json(
        { error: "Role level must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Prevent creating a role with a higher level than the current user's role
    const db = await getDb();
    const currentUserRole = await db.collection("user_roles").findOne({
      userId: user.userId,
      isActive: true,
    });
    if (currentUserRole) {
      const currentRoleDef = await db.collection("roles").findOne({
        name: currentUserRole.roleName || currentUserRole.role,
        isActive: true,
      });
      if (currentRoleDef && roleLevel > currentRoleDef.level && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Cannot create a role with a higher level than your own" },
          { status: 403 }
        );
      }
    }

    // Validate permissions against catalog
    const validKeys = getAllPermissionKeys();
    const cleanedPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => validKeys.includes(p))
      : [];

    // Check for duplicate role name
    const existing = await db.collection("roles").findOne({ name });
    if (existing) {
      return NextResponse.json(
        { error: `Role '${name}' already exists` },
        { status: 409 }
      );
    }

    const newRole = {
      name,
      displayName: displayName.trim(),
      description: (description || "").trim(),
      level: roleLevel,
      permissions: cleanedPermissions,
      isSystem: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
    };

    const result = await db.collection("roles").insertOne(newRole);

    // Audit log
    try {
      await db.collection("audit_logs").insertOne({
        action: "ROLE_CREATED",
        entityType: "role",
        entityId: result.insertedId.toString(),
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          roleName: name,
          displayName,
          level: roleLevel,
          permissionCount: cleanedPermissions.length,
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json(
      {
        message: "Role created successfully",
        role: { ...newRole, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
