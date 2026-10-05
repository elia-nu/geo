import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../middleware/auth";

// GET /api/user-roles/[userId] — get role for a specific user
export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    const db = await getDb();

    const userRole = await db
      .collection("user_roles")
      .findOne({ userId, isActive: true });

    if (!userRole) {
      return NextResponse.json({
        userRole: null,
        role: "EMPLOYEE",
        permissions: ["employee.read.own", "employee.update.own", "document.read.own", "document.create.own", "attendance.checkin", "leave.request", "task.read.own"],
        message: "No role assigned — defaults to EMPLOYEE",
      });
    }

    // Get the full role definition
    const roleDef = await db
      .collection("roles")
      .findOne({ name: userRole.roleName || userRole.role, isActive: true });

    // Get employee info
    let employee = null;
    if (ObjectId.isValid(userId)) {
      employee = await db.collection("employees").findOne(
        { _id: new ObjectId(userId) },
        {
          projection: {
            "personalDetails.name": 1,
            "personalDetails.email": 1,
            "personalDetails.department": 1,
            "personalDetails.employeeId": 1,
            name: 1,
            email: 1,
          },
        }
      );
    }

    return NextResponse.json({
      userRole,
      roleDef: roleDef || null,
      employee: employee
        ? {
            name: employee.personalDetails?.name || employee.name,
            email: employee.personalDetails?.email || employee.email,
            department: employee.personalDetails?.department || "",
            employeeId: employee.personalDetails?.employeeId || employee.employeeId || "",
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { error: "Failed to fetch user role" },
      { status: 500 }
    );
  }
}

// DELETE /api/user-roles/[userId] — revoke role (reset to EMPLOYEE)
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser(request);
    const hasPermission = await checkPermission(
      currentUser.userId,
      "role.manage",
      currentUser.role
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. 'role.manage' permission required." },
        { status: 403 }
      );
    }

    const { userId } = await params;

    // Prevent self-revocation
    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: "Cannot revoke your own role" },
        { status: 403 }
      );
    }

    const db = await getDb();

    const existing = await db
      .collection("user_roles")
      .findOne({ userId, isActive: true });

    if (!existing) {
      return NextResponse.json(
        { error: "No active role found for this user" },
        { status: 404 }
      );
    }

    // Deactivate current role
    await db.collection("user_roles").updateOne(
      { _id: existing._id },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedBy: currentUser.userId,
          reason: "role_revoked",
        },
      }
    );

    // Get EMPLOYEE role definition and assign it
    const employeeRole = await db
      .collection("roles")
      .findOne({ name: "EMPLOYEE", isActive: true });

    if (employeeRole) {
      await db.collection("user_roles").insertOne({
        userId,
        email: existing.email,
        roleId: employeeRole._id,
        roleName: "EMPLOYEE",
        role: "EMPLOYEE",
        permissions: employeeRole.permissions,
        assignedBy: currentUser.userId,
        assignedByEmail: currentUser.email,
        assignedAt: new Date(),
        isActive: true,
      });
    }

    // Sync role to employee record
    try {
      if (ObjectId.isValid(userId)) {
        await db.collection("employees").updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              role: "EMPLOYEE",
              "personalDetails.role": "EMPLOYEE",
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (empRevokeErr) {
      console.error("Error syncing revoked role to employee:", empRevokeErr);
    }

    // Record in role history
    try {
      await db.collection("role_history").insertOne({
        userId,
        userEmail: existing.email,
        previousRole: existing.roleName || existing.role,
        newRole: "EMPLOYEE",
        action: "ROLE_REVOKED",
        revokedBy: currentUser.userId,
        revokedByEmail: currentUser.email,
        timestamp: new Date(),
      });
    } catch (histErr) {
      console.error("Role history error:", histErr);
    }

    // Audit log
    try {
      await db.collection("audit_logs").insertOne({
        action: "ROLE_REVOKED",
        entityType: "user_role",
        entityId: userId,
        userId: currentUser.userId,
        userEmail: currentUser.email,
        metadata: {
          targetUserId: userId,
          targetEmail: existing.email,
          previousRole: existing.roleName || existing.role,
          newRole: "EMPLOYEE",
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      message: "Role revoked. User reset to EMPLOYEE.",
      previousRole: existing.roleName || existing.role,
    });
  } catch (error) {
    console.error("Error revoking user role:", error);
    return NextResponse.json(
      { error: "Failed to revoke user role" },
      { status: 500 }
    );
  }
}
