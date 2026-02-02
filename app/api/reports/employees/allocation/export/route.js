import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { getCurrentUser, checkPermission } from "../../../../middleware/auth";
import { createAuditLog } from "../../../../../utils/audit";

// Export Employee Allocation Report
export async function POST(request) {
  try {
    const data = await request.json();
    const user = await getCurrentUser(request);

    const hasPermission = await checkPermission(user.userId, "reports.export", user.role);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Access denied. You don't have permission to export reports." },
        { status: 403 }
      );
    }

    const {
      format = "excel",
      employees = [],
      allocationStats = {},
      filters = {},
    } = data;

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: "No employee data provided for export" },
        { status: 400 }
      );
    }

    await createAuditLog({
      action: "EXPORT",
      entityType: "report",
      entityId: "employee_allocation",
      userId: user.userId,
      userEmail: user.email,
      metadata: {
        reportType: "employee_allocation",
        format,
        recordCount: employees.length,
        filters,
      },
    });

    switch (format.toLowerCase()) {
      case "excel":
      case "xlsx":
        return generateExcelExport(employees, allocationStats, filters);
      case "csv":
        return generateCSVExport(employees, allocationStats, filters);
      case "pdf":
        return await generatePDFExport(employees, allocationStats, filters);
      default:
        return NextResponse.json(
          { error: "Unsupported export format. Use: excel, csv, or pdf" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting employee allocation report:", error);
    return NextResponse.json(
      {
        error: "Failed to export employee allocation report",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function generateExcelExport(employees, allocationStats, filters) {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ["EMPLOYEE ALLOCATION REPORT"],
    [],
    ["Generated on", new Date().toLocaleString()],
    [],
    ["SUMMARY"],
    [],
    ["Metric", "Value"],
    ["Total Employees", allocationStats.totalEmployees || employees.length],
    ["Overloaded Employees", allocationStats.utilization?.overloaded?.length || 0],
    ["Underutilized Employees", allocationStats.utilization?.underutilized?.length || 0],
    ["Optimal Employees", allocationStats.utilization?.optimal?.length || 0],
    [],
    ["By Project"],
    ["Project", "Employee Count"],
  ];

  if (allocationStats.byProject) {
    Object.values(allocationStats.byProject).forEach((proj) => {
      summaryData.push([proj.name, proj.employeeCount]);
    });
  }

  summaryData.push([], ["By Location"], ["Location", "Employee Count"]);
  if (allocationStats.byLocation) {
    Object.values(allocationStats.byLocation).forEach((loc) => {
      summaryData.push([loc.name, loc.employeeCount]);
    });
  }

  summaryData.push([], ["By Department"], ["Department", "Employee Count"]);
  if (allocationStats.byDepartment) {
    Object.values(allocationStats.byDepartment).forEach((dept) => {
      summaryData.push([dept.name, dept.employeeCount]);
    });
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  // Employee Details Sheet
  const headers = [
    "Employee ID",
    "Employee Name",
    "Email",
    "Department",
    "Role",
    "Work Location",
    "Supervisor",
    "Project Count",
    "Assigned Projects",
  ];

  const rows = [headers];
  employees.forEach((emp) => {
    rows.push([
      emp.employeeId || emp._id || "N/A",
      emp.employeeName || "N/A",
      emp.email || "N/A",
      emp.department || "N/A",
      emp.role || "N/A",
      emp.workLocation || "N/A",
      emp.supervisor || "N/A",
      emp.projectCount || 0,
      emp.assignedProjects
        ? emp.assignedProjects.map((p) => p.name).join(", ")
        : "None",
    ]);
  });

  const employeeSheet = XLSX.utils.aoa_to_sheet(rows);
  employeeSheet["!cols"] = [
    { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 },
    { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, employeeSheet, "Employee Details");

  // Utilization Analysis Sheet
  const utilHeaders = ["Category", "Employee Name", "Department", "Project Count", "Projects"];
  const utilRows = [utilHeaders];

  if (allocationStats.utilization?.overloaded) {
    allocationStats.utilization.overloaded.forEach((emp) => {
      utilRows.push([
        "Overloaded",
        emp.name,
        emp.department,
        emp.projectCount,
        emp.projects?.map((p) => p.name).join(", ") || "",
      ]);
    });
  }

  if (allocationStats.utilization?.underutilized) {
    allocationStats.utilization.underutilized.forEach((emp) => {
      utilRows.push(["Underutilized", emp.name, emp.department, 0, ""]);
    });
  }

  if (utilRows.length > 1) {
    const utilSheet = XLSX.utils.aoa_to_sheet(utilRows);
    XLSX.utils.book_append_sheet(workbook, utilSheet, "Utilization Analysis");
  }

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const fileName = `employee_allocation_report_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache",
    },
  });
}

function generateCSVExport(employees, allocationStats, filters) {
  const headers = [
    "Employee ID",
    "Employee Name",
    "Email",
    "Department",
    "Role",
    "Work Location",
    "Supervisor",
    "Project Count",
    "Assigned Projects",
  ];

  const csvRows = [headers.join(",")];
  employees.forEach((emp) => {
    const row = [
      emp.employeeId || emp._id || "",
      `"${(emp.employeeName || "").replace(/"/g, '""')}"`,
      emp.email || "",
      `"${(emp.department || "").replace(/"/g, '""')}"`,
      `"${(emp.role || "").replace(/"/g, '""')}"`,
      `"${(emp.workLocation || "").replace(/"/g, '""')}"`,
      `"${(emp.supervisor || "").replace(/"/g, '""')}"`,
      emp.projectCount || 0,
      `"${(emp.assignedProjects
        ? emp.assignedProjects.map((p) => p.name).join(", ")
        : "None"
      ).replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");
  const fileName = `employee_allocation_report_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-cache",
    },
  });
}

async function generatePDFExport(employees, allocationStats, filters) {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `employee_allocation_report_${new Date()
          .toISOString()
          .split("T")[0]}.pdf`;

        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Cache-Control": "no-cache",
            },
          })
        );
      });
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("EMPLOYEE ALLOCATION REPORT", {
        align: "center",
      });
      doc.moveDown();
      doc.fontSize(10).font("Helvetica").text(`Generated on: ${new Date().toLocaleString()}`, {
        align: "center",
      });
      doc.moveDown(2);

      doc.fontSize(14).font("Helvetica-Bold").text("SUMMARY");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica");
      doc.text(`Total Employees: ${allocationStats.totalEmployees || employees.length}`);
      doc.text(
        `Overloaded: ${allocationStats.utilization?.overloaded?.length || 0}`
      );
      doc.text(
        `Underutilized: ${allocationStats.utilization?.underutilized?.length || 0}`
      );
      doc.text(`Optimal: ${allocationStats.utilization?.optimal?.length || 0}`);
      doc.moveDown();

      doc.fontSize(14).font("Helvetica-Bold").text("EMPLOYEE ALLOCATIONS");
      doc.moveDown(0.5);

      employees.forEach((emp, index) => {
        if (index > 0 && index % 20 === 0) {
          doc.addPage();
        }

        doc.fontSize(9).font("Helvetica-Bold");
        doc.text(`${index + 1}. ${emp.employeeName || "N/A"}`);
        doc.font("Helvetica");
        doc.text(`   Department: ${emp.department || "N/A"}`);
        doc.text(`   Location: ${emp.workLocation || "N/A"}`);
        doc.text(`   Projects: ${emp.projectCount || 0}`);
        if (emp.assignedProjects && emp.assignedProjects.length > 0) {
          doc.text(
            `   Project List: ${emp.assignedProjects.map((p) => p.name).join(", ")}`
          );
        }
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
