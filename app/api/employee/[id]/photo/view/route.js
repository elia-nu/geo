import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { readFile } from "fs/promises";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
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
        { error: "No photo found for this employee" },
        { status: 404 }
      );
    }

    try {
      // Read the photo file from the filesystem
      const photoBuffer = await readFile(employee.photoPath);

      // Create response with appropriate headers
      const response = new NextResponse(photoBuffer);

      response.headers.set(
        "Content-Type",
        employee.photoMimeType || "image/jpeg"
      );
      response.headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      response.headers.set(
        "Content-Length",
        employee.photoSize?.toString() || photoBuffer.length.toString()
      );

      return response;
    } catch (fileError) {
      console.error("Error reading photo file:", fileError);
      return NextResponse.json(
        { error: "Photo file not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving employee photo:", error);
    return NextResponse.json(
      { error: "Failed to serve photo" },
      { status: 500 }
    );
  }
}
