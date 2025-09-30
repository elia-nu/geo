import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid department id" },
        { status: 400 }
      );
    }
    const db = await getDb();
    const dept = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });
    if (!dept) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }
    // If department has explicit designations array, use it. Otherwise derive from employees
    let designations = Array.isArray(dept.designations)
      ? dept.designations
      : [];
    if (designations.length === 0) {
      const fromEmployees = await db
        .collection("employees")
        .distinct("designation", {
          $or: [
            { departmentId: new ObjectId(id) },
            { department: dept.name },
            { "personalDetails.department": dept.name },
          ],
        });
      designations = (fromEmployees || []).filter((d) => d && d !== "");
    }
    designations = Array.from(new Set(designations)).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
    return NextResponse.json({
      success: true,
      departmentId: id,
      designations,
      total: designations.length,
    });
  } catch (error) {
    console.error("GET designations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!ObjectId.isValid(id) || !name) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const db = await getDb();
    const result = await db
      .collection("departments")
      .updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { designations: name } }
      );
    return NextResponse.json({
      success: true,
      updated: result.modifiedCount === 1,
    });
  } catch (error) {
    console.error("POST designation error:", error);
    return NextResponse.json(
      { error: "Failed to add designation" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const oldName = String(body?.oldName || "").trim();
    const newName = String(body?.newName || "").trim();
    if (!ObjectId.isValid(id) || !oldName || !newName) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const db = await getDb();
    const dept = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });
    if (!dept)
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    const current = Array.isArray(dept.designations) ? dept.designations : [];
    const updated = Array.from(
      new Set(current.map((d) => (d === oldName ? newName : d)))
    );
    const res = await db
      .collection("departments")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { designations: updated } }
      );
    return NextResponse.json({
      success: true,
      updated: res.modifiedCount === 1,
    });
  } catch (error) {
    console.error("PUT designation error:", error);
    return NextResponse.json(
      { error: "Failed to update designation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name || "").trim();
    if (!ObjectId.isValid(id) || !name) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const db = await getDb();
    const res = await db
      .collection("departments")
      .updateOne({ _id: new ObjectId(id) }, { $pull: { designations: name } });
    return NextResponse.json({
      success: true,
      updated: res.modifiedCount === 1,
    });
  } catch (error) {
    console.error("DELETE designation error:", error);
    return NextResponse.json(
      { error: "Failed to remove designation" },
      { status: 500 }
    );
  }
}
