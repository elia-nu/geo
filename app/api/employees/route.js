import { NextResponse } from "next/server";
import { getDb } from "../mongo";

// Get all employees
export async function GET() {
  try {
    const db = await getDb();
    const employees = await db.collection("employees").find().toArray();
    
    // Format employee data to ensure proper name fields
    const formattedEmployees = employees.map(emp => {
      // More comprehensive name extraction
      const fullName = emp.personalDetails?.name || 
                       emp.name || 
                       emp.personalDetails?.fullName ||
                       emp.fullName ||
                       (emp.personalDetails?.firstName && emp.personalDetails?.lastName ? 
                         `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}` : '') ||
                       (emp.firstName && emp.lastName ? 
                         `${emp.firstName} ${emp.lastName}` : '') ||
                       `Employee ${emp._id.toString().slice(-6)}`;
      
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      return {
        ...emp,
        firstName: emp.firstName || emp.personalDetails?.firstName || firstName || "Unknown",
        lastName: emp.lastName || emp.personalDetails?.lastName || lastName || "Employee",
        fullName: fullName.trim(),
        email: emp.personalDetails?.email || emp.email || "",
        role: emp.designation || emp.personalDetails?.designation || emp.position || emp.personalDetails?.position || "Employee",
        department: emp.department || emp.personalDetails?.department || "General"
      };
    });
    
    return NextResponse.json({
      success: true,
      employees: formattedEmployees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch employees",
      },
      { status: 500 }
    );
  }
}
