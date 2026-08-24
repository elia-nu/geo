import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

export async function GET() {
  try {
    const db = await getDb();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];

    // Execute parallel MongoDB queries
    const [
      employeeTotal,
      activeEmployees,
      departmentStats,
      allDocs,
      workLocations,
      employeesWithoutLocation,
      todayAttendance,
      projectsCount,
    ] = await Promise.all([
      // 1. Total employees
      db.collection("employees").countDocuments({}),

      // 2. Active employees
      db.collection("employees").countDocuments({
        $or: [{ status: "active" }, { status: { $exists: false } }],
      }),

      // 3. Department breakdown
      db.collection("employees").aggregate([
        {
          $project: {
            dept: {
              $ifNull: [
                "$department",
                { $ifNull: ["$personalDetails.department", "Unassigned"] },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$dept",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray(),

      // 4. Document statistics (only projection needed: expiryDate)
      db.collection("documents")
        .find({}, { projection: { expiryDate: 1, status: 1 } })
        .toArray(),

      // 5. Work locations with assigned employee count
      db.collection("work_locations")
        .aggregate([
          {
            $project: {
              name: 1,
              address: 1,
              status: 1,
              employeeCount: {
                $cond: {
                  if: { $isArray: "$assignedEmployees" },
                  then: { $size: "$assignedEmployees" },
                  else: 0,
                },
              },
            },
          },
          { $sort: { employeeCount: -1 } },
        ])
        .toArray(),

      // 6. Employees without assigned location
      db.collection("employees").countDocuments({
        $or: [
          { workLocation: { $exists: false } },
          { workLocation: null },
          { workLocation: "" },
        ],
      }),

      // 7. Today's attendance snapshot (check attendance and daily_attendance)
      db.collection("attendance")
        .find({
          $or: [
            { date: todayStr },
            {
              timestamp: {
                $gte: new Date(todayStr),
                $lt: new Date(new Date(todayStr).getTime() + 86400000),
              },
            },
          ],
        }, { projection: { status: 1, checkInTime: 1 } })
        .toArray()
        .catch(() => []),

      // 8. Projects count
      db.collection("projects").countDocuments({}).catch(() => 0),
    ]);

    // Process documents stats
    let totalDocuments = allDocs.length;
    let expiringDocuments = 0;
    let expiredDocuments = 0;
    let activeDocuments = 0;

    allDocs.forEach((doc) => {
      let expiryDate = null;
      if (doc.expiryDate) {
        if (typeof doc.expiryDate === "string") {
          expiryDate = new Date(doc.expiryDate);
        } else if (doc.expiryDate instanceof Date) {
          expiryDate = doc.expiryDate;
        }
      }

      if (expiryDate && !isNaN(expiryDate.getTime())) {
        if (expiryDate < now) {
          expiredDocuments++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiringDocuments++;
        }
      }

      if (!expiryDate || expiryDate >= now) {
        activeDocuments++;
      }
    });

    // Format department map & array
    const departments = {};
    departmentStats.forEach((item) => {
      if (item._id && item._id !== "") {
        departments[item._id] = item.count;
      }
    });

    // Process work locations
    const totalLocations = workLocations.length;
    const activeLocations = workLocations.filter(
      (loc) => loc.status === "active" || !loc.status
    ).length;
    const totalEmployeesAssigned = workLocations.reduce(
      (sum, loc) => sum + (loc.employeeCount || 0),
      0
    );
    const topLocations = workLocations.slice(0, 5).map((loc) => ({
      name: loc.name,
      address: loc.address || "",
      employeeCount: loc.employeeCount || 0,
      status: loc.status || "active",
    }));

    // Process attendance
    const presentToday = todayAttendance.length;

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees: employeeTotal,
        activeEmployees,
        totalDocuments,
        expiringDocuments,
        expiredDocuments,
        activeDocuments,
        departments,
        workLocationStats: {
          total: totalLocations,
          active: activeLocations,
          totalEmployeesAssigned,
          employeesWithoutLocation,
          topLocations,
        },
        attendanceToday: {
          present: presentToday,
          date: todayStr,
        },
        projectsCount: projectsCount || 0,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate dashboard statistics",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
