import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { ObjectId } from "mongodb";
import { getCurrentUser, checkPermission } from "../../../middleware/auth";
import { createAuditLog } from "../../../../utils/audit";

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (user && user.authenticated) {
      const hasPerm = await checkPermission(user.userId, "project.update", user.role);
      if (!hasPerm) {
        return NextResponse.json(
          { error: "Access denied: Missing 'project.update' permission" },
          { status: 403 }
        );
      }
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") || formData.get("photo");

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, WebP, GIF, and SVG images are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Create uploads/projects directory if it doesn't exist
    const projectsDir = join(process.cwd(), "uploads", "projects");
    try {
      await mkdir(projectsDir, { recursive: true });
    } catch {
      // directory exists
    }

    // Delete previous image if exists
    if (project.imagePath) {
      try {
        await unlink(project.imagePath);
      } catch (err) {
        console.warn("Failed to delete previous project image:", err);
      }
    }

    // Generate safe filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const rawExt = file.name ? file.name.split(".").pop() : "jpg";
    const fileExtension = rawExt.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const fileName = `project-${id}-${uniqueSuffix}.${fileExtension}`;
    const filePath = join(projectsDir, fileName);

    // Save buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const imageUrl = `/api/projects/${id}/photo/view?v=${Date.now()}`;
    const imageData = {
      imageUrl,
      imagePath: filePath,
      imageFileName: fileName,
      imageMimeType: file.type,
      imageSize: buffer.length,
      imageUploadDate: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      { $set: imageData }
    );

    // Create audit log
    createAuditLog({
      action: "UPDATE",
      entityType: "project_image",
      entityId: id,
      user,
      request,
      metadata: {
        fileName,
        fileSize: buffer.length,
        mimeType: file.type,
        projectName: project.name,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Project image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading project image:", error);
    return NextResponse.json(
      { error: "Failed to upload project image", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (user && user.authenticated) {
      const hasPerm = await checkPermission(user.userId, "project.update", user.role);
      if (!hasPerm) {
        return NextResponse.json(
          { error: "Access denied: Missing 'project.update' permission" },
          { status: 403 }
        );
      }
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const project = await db.collection("projects").findOne({
      _id: new ObjectId(id),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.imagePath) {
      try {
        await unlink(project.imagePath);
      } catch (err) {
        console.warn("Failed to delete project image on disk:", err);
      }
    }

    await db.collection("projects").updateOne(
      { _id: new ObjectId(id) },
      {
        $unset: {
          imageUrl: "",
          imagePath: "",
          imageFileName: "",
          imageMimeType: "",
          imageSize: "",
          imageUploadDate: "",
        },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Project image removed successfully",
    });
  } catch (error) {
    console.error("Error removing project image:", error);
    return NextResponse.json(
      { error: "Failed to remove project image", details: error.message },
      { status: 500 }
    );
  }
}
