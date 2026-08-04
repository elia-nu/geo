import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Get all project categories
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    // Build filter
    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      filter.status = status;
    }

    const [total, categories] = await Promise.all([
      db.collection("projectCategories").countDocuments(filter),
      db
        .collection("projectCategories")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    return NextResponse.json({
      success: true,
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching project categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch project categories" },
      { status: 500 }
    );
  }
}

// Create new project category
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();

    const { name, description, status = "active" } = data;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Check if category with same name already exists
    const existingCategory = await db
      .collection("projectCategories")
      .findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    // Create category
    const category = {
      name: name.trim(),
      description: description?.trim() || "",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("projectCategories").insertOne(category);

    const createdCategory = {
      _id: result.insertedId,
      ...category,
    };

    // Create audit log
    await createAuditLog({
      action: "CREATE_PROJECT_CATEGORY",
      entityType: "projectCategory",
      entityId: result.insertedId.toString(),
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        categoryName: name,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Project category created successfully",
      category: createdCategory,
    });
  } catch (error) {
    console.error("Error creating project category:", error);
    return NextResponse.json(
      { error: "Failed to create project category" },
      { status: 500 }
    );
  }
}
