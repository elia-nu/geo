import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../audit/route";

// Create a new project
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const {
      name,
      description,
      category,
      startDate,
      endDate,
      status = "active",
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

    // Create project object
    const project = {
      name,
      description: description || "",
      category: category || "general",
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
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;

    const db = await getDb();

    // Build query
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (employeeId) query.assignedEmployees = new ObjectId(employeeId);

    const skip = (page - 1) * limit;

    // Fetch projects with lookup for employee details
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "employees",
          localField: "assignedEmployees",
          foreignField: "_id",
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
                    "Unknown",
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
      },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

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
