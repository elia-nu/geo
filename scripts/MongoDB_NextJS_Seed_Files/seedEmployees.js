import { MongoClient } from "mongodb";
import employees from "./employees.data.js";
import { getMongoUri } from "../getMongoUri.js";

const uri = getMongoUri();

export async function seedEmployees(db) {
  const departments = await db.collection("departments").find({}).toArray();
  const designations = await db.collection("designations").find({}).toArray();
  const departmentMap = new Map(departments.map(d => [d.name, d._id]));
  const designationMap = new Map(designations.map(d => [d.name, d._id]));

  const missing = [];
  for (const e of employees) {
    if (!departmentMap.has(e.department)) missing.push(`Department: ${e.department}`);
    if (!designationMap.has(e.designation)) missing.push(`Designation: ${e.designation}`);
  }
  if (missing.length) throw new Error(`Missing master data: ${[...new Set(missing)].join(", ")}`);

  const col = db.collection("employees");
  await col.createIndex({ employeeId: 1 }, { unique: true });
  await col.bulkWrite(employees.map(e => ({
    updateOne: {
      filter: { employeeId: e.employeeId },
      update: { $set: { ...e, departmentId: departmentMap.get(e.department), designationId: designationMap.get(e.designation), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      upsert: true
    }
  })));
}

if (process.argv[1]?.endsWith("seedEmployees.js")) {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  await seedEmployees(db);
  await client.close();
  console.log("Employees seeded successfully.");
}
