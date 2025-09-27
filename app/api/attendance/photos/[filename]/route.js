import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Serve attendance photo from file system
export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Construct file path
    const photosDir = join(process.cwd(), "uploads", "attendance-photos");
    const filePath = join(photosDir, filename);

    // Read the photo file
    const photoBuffer = await readFile(filePath);

    // Return the image with proper headers
    const response = new NextResponse(photoBuffer);
    response.headers.set("Content-Type", "image/jpeg");
    response.headers.set("Content-Length", photoBuffer.length.toString());
    response.headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return response;
  } catch (error) {
    console.error("Error serving attendance photo:", error);
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
}
