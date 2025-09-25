import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { createAuditLog } from "../../audit/route";

// Check and fix existing employees without user roles or passwords
export async function POST(request) {
  try {
    const db = await getDb();
    const { dryRun = false, batchSize = 10 } = await request.json();

    console.log(
      `🔍 Checking existing employees for missing user roles/passwords...`
    );
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE UPDATE"}`);
    console.log(`Batch Size: ${batchSize}`);

    // Get all employees
    const employees = await db.collection("employees").find({}).toArray();
    console.log(`📊 Found ${employees.length} total employees`);

    const results = {
      totalEmployees: employees.length,
      employeesWithoutRoles: [],
      employeesWithoutPasswords: [],
      employeesFixed: [],
      errors: [],
    };

    // Check each employee
    for (const employee of employees) {
      const employeeId = employee._id.toString();
      const employeeEmail = employee.personalDetails?.email || employee.email;
      const employeeName = employee.personalDetails?.name || employee.name;

      try {
        // Check if employee has a user role
        const existingRole = await db.collection("user_roles").findOne({
          userId: employeeId,
          isActive: true,
        });

        // Check if employee has a password
        const hasPassword =
          employee.password || employee.personalDetails?.password;

        const employeeInfo = {
          employeeId: employee._id,
          employeeIdCode:
            employee.employeeId || employee.personalDetails?.employeeId,
          name: employeeName,
          email: employeeEmail,
          department:
            employee.personalDetails?.department || employee.department,
        };

        if (!existingRole) {
          results.employeesWithoutRoles.push(employeeInfo);
        }

        if (!hasPassword) {
          results.employeesWithoutPasswords.push(employeeInfo);
        }

        // If employee needs fixing and we're not in dry run mode
        if ((!existingRole || !hasPassword) && !dryRun) {
          const fixedEmployee = await fixEmployeeUserAccount(employee, db);
          if (fixedEmployee) {
            results.employeesFixed.push({
              ...employeeInfo,
              roleCreated: !existingRole,
              passwordCreated: !hasPassword,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employeeId}:`, error);
        results.errors.push({
          employeeId: employee._id,
          name: employeeName,
          error: error.message,
        });
      }
    }

    // Create audit log
    if (!dryRun && results.employeesFixed.length > 0) {
      await createAuditLog({
        action: "MIGRATE_EMPLOYEE_USERS",
        entityType: "employee",
        entityId: "bulk_migration",
        userId: "system",
        userEmail: "system@company.com",
        metadata: {
          totalProcessed: employees.length,
          employeesFixed: results.employeesFixed.length,
          rolesCreated: results.employeesFixed.filter((e) => e.roleCreated)
            .length,
          passwordsCreated: results.employeesFixed.filter(
            (e) => e.passwordCreated
          ).length,
          errors: results.errors.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? "Dry run completed - no changes made"
        : `Migration completed - ${results.employeesFixed.length} employees fixed`,
      results,
    });
  } catch (error) {
    console.error("Error during employee migration:", error);
    return NextResponse.json(
      {
        error: "Failed to migrate employees",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to fix an individual employee's user account
async function fixEmployeeUserAccount(employee, db) {
  try {
    const employeeId = employee._id.toString();
    const employeeEmail = employee.personalDetails?.email || employee.email;
    const employeeName = employee.personalDetails?.name || employee.name;

    let roleCreated = false;
    let passwordCreated = false;

    // Check if employee has a user role
    const existingRole = await db.collection("user_roles").findOne({
      userId: employeeId,
      isActive: true,
    });

    // Create role if missing
    if (!existingRole) {
      const userRole = {
        userId: employeeId,
        email: employeeEmail,
        role: "EMPLOYEE",
        permissions: [
          "employee.read.own",
          "employee.update.own",
          "document.read.own",
          "document.create.own",
        ],
        assignedBy: "system",
        assignedAt: new Date(),
        isActive: true,
      };

      await db.collection("user_roles").insertOne(userRole);
      roleCreated = true;
      console.log(
        `✅ Created role for employee: ${employeeName} (${employeeId})`
      );
    }

    // Check if employee has a password
    const hasPassword = employee.password || employee.personalDetails?.password;

    // Create password if missing
    if (!hasPassword) {
      // Generate a random password
      const randomPassword = Math.random().toString(36).slice(-8) + "123!";
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

      // Update employee with password
      if (employee.personalDetails) {
        // New format - update personalDetails
        await db.collection("employees").updateOne(
          { _id: employee._id },
          {
            $set: {
              "personalDetails.password": hashedPassword,
              password: hashedPassword, // Also set at root level for compatibility
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Old format - update directly
        await db.collection("employees").updateOne(
          { _id: employee._id },
          {
            $set: {
              password: hashedPassword,
              updatedAt: new Date(),
            },
          }
        );
      }

      passwordCreated = true;
      console.log(
        `✅ Created password for employee: ${employeeName} (${employeeId})`
      );
    }

    return {
      employeeId,
      name: employeeName,
      email: employeeEmail,
      roleCreated,
      passwordCreated,
    };
  } catch (error) {
    console.error(`Error fixing employee ${employee._id}:`, error);
    throw error;
  }
}

// GET endpoint to check status of existing employees
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get("checkOnly") === "true";

    console.log("🔍 Checking existing employees status...");

    // Get all employees
    const employees = await db.collection("employees").find({}).toArray();
    console.log(`📊 Found ${employees.length} total employees`);

    const status = {
      totalEmployees: employees.length,
      employeesWithRoles: 0,
      employeesWithoutRoles: 0,
      employeesWithPasswords: 0,
      employeesWithoutPasswords: 0,
      employeesReadyForLogin: 0,
      employeesNeedingFix: 0,
      details: [],
    };

    // Check each employee
    for (const employee of employees) {
      const employeeId = employee._id.toString();
      const employeeEmail = employee.personalDetails?.email || employee.email;
      const employeeName = employee.personalDetails?.name || employee.name;

      // Check if employee has a user role
      const existingRole = await db.collection("user_roles").findOne({
        userId: employeeId,
        isActive: true,
      });

      // Check if employee has a password
      const hasPassword =
        employee.password || employee.personalDetails?.password;

      const hasRole = !!existingRole;
      const needsFix = !hasRole || !hasPassword;
      const readyForLogin = hasRole && hasPassword;

      if (hasRole) status.employeesWithRoles++;
      else status.employeesWithoutRoles++;

      if (hasPassword) status.employeesWithPasswords++;
      else status.employeesWithoutPasswords++;

      if (readyForLogin) status.employeesReadyForLogin++;
      if (needsFix) status.employeesNeedingFix++;

      if (checkOnly) {
        status.details.push({
          employeeId: employee._id,
          employeeIdCode:
            employee.employeeId || employee.personalDetails?.employeeId,
          name: employeeName,
          email: employeeEmail,
          department:
            employee.personalDetails?.department || employee.department,
          hasRole,
          hasPassword,
          readyForLogin,
          needsFix,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Employee status check completed",
      status,
    });
  } catch (error) {
    console.error("Error checking employee status:", error);
    return NextResponse.json(
      {
        error: "Failed to check employee status",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
