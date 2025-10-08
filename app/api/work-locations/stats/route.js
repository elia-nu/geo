import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

// Get work location statistics
export async function GET() {
  try {
    const db = await getDb();

    // Get all work locations with employee counts
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
            _id: 1,
            name: 1,
            address: 1,
            latitude: 1,
            longitude: 1,
            radius: 1,
            status: 1,
            employeeCount: 1,
            createdAt: 1,
          },
        },
        {
          $sort: { employeeCount: -1 },
        },
      ])
      .toArray();

    // Calculate statistics
    const totalLocations = workLocations.length;
    const activeLocations = workLocations.filter(
      (loc) => loc.status === "active"
    ).length;
    const totalEmployeesAssigned = workLocations.reduce(
      (sum, loc) => sum + loc.employeeCount,
      0
    );

    // Get top 5 locations by employee count
    const topLocations = workLocations.slice(0, 5).map((loc) => ({
      name: loc.name,
      address: loc.address,
      employeeCount: loc.employeeCount,
      status: loc.status,
    }));

    // Get employees without assigned locations
    const employeesWithoutLocation = await db
      .collection("employees")
      .countDocuments({
        $or: [
          { workLocation: { $exists: false } },
          { workLocation: null },
          { workLocation: "" },
        ],
      });

    const stats = {
      total: totalLocations,
      active: activeLocations,
      totalEmployeesAssigned,
      employeesWithoutLocation,
      topLocations,
      locations: workLocations,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching work location statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch work location statistics" },
      { status: 500 }
    );
  }
}
