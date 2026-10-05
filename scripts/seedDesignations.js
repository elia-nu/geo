import { MongoClient } from "mongodb";
import { getMongoUri } from "./getMongoUri.js";

const uri = getMongoUri();

const designations = [
  "General Manager",
  "Deputy Manager",
  "Department Head",
  "Supervision Team Leader",
  "Resident Engineer",
  "Assistant Resident Engineer",
  "Senior Structural Engineer",
  "Structural Engineer",
  "Architect",
  "Office Engineer",
  "CAD Expert",
  "Electrical Engineer",
  "IT Officer",
  "Finance Officer",
  "Record Officer",
  "Secretary",
  "Janitor",
  "Contract Administration Department Head",
  "Design Department Head",
  "Office Engineering Department Head"
];

export async function seedDesignations(db) {
  const col = db.collection("designations");
  await col.createIndex({ name: 1 }, { unique: true });
  await col.bulkWrite(designations.map(name => ({ updateOne: { filter: { name }, update: { $set: { name, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, upsert: true } })));
}

if (process.argv[1]?.endsWith("seedDesignations.js")) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await seedDesignations(db);
  await client.close();
  console.log("Designations seeded successfully.");
}
