import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const department = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });

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
    const { id } = await params;
    const db = await getDb();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();

    const update = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.status ? { status: body.status } : {}),
      updatedAt: new Date(),
    };

    // First check if the department exists
    const existingDept = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });

    if (!existingDept) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update the department
    await db
      .collection("departments")
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

    // Get the updated department
    const updatedDept = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });

    await createAuditLog({
      action: "UPDATE_DEPARTMENT",
      entityType: "department",
      entityId: id,
      request,
      metadata: { update },
    });

    return NextResponse.json({ success: true, department: updatedDept });
  } catch (e) {
    console.error("PUT department error:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Prevent deleting if employees still reference this department
    const dept = await db
      .collection("departments")
      .findOne({ _id: new ObjectId(id) });
    if (!dept)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Block deletion if employees are still assigned to this department
    const employeeCount = await db.collection("employees").countDocuments({
      $or: [
        { departmentId: new ObjectId(id) },
        { departmentId: id },
        { "personalDetails.department": dept.name },
        { department: dept.name },
      ],
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department "${dept.name}". It has ${employeeCount} assigned employee(s). Please reassign or remove employees before deleting this department.`,
        },
        { status: 400 }
      );
    }

    // Unassign department from designations
    await db.collection("designations").updateMany(
      {},
      {
        $pull: {
          departmentIds: id,
          departments: dept.name,
        },
      }
    );

    const result = await db
      .collection("departments")
      .deleteOne({ _id: new ObjectId(id) });

    await createAuditLog({
      action: "DELETE_DEPARTMENT",
      entityType: "department",
      entityId: id,
      request,
      metadata: { name: dept.name },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (e) {
    console.error("DELETE department error:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
