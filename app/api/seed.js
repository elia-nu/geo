const { getDb } = require("./mongo.js");
const fs = require("fs");
const path = require("path");

async function seed() {
  const db = await getDb();

  // Seed attendance
  const attendancePath = path.join(process.cwd(), "data", "attendance.json");
  const attendanceData = JSON.parse(fs.readFileSync(attendancePath, "utf-8"));
  await db.collection("attendance").deleteMany({});
  await db.collection("attendance").insertMany(attendanceData);

  // Seed geofences
  const geofencesPath = path.join(process.cwd(), "data", "geofences.json");
  const geofencesRaw = JSON.parse(fs.readFileSync(geofencesPath, "utf-8"));
  // Convert geofences object to array of { name, lat, lng, radius }
  const geofencesData = Object.entries(geofencesRaw).map(([name, value]) => ({
    name,
    ...value,
  }));
  await db.collection("geofences").deleteMany({});
  await db.collection("geofences").insertMany(geofencesData);

  console.log("Seeding complete!");
}

seed();
