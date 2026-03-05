import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Employee Master Report
export async function POST(request) {
  try {
    const data = await request.json();

    // Get current user for role-based access
    const user = await getCurrentUser(request);

    // Check permission to export reports (pass role from token)
    const hasPermission = await checkPermission(user.userId, "reports.export", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to export reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel", // excel, csv
      employees = [],
      summary = {},
      filters = {},
    } = data;

    // Validate employees data
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: "No employee data provided for export. Please generate a report first." },
        { status: 400 }
      );
    }

    // Create audit log (don't block export if this fails)
    try {
      await createAuditLog({
        action: "EXPORT",
        entityType: "report",
        entityId: "employee_master",
        userId: user.userId,
        userEmail: user.email,
        metadata: {
          reportType: "employee_master",
          format,
          recordCount: employees.length,
          filters,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log (non-blocking):", auditError);
    }

    // Generate export based on format
    try {
      switch (format.toLowerCase()) {
        case "excel":
        case "xlsx":
          return generateExcelExport(employees, summary, filters);
        case "csv":
          return generateCSVExport(employees, summary, filters);
        default:
          return NextResponse.json(
            { error: "Unsupported export format. Use: excel or csv" },
            { status: 400 }
          );
      }
    } catch (exportError) {
      console.error("Error in export generation:", exportError);
      return NextResponse.json(
        {
          error: "Failed to generate export file",
          message: exportError.message || "Unknown error occurred",
          details: process.env.NODE_ENV === "development" ? exportError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error exporting employee master report:", error);
    return NextResponse.json(
      {
        error: "Failed to export employee master report",
        message: error.message || "Unknown error occurred",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Generate Excel export
function generateExcelExport(employees, summary, filters) {
  try {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ["EMPLOYEE MASTER REPORT"],
      [],
      ["Generated on", new Date().toLocaleString()],
      [],
      ["SUMMARY"],
      [],
      ["Metric", "Value"],
      ["Total Employees", summary?.total || employees?.length || 0],
      ["Active", summary?.byStatus?.Active || 0],
      ["Inactive", summary?.byStatus?.Inactive || 0],
      ["On Leave", summary?.byStatus?.["On Leave"] || 0],
      ["Terminated", summary?.byStatus?.Terminated || 0],
      [],
      ["By Department"],
      ["Department", "Count"],
    ];

    // Add department breakdown
    if (summary?.byDepartment && typeof summary.byDepartment === 'object') {
      Object.entries(summary.byDepartment).forEach(([dept, count]) => {
        summaryData.push([dept || "Not Assigned", count || 0]);
      });
    }

    summaryData.push([], ["By Contract Type"], ["Contract Type", "Count"]);

    // Add contract type breakdown
    if (summary?.byContractType && typeof summary.byContractType === 'object') {
      Object.entries(summary.byContractType).forEach(([type, count]) => {
        summaryData.push([type || "Permanent", count || 0]);
      });
    }

    // Add filters if any
    if (filters && Object.keys(filters).length > 0) {
      summaryData.push([], ["FILTERS APPLIED"]);
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          summaryData.push([key, value]);
        }
      });
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Employee Details Sheet
    const employeeHeaders = [
      "Employee ID",
      "Employee Name",
      "Email",
      "Contact Number",
      "Department",
      "Role/Designation",
      "Work Location",
      "Contract Type",
      "Joining Date",
      "Contract Expiry Date",
      "Status",
      "Assigned Projects",
    ];

    const employeeRows = [employeeHeaders];

    // Ensure employees is an array
    const employeesList = Array.isArray(employees) ? employees : [];
    
    employeesList.forEach((emp) => {
      try {
        // Safely handle ObjectId conversion
        const empId = emp.employeeId || (emp._id ? (typeof emp._id === 'string' ? emp._id : emp._id.toString()) : "N/A");
        
        // Safely handle dates
        let joiningDate = "N/A";
        if (emp.joiningDate) {
          try {
            if (emp.joiningDate instanceof Date) {
              joiningDate = emp.joiningDate.toLocaleDateString();
            } else {
              const date = new Date(emp.joiningDate);
              if (!isNaN(date.getTime())) {
                joiningDate = date.toLocaleDateString();
              }
            }
          } catch (e) {
            joiningDate = String(emp.joiningDate);
          }
        }
        
        let contractExpiryDate = "N/A";
        if (emp.contractExpiryDate) {
          try {
            if (emp.contractExpiryDate instanceof Date) {
              contractExpiryDate = emp.contractExpiryDate.toLocaleDateString();
            } else {
              const date = new Date(emp.contractExpiryDate);
              if (!isNaN(date.getTime())) {
                contractExpiryDate = date.toLocaleDateString();
              }
            }
          } catch (e) {
            contractExpiryDate = String(emp.contractExpiryDate);
          }
        }

        // Safely handle assigned projects
        const projects = emp.assignedProjects && Array.isArray(emp.assignedProjects)
          ? emp.assignedProjects.map((p) => (p?.name || p?.id || "Unknown")).join(", ")
          : "None";

        employeeRows.push([
          empId,
          emp.employeeName || emp.name || "N/A",
          emp.email || "N/A",
          emp.contactNumber || emp.contact || "N/A",
          emp.department || "N/A",
          emp.role || emp.designation || "N/A",
          emp.workLocation || "N/A",
          emp.contractType || "N/A",
          joiningDate,
          contractExpiryDate,
          emp.status || "N/A",
          projects,
        ]);
      } catch (err) {
        console.error("Error processing employee for export:", err, emp);
        // Add row with error indicator
        employeeRows.push([
          "ERROR",
          "Error processing employee data",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }
    });

    const employeeSheet = XLSX.utils.aoa_to_sheet(employeeRows);

    // Set column widths
    employeeSheet["!cols"] = [
      { wch: 15 }, // Employee ID
      { wch: 25 }, // Employee Name
      { wch: 30 }, // Email
      { wch: 15 }, // Contact Number
      { wch: 20 }, // Department
      { wch: 20 }, // Role
      { wch: 20 }, // Work Location
      { wch: 15 }, // Contract Type
      { wch: 15 }, // Joining Date
      { wch: 18 }, // Contract Expiry Date
      { wch: 12 }, // Status
      { wch: 40 }, // Assigned Projects
    ];

    XLSX.utils.book_append_sheet(workbook, employeeSheet, "Employee Details");

    // Convert to buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `employee_master_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`;

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating Excel export:", error);
    throw error;
  }
}

// Generate CSV export
function generateCSVExport(employees, summary, filters) {
  try {
    const headers = [
      "Employee ID",
      "Employee Name",
      "Email",
      "Contact Number",
      "Department",
      "Role/Designation",
      "Work Location",
      "Contract Type",
      "Joining Date",
      "Contract Expiry Date",
      "Status",
      "Assigned Projects",
    ];

    // Convert to CSV format
    const csvRows = [headers.join(",")];

    // Ensure employees is an array
    const employeesList = Array.isArray(employees) ? employees : [];

    employeesList.forEach((emp) => {
      try {
        // Safely handle ObjectId conversion
        const empId = emp.employeeId || (emp._id ? (typeof emp._id === 'string' ? emp._id : emp._id.toString()) : "");
        
        // Safely handle dates
        let joiningDate = "";
        if (emp.joiningDate) {
          try {
            if (emp.joiningDate instanceof Date) {
              joiningDate = emp.joiningDate.toLocaleDateString();
            } else {
              const date = new Date(emp.joiningDate);
              if (!isNaN(date.getTime())) {
                joiningDate = date.toLocaleDateString();
              }
            }
          } catch (e) {
            joiningDate = String(emp.joiningDate);
          }
        }
        
        let contractExpiryDate = "";
        if (emp.contractExpiryDate) {
          try {
            if (emp.contractExpiryDate instanceof Date) {
              contractExpiryDate = emp.contractExpiryDate.toLocaleDateString();
            } else {
              const date = new Date(emp.contractExpiryDate);
              if (!isNaN(date.getTime())) {
                contractExpiryDate = date.toLocaleDateString();
              }
            }
          } catch (e) {
            contractExpiryDate = String(emp.contractExpiryDate);
          }
        }

        // Safely handle assigned projects
        const projects = emp.assignedProjects && Array.isArray(emp.assignedProjects)
          ? emp.assignedProjects.map((p) => (p?.name || p?.id || "Unknown")).join(", ")
          : "None";

        // Escape CSV values properly
        const escapeCSV = (value) => {
          if (value === null || value === undefined) return "";
          const str = String(value);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const row = [
          escapeCSV(empId),
          escapeCSV(emp.employeeName || emp.name || ""),
          escapeCSV(emp.email || ""),
          escapeCSV(emp.contactNumber || emp.contact || ""),
          escapeCSV(emp.department || ""),
          escapeCSV(emp.role || emp.designation || ""),
          escapeCSV(emp.workLocation || ""),
          escapeCSV(emp.contractType || ""),
          escapeCSV(joiningDate),
          escapeCSV(contractExpiryDate),
          escapeCSV(emp.status || ""),
          escapeCSV(projects),
        ];
        csvRows.push(row.join(","));
      } catch (err) {
        console.error("Error processing employee for CSV export:", err, emp);
      }
    });

    const csvContent = csvRows.join("\n");
    const fileName = `employee_master_report_${new Date()
      .toISOString()
      .split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error generating CSV export:", error);
    throw error;
  }
}

