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
    "Annual Leave - Available",
    "Annual Leave - Used",
    "Annual Leave - Pending",
    "Sick Leave - Available",
    "Sick Leave - Used",
    "Sick Leave - Pending",
    "Personal Leave - Available",
    "Personal Leave - Used",
    "Personal Leave - Pending",
    "Maternity Leave - Available",
    "Maternity Leave - Used",
    "Maternity Leave - Pending",
    "Paternity Leave - Available",
    "Paternity Leave - Used",
    "Paternity Leave - Pending",
    "Bereavement Leave - Available",
    "Bereavement Leave - Used",
    "Bereavement Leave - Pending",
    "Total Available Days",
    "Total Used Days",
    "Total Pending Days",
    "Last Calculated",
  ];

  const rows = leaveBalances.map((balance) => {
    const annual = balance.balances?.annual || {
      available: 0,
      used: 0,
      pending: 0,
    };
    const sick = balance.balances?.sick || {
      available: 0,
      used: 0,
      pending: 0,
    };
    const personal = balance.balances?.personal || {
      available: 0,
      used: 0,
      pending: 0,
    };
    const maternity = balance.balances?.maternity || {
      available: 0,
      used: 0,
      pending: 0,
    };
    const paternity = balance.balances?.paternity || {
      available: 0,
      used: 0,
      pending: 0,
    };
    const bereavement = balance.balances?.bereavement || {
      available: 0,
      used: 0,
      pending: 0,
    };

    const totalAvailable =
      annual.available +
      sick.available +
      personal.available +
      maternity.available +
      paternity.available +
      bereavement.available;
    const totalUsed =
      annual.used +
      sick.used +
      personal.used +
      maternity.used +
      paternity.used +
      bereavement.used;
    const totalPending =
      annual.pending +
      sick.pending +
      personal.pending +
      maternity.pending +
      paternity.pending +
      bereavement.pending;

    return [
      balance.employee.name || "",
      balance.employee.email || "",
      balance.employee.department || "",
      balance.employee.designation || "",
      new Date(balance.employmentDate).toLocaleDateString(),
      balance.yearsOfService || 0,
      annual.available,
      annual.used,
      annual.pending,
      sick.available,
      sick.used,
      sick.pending,
      personal.available,
      personal.used,
      personal.pending,
      maternity.available,
      maternity.used,
      maternity.pending,
      paternity.available,
      paternity.used,
      paternity.pending,
      bereavement.available,
      bereavement.used,
      bereavement.pending,
      totalAvailable,
      totalUsed,
      totalPending,
      balance.lastCalculated
        ? new Date(balance.lastCalculated).toLocaleString()
        : "",
    ];
  });

  // Convert to CSV format
  const csvRows = [headers, ...rows];
  return csvRows
    .map((row) =>
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
}
