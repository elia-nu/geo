import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

export async function GET() {
  try {
    const db = await getDb();

    // Check if employees collection exists
    const collections = await db.listCollections().toArray();
    const hasEmployeesCollection = collections.some(
      (col) => col.name === "employees"
    );

    if (!hasEmployeesCollection) {
      return NextResponse.json({
        success: false,
        message: "Employees collection does not exist",
        collections: collections.map((col) => col.name),
      });
    }

    // Get employee count
    const count = await db.collection("employees").countDocuments();

    // Get first few employees for debugging
    const employees = await db
      .collection("employees")
      .find()
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      count: count,
      employees: employees,
      hasCollection: hasEmployeesCollection,
      collections: collections.map((col) => col.name),
    });
  } catch (error) {
    console.error("Test employees error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
