import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Save attendance photo to file system
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    console.log("[photos] POST start");
    const contentType = request.headers.get("content-type") || "";
    let photo;
    let employeeId;
    let action;
    let date;

    if (contentType.includes("application/json")) {
      const json = await request.json();
      console.log("[photos] json parsed");
      photo = json.photo;
      employeeId = json.employeeId;
      action = json.action;
      date = json.date;
    } else {
      const formData = await request.formData();
      console.log("[photos] formData parsed");
      photo = formData.get("photo");
      employeeId = formData.get("employeeId");
      action = formData.get("action"); // check-in or check-out
      date = formData.get("date");
    }

    if (!photo || !employeeId || !action || !date) {
      return NextResponse.json(
        { error: "Missing required fields: photo, employeeId, action, date" },
        { status: 400 }
      );
    }

    // Normalize to Buffer (support data URL string or Blob/File)
    let buffer;
    let mimeType = "image/jpeg";
    if (typeof photo === "string") {
      // Data URL string
      const match = photo.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        mimeType = match[1] || "image/jpeg";
        buffer = Buffer.from(match[2], "base64");
      } else {
        // Fallback assuming jpeg prefix omitted
        const base64Data = photo.replace(/^data:image\/jpeg;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
      }
    } else if (photo && photo.arrayBuffer) {
      // Blob/File from multipart form
      mimeType = photo.type || "image/jpeg";
      const arr = await photo.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      return NextResponse.json(
        { error: "Invalid photo payload" },
        { status: 400 }
      );
    }
    console.log("[photos] buffer prepared:", {
      mimeType,
      size: buffer?.length,
    });

    // Create photos directory if it doesn't exist
    const photosDir = join(process.cwd(), "uploads", "attendance-photos");
    await mkdir(photosDir, { recursive: true });

    // Generate unique filename
    const ext = mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
      ? "webp"
      : "jpg";
    const fileName = `${employeeId}_${action}_${date}_${uuidv4()}.${ext}`;
    const filePath = join(photosDir, fileName);
    console.log("[photos] saving to:", filePath);

    // Save photo to file system
    await writeFile(filePath, buffer);
    console.log("[photos] saved");

    // Return photo URL and metadata
    const photoUrl = `/api/attendance/photos/${fileName}`;

    const response = NextResponse.json({
      success: true,
      message: "Photo saved successfully",
      data: {
        photoUrl,
        fileName,
        filePath,
        fileSize: buffer.length,
        mimeType,
        uploadDate: new Date(),
      },
    });
    console.log("[photos] response sent");
    return response;
  } catch (error) {
    console.error("Error saving attendance photo:", error);
    return NextResponse.json(
      { error: "Failed to save photo", message: error.message },
      { status: 500 }
    );
  }
}
