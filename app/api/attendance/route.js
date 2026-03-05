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
    query.employeeId = employeeId;
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

    // Get employee details for each record
    const employeeIds = [
      ...new Set(attendanceRecords.map((record) => record.employeeId)),
    ];
    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeIds.map((id) => new ObjectId(id)) } })
      .toArray();

    // Create employee lookup map
    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || emp.name || "Unknown",
        email: emp.personalDetails?.email || emp.email || "",
        department: emp.department || emp.personalDetails?.department || "",
        designation: emp.designation || emp.personalDetails?.designation || "",
      };
    });

    // Enhance attendance records with employee details
    const enhancedRecords = attendanceRecords.map((record) => ({
      ...record,
      employee: employeeMap[record.employeeId] || { name: "Unknown Employee" },
    }));

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
