import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

export async function GET(_request, { params }) {
  try {
    const db = await getDb();
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const department = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(params.id) });

    if (!department) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, department });
  } catch (e) {
    console.error("GET department error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json();
    const update = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status ? { status: body.status } : {}),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("departments")
      .findOneAndUpdate({ _id: new ObjectId(params.id) }, { $set: update }, { returnDocument: "after" });

    if (!result.value) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await createAuditLog({
      action: "UPDATE_DEPARTMENT",
      entityType: "department",
      entityId: params.id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: { update },
    });

    return NextResponse.json({ success: true, department: result.value });
  } catch (e) {
    console.error("PUT department error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const db = await getDb();
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Prevent deleting if employees still reference this department
    const dept = await db.collection("departments").findOne({ _id: new ObjectId(params.id) });
    if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const employeeCount = await db.collection("employees").countDocuments({
      $or: [
        { departmentId: new ObjectId(params.id) },
        { "personalDetails.department": dept.name },
        { department: dept.name },
      ],
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete department with ${employeeCount} assigned employee(s)` },
        { status: 400 }
      );
    }

    const result = await db
      .collection("departments")
      .deleteOne({ _id: new ObjectId(params.id) });

    await createAuditLog({
      action: "DELETE_DEPARTMENT",
      entityType: "department",
      entityId: params.id,
      userId: "admin",
      userEmail: "admin@company.com",
      metadata: { name: dept.name },
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (e) {
    console.error("DELETE department error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}


