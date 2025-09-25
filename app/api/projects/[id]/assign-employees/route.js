import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Assign employees to a project
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    const { employeeIds } = data;

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      );
    }

    // Validate that the project exists
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Validate that all employees exist
    const employeeObjectIds = employeeIds.map((id) => new ObjectId(id));
    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: employeeObjectIds },
      })
      .toArray();

    if (employees.length !== employeeIds.length) {
      return NextResponse.json(
        { error: "One or more employees not found" },
        { status: 400 }
      );
    }

    // Add employees to the project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $addToSet: { assignedEmployees: { $each: employeeObjectIds } },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create audit log
    await createAuditLog({
      action: "ASSIGN_EMPLOYEES",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        employeesAssigned: employeeIds.length,
        employeeIds: employeeIds,
      },
    });

    // Get employee details for response
    const employeeDetails = employees.map((emp) => ({
      _id: emp._id,
      name: emp.personalDetails?.name || emp.name || "Unknown",
      email: emp.personalDetails?.email || emp.email || "",
      department: emp.department || emp.personalDetails?.department || "",
    }));

    return NextResponse.json({
      success: true,
      message: `${employeeIds.length} employees assigned to project successfully`,
      assignedEmployees: employeeDetails,
    });
  } catch (error) {
    console.error("Error assigning employees to project:", error);
    return NextResponse.json(
      { error: "Failed to assign employees to project" },
      { status: 500 }
    );
  }
}

// Remove employees from a project
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    // Validate input
    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId query parameter is required" },
        { status: 400 }
      );
    }

    // Validate that the project exists
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Remove employee from the project
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { assignedEmployees: new ObjectId(employeeId) },
        $set: { updatedAt: new Date() },
      }
    );

    // Get employee details for audit log
    const employee = await db
      .collection("employees")
      .findOne(
        { _id: new ObjectId(employeeId) },
        { projection: { personalDetails: 1, name: 1, email: 1 } }
      );

    const employeeName =
      employee?.personalDetails?.name || employee?.name || "Unknown Employee";

    // Create audit log
    await createAuditLog({
      action: "REMOVE_EMPLOYEE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project.name,
        employeeId: employeeId,
        employeeName: employeeName,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Employee removed from project successfully`,
      removedEmployeeId: employeeId,
    });
  } catch (error) {
    console.error("Error removing employee from project:", error);
    return NextResponse.json(
      { error: "Failed to remove employee from project" },
      { status: 500 }
    );
  }
}

// Get all employees assigned to a project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate that the project exists
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If no employees are assigned, return empty array
    if (!project.assignedEmployees || project.assignedEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        assignedEmployees: [],
        count: 0,
        projectName: project.name,
      });
    }

    // Get employee details
    const employees = await db
      .collection("employees")
      .find({
        _id: { $in: project.assignedEmployees },
      })
      .toArray();

    // Format employee data
    const formattedEmployees = employees.map((emp) => ({
      _id: emp._id,
      name: emp.personalDetails?.name || emp.name || "Unknown",
      email: emp.personalDetails?.email || emp.email || "",
      department: emp.department || emp.personalDetails?.department || "",
      position: emp.personalDetails?.position || emp.position || "",
      phone: emp.personalDetails?.phone || emp.phone || "",
    }));

    return NextResponse.json({
      success: true,
      assignedEmployees: formattedEmployees,
      count: formattedEmployees.length,
      projectName: project.name,
    });
  } catch (error) {
    console.error("Error fetching project employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch project employees" },
      { status: 500 }
    );
  }
}
