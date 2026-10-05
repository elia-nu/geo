import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// GET /api/designations/[id]
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid designation ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const designation = await db
      .collection("designations")
      .findOne({ _id: new ObjectId(id) });

    if (!designation) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }

    const employeeCount = await db.collection("employees").countDocuments({
      $or: [
        { designation: designation.name },
        { "personalDetails.designation": designation.name },
      ],
    });

    return NextResponse.json({
      success: true,
      designation: {
        ...designation,
        _id: designation._id.toString(),
        id: designation._id.toString(),
        employeeCount,
      },
    });
  } catch (error) {
    console.error("GET /api/designations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch designation" },
      { status: 500 }
    );
  }
}

// PUT /api/designations/[id]
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid designation ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const body = await request.json();
    const newName = String(body?.name || body?.title || "").trim();

    if (!newName) {
      return NextResponse.json(
        { error: "Designation title cannot be empty" },
        { status: 400 }
      );
    }

    const current = await db
      .collection("designations")
      .findOne({ _id: new ObjectId(id) });

    if (!current) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }

    const effectiveOldName = current.name;

    // Check duplicate if name changed
    if (newName.toLowerCase() !== effectiveOldName.toLowerCase()) {
      const duplicate = await db.collection("designations").findOne({
        _id: { $ne: current._id },
        name: { $regex: new RegExp(`^${newName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}$`, "i") },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `Another designation with title "${newName}" already exists` },
          { status: 400 }
        );
      }
    }

    const isUniversal = body.isUniversal !== undefined
      ? Boolean(body.isUniversal)
      : current.isUniversal !== false;

    const departments = Array.isArray(body.departments)
      ? body.departments.filter(Boolean)
      : current.departments || [];

    const departmentIds = Array.isArray(body.departmentIds)
      ? body.departmentIds.filter(Boolean)
      : current.departmentIds || [];

    const level = body.level || current.level || "Mid-Level";
    const status = body.status ? body.status : current.status || "active";
    const description = body.description !== undefined ? String(body.description).trim() : (current.description || "");

    const updateFields = {
      name: newName,
      title: newName,
      description,
      isUniversal,
      departments,
      departmentIds,
      level,
      status,
      updatedAt: new Date(),
    };

    await db
      .collection("designations")
      .updateOne({ _id: current._id }, { $set: updateFields });

    // Cascade rename to employees
    if (newName !== effectiveOldName) {
      await db.collection("employees").updateMany(
        {
          $or: [
            { designation: effectiveOldName },
            { "personalDetails.designation": effectiveOldName },
          ],
        },
        {
          $set: {
            designation: newName,
            "personalDetails.designation": newName,
          },
        }
      );

      await db.collection("departments").updateMany(
        { designations: effectiveOldName },
        { $set: { "designations.$": newName } }
      );
    }

    createAuditLog({
      action: "UPDATE",
      entityType: "designation",
      entityId: id,
      status: "SUCCESS",
      request,
      changes: {
        before: { name: effectiveOldName, level: current.level, status: current.status },
        after: { name: newName, level, status },
      },
      metadata: { oldName: effectiveOldName, newName },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Designation updated successfully`,
      designation: {
        ...updateFields,
        _id: id,
        id,
      },
    });
  } catch (error) {
    console.error("PUT /api/designations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update designation: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/designations/[id]
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid designation ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const desDoc = await db
      .collection("designations")
      .findOne({ _id: new ObjectId(id) });

    if (!desDoc) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }

    const employeeCount = await db.collection("employees").countDocuments({
      $or: [
        { designation: desDoc.name },
        { "personalDetails.designation": desDoc.name },
      ],
    });

    if (employeeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete designation "${desDoc.name}". It is currently assigned to ${employeeCount} employee(s). Please reassign them before deleting this designation.`,
        },
        { status: 400 }
      );
    }

    await db.collection("designations").deleteOne({ _id: desDoc._id });

    await db.collection("departments").updateMany(
      {},
      { $pull: { designations: desDoc.name } }
    );

    createAuditLog({
      action: "DELETE",
      entityType: "designation",
      entityId: id,
      status: "SUCCESS",
      request,
      metadata: { designationName: desDoc.name, employeeCount, forced: force },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Designation "${desDoc.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("DELETE /api/designations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete designation: " + error.message },
      { status: 500 }
    );
  }
}
