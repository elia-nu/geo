import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Create a new project
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      name,
      description,
      category,
      categoryId,
      startDate,
      endDate,
      status = "not_started",
      assignedEmployees = [],
      milestones = [],
    } = data;

    // Validation
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Convert employee IDs to ObjectIds
    const employeeObjectIds = assignedEmployees.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    // Validate categoryId if provided
    let categoryObjectId = null;
    if (categoryId) {
      if (!ObjectId.isValid(categoryId)) {
        return NextResponse.json(
          { error: "Invalid category ID" },
          { status: 400 }
        );
      }
      categoryObjectId = new ObjectId(categoryId);

      // Verify category exists
      const categoryExists = await db.collection("projectCategories").findOne({
        _id: categoryObjectId,
        status: "active",
      });

      if (!categoryExists) {
        return NextResponse.json(
          { error: "Project category not found or inactive" },
          { status: 400 }
        );
      }
    }

    // Create project object
    const project = {
      name,
      description: description || "",
      category: category || "general", // Keep for backward compatibility
      categoryId: categoryObjectId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      progress: 0,
      assignedEmployees: employeeObjectIds,
      milestones: milestones.map((milestone) => ({
        ...milestone,
        _id: new ObjectId(),
        status: milestone.status || "pending",
        createdAt: new Date(),
      })),
      // Initialize financial structure
      budget: null, // Budget will be created separately
      budgetAllocations: [],
      expenses: [],
      income: [],
      financialStatus: {
        totalBudget: 0,
        totalExpenses: 0,
        totalIncome: 0,
        budgetUtilization: 0,
        profitLoss: 0,
        lastUpdated: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("projects").insertOne(project);

    // Create audit log
    await createAuditLog({
      action: "CREATE",
      entityType: "project",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: name,
        category,
        startDate,
        endDate,
        assignedEmployees: assignedEmployees.length,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        project: { ...project, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}

// Get all projects with optional filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const includeEmployees = searchParams.get("includeEmployees") === "true";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (employeeId) query.assignedEmployees = new ObjectId(employeeId);

    const skip = (page - 1) * limit;

    // List view skips the heavy employee $lookup by default — callers that need
    // full employee details can pass includeEmployees=true.
    const pipeline = [{ $match: query }];

    if (includeEmployees) {
      pipeline.push(
        {
          $lookup: {
            from: "employees",
            localField: "assignedEmployees",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  "personalDetails.name": 1,
                  "personalDetails.fullName": 1,
                  "personalDetails.firstName": 1,
                  "personalDetails.lastName": 1,
                  "personalDetails.email": 1,
                  "personalDetails.department": 1,
                  name: 1,
                  fullName: 1,
                  firstName: 1,
                  lastName: 1,
                  email: 1,
                  department: 1,
                },
              },
            ],
            as: "assignedEmployeeDetails",
          },
        },
        {
          $addFields: {
            assignedEmployeeDetails: {
              $map: {
                input: "$assignedEmployeeDetails",
                as: "employee",
                in: {
                  _id: "$$employee._id",
                  name: {
                    $ifNull: [
                      "$$employee.personalDetails.name",
                      "$$employee.name",
                      "$$employee.personalDetails.fullName",
                      "$$employee.fullName",
                      {
                        $trim: {
                          input: {
                            $concat: [
                              {
                                $ifNull: [
                                  "$$employee.personalDetails.firstName",
                                  "$$employee.firstName",
                                  "",
                                ],
                              },
                              " ",
                              {
                                $ifNull: [
                                  "$$employee.personalDetails.lastName",
                                  "$$employee.lastName",
                                  "",
                                ],
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                  email: {
                    $ifNull: [
                      "$$employee.personalDetails.email",
                      "$$employee.email",
                      "",
                    ],
                  },
                  department: {
                    $ifNull: [
                      "$$employee.department",
                      "$$employee.personalDetails.department",
                      "",
                    ],
                  },
                },
              },
            },
          },
        }
      );
    } else {
      // Keep assignedEmployeeDetails.length working for existing UI without a join.
      pipeline.push({
        $addFields: {
          assignedEmployeeDetails: {
            $map: {
              input: { $ifNull: ["$assignedEmployees", []] },
              as: "id",
              in: { _id: "$$id" },
            },
          },
        },
      });
    }

    pipeline.push(
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const [projects, totalCount] = await Promise.all([
      db.collection("projects").aggregate(pipeline).toArray(),
      db.collection("projects").countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
