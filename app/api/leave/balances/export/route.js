import { NextResponse } from "next/server";
import { getDb } from "../../../mongo";
import { ObjectId } from "mongodb";

// Export leave balances in various formats
export async function POST(request) {
  try {
    const db = await getDb();
    const data = await request.json();
    const { format = "csv", department, employeeId } = data;

    // Build query
    let query = {};
    if (employeeId) {
      query.employeeId = new ObjectId(employeeId);
    }

    // Get leave balances
    const leaveBalances = await db
      .collection("leave_balances")
      .find(query)
      .toArray();

    // Get employee details for each balance
    const employeeIds = leaveBalances.map((balance) => balance.employeeId);
    const employees = await db
      .collection("employees")
      .find({ _id: { $in: employeeIds } })
      .toArray();

    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp._id.toString()] = {
        name: emp.personalDetails?.name || emp.name,
        email: emp.personalDetails?.email || emp.email,
        department: emp.department,
        designation: emp.designation,
      };
    });

    // Filter by department if specified
    let filteredBalances = leaveBalances;
    if (department) {
      filteredBalances = leaveBalances.filter((balance) => {
        const employee = employeeMap[balance.employeeId.toString()];
        return employee && employee.department === department;
      });
    }

    // Enhance balances with employee details
    const enhancedBalances = filteredBalances.map((balance) => {
      const employee = employeeMap[balance.employeeId.toString()];
      return {
        ...balance,
        employee: employee || {
          name: "Unknown",
          email: "",
          department: "",
          designation: "",
        },
      };
    });

    if (format === "csv") {
      const csvContent = generateCSV(enhancedBalances);
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="leave-balances-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    } else if (format === "json") {
      return NextResponse.json({
        success: true,
        data: enhancedBalances,
        exportedAt: new Date(),
        totalRecords: enhancedBalances.length,
      });
    } else {
      return NextResponse.json(
        { error: "Unsupported format. Use 'csv' or 'json'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error exporting leave balances:", error);
    return NextResponse.json(
      { error: "Failed to export leave balances", message: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate CSV content
function generateCSV(leaveBalances) {
  const headers = [
    "Employee Name",
    "Email",
    "Department",
    "Designation",
    "Employment Date",
    "Years of Service",
    "Base Allowance",
    "Seniority Bonus (+1/2yrs)",
    "Annual Allowance",
    "Carried Forward (Rollover)",
    "Expired (>2yrs Limit)",
    "Total Earned",
    "Used Days",
    "Pending Days",
    "Available Days",
    "Last Calculated",
  ];

  const rows = leaveBalances.map((balance) => {
    const annual = balance.balances?.annual || {
      baseAllowance: 16,
      seniorityBonus: 0,
      yearlyAllowance: 16,
      carriedForward: 0,
      expiredDays: 0,
      totalEarned: 16,
      available: 16,
      used: 0,
      pending: 0,
    };

    return [
      balance.employee?.name || balance.employeeName || "Unknown",
      balance.employee?.email || "",
      balance.employee?.department || "",
      balance.employee?.designation || "",
      balance.employmentDate
        ? new Date(balance.employmentDate).toLocaleDateString()
        : "",
      balance.yearsOfService || 0,
      annual.baseAllowance ?? 16,
      annual.seniorityBonus ?? 0,
      annual.yearlyAllowance ?? 16,
      annual.carriedForward ?? 0,
      annual.expiredDays ?? 0,
      annual.totalEarned ?? 16,
      annual.used ?? 0,
      annual.pending ?? 0,
      annual.available ?? 0,
      balance.lastCalculated
        ? new Date(balance.lastCalculated).toLocaleDateString()
        : "",
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((field) => {
          if (field === null || field === undefined) return '""';
          const stringField = String(field);
          if (
            stringField.includes(",") ||
            stringField.includes('"') ||
            stringField.includes("\n")
          ) {
            return `"${stringField.replace(/"/g, '""')}"`;
          }
          return stringField;
        })
        .join(",")
    ),
  ].join("\n");

  return csvContent;
}
