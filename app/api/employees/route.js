import { NextResponse } from "next/server";
import { getDb } from "../mongo";

// Get all employees
export async function GET() {
  try {
    const db = await getDb();
    const employees = await db.collection("employees").find().toArray();
    
    // Format employee data to ensure proper name fields
    const formattedEmployees = employees.map(emp => {
      // Extract name from personalDetails or use existing name fields
      const fullName = emp.personalDetails?.name || emp.name || "";
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      return {
        ...emp,
        firstName: emp.firstName || firstName || "Unknown",
        lastName: emp.lastName || lastName || "Employee",
        email: emp.personalDetails?.email || emp.email || "",
        role: emp.designation || emp.personalDetails?.designation || "Employee",
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
