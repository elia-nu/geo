import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import bcrypt from "bcryptjs";

// Get a specific employee by ID
export async function GET(request, { params }) {
  try {
    const db = await getDb();

    console.log("Fetching employee with ID:", params.id);

    // Find the employee
    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    console.log("Found employee:", employee);

    // Serialize ObjectId to string for JSON response
    const serializedEmployee = {
      ...employee,
      _id: employee._id.toString(),
    };

    return NextResponse.json({
      success: true,
      employee: serializedEmployee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// Update an employee
export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const db = await getDb();

    // Get the current employee data for audit trail
    const currentEmployee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!currentEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Add updated timestamp
    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("employees")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updateData });

    // After updating employee, check if they need user role/password
    const employeeId = params.id;
    const employeeEmail =
      body.personalDetails?.email ||
      body.email ||
      currentEmployee.personalDetails?.email ||
      currentEmployee.email;
    const employeeName =
      body.personalDetails?.name ||
      body.name ||
      currentEmployee.personalDetails?.name ||
      currentEmployee.name;

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
    const hasPassword =
      body.password ||
      body.personalDetails?.password ||
      currentEmployee.password ||
      currentEmployee.personalDetails?.password;

    // Create password if missing
    if (!hasPassword) {
      // Generate a random password
      const randomPassword = Math.random().toString(36).slice(-8) + "123!";
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

      // Update employee with password
      if (body.personalDetails || currentEmployee.personalDetails) {
        // New format - update personalDetails
        await db.collection("employees").updateOne(
          { _id: new ObjectId(params.id) },
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
          { _id: new ObjectId(params.id) },
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

    // Create audit log with changes
    const changes = {};
    Object.keys(body).forEach((key) => {
      if (JSON.stringify(currentEmployee[key]) !== JSON.stringify(body[key])) {
        changes[key] = {
          before: currentEmployee[key],
          after: body[key],
        };
      }
    });

    // Add role/password creation to audit metadata
    const auditMetadata = {
      employeeName: employeeName,
      department:
        body.personalDetails?.department ||
        body.department ||
        currentEmployee.personalDetails?.department ||
        currentEmployee.department,
    };

    if (roleCreated || passwordCreated) {
      auditMetadata.roleCreated = roleCreated;
      auditMetadata.passwordCreated = passwordCreated;
      auditMetadata.userAccountSetup = true;
    }

    await createAuditLog({
      action: "UPDATE",
      entityType: "employee",
      entityId: params.id,
      userId: "system",
      userEmail: "system@company.com",
      changes: changes,
      metadata: auditMetadata,
    });

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      data: {
        ...result,
        roleCreated,
        passwordCreated,
        loginEnabled: true,
        // Only return the plain password in development
        ...(process.env.NODE_ENV === "development" &&
          passwordCreated && { generatedPassword: randomPassword }),
      },
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee", message: error.message },
      { status: 500 }
    );
  }
}

// Delete an employee
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();

    // Get the employee data before deletion for audit trail
    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(params.id),
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee has associated documents
    const documentCount = await db.collection("documents").countDocuments({
      employeeId: params.id,
    });

    if (documentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete employee with ${documentCount} associated documents. Please delete or reassign documents first.`,
        },
        { status: 400 }
      );
    }

    const result = await db
      .collection("employees")
      .deleteOne({ _id: new ObjectId(params.id) });

    // Create audit log
    await createAuditLog({
      action: "DELETE",
      entityType: "employee",
      entityId: params.id,
      userId: "system", // Replace with actual user ID when auth is implemented
      userEmail: "system@company.com", // Replace with actual user email
      metadata: {
        employeeName: employee.personalDetails?.name,
        department: employee.department,
        deletedData: employee, // Store the deleted data for recovery purposes
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
