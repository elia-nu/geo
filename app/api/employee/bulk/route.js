import { NextResponse } from "next/server";
import { getDb } from "../../mongo";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { action, data, employeeIds } = await request.json();

    const db = await getDb();

    switch (action) {
      case "import":
        return await bulkImportEmployees(db, data);
      case "export":
        return await bulkExportEmployees(db, employeeIds);
      case "update":
        return await bulkUpdateEmployees(db, employeeIds, data);
      case "delete":
        return await bulkDeleteEmployees(db, employeeIds);
      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use 'import', 'export', 'update', or 'delete'",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 }
    );
  }
}

async function bulkImportEmployees(db, employees) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const [index, employeeData] of employees.entries()) {
    try {
      // Validate required fields
      if (
        !employeeData.personalDetails?.name ||
        !employeeData.personalDetails?.email
      ) {
        results.failed++;
        results.errors.push({
          index,
          error: "Missing required fields: name and email",
        });
        continue;
      }

      // Check if employee with email already exists
      const existingEmployee = await db.collection("employees").findOne({
        "personalDetails.email": employeeData.personalDetails.email,
      });

      if (existingEmployee) {
        results.failed++;
        results.errors.push({
          index,
          error: `Employee with email ${employeeData.personalDetails.email} already exists`,
        });
        continue;
      }

      // Add timestamps and default values
      const employee = {
        ...employeeData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
        // Ensure arrays exist
        employmentHistory: employeeData.employmentHistory || [],
        certifications: employeeData.certifications || [],
        skills: employeeData.skills || [],
        healthRecords: {
          bloodType: "",
          allergies: [],
          medicalConditions: [],
          ...employeeData.healthRecords,
        },
      };

      await db.collection("employees").insertOne(employee);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        index,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    message: `Bulk import completed. ${results.successful} successful, ${results.failed} failed`,
    ...results,
  });
}

async function bulkExportEmployees(db, employeeIds) {
  try {
    let query = {};

    if (employeeIds && employeeIds.length > 0) {
      // Export specific employees
      const objectIds = employeeIds.map((id) => new ObjectId(id));
      query = { _id: { $in: objectIds } };
    }

    const employees = await db.collection("employees").find(query).toArray();

    // Remove sensitive data and MongoDB-specific fields
    const exportData = employees.map((emp) => {
      const {
        _id,
        createdAt,
        updatedAt,
        photoPath,
        photoFileName,
        ...exportEmployee
      } = emp;
      return {
        ...exportEmployee,
        id: _id.toString(),
        exportedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      message: `Exported ${exportData.length} employees`,
      count: exportData.length,
      data: exportData,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
}

async function bulkUpdateEmployees(db, employeeIds, updateData) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  if (!employeeIds || employeeIds.length === 0) {
    return NextResponse.json(
      { error: "No employee IDs provided" },
      { status: 400 }
    );
  }

  for (const id of employeeIds) {
    try {
      if (!ObjectId.isValid(id)) {
        results.failed++;
        results.errors.push({
          employeeId: id,
          error: "Invalid employee ID",
        });
        continue;
      }

      const result = await db.collection("employees").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        results.failed++;
        results.errors.push({
          employeeId: id,
          error: "Employee not found",
        });
      } else {
        results.successful++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        employeeId: id,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    message: `Bulk update completed. ${results.successful} successful, ${results.failed} failed`,
    ...results,
  });
}

async function bulkDeleteEmployees(db, employeeIds) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  if (!employeeIds || employeeIds.length === 0) {
    return NextResponse.json(
      { error: "No employee IDs provided" },
      { status: 400 }
    );
  }

  for (const id of employeeIds) {
    try {
      if (!ObjectId.isValid(id)) {
        results.failed++;
        results.errors.push({
          employeeId: id,
          error: "Invalid employee ID",
        });
        continue;
      }

      // Check if employee has associated documents
      const documentCount = await db.collection("documents").countDocuments({
        employeeId: id,
      });

      if (documentCount > 0) {
        results.failed++;
        results.errors.push({
          employeeId: id,
          error: `Cannot delete employee with ${documentCount} associated documents`,
        });
        continue;
      }

      const result = await db.collection("employees").deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        results.failed++;
        results.errors.push({
          employeeId: id,
          error: "Employee not found",
        });
      } else {
        results.successful++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        employeeId: id,
        error: error.message,
      });
    }
  }

  return NextResponse.json({
    message: `Bulk delete completed. ${results.successful} successful, ${results.failed} failed`,
    ...results,
  });
}

// GET endpoint for bulk export
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const department = searchParams.get("department");
    const location = searchParams.get("location");

    const db = await getDb();

    let query = {};
    if (department) query.department = department;
    if (location) query.workLocation = location;

    const employees = await db.collection("employees").find(query).toArray();

    if (format === "csv") {
      return generateCSVExport(employees);
    }

    const exportData = employees.map((emp) => {
      const { _id, photoPath, photoFileName, ...exportEmployee } = emp;
      return {
        ...exportEmployee,
        id: _id.toString(),
      };
    });

    return NextResponse.json({
      message: `Exported ${exportData.length} employees`,
      count: exportData.length,
      data: exportData,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in bulk export:", error);
    return NextResponse.json(
      { error: "Failed to export employees" },
      { status: 500 }
    );
  }
}

function generateCSVExport(employees) {
  const headers = [
    "Name",
    "Email",
    "Department",
    "Designation",
    "Work Location",
    "Contact Number",
    "Date of Birth",
    "Address",
    "Skills",
    "Created At",
  ];

  const csvRows = [headers.join(",")];

  employees.forEach((emp) => {
    const row = [
      `"${emp.personalDetails.name || ""}"`,
      `"${emp.personalDetails.email || ""}"`,
      `"${emp.department || ""}"`,
      `"${emp.designation || ""}"`,
      `"${emp.workLocation || ""}"`,
      `"${emp.personalDetails.contactNumber || ""}"`,
      `"${emp.personalDetails.dateOfBirth || ""}"`,
      `"${emp.personalDetails.address || ""}"`,
      `"${emp.skills ? emp.skills.join("; ") : ""}"`,
      `"${emp.createdAt ? new Date(emp.createdAt).toISOString() : ""}"`,
    ];
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="employees-export-${
        new Date().toISOString().split("T")[0]
      }.csv"`,
    },
  });
}
