import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// GET all employees with aggregated data from normalized tables
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("includeDetails") === "true";
    const department = searchParams.get("department");
    const designation = searchParams.get("designation");
    const location = searchParams.get("location");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query for employees
    let query = {};
    if (department) query.department = department;
    if (designation) query.designation = designation;
    if (location) query.workLocation = location;

    const skip = (page - 1) * limit;

    if (includeDetails) {
      // Use aggregation pipeline to join all related data
      const pipeline = [
        { $match: query },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "employment_history",
            localField: "_id",
            foreignField: "employeeId",
            as: "employmentHistory",
            pipeline: [
              { $addFields: { employeeId: { $toObjectId: "$employeeId" } } },
            ],
          },
        },
        {
          $lookup: {
            from: "certifications",
            localField: "_id",
            foreignField: "employeeId",
            as: "certifications",
            pipeline: [
              { $addFields: { employeeId: { $toObjectId: "$employeeId" } } },
            ],
          },
        },
        {
          $lookup: {
            from: "employee_skills",
            localField: "_id",
            foreignField: "employeeId",
            as: "skills",
            pipeline: [
              { $addFields: { employeeId: { $toObjectId: "$employeeId" } } },
            ],
          },
        },
        {
          $lookup: {
            from: "health_records",
            localField: "_id",
            foreignField: "employeeId",
            as: "healthRecords",
            pipeline: [
              { $addFields: { employeeId: { $toObjectId: "$employeeId" } } },
              { $limit: 1 },
            ],
          },
        },
        {
          $addFields: {
            healthRecords: { $arrayElemAt: ["$healthRecords", 0] },
            skillsList: {
              $map: {
                input: "$skills",
                as: "skill",
                in: "$$skill.skillName",
              },
            },
            certificationsCount: { $size: "$certifications" },
            employmentHistoryCount: { $size: "$employmentHistory" },
            skillsCount: { $size: "$skills" },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ];

      const employees = await db
        .collection("employees")
        .aggregate(pipeline)
        .toArray();
      const totalCount = await db.collection("employees").countDocuments(query);

      return NextResponse.json({
        employees,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      });
    } else {
      // Simple employee list without details
      const employees = await db
        .collection("employees")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalCount = await db.collection("employees").countDocuments(query);

      // Add basic counts for each employee
      const employeesWithCounts = await Promise.all(
        employees.map(async (employee) => {
          const employeeId = employee._id.toString();

          const [
            employmentHistoryCount,
            certificationsCount,
            skillsCount,
            hasHealthRecords,
          ] = await Promise.all([
            db.collection("employment_history").countDocuments({ employeeId }),
            db.collection("certifications").countDocuments({ employeeId }),
            db.collection("employee_skills").countDocuments({ employeeId }),
            db.collection("health_records").countDocuments({ employeeId }),
          ]);

          return {
            ...employee,
            counts: {
              employmentHistory: employmentHistoryCount,
              certifications: certificationsCount,
              skills: skillsCount,
              hasHealthRecords: hasHealthRecords > 0,
            },
          };
        })
      );

      return NextResponse.json({
        employees: employeesWithCounts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching enhanced employee data:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee data" },
      { status: 500 }
    );
  }
}

// POST endpoint for bulk operations on normalized data
export async function POST(request) {
  try {
    const { action, employeeIds, updateData } = await request.json();
    const db = await getDb();

    switch (action) {
      case "bulkDelete":
        return await handleBulkDelete(db, employeeIds);
      case "bulkUpdate":
        return await handleBulkUpdate(db, employeeIds, updateData);
      case "getStats":
        return await handleGetStats(db);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(db, employeeIds) {
  const session = db.client?.startSession();

  try {
    if (session) {
      session.startTransaction();
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const employeeId of employeeIds) {
      try {
        if (!ObjectId.isValid(employeeId)) {
          results.failed++;
          results.errors.push({
            employeeId,
            error: "Invalid employee ID",
          });
          continue;
        }

        // Check if employee exists
        const employee = await db.collection("employees").findOne(
          {
            _id: new ObjectId(employeeId),
          },
          { session }
        );

        if (!employee) {
          results.failed++;
          results.errors.push({
            employeeId,
            error: "Employee not found",
          });
          continue;
        }

        // Delete from all related tables
        await Promise.all([
          db
            .collection("employment_history")
            .deleteMany({ employeeId }, { session }),
          db
            .collection("certifications")
            .deleteMany({ employeeId }, { session }),
          db
            .collection("employee_skills")
            .deleteMany({ employeeId }, { session }),
          db
            .collection("health_records")
            .deleteMany({ employeeId }, { session }),
          db
            .collection("employees")
            .deleteOne({ _id: new ObjectId(employeeId) }, { session }),
        ]);

        results.successful++;

        // Create audit log
        await createAuditLog({
          action: "DELETE",
          entityType: "employee",
          entityId: employeeId,
          userId: "system",
          userEmail: "system@company.com",
          metadata: {
            employeeName: employee.name,
            department: employee.department,
            method: "bulk_delete",
          },
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          employeeId,
          error: error.message,
        });
      }
    }

    if (session) {
      await session.commitTransaction();
    }

    return NextResponse.json({
      message: `Bulk delete completed. ${results.successful} successful, ${results.failed} failed`,
      ...results,
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

async function handleBulkUpdate(db, employeeIds, updateData) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const employeeId of employeeIds) {
    try {
      if (!ObjectId.isValid(employeeId)) {
        results.failed++;
        results.errors.push({
          employeeId,
          error: "Invalid employee ID",
        });
        continue;
      }

      const result = await db.collection("employees").updateOne(
        { _id: new ObjectId(employeeId) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        results.failed++;
        results.errors.push({
          employeeId,
          error: "Employee not found",
        });
      } else {
        results.successful++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        employeeId,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    message: `Bulk update completed. ${results.successful} successful, ${results.failed} failed`,
    ...results,
  });
}

async function handleGetStats(db) {
  const [
    totalEmployees,
    totalEmploymentRecords,
    totalCertifications,
    totalSkills,
    totalHealthRecords,
    departmentStats,
    skillStats,
  ] = await Promise.all([
    db.collection("employees").countDocuments(),
    db.collection("employment_history").countDocuments(),
    db.collection("certifications").countDocuments(),
    db.collection("employee_skills").countDocuments(),
    db.collection("health_records").countDocuments(),
    db
      .collection("employees")
      .aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    db
      .collection("employee_skills")
      .aggregate([
        { $group: { _id: "$skillName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
  ]);

  return NextResponse.json({
    overview: {
      totalEmployees,
      totalEmploymentRecords,
      totalCertifications,
      totalSkills,
      totalHealthRecords,
    },
    departmentDistribution: departmentStats,
    topSkills: skillStats,
    generatedAt: new Date().toISOString(),
  });
}
