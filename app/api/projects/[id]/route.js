import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../utils/audit.js";
import { getCurrentUser, checkPermission } from "../../middleware/auth.js";

// Get a specific project by ID
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !user.authenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const canReadAll = await checkPermission(user.userId, "project.read", user.role);
    const canReadAssigned =
      canReadAll ||
      (await checkPermission(user.userId, "project.read.assigned", user.role)) ||
      (await checkPermission(user.userId, "project.read.own", user.role));

    if (!canReadAll && !canReadAssigned) {
      return NextResponse.json(
        { error: "Access denied: Missing 'project.read' or 'project.read.assigned' permission" },
        { status: 403 }
      );
    }

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
                    "$$employee.personalDetails.fullName",
                    "$$employee.fullName",
                    {
                      $cond: {
                        if: {
                          $and: [
                            {
                              $ne: [
                                "$$employee.personalDetails.firstName",
                                null,
                              ],
                            },
                            {
                              $ne: [
                                "$$employee.personalDetails.lastName",
                                null,
                              ],
                            },
                          ],
                        },
                        then: {
                          $concat: [
                            "$$employee.personalDetails.firstName",
                            " ",
                            "$$employee.personalDetails.lastName",
                          ],
                        },
                        else: {
                          $cond: {
                            if: {
                              $and: [
                                { $ne: ["$$employee.firstName", null] },
                                { $ne: ["$$employee.lastName", null] },
                              ],
                            },
                            then: {
                              $concat: [
                                "$$employee.firstName",
                                " ",
                                "$$employee.lastName",
                              ],
                            },
                            else: {
                              $concat: [
                                "Employee ",
                                {
                                  $substr: [
                                    { $toString: "$$employee._id" },
                                    -6,
                                    -1,
                                  ],
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
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

    // If user is restricted to assigned projects only, ensure they are assigned
    if (!canReadAll) {
      const userObjectId = ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null;
      const userIds = [String(user.userId)];
      if (userObjectId) userIds.push(String(userObjectId));

      const isAssigned = (
        project.assignedEmployees?.some((emp) => userIds.includes(String(emp?._id || emp))) ||
        userIds.includes(String(project.managerId)) ||
        userIds.includes(String(project.projectManager)) ||
        userIds.includes(String(project.createdBy)) ||
        project.team?.some((t) => userIds.includes(String(t.employeeId)))
      );

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Access denied: You are not assigned to this project" },
          { status: 403 }
        );
      }
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
    const user = await getCurrentUser(request);
    if (!user || !user.authenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const hasPerm = await checkPermission(user.userId, "project.update", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied: Missing 'project.update' permission" },
        { status: 403 }
      );
    }

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

    // Check if user is restricted to assigned projects
    const canReadAll = await checkPermission(user.userId, "project.read", user.role);
    if (!canReadAll) {
      const userObjectId = ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null;
      const userIds = [String(user.userId)];
      if (userObjectId) userIds.push(String(userObjectId));

      const isAssigned = (
        existingProject.assignedEmployees?.some((emp) => userIds.includes(String(emp?._id || emp))) ||
        userIds.includes(String(existingProject.managerId)) ||
        userIds.includes(String(existingProject.projectManager)) ||
        userIds.includes(String(existingProject.createdBy)) ||
        existingProject.team?.some((t) => userIds.includes(String(t.employeeId)))
      );

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Access denied: You can only edit projects you are assigned to" },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const {
      name,
      description,
      category,
      categoryId,
      startDate,
      endDate,
      status,
      progress,
      assignedEmployees,
      milestones,
      imageUrl,
      image,
    } = data;

    const updateData = {};

    // Validate categoryId if provided
    if (categoryId !== undefined) {
      if (categoryId === null) {
        updateData.categoryId = null;
      } else {
        if (!ObjectId.isValid(categoryId)) {
          return NextResponse.json(
            { error: "Invalid category ID" },
            { status: 400 }
          );
        }

        // Verify category exists
        const categoryExists = await db
          .collection("projectCategories")
          .findOne({
            _id: new ObjectId(categoryId),
            status: "active",
          });

        if (!categoryExists) {
          return NextResponse.json(
            { error: "Project category not found or inactive" },
            { status: 400 }
          );
        }

        updateData.categoryId = new ObjectId(categoryId);
      }
    }

    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category; // Keep for backward compatibility
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    else if (image !== undefined) updateData.imageUrl = image;

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
      user,
      request,
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
    const user = await getCurrentUser(request);
    if (!user || !user.authenticated) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const hasPerm = await checkPermission(user.userId, "project.delete", user.role);
    if (!hasPerm) {
      return NextResponse.json(
        { error: "Access denied: Missing 'project.delete' permission" },
        { status: 403 }
      );
    }

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

    // Check if user is restricted to assigned projects
    const canReadAll = await checkPermission(user.userId, "project.read", user.role);
    if (!canReadAll) {
      const userObjectId = ObjectId.isValid(user.userId) ? new ObjectId(user.userId) : null;
      const userIds = [String(user.userId)];
      if (userObjectId) userIds.push(String(userObjectId));

      const isAssigned = (
        existingProject.assignedEmployees?.some((emp) => userIds.includes(String(emp?._id || emp))) ||
        userIds.includes(String(existingProject.managerId)) ||
        userIds.includes(String(existingProject.projectManager)) ||
        userIds.includes(String(existingProject.createdBy)) ||
        existingProject.team?.some((t) => userIds.includes(String(t.employeeId)))
      );

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Access denied: You can only delete projects you are assigned to" },
          { status: 403 }
        );
      }
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
      user,
      request,
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
