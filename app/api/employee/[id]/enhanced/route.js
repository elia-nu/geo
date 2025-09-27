import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../../utils/audit.js";
import bcrypt from "bcryptjs";

// Update employee with enhanced data structure
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const db = await getDb();

    // Validate employee ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    // Check if transactions are supported (replica set or mongos)
    let session = null;
    let useTransactions = false;

    try {
      // Only try to use sessions if the client supports it
      if (db.client && typeof db.client.startSession === "function") {
        session = db.client.startSession();
        if (session) {
          await session.startTransaction();
          useTransactions = true;
          console.log("Using transactions for employee update");
        }
      } else {
        console.log("MongoDB client doesn't support sessions");
      }
    } catch (transactionError) {
      console.log(
        "Transactions not supported, proceeding without transaction:",
        transactionError.message
      );
      if (session) {
        try {
          session.endSession();
        } catch (endError) {
          console.error("Error ending session:", endError);
        }
      }
      session = null;
      useTransactions = false;
    }

    try {
      // Get current employee data for audit
      const currentEmployee = await db
        .collection("employees")
        .findOne({ _id: new ObjectId(id) }, useTransactions ? { session } : {});

      if (!currentEmployee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      // 1. Update main employee record with personal details
      const employeeUpdateData = {
        ...data.personalDetails,
        department: data.personalDetails.department,
        designation: data.personalDetails.designation,
        workLocation: data.personalDetails.workLocation,
        updatedAt: new Date(),
      };

      await db
        .collection("employees")
        .updateOne(
          { _id: new ObjectId(id) },
          { $set: employeeUpdateData },
          useTransactions ? { session } : {}
        );

      // 2. Handle Employment History
      if (data.employmentHistory) {
        // Remove existing employment history
        await db
          .collection("employment_history")
          .deleteMany({ employeeId: id }, useTransactions ? { session } : {});

        // Insert new employment history
        if (data.employmentHistory.length > 0) {
          const employmentRecords = data.employmentHistory.map((job) => ({
            ...job,
            employeeId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          await db
            .collection("employment_history")
            .insertMany(employmentRecords, useTransactions ? { session } : {});
        }
      }

      // 3. Handle Certifications
      if (data.certifications) {
        // Remove existing certifications
        await db
          .collection("certifications")
          .deleteMany({ employeeId: id }, useTransactions ? { session } : {});

        // Insert new certifications
        if (data.certifications.length > 0) {
          const certificationRecords = data.certifications.map((cert) => ({
            ...cert,
            employeeId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: "active",
          }));

          await db
            .collection("certifications")
            .insertMany(
              certificationRecords,
              useTransactions ? { session } : {}
            );
        }
      }

      // 4. Handle Skills
      if (data.skills) {
        // Remove existing skills
        await db
          .collection("employee_skills")
          .deleteMany({ employeeId: id }, useTransactions ? { session } : {});

        // Insert new skills
        if (data.skills.length > 0) {
          const skillRecords = data.skills.map((skill) => ({
            ...skill,
            employeeId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          await db
            .collection("employee_skills")
            .insertMany(skillRecords, useTransactions ? { session } : {});
        }
      }

      // 5. Handle Health Records
      if (data.healthRecords) {
        // Remove existing health records
        await db
          .collection("health_records")
          .deleteMany({ employeeId: id }, useTransactions ? { session } : {});

        // Insert new health records if data exists
        if (
          Object.keys(data.healthRecords).some(
            (key) =>
              data.healthRecords[key] &&
              (typeof data.healthRecords[key] !== "object" ||
                data.healthRecords[key].length > 0)
          )
        ) {
          const healthRecord = {
            ...data.healthRecords,
            employeeId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
            confidential: true,
          };

          await db
            .collection("health_records")
            .insertOne(healthRecord, useTransactions ? { session } : {});
        }
      }

      // 6. Check and create user role/password if missing
      const employeeEmail =
        data.personalDetails?.email ||
        currentEmployee.personalDetails?.email ||
        currentEmployee.email;
      const employeeName =
        data.personalDetails?.name ||
        currentEmployee.personalDetails?.name ||
        currentEmployee.name;

      let roleCreated = false;
      let passwordCreated = false;

      // Check if employee has a user role
      const existingRole = await db.collection("user_roles").findOne(
        {
          userId: id,
          isActive: true,
        },
        useTransactions ? { session } : {}
      );

      // Create role if missing
      if (!existingRole) {
        const userRole = {
          userId: id,
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

        await db
          .collection("user_roles")
          .insertOne(userRole, useTransactions ? { session } : {});
        roleCreated = true;
        console.log(`✅ Created role for employee: ${employeeName} (${id})`);
      }

      // Check if employee has a password
      const hasPassword =
        data.personalDetails?.password ||
        currentEmployee.password ||
        currentEmployee.personalDetails?.password;

      // Create password if missing
      if (!hasPassword) {
        // Generate a random password
        const randomPassword = Math.random().toString(36).slice(-8) + "123!";
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

        // Update employee with password
        await db.collection("employees").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              "personalDetails.password": hashedPassword,
              password: hashedPassword, // Also set at root level for compatibility
              updatedAt: new Date(),
            },
          },
          useTransactions ? { session } : {}
        );

        passwordCreated = true;
        console.log(
          `✅ Created password for employee: ${employeeName} (${id})`
        );
      }

      // Commit transaction if using transactions
      if (useTransactions && session) {
        await session.commitTransaction();
      }

      // Create audit log
      const auditMetadata = {
        employeeName: data.personalDetails?.name,
        department: data.personalDetails?.department,
        changes: {
          personalDetails: data.personalDetails !== undefined,
          employmentHistory: data.employmentHistory !== undefined,
          certifications: data.certifications !== undefined,
          skills: data.skills !== undefined,
          healthRecords: data.healthRecords !== undefined,
        },
        transactionUsed: useTransactions,
      };

      if (roleCreated || passwordCreated) {
        auditMetadata.roleCreated = roleCreated;
        auditMetadata.passwordCreated = passwordCreated;
        auditMetadata.userAccountSetup = true;
      }

      await createAuditLog({
        action: "UPDATE_ENHANCED",
        entityType: "employee",
        entityId: id,
        userId: "system",
        userEmail: "system@company.com",
        metadata: auditMetadata,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Employee updated successfully",
          employeeId: id,
          data: {
            roleCreated,
            passwordCreated,
            loginEnabled: true,
            // Only return the plain password in development
            ...(process.env.NODE_ENV === "development" &&
              passwordCreated && { generatedPassword: randomPassword }),
          },
        },
        { status: 200 }
      );
    } catch (error) {
      // Rollback transaction on error if using transactions
      if (useTransactions && session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          console.error("Error aborting transaction:", abortError);
        }
      }
      throw error;
    } finally {
      if (session) {
        try {
          session.endSession();
        } catch (endError) {
          console.error("Error ending session:", endError);
        }
      }
    }
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      {
        error: "Failed to update employee",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Get employee with all enhanced data
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    // Fetch all related data in parallel
    const [employee, employmentHistory, certifications, skills, healthRecords] =
      await Promise.all([
        db.collection("employees").findOne({ _id: new ObjectId(id) }),
        db.collection("employment_history").find({ employeeId: id }).toArray(),
        db.collection("certifications").find({ employeeId: id }).toArray(),
        db.collection("employee_skills").find({ employeeId: id }).toArray(),
        db.collection("health_records").findOne({ employeeId: id }),
      ]);

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      employee,
      employmentHistory,
      certifications,
      skills,
      healthRecords: healthRecords || {},
    });
  } catch (error) {
    console.error("Error fetching enhanced employee data:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee data" },
      { status: 500 }
    );
  }
}
