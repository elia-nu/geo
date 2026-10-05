import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";
import { getCurrentUser, checkPermission } from "../middleware/auth.js";

// Create a new project
export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.authenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const hasPerm = await checkPermission(user.userId, "project.create", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied: Missing 'project.create' permission" },
        { status: 403 }
      );
    }

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
      imageUrl,
      image,
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

    // Ensure creator is assigned to the new project so they can view and manage it
    if (user.userId) {
      const creatorIdStr = String(user.userId);
      const isAlreadyAssigned = employeeObjectIds.some(
        (id) => String(id) === creatorIdStr
      );
      if (!isAlreadyAssigned && ObjectId.isValid(user.userId)) {
        employeeObjectIds.push(new ObjectId(user.userId));
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
      imageUrl: imageUrl || image || null,
      assignedEmployees: employeeObjectIds,
      createdBy: ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : user.userId,
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
      user,
      request,
      metadata: {
        projectName: name,
        category,
        startDate,
        endDate,
        assignedEmployees: employeeObjectIds.length,
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

// Get all projects with optional filtering and role-based assignment scoping
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.authenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check project read permissions:
    // "project.read" grants viewing ALL projects across the organization.
    // "project.read.assigned" grants viewing ONLY projects where the user is assigned.
    const canReadAll = await checkPermission(user.userId, "project.read", user.role);
    const canReadAssigned =
      canReadAll ||
      (await checkPermission(user.userId, "project.read.assigned", user.role)) ||
      (await checkPermission(user.userId, "project.read.own", user.role));

    if (!canReadAll && !canReadAssigned) {
      return NextResponse.json(
        { error: "Access denied: Missing 'project.read' or 'project.read.assigned' permission" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const assignedOnly = searchParams.get("assignedOnly") === "true";
    const includeEmployees = searchParams.get("includeEmployees") === "true";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query
    let query = {};

    if (category && category !== "all") query.category = category;
    if (status && status !== "all") query.status = status;
    if (employeeId && ObjectId.isValid(employeeId)) {
      query.assignedEmployees = new ObjectId(employeeId);
    }

    // If user cannot read all projects, or client explicitly asked for assignedOnly
    if (!canReadAll || assignedOnly) {
      const userObjectId = ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null;
      const userIds = [String(user.userId)];
      if (userObjectId) userIds.push(userObjectId);

      const assignedFilter = {
        $or: [
          { assignedEmployees: { $in: userIds } },
          { managerId: { $in: userIds } },
          { projectManager: { $in: userIds } },
          { createdBy: { $in: userIds } },
          { "team.employeeId": { $in: userIds } },
        ],
      };

      if (Object.keys(query).length > 0) {
        query = { $and: [query, assignedFilter] };
      } else {
        query = assignedFilter;
      }
    }

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
