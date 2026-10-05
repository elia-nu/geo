import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../middleware/auth";

// GET /api/user-roles — list all user-role assignments
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const roleName = searchParams.get("role");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const db = await getDb();

    // Build query
    const query = { isActive: true };
    if (roleName) query.roleName = roleName;

    // Get user roles
    let userRoles = await db
      .collection("user_roles")
      .find(query)
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Enrich with employee data
    const employeeIds = userRoles
      .map((ur) => {
        try {
          return ObjectId.isValid(ur.userId) ? new ObjectId(ur.userId) : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeIds } })
      .project({
        "personalDetails.name": 1,
        "personalDetails.email": 1,
        "personalDetails.department": 1,
        "personalDetails.employeeId": 1,
        employeeId: 1,
        name: 1,
        email: 1,
        department: 1,
      })
      .toArray();

    const employeeMap = {};
    for (const emp of employees) {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.personalDetails?.department || emp.department || "",
        employeeId: emp.personalDetails?.employeeId || emp.employeeId || "",
      };
    }

    userRoles = userRoles.map((ur) => ({
      ...ur,
      employee: employeeMap[ur.userId] || null,
    }));

    // Apply search filter on enriched data
    if (search) {
      const searchLower = search.toLowerCase();
      userRoles = userRoles.filter(
        (ur) =>
          ur.employee?.name?.toLowerCase().includes(searchLower) ||
          ur.employee?.email?.toLowerCase().includes(searchLower) ||
          ur.employee?.employeeId?.toLowerCase().includes(searchLower) ||
          ur.email?.toLowerCase().includes(searchLower) ||
          ur.roleName?.toLowerCase().includes(searchLower)
      );
    }

    const total = await db.collection("user_roles").countDocuments(query);

    return NextResponse.json({
      userRoles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch user roles" },
      { status: 500 }
    );
  }
}

// POST /api/user-roles — assign a role to a user
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
    const { userId, roleName } = body;

    if (!userId || !roleName) {
      return NextResponse.json(
        { error: "userId and roleName are required" },
        { status: 400 }
      );
    }

    // Prevent self-assignment
    if (userId === currentUser.userId) {
      return NextResponse.json(
        { error: "Cannot change your own role. Ask another admin." },
        { status: 403 }
      );
    }

    const db = await getDb();

    // Validate role exists
    const roleDef = await db
      .collection("roles")
      .findOne({ name: roleName, isActive: true });
    if (!roleDef) {
      return NextResponse.json(
        { error: `Role '${roleName}' not found or is inactive` },
        { status: 404 }
      );
    }

    // Validate employee exists
    let employee = null;
    if (ObjectId.isValid(userId)) {
      employee = await db
        .collection("employees")
        .findOne({ _id: new ObjectId(userId) });
    }
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check role level hierarchy (can't assign a role higher than your own, unless ADMIN)
    if (currentUser.role !== "ADMIN") {
      const currentUserRoleDef = await db
        .collection("roles")
        .findOne({ name: currentUser.role, isActive: true });
      if (currentUserRoleDef && roleDef.level > currentUserRoleDef.level) {
        return NextResponse.json(
          { error: "Cannot assign a role with a higher level than your own" },
          { status: 403 }
        );
      }
    }

    // Get previous role for audit
    const previousRole = await db
      .collection("user_roles")
      .findOne({ userId, isActive: true });

    // Deactivate any existing active role for this user
    if (previousRole) {
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

    // Create new role assignment
    const employeeEmail =
      employee.personalDetails?.email || employee.email || "";
    const newAssignment = {
      userId,
      email: employeeEmail,
      roleId: roleDef._id,
      roleName: roleDef.name,
      role: roleDef.name, // Keep backward compatibility
      permissions: roleDef.permissions,
      assignedBy: currentUser.userId,
      assignedByEmail: currentUser.email,
      assignedAt: new Date(),
      isActive: true,
    };

    await db.collection("user_roles").insertOne(newAssignment);

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
      console.error("Error syncing role to employee:", empSyncErr);
    }

    // Record in role history
    try {
      await db.collection("role_history").insertOne({
        userId,
        userEmail: employeeEmail,
        previousRole: previousRole?.roleName || previousRole?.role || null,
        newRole: roleName,
        assignedBy: currentUser.userId,
        assignedByEmail: currentUser.email,
        timestamp: new Date(),
      });
    } catch (histErr) {
      console.error("Role history error:", histErr);
    }

    // Audit log
    try {
      await db.collection("audit_logs").insertOne({
        action: "ROLE_ASSIGNED",
        entityType: "user_role",
        entityId: userId,
        userId: currentUser.userId,
        userEmail: currentUser.email,
        metadata: {
          targetUserId: userId,
          targetEmail: employeeEmail,
          targetName: employee.personalDetails?.name || employee.name,
          previousRole: previousRole?.roleName || previousRole?.role || null,
          newRole: roleName,
          permissionCount: roleDef.permissions.length,
        },
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({
      message: `Role '${roleDef.displayName}' assigned to ${employee.personalDetails?.name || employee.name || "user"}`,
      assignment: newAssignment,
    });
  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }
}
