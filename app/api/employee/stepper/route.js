import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

export async function POST(request) {
  try {
    const data = await request.json();
    const db = await getDb();

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
          console.log("Using transactions for employee creation");
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
      // 1. Insert Personal Details (main employee record)
      const employeeData = {
        ...data.personalDetails,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      };

      const employeeResult = await db
        .collection("employees")
        .insertOne(employeeData, useTransactions ? { session } : {});
      const employeeId = employeeResult.insertedId;

      // 2. Insert Employment History
      if (data.employmentHistory && data.employmentHistory.length > 0) {
        const employmentRecords = data.employmentHistory.map((job) => ({
          ...job,
          employeeId: employeeId.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await db
          .collection("employment_history")
          .insertMany(employmentRecords, useTransactions ? { session } : {});
      }

      // 3. Insert Certifications
      if (data.certifications && data.certifications.length > 0) {
        const certificationRecords = data.certifications.map((cert) => ({
          ...cert,
          employeeId: employeeId.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: "active",
        }));

        await db
          .collection("certifications")
          .insertMany(certificationRecords, useTransactions ? { session } : {});
      }

      // 4. Insert Skills
      if (data.skills && data.skills.length > 0) {
        const skillRecords = data.skills.map((skill) => ({
          ...skill,
          employeeId: employeeId.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        await db
          .collection("employee_skills")
          .insertMany(skillRecords, useTransactions ? { session } : {});
      }

      // 5. Insert Health Records
      if (data.healthRecords && Object.keys(data.healthRecords).length > 0) {
        const healthRecord = {
          ...data.healthRecords,
          employeeId: employeeId.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          confidential: true,
        };

        await db
          .collection("health_records")
          .insertOne(healthRecord, useTransactions ? { session } : {});
      }

      // Commit transaction if using transactions
      if (useTransactions && session) {
        await session.commitTransaction();
      }

      // Create audit log
      await createAuditLog({
        action: "CREATE",
        entityType: "employee",
        entityId: employeeId.toString(),
        userId: "system",
        userEmail: "system@company.com",
        metadata: {
          employeeName: data.personalDetails?.name,
          department: data.personalDetails?.department,
          method: "stepper_form",
          transactionUsed: useTransactions,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Employee created successfully",
          employeeId: employeeId.toString(),
          data: {
            employee: employeeData,
            employmentHistoryCount: data.employmentHistory?.length || 0,
            certificationsCount: data.certifications?.length || 0,
            skillsCount: data.skills?.length || 0,
            hasHealthRecords: !!(
              data.healthRecords && Object.keys(data.healthRecords).length > 0
            ),
          },
        },
        { status: 201 }
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
    console.error("Error creating employee with stepper:", error);
    return NextResponse.json(
      {
        error: "Failed to create employee",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch employee with all related data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch all related data in parallel
    const [employee, employmentHistory, certifications, skills, healthRecords] =
      await Promise.all([
        db.collection("employees").findOne({ _id: new ObjectId(employeeId) }),
        db.collection("employment_history").find({ employeeId }).toArray(),
        db.collection("certifications").find({ employeeId }).toArray(),
        db.collection("employee_skills").find({ employeeId }).toArray(),
        db.collection("health_records").findOne({ employeeId }),
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
    console.error("Error fetching employee data:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee data" },
      { status: 500 }
    );
  }
}
