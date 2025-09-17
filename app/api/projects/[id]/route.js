import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Get related milestones and tasks
    const [milestones, tasks] = await Promise.all([
      db.collection("milestones").find({ projectId: id }).toArray(),
      db.collection("tasks").find({ projectId: id }).toArray(),
    ]);

    return NextResponse.json({
      success: true,
      data: { ...project, milestones, tasks },
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    // Convert date strings to Date objects if present
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const result = await db
      .collection("projects")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const updatedProject = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Delete related milestones and tasks
    await Promise.all([
      db.collection("milestones").deleteMany({ projectId: id }),
      db.collection("tasks").deleteMany({ projectId: id }),
    ]);

    const result = await db.collection("projects").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
