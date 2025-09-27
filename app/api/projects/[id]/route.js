import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";

// Get a specific project by ID
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Fetch project with employee details
    const pipeline = [
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: "employees",
          localField: "assignedEmployees",
          foreignField: "_id",
          as: "assignedEmployeeDetails",
        },
      },
      {
        $addFields: {
          assignedEmployeeDetails: {
            $map: {
              input: "$assignedEmployeeDetails",
              as: "employee",
              in: {
                _id: "$$employee._id",
                name: {
                  $ifNull: [
                    "$$employee.personalDetails.name",
                    "$$employee.name",
                    "Unknown",
                  ],
                },
                email: {
                  $ifNull: [
                    "$$employee.personalDetails.email",
                    "$$employee.email",
                    "",
                  ],
                },
                department: {
                  $ifNull: [
                    "$$employee.department",
                    "$$employee.personalDetails.department",
                    "",
                  ],
                },
              },
            },
          },
        },
      },
    ];

    const project = await db.collection("projects").aggregate(pipeline).next();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// Update a project
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Prepare update data
    const {
      name,
      description,
      category,
      startDate,
      endDate,
      status,
      progress,
      assignedEmployees,
      milestones,
    } = data;

    const updateData = {};

    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;

    // Handle assigned employees
    if (assignedEmployees !== undefined) {
      updateData.assignedEmployees = assignedEmployees.map((id) =>
        typeof id === "string" ? new ObjectId(id) : id
      );
    }

    // Handle milestones
    if (milestones !== undefined) {
      // Preserve existing milestone IDs if they exist
      updateData.milestones = milestones.map((milestone) => {
        if (milestone._id) {
          return {
            ...milestone,
            _id:
              typeof milestone._id === "string"
                ? new ObjectId(milestone._id)
                : milestone._id,
            updatedAt: new Date(),
          };
        } else {
          return {
            ...milestone,
            _id: new ObjectId(),
            createdAt: new Date(),
          };
        }
      });
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    // Update the project
    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Create audit log
    await createAuditLog({
      action: "UPDATE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: name || existingProject.name,
        updatedFields: Object.keys(updateData).filter(
          (key) => key !== "updatedAt"
        ),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// Delete a project
export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = await params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete the project
    const result = await db.collection("projects").deleteOne({
      _id: new ObjectId(id),
    });

    // Create audit log
    await createAuditLog({
      action: "DELETE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: existingProject.name,
        category: existingProject.category,
        assignedEmployees: existingProject.assignedEmployees?.length || 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
