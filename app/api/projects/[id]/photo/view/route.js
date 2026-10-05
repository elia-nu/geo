import { NextResponse } from "next/server";
import { getDb } from "../../../../mongo";
import { readFile } from "fs/promises";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
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

    if (!project.imagePath) {
      // If there is an external or data URL
      if (project.imageUrl && (project.imageUrl.startsWith("http") || project.imageUrl.startsWith("data:"))) {
        return NextResponse.redirect(project.imageUrl);
      }
      return NextResponse.json(
        { error: "No image found for this project" },
        { status: 404 }
      );
    }

    try {
      const buffer = await readFile(project.imagePath);
      const response = new NextResponse(buffer);

      response.headers.set(
        "Content-Type",
        project.imageMimeType || "image/jpeg"
      );
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, stale-while-revalidate=43200"
      );
      response.headers.set(
        "Content-Length",
        (project.imageSize || buffer.length).toString()
      );

      return response;
    } catch (fileError) {
      console.error("Error reading project image file:", fileError);
      return NextResponse.json(
        { error: "Image file not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error retrieving project image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
