import { getDb } from "../mongo.js";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build filter
    let filter = {};

    if (userId) {
      filter = {
        $or: [{ projectManager: userId }, { teamMembers: { $in: [userId] } }],
      };
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { client: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Get projects with pagination
    const [projects, totalCount] = await Promise.all([
      db
        .collection("projects")
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("projects").countDocuments(filter),
    ]);

    // Get employee details for enrichment
    const employeeIds = new Set();
    projects.forEach((project) => {
      if (project.projectManager) employeeIds.add(project.projectManager);
      if (project.teamMembers) {
        project.teamMembers.forEach((member) => employeeIds.add(member));
      }
    });

    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: Array.from(employeeIds).map((id) => new ObjectId(id)) },
      })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = emp.personalDetails?.name || "Unknown";
    });

    // Enrich projects with employee names
    const enrichedProjects = projects.map((project) => ({
      ...project,
      projectManagerName: employeeMap[project.projectManager] || "Unknown",
      teamMemberNames:
        project.teamMembers?.map(
          (memberId) => employeeMap[memberId] || "Unknown"
        ) || [],
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return Response.json({
      success: true,
      projects: enrichedProjects,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return Response.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description || !body.projectManager) {
      return Response.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create project
    const project = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: body.createdBy || body.projectManager,
      lastModifiedBy: body.projectManager,
      progress: body.progress || 0,
      actualCost: body.actualCost || 0,
      status: body.status || "planning",
    };

    const result = await db.collection("projects").insertOne(project);

    return Response.json({
      success: true,
      project: { _id: result.insertedId, ...project },
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return Response.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}
