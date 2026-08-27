import { getDb } from "../mongo";
import { ObjectId } from "mongodb";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance * 1000; // Convert to meters
}

export async function GET(req) {
  const db = await getDb();
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  const employeeId = url.searchParams.get("employeeId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const collection = url.searchParams.get("collection") || "attendance"; // Default to attendance collection

  if (id) {
    const doc = await db.collection(collection).findOne({ id });
    if (!doc) return new Response("Not found", { status: 404 });
    return Response.json(doc);
  }

  // Build query
  let query = {};
  if (employeeId) {
    const trimmedEmpId = employeeId.trim();
    // Try to find the matching employee document first to resolve IDs
    let matchedEmp = null;
    if (ObjectId.isValid(trimmedEmpId)) {
      matchedEmp = await db.collection("employees").findOne({ _id: new ObjectId(trimmedEmpId) });
    }
    if (!matchedEmp) {
      matchedEmp = await db.collection("employees").findOne({
        $or: [
          { employeeId: trimmedEmpId },
          { empId: trimmedEmpId },
          { "personalDetails.employeeId": trimmedEmpId },
        ],
      });
    }

    if (matchedEmp) {
      const possibleIds = [
        matchedEmp._id.toString(),
        matchedEmp._id,
        trimmedEmpId,
        matchedEmp.employeeId,
        matchedEmp.empId,
      ].filter(Boolean);
      query.employeeId = { $in: possibleIds };
    } else {
      query.employeeId = trimmedEmpId;
    }
  }

  if (startDate && endDate) {
    query.date = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  if (collection === "daily_attendance") {
    // Get attendance records with employee details
    const attendanceRecords = await db
      .collection("daily_attendance")
      .find(query)
      .sort({ date: -1, checkInTime: -1 })
      .toArray();

    // Get employee details for each record safely
    const rawEmployeeIds = [
      ...new Set(attendanceRecords.map((record) => record.employeeId).filter(Boolean)),
    ];
    const validObjectIds = rawEmployeeIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => (typeof id === "string" ? new ObjectId(id) : id));

    const employees = await db
      .collection("employees")
      .find({
        $or: [
          ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
          { employeeId: { $in: rawEmployeeIds } },
          { empId: { $in: rawEmployeeIds } },
        ],
      })
      .toArray();

    // Create employee lookup map
    const employeeMap = {};
    employees.forEach((emp) => {
      const empCode =
        emp.employeeId ||
        emp.empId ||
        emp.personalDetails?.employeeId ||
        emp._id.toString();
      const empData = {
        _id: emp._id.toString(),
        employeeId: empCode,
        empId: empCode,
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "",
        designation: emp.designation || emp.personalDetails?.designation || "",
      };
      employeeMap[emp._id.toString()] = empData;
      if (emp.employeeId) employeeMap[emp.employeeId] = empData;
      if (emp.empId) employeeMap[emp.empId] = empData;
    });

    // Enhance attendance records with employee details
    const enhancedRecords = attendanceRecords.map((record) => {
      const emp =
        employeeMap[record.employeeId?.toString()] ||
        employeeMap[record.employeeId] || {
          name: record.employeeName || "Unknown Employee",
          employeeId: record.employeeId || "—",
          empId: record.employeeId || "—",
        };
      return {
        ...record,
        employee: emp,
      };
    });

    return Response.json(enhancedRecords);
  } else {
    // Original behavior for attendance collection
    const docs = await db.collection("attendance").find(query).toArray();
    return Response.json(docs);
  }
}

export async function POST(req) {
  const db = await getDb();
  const data = await req.json();

  // Validate geofence if user location is provided
  if (data.lat && data.lng && data.name) {
    try {
      // Get user's geofence
      const geofence = await db
        .collection("geofences")
        .findOne({ name: data.name });

      if (geofence) {
        // Calculate distance from geofence center
        const distance = calculateDistance(
          data.lat,
          data.lng,
          geofence.lat,
          geofence.lng
        );

        // Check if user is outside geofence radius
        if (distance > geofence.radius) {
          return new Response(
            JSON.stringify({
              error: `You are outside your allowed area. Distance: ${Math.round(
                distance
              )}m, Allowed radius: ${geofence.radius}m`,
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Add geofence validation info to attendance record
        data.geofenceValidated = true;
        data.distanceFromCenter = Math.round(distance);
        data.geofenceRadius = geofence.radius;
      }
    } catch (error) {
      console.error("Error validating geofence:", error);
      return new Response(
        JSON.stringify({ error: "Failed to validate location" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  await db.collection("attendance").insertOne(data);
  return Response.json({ success: true });
}

export async function PUT(req) {
  const db = await getDb();
  const data = await req.json();
  if (!data.id) return new Response("Missing id", { status: 400 });
  const result = await db
    .collection("attendance")
    .updateOne({ id: data.id }, { $set: data });
  if (result.matchedCount === 0)
    return new Response("Not found", { status: 404 });
  return Response.json({ success: true });
}

export async function DELETE(req) {
  const db = await getDb();
  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });
  const result = await db.collection("attendance").deleteOne({ id });
  if (result.deletedCount === 0)
    return new Response("Not found", { status: 404 });
  return Response.json({ success: true });
}
