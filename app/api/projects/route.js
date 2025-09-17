import { NextResponse } from "next/server";
import { getDb } from "../mongo";

export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { client: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      db
        .collection("projects")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("projects").countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    if (!data.name || !data.description || !data.startDate || !data.endDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, description, startDate, endDate",
        },
        { status: 400 }
      );
    }

    const existingProject = await db.collection("projects").findOne({
      name: data.name,
    });

    if (existingProject) {
      return NextResponse.json(
        { success: false, error: "Project with this name already exists" },
        { status: 409 }
      );
    }

    const project = {
      name: data.name,
      description: data.description,
      client: data.client || "",
      category: data.category || "General",
      priority: data.priority || "Medium",
      status: "Planning", // Initial status
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budget: data.budget || 0,
      progress: 0,
      teamMembers: data.teamMembers || [],
      milestones: [],
      tasks: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy || "system",
      tags: data.tags || [],
    };

    const result = await db.collection("projects").insertOne(project);

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        data: { ...project, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}
