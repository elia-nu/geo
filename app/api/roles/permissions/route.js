import { NextResponse } from "next/server";
import { PERMISSION_CATALOG, getAllPermissionKeys } from "../../../utils/permissions";

// GET /api/roles/permissions — returns the full permission catalog
export async function GET() {
  try {
    const allKeys = getAllPermissionKeys();
    return NextResponse.json({
      catalog: PERMISSION_CATALOG,
      totalPermissions: allKeys.length,
      allKeys,
    });
  } catch (error) {
    console.error("Error fetching permission catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch permission catalog" },
      { status: 500 }
    );
  }
}
