import { NextResponse } from "next/server";
import { getDb } from "../mongo";
import { ObjectId } from "mongodb";

// Get all documents (metadata only — exclude large binary payloads)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const documentType = searchParams.get("documentType") || searchParams.get("type");

    const query = {};

    if (employeeId) {
      const matchConditions = [
        { employeeId: employeeId },
        { "documentData.employeeId": employeeId },
      ];
      if (ObjectId.isValid(employeeId)) {
        matchConditions.push({ employeeId: new ObjectId(employeeId) });
      }
      query.$or = matchConditions;
    }

    if (documentType) {
      query.$or = query.$or
        ? query.$or.map((cond) => ({
            ...cond,
            $and: [
              {
                $or: [
                  { documentType: documentType },
                  { type: documentType },
                  { "documentData.documentType": documentType },
                  { "documentData.type": documentType },
                ],
              },
            ],
          }))
        : [
            { documentType: documentType },
            { type: documentType },
            { "documentData.documentType": documentType },
            { "documentData.type": documentType },
          ];
    }

    const db = await getDb();
    const documents = await db
      .collection("documents")
      .find(
        query,
        {
          projection: {
            fileData: 0,
            content: 0,
            data: 0,
            buffer: 0,
            binary: 0,
          },
        }
      )
      .sort({ uploadDate: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

