import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../audit/route";

export async function POST(request) {
  try {
    const data = await request.json();
    const db = await getDb();

    console.log("Creating employee without transactions...");

    // 1. Insert Personal Details (main employee record)
    const employeeData = {
      ...data.personalDetails,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    console.log("Inserting employee data:", employeeData);
    const employeeResult = await db
      .collection("employees")
      .insertOne(employeeData);
    const employeeId = employeeResult.insertedId;
    console.log("Employee created with ID:", employeeId);

    // 2. Insert Employment History
    if (data.employmentHistory && data.employmentHistory.length > 0) {
      const employmentRecords = data.employmentHistory.map((job) => ({
        ...job,
        employeeId: employeeId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      console.log(
        "Inserting employment history:",
        employmentRecords.length,
        "records"
      );
      await db.collection("employment_history").insertMany(employmentRecords);
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

      console.log(
        "Inserting certifications:",
        certificationRecords.length,
        "records"
      );
      await db.collection("certifications").insertMany(certificationRecords);
    }

    // 4. Insert Skills
    if (data.skills && data.skills.length > 0) {
      const skillRecords = data.skills.map((skill) => ({
        ...skill,
        employeeId: employeeId.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      console.log("Inserting skills:", skillRecords.length, "records");
      await db.collection("employee_skills").insertMany(skillRecords);
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

      console.log("Inserting health records");
      await db.collection("health_records").insertOne(healthRecord);
    }

    // Create audit log
    try {
      await createAuditLog({
        action: "CREATE",
        entityType: "employee",
        entityId: employeeId.toString(),
        userId: "system",
        userEmail: "system@company.com",
        metadata: {
          employeeName: data.personalDetails?.name,
          department: data.personalDetails?.department,
          method: "stepper_form_simple",
        },
      });
    } catch (auditError) {
      console.error(
        "Audit log failed, but employee created successfully:",
        auditError
      );
    }

    console.log("Employee creation completed successfully");
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
    console.error("Error creating employee with simple stepper:", error);
    return NextResponse.json(
      {
        error: "Failed to create employee",
        message: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
