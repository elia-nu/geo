import { MongoClient } from "mongodb";
import { seedEmployees } from "./seedEmployees.js";
import { getMongoUri } from "./getMongoUri.js";

const uri = getMongoUri();

async function main() {
  console.log("🌱 Starting Master Database Seed...\n");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("geo");

    // Runs Roles, Permissions, Admin Account, Departments, Designations, Work Locations, and Employees
    await seedEmployees(db, { runDependencies: true });

    console.log("✨ Master seed completed successfully!");
  } catch (error) {
    console.error("❌ Master seed failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
