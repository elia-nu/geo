import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { dryRun = false } = await request.json();
    const db = await getDb();

    const migrationResults = {
      employeesProcessed: 0,
      employmentHistoryCreated: 0,
      certificationsCreated: 0,
      skillsCreated: 0,
      healthRecordsCreated: 0,
      errors: [],
    };

    // Get all existing employees from the old structure
    const existingEmployees = await db
      .collection("employees")
      .find({
        $or: [
          { employmentHistory: { $exists: true, $ne: [] } },
          { certifications: { $exists: true, $ne: [] } },
          { skills: { $exists: true, $ne: [] } },
          { healthRecords: { $exists: true } },
        ],
      })
      .toArray();

    console.log(`Found ${existingEmployees.length} employees to migrate`);

    if (dryRun) {
      return NextResponse.json({
        message: "Dry run completed",
        employeesToProcess: existingEmployees.length,
        preview: existingEmployees.slice(0, 5).map((emp) => ({
          id: emp._id,
          name: emp.personalDetails?.name || emp.name,
          hasEmploymentHistory: !!emp.employmentHistory?.length,
          hasCertifications: !!emp.certifications?.length,
          hasSkills: !!emp.skills?.length,
          hasHealthRecords: !!(
            emp.healthRecords && Object.keys(emp.healthRecords).length
          ),
        })),
      });
    }

    // Check if transactions are supported (replica set or mongos)
    let session = null;
    let useTransactions = false;

    try {
      session = db.client?.startSession();
      if (session) {
        session.startTransaction();
        useTransactions = true;
      }
    } catch (transactionError) {
      console.log("Transactions not supported, proceeding without transaction");
      session = null;
      useTransactions = false;
    }

    try {
      for (const employee of existingEmployees) {
        try {
          const employeeId = employee._id.toString();
          migrationResults.employeesProcessed++;

          // 1. Migrate Employment History
          if (
            employee.employmentHistory &&
            employee.employmentHistory.length > 0
          ) {
            const employmentRecords = employee.employmentHistory.map((job) => ({
              ...job,
              employeeId,
              createdAt: employee.createdAt || new Date(),
              updatedAt: new Date(),
            }));

            const existingCount = await db
              .collection("employment_history")
              .countDocuments({
                employeeId,
              });

            if (existingCount === 0) {
              await db
                .collection("employment_history")
                .insertMany(
                  employmentRecords,
                  useTransactions ? { session } : {}
                );
              migrationResults.employmentHistoryCreated +=
                employmentRecords.length;
            }
          }

          // 2. Migrate Certifications
          if (employee.certifications && employee.certifications.length > 0) {
            const certificationRecords = employee.certifications.map(
              (cert) => ({
                ...cert,
                employeeId,
                createdAt: employee.createdAt || new Date(),
                updatedAt: new Date(),
                status: "active",
              })
            );

            const existingCount = await db
              .collection("certifications")
              .countDocuments({
                employeeId,
              });

            if (existingCount === 0) {
              await db
                .collection("certifications")
                .insertMany(
                  certificationRecords,
                  useTransactions ? { session } : {}
                );
              migrationResults.certificationsCreated +=
                certificationRecords.length;
            }
          }

          // 3. Migrate Skills
          if (employee.skills && employee.skills.length > 0) {
            const skillRecords = employee.skills.map((skill) => {
              if (typeof skill === "string") {
                return {
                  skillName: skill,
                  proficiencyLevel: "Intermediate",
                  yearsOfExperience: "",
                  category: "",
                  employeeId,
                  createdAt: employee.createdAt || new Date(),
                  updatedAt: new Date(),
                };
              } else {
                return {
                  ...skill,
                  employeeId,
                  createdAt: employee.createdAt || new Date(),
                  updatedAt: new Date(),
                };
              }
            });

            const existingCount = await db
              .collection("employee_skills")
              .countDocuments({
                employeeId,
              });

            if (existingCount === 0) {
              await db
                .collection("employee_skills")
                .insertMany(skillRecords, useTransactions ? { session } : {});
              migrationResults.skillsCreated += skillRecords.length;
            }
          }

          // 4. Migrate Health Records
          if (
            employee.healthRecords &&
            Object.keys(employee.healthRecords).length > 0
          ) {
            const existingCount = await db
              .collection("health_records")
              .countDocuments({
                employeeId,
              });

            if (existingCount === 0) {
              const healthRecord = {
                ...employee.healthRecords,
                employeeId,
                createdAt: employee.createdAt || new Date(),
                updatedAt: new Date(),
                confidential: true,
              };

              await db
                .collection("health_records")
                .insertOne(healthRecord, useTransactions ? { session } : {});
              migrationResults.healthRecordsCreated++;
            }
          }
        } catch (error) {
          migrationResults.errors.push({
            employeeId: employee._id.toString(),
            employeeName: employee.personalDetails?.name || employee.name,
            error: error.message,
          });
        }
      }

      if (useTransactions && session) {
        await session.commitTransaction();
      }

      return NextResponse.json({
        message: "Migration completed successfully",
        ...migrationResults,
      });
    } catch (error) {
      if (useTransactions && session) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } catch (error) {
    console.error("Error in migration:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        message: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDb();

    // Get collection stats
    const [
      employeesCount,
      employmentHistoryCount,
      certificationsCount,
      skillsCount,
      healthRecordsCount,
    ] = await Promise.all([
      db.collection("employees").countDocuments(),
      db.collection("employment_history").countDocuments(),
      db.collection("certifications").countDocuments(),
      db.collection("employee_skills").countDocuments(),
      db.collection("health_records").countDocuments(),
    ]);

    // Check which employees need migration
    const employeesNeedingMigration = await db
      .collection("employees")
      .countDocuments({
        $or: [
          { employmentHistory: { $exists: true, $ne: [] } },
          { certifications: { $exists: true, $ne: [] } },
          { skills: { $exists: true, $ne: [] } },
          { healthRecords: { $exists: true, $ne: null } },
        ],
      });

    return NextResponse.json({
      currentStats: {
        employees: employeesCount,
        employmentHistory: employmentHistoryCount,
        certifications: certificationsCount,
        skills: skillsCount,
        healthRecords: healthRecordsCount,
      },
      migrationStatus: {
        employeesNeedingMigration,
        migrationNeeded: employeesNeedingMigration > 0,
      },
    });
  } catch (error) {
    console.error("Error checking migration status:", error);
    return NextResponse.json(
      { error: "Failed to check migration status" },
      { status: 500 }
    );
  }
}
