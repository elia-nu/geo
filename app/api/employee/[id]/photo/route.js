import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo");

    if (!file) {
      return NextResponse.json({ error: "No photo uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, and WebP images are allowed",
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if employee exists
    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(id),
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Create photos directory if it doesn't exist
    const photosDir = join(process.cwd(), "uploads", "photos");
    try {
      await mkdir(photosDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Delete old photo if it exists
    if (employee.photoPath) {
      try {
        await unlink(employee.photoPath);
      } catch (error) {
        console.warn("Failed to delete old photo:", error);
      }
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = file.name.split(".").pop();
    const fileName = `employee-${id}-${uniqueSuffix}.${fileExtension}`;
    const filePath = join(photosDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update employee record with photo information
    const photoData = {
      photoPath: filePath,
      photoFileName: fileName,
      photoUrl: `/api/employee/${id}/photo/view`,
      photoUploadDate: new Date(),
      photoSize: buffer.length,
      photoMimeType: file.type,
    };

    await db.collection("employees").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...photoData,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Photo uploaded successfully",
      photoUrl: photoData.photoUrl,
      fileName: fileName,
      fileSize: buffer.length,
    });
  } catch (error) {
    console.error("Error uploading employee photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const employee = await db.collection("employees").findOne({
      _id: new ObjectId(id),
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (!employee.photoPath) {
      return NextResponse.json(
        { error: "No photo to delete" },
        { status: 400 }
      );
    }

    // Delete photo file
    try {
      await unlink(employee.photoPath);
    } catch (error) {
      console.warn("Failed to delete photo file:", error);
    }

    // Remove photo information from employee record
    await db.collection("employees").updateOne(
      { _id: new ObjectId(id) },
      {
        $unset: {
          photoPath: "",
          photoFileName: "",
          photoUrl: "",
          photoUploadDate: "",
          photoSize: "",
          photoMimeType: "",
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
