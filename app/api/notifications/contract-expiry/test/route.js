import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

/**
 * Test endpoint to check contract expiry status
 * GET /api/notifications/contract-expiry/test
 */
export async function GET(request) {
  try {
    const db = await getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all contractual employees
    const employees = await db
      .collection("employees")
      .find({
        $and: [
          {
            $or: [
              { "personalDetails.employeeType": "Contractual" },
              { employeeType: "Contractual" },
            ],
          },
          {
            $or: [
              { "personalDetails.contractExpiryDate": { $exists: true, $ne: null, $ne: "" } },
              { contractExpiryDate: { $exists: true, $ne: null, $ne: "" } },
            ],
          },
        ],
      })
      .toArray();

    const results = employees.map((employee) => {
      const contractExpiryDate =
        employee.personalDetails?.contractExpiryDate ||
        employee.contractExpiryDate;
      const employeeType =
        employee.personalDetails?.employeeType || employee.employeeType;

      if (!contractExpiryDate) {
        return {
          employeeId: employee._id.toString(),
          name: employee.personalDetails?.name || employee.name,
          email: employee.personalDetails?.email || employee.email,
          employeeType: employeeType,
          contractExpiryDate: null,
          daysUntilExpiry: null,
          status: "No expiry date",
        };
      }

      const expiryDate = new Date(contractExpiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil(
        (expiryDate - today) / (1000 * 60 * 60 * 24)
      );

      const shouldNotify =
        (daysUntilExpiry >= 13 && daysUntilExpiry <= 15) ||
        (daysUntilExpiry <= 0 && daysUntilExpiry >= -7) ||
        (daysUntilExpiry >= 0 && daysUntilExpiry <= 7);

      return {
        employeeId: employee._id.toString(),
        name: employee.personalDetails?.name || employee.name,
        email: employee.personalDetails?.email || employee.email,
        employeeType: employeeType,
        contractExpiryDate: contractExpiryDate,
        daysUntilExpiry: daysUntilExpiry,
        shouldNotify: shouldNotify,
        status: shouldNotify
          ? "Will receive notification"
          : "Outside notification window",
      };
    });

    return NextResponse.json({
      success: true,
      total: employees.length,
      today: today.toISOString().split("T")[0],
      employees: results,
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch contract expiry status",
      },
      { status: 500 }
    );
  }
}

