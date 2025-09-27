import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Get all departments
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const includeEmployees = searchParams.get("includeEmployees") === "true";

    let query = {};
    if (projectId && ObjectId.isValid(projectId)) {
      query.projectId = new ObjectId(projectId);
    }

    let pipeline = [{ $match: query }];

    if (includeEmployees) {
      pipeline.push({
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "departmentId",
          as: "employees",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: { $ifNull: ["$personalDetails.name", "$name"] },
                email: { $ifNull: ["$personalDetails.email", "$email"] },
                role: { $ifNull: ["$personalDetails.role", "$role"] },
                status: 1,
              },
            },
          ],
        },
      });
    }

    const departments = await db
      .collection("departments")
      .aggregate(pipeline)
      .toArray();

    return NextResponse.json({
      success: true,
      departments,
      total: departments.length,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// Create a new department
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      name,
      description,
      projectId,
      managerId,
      budget,
      status = "active",
    } = data;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    // Check if department already exists in the project
    if (projectId && ObjectId.isValid(projectId)) {
      const existingDepartment = await db.collection("departments").findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        projectId: new ObjectId(projectId),
      });

      if (existingDepartment) {
        return NextResponse.json(
          { error: "Department with this name already exists in the project" },
          { status: 400 }
        );
      }
    }

    const department = {
      name,
      description: description || "",
      projectId:
        projectId && ObjectId.isValid(projectId)
          ? new ObjectId(projectId)
          : null,
      managerId:
        managerId && ObjectId.isValid(managerId)
          ? new ObjectId(managerId)
          : null,
      budget: budget ? parseFloat(budget) : 0,
      status,
      employeeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("departments").insertOne(department);

    // Create audit log
    await createAuditLog({
      action: "CREATE_DEPARTMENT",
      entityType: "department",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        departmentName: name,
        projectId: projectId,
        budget: budget,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Department created successfully",
      department: {
        _id: result.insertedId,
        ...department,
      },
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
