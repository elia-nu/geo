import { getDb } from "../mongo";

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
  if (id) {
    const doc = await db.collection("attendance").findOne({ id });
    if (!doc) return new Response("Not found", { status: 404 });
    return Response.json(doc);
  }
  const docs = await db.collection("attendance").find({}).toArray();
  return Response.json(docs);
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
