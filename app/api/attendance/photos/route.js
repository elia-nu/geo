import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Save attendance photo to file system
export async function POST(request) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo");
    const employeeId = formData.get("employeeId");
    const action = formData.get("action"); // check-in or check-out
    const date = formData.get("date");

    if (!photo || !employeeId || !action || !date) {
      return NextResponse.json(
        { error: "Missing required fields: photo, employeeId, action, date" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const base64Data = photo.replace(/^data:image\/jpeg;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Create photos directory if it doesn't exist
    const photosDir = join(process.cwd(), "uploads", "attendance-photos");
    await mkdir(photosDir, { recursive: true });

    // Generate unique filename
    const fileName = `${employeeId}_${action}_${date}_${uuidv4()}.jpg`;
    const filePath = join(photosDir, fileName);

    // Save photo to file system
    await writeFile(filePath, buffer);

    // Return photo URL and metadata
    const photoUrl = `/api/attendance/photos/${fileName}`;

    return NextResponse.json({
      success: true,
      message: "Photo saved successfully",
      data: {
        photoUrl,
        fileName,
        filePath,
        fileSize: buffer.length,
        mimeType: "image/jpeg",
        uploadDate: new Date(),
      },
    });
  } catch (error) {
    console.error("Error saving attendance photo:", error);
    return NextResponse.json(
      { error: "Failed to save photo", message: error.message },
      { status: 500 }
    );
  }
}
