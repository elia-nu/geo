import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request, { params }) {
  try {
    const { filename } = await params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "reports",
      filename
    );

    try {
      const fileBuffer = await fs.readFile(filePath);

      // Determine content type based on file extension
      const contentType = filename.endsWith(".pdf")
        ? "application/pdf"
        : "application/json";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      });
    } catch (fileError) {
      return NextResponse.json(
        { error: "Report file not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error downloading report:", error);
    return NextResponse.json(
      { error: "Failed to download report", message: error.message },
      { status: 500 }
    );
  }
}
