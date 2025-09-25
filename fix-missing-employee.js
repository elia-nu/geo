// Fix missing employee script
// Run this in your browser console

const fixMissingEmployee = async () => {
  console.log("🔧 Fixing missing employee...");

  try {
    // Add the missing employee to the database
    const employeeData = {
      personalDetails: {
        name: "ddd",
        dateOfBirth: "1990-01-01",
        address: "Test Address",
        contactNumber: "+1234567890",
        email: "ddd@company.com",
        employeeId: "68ada2ab57e7f15bd0897143",
      },
      department: "IT",
      designation: "Developer",
      workLocation: "Office",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    const response = await fetch("/api/employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Employee added successfully");
      console.log("Employee ID:", result.employee._id);

      // Now test the leave requests again
      console.log("\n🔄 Testing leave requests after fix...");
      const managerId = "68b049c2c04c31ba7af8f312";
      const requestsResponse = await fetch(
        `/api/leave/approval-routing/requests?managerId=${managerId}&status=pending`
      );
      const requestsResult = await requestsResponse.json();

      if (requestsResult.success) {
        console.log(
          `✅ Now manager can approve ${requestsResult.data.length} requests`
        );
        requestsResult.data.forEach((req, index) => {
          console.log(
            `${index + 1}. ${req.employeeName} - ${req.leaveType} leave`
          );
        });
      }
    } else {
      console.log("❌ Failed to add employee:", result.error);
    }
  } catch (error) {
    console.error("❌ Fix failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run fixMissingEmployee() to add the missing employee."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fixMissingEmployee };
}
