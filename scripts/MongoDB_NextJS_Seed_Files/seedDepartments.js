import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const departments = [
  "Top Management",
  "Finance and Administration",
  "Design Department",
  "Contract Administration and Procurement Department",
  "Supervision and Project Follow-up Department",
  "Office Engineering Department"
];

export async function seedDepartments(db) {
  const col = db.collection("departments");
  await col.createIndex({ name: 1 }, { unique: true });
  await col.bulkWrite(departments.map(name => ({ updateOne: { filter: { name }, update: { $set: { name, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } })));
}

if (process.argv[1]?.endsWith("seedDepartments.js")) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await seedDepartments(db);
  await client.close();
  console.log("Departments seeded successfully.");
}
