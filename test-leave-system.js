// Simple test script to verify leave approval system
// Run this in your browser console

const testLeaveSystem = async () => {
  console.log("🧪 Testing Leave Approval System...");

  try {
    // Step 1: Test employees API
    console.log("\n1️⃣ Testing employees API...");
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();

    if (employeesResult.success && employeesResult.employees.length > 0) {
      console.log("✅ Employees API working");
      console.log(`   Found ${employeesResult.employees.length} employees`);
      const testEmployee = employeesResult.employees[0];
      console.log(
        `   Test employee: ${
          testEmployee.personalDetails?.name || testEmployee.name
        }`
      );
      console.log(`   Employee ID: ${testEmployee._id}`);

      // Step 2: Create a test leave request
      console.log("\n2️⃣ Creating test leave request...");
      const leaveData = {
        employeeId: testEmployee._id,
        type: "leave",
        leaveType: "annual",
        startDate: "2024-01-15",
        endDate: "2024-01-17",
        reason: "Test leave request for approval system",
        description: "Testing the leave approval workflow",
      };

      const leaveResponse = await fetch("/api/attendance/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveData),
      });

      const leaveResult = await leaveResponse.json();
      if (leaveResult.success) {
        console.log("✅ Leave request created successfully");
        console.log(`   Request ID: ${leaveResult.data.documentId}`);
        console.log(`   Status: ${leaveResult.data.status}`);

        // Step 3: Test leave requests API
        console.log("\n3️⃣ Testing leave requests API...");
        const requestsResponse = await fetch(
          `/api/leave/approval-routing/requests?managerId=${testEmployee._id}&status=pending`
        );
        const requestsResult = await requestsResponse.json();

        if (requestsResult.success) {
          console.log("✅ Leave requests API working");
          console.log(
            `   Found ${requestsResult.data.length} pending requests`
          );
          if (requestsResult.data.length > 0) {
            console.log("   Sample request:", {
              employee: requestsResult.data[0].employeeName,
              leaveType: requestsResult.data[0].leaveType,
              dates: `${requestsResult.data[0].startDate} to ${requestsResult.data[0].endDate}`,
            });
          }
        } else {
          console.log("❌ Leave requests API failed:", requestsResult.error);
        }

        // Step 4: Test leave balances API
        console.log("\n4️⃣ Testing leave balances API...");
        const balanceResponse = await fetch(
          `/api/leave/balances?employeeId=${testEmployee._id}`
        );
        const balanceResult = await balanceResponse.json();

        if (balanceResult.success) {
          console.log("✅ Leave balances API working");
          console.log("   Annual leave:", balanceResult.data.balances.annual);
          console.log("   Sick leave:", balanceResult.data.balances.sick);
        } else {
          console.log("❌ Leave balances API failed:", balanceResult.error);
        }
      } else {
        console.log("❌ Failed to create leave request:", leaveResult.error);
      }
    } else {
      console.log("❌ No employees found");
    }

    console.log("\n🎉 Test completed!");
    console.log("\n📋 Next Steps:");
    console.log("1. Go to: http://localhost:3000/hrm");
    console.log("2. Navigate to: Leave Management → Leave Approval");
    console.log("3. You should see the test leave request in the pending list");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log("🌐 Browser detected. Run testLeaveSystem() to start the test.");
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testLeaveSystem };
}
