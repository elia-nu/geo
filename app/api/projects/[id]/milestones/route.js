import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";
import { createAuditLog } from "../../../audit/route";

// Get all milestones for a project
export async function GET(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Find the project
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id)
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Return the milestones
    return NextResponse.json({
      success: true,
      milestones: project.milestones || [],
      projectName: project.name
    });

  } catch (error) {
    console.error("Error fetching project milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch project milestones" },
      { status: 500 }
    );
  }
}

// Add a new milestone to a project
export async function POST(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Validate milestone data
    const { title, description, dueDate, status = "pending" } = data;

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    // Create new milestone
    const newMilestone = {
      _id: new ObjectId(),
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Find the project and update it
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { 
        $push: { milestones: newMilestone },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get project name for audit log
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1 } }
    );

    // Create audit log
    await createAuditLog({
      action: "ADD_MILESTONE",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project?.name || "Unknown Project",
        milestoneTitle: title,
        milestoneDueDate: dueDate
      },
    });

    return NextResponse.json({
      success: true,
      message: "Milestone added successfully",
      milestone: newMilestone
    });

  } catch (error) {
    console.error("Error adding project milestone:", error);
    return NextResponse.json(
      { error: "Failed to add project milestone" },
      { status: 500 }
    );
  }
}

// Update all milestones for a project (replace entire array)
export async function PUT(request, { params }) {
  try {
    const db = await getDb();
    const { id } = params;
    const data = await request.json();

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Validate milestones array
    const { milestones } = data;

    if (!Array.isArray(milestones)) {
      return NextResponse.json(
        { error: "Milestones must be an array" },
        { status: 400 }
      );
    }

    // Process milestones to ensure they have proper ObjectIds
    const processedMilestones = milestones.map(milestone => {
      // If milestone has an ID, preserve it, otherwise create a new one
      const milestoneId = milestone._id 
        ? (typeof milestone._id === 'string' ? new ObjectId(milestone._id) : milestone._id)
        : new ObjectId();
      
      return {
        ...milestone,
        _id: milestoneId,
        updatedAt: new Date(),
        // If it's a new milestone (no _id in original), set createdAt
        ...(milestone._id ? {} : { createdAt: new Date() })
      };
    });

    // Update the project with the new milestones array
    const result = await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          milestones: processedMilestones,
          updatedAt: new Date() 
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get project name for audit log
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1 } }
    );

    // Create audit log
    await createAuditLog({
      action: "UPDATE_MILESTONES",
      entityType: "project",
      entityId: id,
      userId: "admin", // Replace with actual user ID when auth is implemented
      userEmail: "admin@company.com", // Replace with actual user email
      metadata: {
        projectName: project?.name || "Unknown Project",
        milestonesCount: processedMilestones.length
      },
    });

    return NextResponse.json({
      success: true,
      message: "Project milestones updated successfully",
      milestones: processedMilestones
    });

  } catch (error) {
    console.error("Error updating project milestones:", error);
    return NextResponse.json(
      { error: "Failed to update project milestones" },
      { status: 500 }
    );
  }
}