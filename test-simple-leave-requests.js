// Simple test script to verify leave requests without managerId
// Run this in your browser console

const testSimpleLeaveRequests = async () => {
  console.log("🧪 Testing Leave Requests (No Manager ID)...");

  try {
    // Test 1: Get all leave requests without managerId
    console.log("\n1️⃣ Testing leave requests API without managerId...");
    const response = await fetch(
      "/api/leave/approval-routing/requests?status=pending"
    );
    const result = await response.json();

    if (result.success) {
      console.log("✅ Leave requests API working without managerId");
      console.log(`   Found ${result.data.length} pending requests`);

      if (result.data.length > 0) {
        console.log("   Sample requests:");
        result.data.forEach((req, index) => {
          console.log(
            `   ${index + 1}. ${req.employeeName} - ${req.leaveType} leave`
          );
          console.log(`      Dates: ${req.startDate} to ${req.endDate}`);
          console.log(`      Reason: ${req.reason}`);
          console.log(`      Status: ${req.status}`);
        });
      } else {
        console.log("   No pending requests found");
      }
    } else {
      console.log("❌ Leave requests API failed:", result.error);
    }

    // Test 2: Check if your specific request is there
    console.log("\n2️⃣ Looking for your specific leave request...");
    const yourRequest = result.data.find(
      (req) =>
        req.employeeName === "ddd" &&
        req.startDate === "2025-08-28" &&
        req.endDate === "2025-08-30"
    );

    if (yourRequest) {
      console.log("✅ Found your leave request!");
      console.log("   Request ID:", yourRequest._id);
      console.log("   Employee:", yourRequest.employeeName);
      console.log("   Leave Type:", yourRequest.leaveType);
      console.log("   Status:", yourRequest.status);
    } else {
      console.log("❌ Your specific leave request not found");
      console.log(
        "   This might be because the employee 'ddd' doesn't exist in the employees collection"
      );
    }

    console.log("\n🎉 Test completed!");
    console.log("\n📋 Next Steps:");
    console.log("1. Go to: http://localhost:3000/hrm");
    console.log("2. Navigate to: Leave Management → Leave Approval");
    console.log(
      "3. You should now see all leave requests (including yours if the employee exists)"
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run testSimpleLeaveRequests() to start the test."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testSimpleLeaveRequests };
}
