import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../middleware/auth";
import { getAllPermissionKeys } from "../../../utils/permissions";

// GET /api/roles/[id] — get a single role by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    let query;
    if (ObjectId.isValid(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      // Also allow lookup by name (e.g. "HR_MANAGER")
      query = { name: id.toUpperCase() };
    }

    const role = await db.collection("roles").findOne(query);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Get user count for this role
    const userCount = await db
      .collection("user_roles")
      .countDocuments({ roleName: role.name, isActive: true });

    return NextResponse.json({ role: { ...role, userCount } });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] — update a role
export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "role.manage", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. 'role.manage' permission required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = await getDb();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const existingRole = await db
      .collection("roles")
      .findOne({ _id: new ObjectId(id) });
    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const body = await request.json();
    const { displayName, description, level, permissions } = body;

    // System roles: name and isSystem cannot be changed
    if (existingRole.isSystem && body.name && body.name !== existingRole.name) {
      return NextResponse.json(
        { error: "Cannot rename system roles" },
        { status: 403 }
      );
    }

    // Build update
    const update = { updatedAt: new Date() };

    if (displayName !== undefined) update.displayName = displayName.trim();
    if (description !== undefined) update.description = description.trim();

    if (level !== undefined) {
      const roleLevel = typeof level === "number" ? level : existingRole.level;
      if (roleLevel < 0 || roleLevel > 100) {
        return NextResponse.json(
          { error: "Role level must be between 0 and 100" },
          { status: 400 }
        );
      }
      update.level = roleLevel;
    }

    if (permissions !== undefined) {
      const validKeys = getAllPermissionKeys();
      update.permissions = Array.isArray(permissions)
        ? permissions.filter((p) => validKeys.includes(p))
        : existingRole.permissions;
    }

    await db
      .collection("roles")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    // If permissions changed, cascade update to all users with this role
    if (update.permissions) {
      await db.collection("user_roles").updateMany(
        { roleName: existingRole.name, isActive: true },
        {
          $set: {
            permissions: update.permissions,
            permissionsUpdatedAt: new Date(),
          },
        }
      );
    }

    // Audit log
    try {
      const changes = {};
      if (update.displayName && update.displayName !== existingRole.displayName)
        changes.displayName = { from: existingRole.displayName, to: update.displayName };
      if (update.level !== undefined && update.level !== existingRole.level)
        changes.level = { from: existingRole.level, to: update.level };
      if (update.permissions) {
        const added = update.permissions.filter(
          (p) => !existingRole.permissions.includes(p)
        );
        const removed = existingRole.permissions.filter(
          (p) => !update.permissions.includes(p)
        );
        if (added.length || removed.length) {
          changes.permissions = { added, removed };
        }
      }

      await db.collection("audit_logs").insertOne({
        action: "ROLE_UPDATED",
        entityType: "role",
        entityId: id,
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          roleName: existingRole.name,
          changes,
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    const updatedRole = await db
      .collection("roles")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      message: "Role updated successfully",
      role: updatedRole,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] — soft-delete a role
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    const hasPermission = await checkPermission(user.userId, "role.manage", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. 'role.manage' permission required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const db = await getDb();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });
    }

    const role = await db
      .collection("roles")
      .findOne({ _id: new ObjectId(id) });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return NextResponse.json(
        { error: `Cannot delete system role '${role.name}'` },
        { status: 403 }
      );
    }

    // Check if any users are assigned to this role
    const assignedCount = await db
      .collection("user_roles")
      .countDocuments({ roleName: role.name, isActive: true });
    if (assignedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role '${role.displayName || role.name}'. ${assignedCount} user(s) are still assigned. Please reassign users before deleting this role.`,
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db.collection("roles").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy: user.userId,
        },
      }
    );

    // Audit log
    try {
      await db.collection("audit_logs").insertOne({
        action: "ROLE_DELETED",
        entityType: "role",
        entityId: id,
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          roleName: role.name,
          displayName: role.displayName,
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
