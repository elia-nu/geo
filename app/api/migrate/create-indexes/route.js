import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

export async function POST() {
  try {
    const db = await getDb();
    const results = [];

    // Create indexes for employment_history collection
    try {
      await db.collection("employment_history").createIndex({ employeeId: 1 });
      await db.collection("employment_history").createIndex({ company: 1 });
      await db.collection("employment_history").createIndex({ startDate: -1 });
      results.push("Created indexes for employment_history collection");
    } catch (error) {
      results.push(
        `Error creating employment_history indexes: ${error.message}`
      );
    }

    // Create indexes for certifications collection
    try {
      await db.collection("certifications").createIndex({ employeeId: 1 });
      await db.collection("certifications").createIndex({ title: 1 });
      await db.collection("certifications").createIndex({ institution: 1 });
      await db.collection("certifications").createIndex({ expiryDate: 1 });
      await db.collection("certifications").createIndex({ status: 1 });
      results.push("Created indexes for certifications collection");
    } catch (error) {
      results.push(`Error creating certifications indexes: ${error.message}`);
    }

    // Create indexes for employee_skills collection
    try {
      await db.collection("employee_skills").createIndex({ employeeId: 1 });
      await db.collection("employee_skills").createIndex({ skillName: 1 });
      await db.collection("employee_skills").createIndex({ category: 1 });
      await db
        .collection("employee_skills")
        .createIndex({ proficiencyLevel: 1 });
      results.push("Created indexes for employee_skills collection");
    } catch (error) {
      results.push(`Error creating employee_skills indexes: ${error.message}`);
    }

    // Create indexes for health_records collection
    try {
      await db
        .collection("health_records")
        .createIndex({ employeeId: 1 }, { unique: true });
      await db.collection("health_records").createIndex({ bloodType: 1 });
      results.push("Created indexes for health_records collection");
    } catch (error) {
      results.push(`Error creating health_records indexes: ${error.message}`);
    }

    // Create compound indexes for better query performance
    try {
      await db.collection("certifications").createIndex({
        employeeId: 1,
        expiryDate: 1,
      });
      await db.collection("employee_skills").createIndex({
        employeeId: 1,
        category: 1,
      });
      results.push("Created compound indexes");
    } catch (error) {
      results.push(`Error creating compound indexes: ${error.message}`);
    }

    // Update existing employee collection indexes
    try {
      await db.collection("employees").createIndex({ department: 1 });
      await db.collection("employees").createIndex({ designation: 1 });
      await db.collection("employees").createIndex({ workLocation: 1 });
      await db.collection("employees").createIndex({ status: 1 });
      await db.collection("employees").createIndex(
        {
          "personalDetails.email": 1,
        },
        { unique: true }
      );
      await db.collection("employees").createIndex({
        "personalDetails.name": "text",
        department: "text",
        designation: "text",
      });
      results.push("Updated indexes for employees collection");
    } catch (error) {
      results.push(`Error updating employees indexes: ${error.message}`);
    }

    return NextResponse.json({
      message: "Index creation completed",
      results,
    });
  } catch (error) {
    console.error("Error creating indexes:", error);
    return NextResponse.json(
      {
        error: "Failed to create indexes",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDb();

    const collections = [
      "employees",
      "employment_history",
      "certifications",
      "employee_skills",
      "health_records",
    ];

    const indexInfo = {};

    for (const collectionName of collections) {
      try {
        const indexes = await db
          .collection(collectionName)
          .listIndexes()
          .toArray();
        indexInfo[collectionName] = indexes.map((index) => ({
          name: index.name,
          key: index.key,
          unique: index.unique || false,
        }));
      } catch (error) {
        indexInfo[collectionName] = { error: error.message };
      }
    }

    return NextResponse.json({
      message: "Current index information",
      indexes: indexInfo,
    });
  } catch (error) {
    console.error("Error fetching index information:", error);
    return NextResponse.json(
      { error: "Failed to fetch index information" },
      { status: 500 }
    );
  }
}
