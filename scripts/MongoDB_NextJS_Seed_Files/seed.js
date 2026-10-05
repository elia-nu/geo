import { MongoClient } from "mongodb";
import { seedDepartments } from "./seedDepartments.js";
import { seedDesignations } from "./seedDesignations.js";
import { seedEmployees } from "./seedEmployees.js";
import { getMongoUri } from "../getMongoUri.js";

const uri = getMongoUri();

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
