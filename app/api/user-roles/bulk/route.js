import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../middleware/auth";

// POST /api/user-roles/bulk — assign a role to multiple users at once
export async function POST(request) {
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

    const body = await request.json();
    const { userIds, roleName } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!roleName) {
      return NextResponse.json(
        { error: "roleName is required" },
        { status: 400 }
      );
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 users per bulk operation" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Validate role
    const roleDef = await db
      .collection("roles")
      .findOne({ name: roleName, isActive: true });
    if (!roleDef) {
      return NextResponse.json(
        { error: `Role '${roleName}' not found or is inactive` },
        { status: 404 }
      );
    }

    // Filter out self-assignment
    const filteredUserIds = userIds.filter((id) => id !== currentUser.userId);
    if (filteredUserIds.length < userIds.length) {
      // At least one was the current user
    }

    const results = {
      success: [],
      failed: [],
      skippedSelf: userIds.length - filteredUserIds.length,
    };

    for (const userId of filteredUserIds) {
      try {
        // Validate employee exists
        let employee = null;
        if (ObjectId.isValid(userId)) {
          employee = await db
            .collection("employees")
            .findOne({ _id: new ObjectId(userId) });
        }
        if (!employee) {
          results.failed.push({ userId, reason: "Employee not found" });
          continue;
        }

        // Deactivate existing role
        const previousRole = await db
          .collection("user_roles")
          .findOne({ userId, isActive: true });

        if (previousRole) {
          // Skip if already has the same role
          if ((previousRole.roleName || previousRole.role) === roleName) {
            results.success.push({
              userId,
              name: employee.personalDetails?.name || employee.name,
              status: "already_assigned",
            });
            continue;
          }

          await db.collection("user_roles").updateOne(
            { _id: previousRole._id },
            {
              $set: {
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: currentUser.userId,
                replacedByRole: roleName,
              },
            }
          );
        }

        // Assign new role
        const employeeEmail =
          employee.personalDetails?.email || employee.email || "";
        await db.collection("user_roles").insertOne({
          userId,
          email: employeeEmail,
          roleId: roleDef._id,
          roleName: roleDef.name,
          role: roleDef.name,
          permissions: roleDef.permissions,
          assignedBy: currentUser.userId,
          assignedByEmail: currentUser.email,
          assignedAt: new Date(),
          isActive: true,
        });

        // Sync role to employee record
        try {
          if (ObjectId.isValid(userId)) {
            await db.collection("employees").updateOne(
              { _id: new ObjectId(userId) },
              {
                $set: {
                  role: roleDef.name,
                  "personalDetails.role": roleDef.name,
                  updatedAt: new Date(),
                },
              }
            );
          }
        } catch (empSyncErr) {
          console.error("Error syncing role to employee in bulk:", empSyncErr);
        }

        // Role history
        await db.collection("role_history").insertOne({
          userId,
          userEmail: employeeEmail,
          previousRole: previousRole?.roleName || previousRole?.role || null,
          newRole: roleName,
          assignedBy: currentUser.userId,
          assignedByEmail: currentUser.email,
          timestamp: new Date(),
          bulkOperation: true,
        });

        results.success.push({
          userId,
          name: employee.personalDetails?.name || employee.name,
          previousRole: previousRole?.roleName || previousRole?.role || null,
          status: "assigned",
        });
      } catch (err) {
        results.failed.push({ userId, reason: err.message });
      }
    }

    // Single audit log for bulk operation
    try {
      await db.collection("audit_logs").insertOne({
        action: "ROLE_BULK_ASSIGNED",
        entityType: "user_role",
        entityId: null,
        userId: currentUser.userId,
        userEmail: currentUser.email,
        metadata: {
          roleName,
          totalRequested: userIds.length,
          successCount: results.success.length,
          failedCount: results.failed.length,
          skippedSelf: results.skippedSelf,
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      message: `Bulk role assignment completed: ${results.success.length} successful, ${results.failed.length} failed`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk role assignment:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk role assignment" },
      { status: 500 }
    );
  }
}
