import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";
import { getCurrentUser, checkPermission } from "../middleware/auth.js";

// Create a new work location
export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPerm = await checkPermission(user.userId, "location.create", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied. 'location.create' or 'location.manage' permission required." },
        { status: 403 }
      );
    }

    const db = await getDb();
    const data = await request.json();

    const {
      name,
      address,
      latitude,
      longitude,
      radius = 500,
      description = "",
    } = data;

    // Validation
    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const workLocation = {
      name,
      address: address || "",
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius) || 500,
      description: description || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
      assignedEmployees: [], // Array of employee IDs assigned to this location
    };

    const result = await db
      .collection("work_locations")
      .insertOne(workLocation);

    // Create audit log
    await createAuditLog({
      action: "CREATE",
      entityType: "work_location",
      entityId: result.insertedId.toString(),
      userId: user.userId || "system",
      userEmail: user.email || "user@company.com",
      metadata: {
        locationName: name,
        address: address,
        coordinates: `${latitude}, ${longitude}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Work location created successfully",
        location: { ...workLocation, _id: result.insertedId },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating work location:", error);
    return NextResponse.json(
      { error: "Failed to create work location" },
      { status: 500 }
    );
  }
}

// Get all work locations
export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (user && user.userId !== "guest" && user.authenticated) {
      const hasPerm =
        user.role === "ADMIN" ||
        user.role === "EMPLOYEE" ||
        (await checkPermission(user.userId, "location.read", user.role)) ||
        (await checkPermission(user.userId, "attendance.checkin", user.role)) ||
        (await checkPermission(user.userId, "employee.read.own", user.role));

      if (!hasPerm) {
        return NextResponse.json(
          { error: "Access denied. 'location.read' or employee access required." },
          { status: 403 }
        );
      }
    }

    const db = await getDb();

    // Get all work locations with employee count
    const workLocations = await db
      .collection("work_locations")
      .aggregate([
        {
          $lookup: {
            from: "employees",
            localField: "assignedEmployees",
            foreignField: "_id",
            as: "employees",
          },
        },
        {
          $addFields: {
            employeeCount: { $size: "$employees" },
          },
        },
        {
          $project: {
            employees: 0, // Don't include full employee data in response
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    const normalizedLocations = workLocations.map((loc) => ({
      ...loc,
      name: loc.name || loc.siteName || "",
      siteName: loc.siteName || loc.name || "",
      address: loc.address || "",
      radius: typeof loc.radius === "number" ? loc.radius : 500,
      createdAt: loc.createdAt || new Date(),
    }));

    return NextResponse.json({
      success: true,
      locations: normalizedLocations,
    });
  } catch (error) {
    console.error("Error fetching work locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch work locations" },
      { status: 500 }
    );
  }
}
