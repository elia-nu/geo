import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../utils/audit.js";

// Helper to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Initial seed list for first-time population
const DEFAULT_DESIGNATIONS = [
  { name: "General Manager", level: "Executive" },
  { name: "G/ Manager", level: "Executive" },
  { name: "Deputy Manager", level: "Executive" },
  { name: "D/Manager", level: "Executive" },
  { name: "Supervision Team Leader", level: "Management" },
  { name: "Resident Engineer", level: "Senior" },
  { name: "Assistant Resident Engineer", level: "Junior" },
  { name: "Design Department Head", level: "Executive" },
  { name: "Senior Structural Engineer", level: "Senior" },
  { name: "Structural Engineer", level: "Mid-Level" },
  { name: "Senior Architect", level: "Senior" },
  { name: "Architect", level: "Mid-Level" },
  { name: "Electrical Engineer", level: "Mid-Level" },
  { name: "Sanitary Engineer", level: "Mid-Level" },
  { name: "Office Engineer Department Head", level: "Executive" },
  { name: "Office Engineer", level: "Mid-Level" },
  { name: "Contract Admin Department Head", level: "Executive" },
  { name: "Contract Administrator", level: "Mid-Level" },
  { name: "CAD Expert", level: "Specialist" },
  { name: "Draftsperson", level: "Junior" },
  { name: "Administration and Finance", level: "Management" },
  { name: "Finance officer", level: "Mid-Level" },
  { name: "Accountant", level: "Mid-Level" },
  { name: "HR Manager", level: "Management" },
  { name: "HR Officer", level: "Mid-Level" },
  { name: "IT officer", level: "Mid-Level" },
  { name: "System Administrator", level: "Specialist" },
  { name: "Record Officer", level: "Support" },
  { name: "Project Coordinator", level: "Management" },
  { name: "Quantity Surveyor", level: "Mid-Level" },
  { name: "Secretary", level: "Support" },
  { name: "Executive Assistant", level: "Support" },
  { name: "Driver", level: "Support" },
  { name: "Janitor", level: "Support" },
];

function inferSeniorityLevel(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("general manager") || n.includes("deputy manager") || n.includes("director") || n.includes("head") || n.includes("executive")) {
    return "Executive";
  }
  if (n.includes("manager") || n.includes("coordinator") || n.includes("leader")) {
    return "Management";
  }
  if (n.includes("senior") || n.includes("lead") || n.includes("chief") || n.includes("expert")) {
    return "Senior";
  }
  if (n.includes("assistant") || n.includes("junior") || n.includes("trainee") || n.includes("intern") || n.includes("draftsperson")) {
    return "Junior";
  }
  if (n.includes("driver") || n.includes("janitor") || n.includes("guard") || n.includes("clerk") || n.includes("secretary") || n.includes("support")) {
    return "Support";
  }
  if (n.includes("specialist") || n.includes("architect") || n.includes("cad") || n.includes("system administrator") || n.includes("analyst")) {
    return "Specialist";
  }
  return "Mid-Level";
}

// Automatically sync / seed designations from departments, employees and defaults
async function ensureDesignationsSeeded(db) {
  const existingCount = await db.collection("designations").countDocuments();
  if (existingCount > 0) return;

  // Gather unique designations from departments and employees
  const deptDes = await db.collection("departments").distinct("designations");
  const empDes1 = await db.collection("employees").distinct("designation");
  const empDes2 = await db.collection("employees").distinct("personalDetails.designation");

  const nameMap = new Map();

  // Add defaults
  DEFAULT_DESIGNATIONS.forEach((d) => {
    nameMap.set(d.name.trim().toLowerCase(), {
      name: d.name.trim(),
      level: d.level,
    });
  });

  // Add from DB sources
  [...(deptDes || []), ...(empDes1 || []), ...(empDes2 || [])]
    .filter(Boolean)
    .forEach((raw) => {
      const trimmed = String(raw).trim();
      if (!trimmed) return;
      const lower = trimmed.toLowerCase();
      if (!nameMap.has(lower)) {
        nameMap.set(lower, {
          name: trimmed,
          level: inferSeniorityLevel(trimmed),
        });
      }
    });

  const docsToInsert = Array.from(nameMap.values()).map((item, index) => ({
    name: item.name,
    title: item.name,
    code: `DES-${String(index + 1).padStart(3, "0")}`,
    description: "",
    isUniversal: true, // Available to any department in any combination
    departments: [], // Empty means universally selectable
    departmentIds: [],
    level: item.level,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (docsToInsert.length > 0) {
    await db.collection("designations").insertMany(docsToInsert);
  }
}

// GET /api/designations - List all designations (with stats, employee counts, department mappings)
export async function GET(request) {
  try {
    const db = await getDb();
    await ensureDesignationsSeeded(db);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const department = searchParams.get("department")?.trim() || "";
    const level = searchParams.get("level")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const format = searchParams.get("format")?.trim() || "";

    // Build filter
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { code: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (level && level !== "all") {
      query.level = level;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (department && department !== "all") {
      // Return designations that are either universal (available to any department) OR explicitly assigned to this department
      query.$or = [
        { isUniversal: true },
        { departments: department },
        { departmentIds: department },
        { departments: { $size: 0 } },
      ];
    }

    // Aggregate live employee count per designation
    const empAgg = await db
      .collection("employees")
      .aggregate([
        {
          $project: {
            des: { $ifNull: ["$designation", "$personalDetails.designation"] },
          },
        },
        { $match: { des: { $nin: [null, ""] } } },
        { $group: { _id: "$des", count: { $sum: 1 } } },
      ])
      .toArray();

    const countMap = {};
    let totalAssignedEmployees = 0;
    empAgg.forEach((item) => {
      if (item._id) {
        const key = String(item._id).trim().toLowerCase();
        countMap[key] = item.count;
        totalAssignedEmployees += item.count;
      }
    });

    const docs = await db
      .collection("designations")
      .find(query)
      .sort({ name: 1 })
      .toArray();

    const allDocs = await db.collection("designations").find({}).toArray();

    const formatted = docs.map((doc, idx) => {
      const lower = String(doc.name || "").trim().toLowerCase();
      return {
        _id: doc._id.toString(),
        id: doc._id.toString(),
        name: doc.name,
        title: doc.name,
        code: doc.code || `DES-${String(idx + 1).padStart(3, "0")}`,
        description: doc.description || "",
        isUniversal: doc.isUniversal !== false,
        departments: Array.isArray(doc.departments) ? doc.departments : [],
        departmentIds: Array.isArray(doc.departmentIds) ? doc.departmentIds : [],
        level: doc.level || inferSeniorityLevel(doc.name),
        status: doc.status || "active",
        employeeCount: countMap[lower] || 0,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    // If client requested names-only format
    if (format === "names" || searchParams.get("namesOnly") === "true") {
      return NextResponse.json({
        success: true,
        designations: formatted.map((d) => d.name),
        total: formatted.length,
      });
    }

    const stats = {
      total: allDocs.length,
      active: allDocs.filter((d) => d.status === "active" || !d.status).length,
      universal: allDocs.filter((d) => d.isUniversal !== false).length,
      totalAssignedEmployees,
    };

    return NextResponse.json({
      success: true,
      designations: formatted,
      total: formatted.length,
      stats,
    });
  } catch (error) {
    console.error("Error fetching designations:", error);
    return NextResponse.json(
      { error: "Failed to fetch designations: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/designations - Create new standalone designation
export async function POST(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    const name = String(body?.name || body?.title || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Designation title is required" },
        { status: 400 }
      );
    }

    // Check duplicate name
    const existing = await db.collection("designations").findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A designation with the title "${name}" already exists` },
        { status: 400 }
      );
    }

    const totalCount = await db.collection("designations").countDocuments();
    const isUniversal = body.isUniversal !== false && (!body.departments || body.departments.length === 0);
    const departments = Array.isArray(body.departments) ? body.departments.filter(Boolean) : [];
    const departmentIds = Array.isArray(body.departmentIds) ? body.departmentIds.filter(Boolean) : [];
    const level = body.level || inferSeniorityLevel(name);
    const status = body.status === "inactive" ? "inactive" : "active";

    const newDoc = {
      name,
      title: name,
      code: body.code?.trim() || `DES-${String(totalCount + 1).padStart(3, "0")}`,
      description: body.description?.trim() || "",
      isUniversal,
      departments,
      departmentIds,
      level,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection("designations").insertOne(newDoc);
    const designation = { ...newDoc, _id: res.insertedId.toString(), id: res.insertedId.toString(), employeeCount: 0 };

    // Optionally sync with department designations array for backward-compatibility
    if (departmentIds.length > 0) {
      const validObjIds = departmentIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      if (validObjIds.length > 0) {
        await db.collection("departments").updateMany(
          { _id: { $in: validObjIds } },
          { $addToSet: { designations: name } }
        );
      }
    }

    createAuditLog({
      action: "CREATE",
      entityType: "designation",
      entityId: res.insertedId.toString(),
      status: "SUCCESS",
      request,
      metadata: {
        designationName: name,
        level,
        isUniversal,
        departments,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Designation "${name}" created successfully`,
      designation,
    });
  } catch (error) {
    console.error("Error creating designation:", error);
    return NextResponse.json(
      { error: "Failed to create designation: " + error.message },
      { status: 500 }
    );
  }
}

// PUT /api/designations - Update designation (with cascade renaming)
export async function PUT(request) {
  try {
    const db = await getDb();
    const body = await request.json();

    const id = body?._id || body?.id;
    const oldName = String(body?.oldName || "").trim();
    const newName = String(body?.name || body?.title || "").trim();

    if (!id && !oldName) {
      return NextResponse.json(
        { error: "Designation ID or existing name is required for update" },
        { status: 400 }
      );
    }

    if (!newName) {
      return NextResponse.json(
        { error: "Designation title cannot be empty" },
        { status: 400 }
      );
    }

    // Find current document
    let query = {};
    if (id && ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else if (oldName) {
      query.name = { $regex: new RegExp(`^${escapeRegex(oldName)}$`, "i") };
    }

    const current = await db.collection("designations").findOne(query);
    if (!current) {
      return NextResponse.json(
        { error: "Designation not found" },
        { status: 404 }
      );
    }

    const effectiveOldName = current.name;

    // Check if new name is already taken by another designation
    if (newName.toLowerCase() !== effectiveOldName.toLowerCase()) {
      const duplicate = await db.collection("designations").findOne({
        _id: { $ne: current._id },
        name: { $regex: new RegExp(`^${escapeRegex(newName)}$`, "i") },
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

    const level = body.level || current.level || inferSeniorityLevel(newName);
    const status = body.status ? body.status : current.status || "active";
    const description = body.description !== undefined ? String(body.description).trim() : (current.description || "");
    const code = body.code?.trim() || current.code || `DES-${String(current._id).slice(-4).toUpperCase()}`;

    const updateFields = {
      name: newName,
      title: newName,
      code,
      description,
      isUniversal,
      departments,
      departmentIds,
      level,
      status,
      updatedAt: new Date(),
    };

    await db.collection("designations").updateOne(
      { _id: current._id },
      { $set: updateFields }
    );

    // If name changed, cascade to employees and departments
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

      // Cascade in departments.designations array
      await db.collection("departments").updateMany(
        { designations: effectiveOldName },
        { $set: { "designations.$": newName } }
      );
    }

    createAuditLog({
      action: "UPDATE",
      entityType: "designation",
      entityId: current._id.toString(),
      status: "SUCCESS",
      request,
      changes: {
        before: { name: effectiveOldName, level: current.level, status: current.status },
        after: { name: newName, level, status },
      },
      metadata: {
        oldName: effectiveOldName,
        newName,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Designation updated successfully`,
      designation: {
        ...updateFields,
        _id: current._id.toString(),
        id: current._id.toString(),
      },
    });
  } catch (error) {
    console.error("Error updating designation:", error);
    return NextResponse.json(
      { error: "Failed to update designation: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/designations - Delete designation
export async function DELETE(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);

    let id = searchParams.get("id") || searchParams.get("_id");
    let name = searchParams.get("name");
    let force = searchParams.get("force") === "true";

    // Also check body if not in query params
    if (!id && !name) {
      const body = await request.json().catch(() => ({}));
      id = body?.id || body?._id;
      name = body?.name;
      if (body?.force) force = true;
    }

    if (!id && !name) {
      return NextResponse.json(
        { error: "Designation ID or name is required" },
        { status: 400 }
      );
    }

    let query = {};
    if (id && ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
    } else if (name) {
      query.name = { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") };
    }

    const desDoc = await db.collection("designations").findOne(query);
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

    // Clean up from departments arrays
    await db.collection("departments").updateMany(
      {},
      { $pull: { designations: desDoc.name } }
    );

    createAuditLog({
      action: "DELETE",
      entityType: "designation",
      entityId: desDoc._id.toString(),
      status: "SUCCESS",
      request,
      metadata: {
        designationName: desDoc.name,
        employeeCount,
        forced: force,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Designation "${desDoc.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting designation:", error);
    return NextResponse.json(
      { error: "Failed to delete designation: " + error.message },
      { status: 500 }
    );
  }
}
