const { getDb } = require("../mongo.js");

export async function GET(req) {
  const db = await getDb();
  const url = new URL(req.url, "http://localhost");
  const name = url.searchParams.get("name");
  if (name) {
    const doc = await db.collection("geofences").findOne({ name });
    if (!doc) return new Response("Not found", { status: 404 });
    return Response.json(doc);
  }
  const docs = await db.collection("geofences").find({}).toArray();
  return Response.json(docs);
}

export async function POST(req) {
  const db = await getDb();
  const data = await req.json();
  await db.collection("geofences").insertOne(data);
  return Response.json({ success: true });
}

export async function PUT(req) {
  const db = await getDb();
  const data = await req.json();
  if (!data.name) return new Response("Missing name", { status: 400 });
  const result = await db
    .collection("geofences")
    .updateOne({ name: data.name }, { $set: data });
  if (result.matchedCount === 0)
    return new Response("Not found", { status: 404 });
  return Response.json({ success: true });
}

export async function DELETE(req) {
  const db = await getDb();
  const url = new URL(req.url, "http://localhost");
  const name = url.searchParams.get("name");
  if (!name) return new Response("Missing name", { status: 400 });
  const result = await db.collection("geofences").deleteOne({ name });
  if (result.deletedCount === 0)
    return new Response("Not found", { status: 404 });
  return Response.json({ success: true });
}
