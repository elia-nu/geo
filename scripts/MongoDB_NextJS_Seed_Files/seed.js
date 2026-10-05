import { MongoClient } from "mongodb";
import { seedDepartments } from "./seedDepartments.js";
import { seedDesignations } from "./seedDesignations.js";
import { seedEmployees } from "./seedEmployees.js";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  await seedDepartments(db);
  await seedDesignations(db);
  await seedEmployees(db);
  console.log("All departments, designations, and employees seeded successfully.");
} finally {
  await client.close();
}
