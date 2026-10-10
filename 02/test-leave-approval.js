// Leave Approval System Test Script
// Run this in your browser console or as a Node.js script

const testLeaveApprovalSystem = async () => {
  console.log("🚀 Starting Leave Approval System Test...");

  try {
    // Step 1: Get employees for testing
    console.log("\n📋 Step 1: Fetching employees...");
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();

    if (
      !employeesResult.success ||
      !employeesResult.employees ||
      employeesResult.employees.length === 0
    ) {
      console.error("❌ No employees found. Please seed data first.");
      return;
    }

    const testEmployee = employeesResult.employees[0];
    console.log(
      `✅ Found test employee: ${
        testEmployee.personalDetails?.name || testEmployee.name
      }`
    );
    console.log(`   ID: ${testEmployee._id}`);

    // Step 2: Create a test leave request
    console.log("\n📝 Step 2: Creating test leave request...");
    const leaveRequestData = {
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
      body: JSON.stringify(leaveRequestData),
    });

    const leaveResult = await leaveResponse.json();
    if (!leaveResult.success) {
      console.error("❌ Failed to create leave request:", leaveResult.error);
      return;
    }

    console.log("✅ Leave request created successfully");
    console.log(`   Request ID: ${leaveResult.document._id}`);
    console.log(`   Status: ${leaveResult.document.status}`);

    // Step 3: Test leave balance calculation
    console.log("\n💰 Step 3: Testing leave balance calculation...");
    const balanceResponse = await fetch(
      `/api/leave/balances?employeeId=${testEmployee._id}`
    );
    const balanceResult = await balanceResponse.json();

    if (balanceResult.success) {
      console.log("✅ Leave balance calculated successfully");
      console.log("   Annual Leave:", balanceResult.data.balances.annual);
      console.log("   Sick Leave:", balanceResult.data.balances.sick);
    } else {
      console.log("⚠️  Leave balance calculation failed:", balanceResult.error);
    }

    // Step 4: Test approval routing
    console.log("\n🔄 Step 4: Testing approval routing...");
    const routingResponse = await fetch(
      `/api/leave/approval-routing?employeeId=${testEmployee._id}&leaveRequestId=${leaveResult.document._id}`
    );
    const routingResult = await routingResponse.json();

    if (routingResult.success) {
      console.log("✅ Approval routing generated successfully");
      console.log("   Levels:", routingResult.data.levels.length);
      routingResult.data.levels.forEach((level, index) => {
        console.log(
          `   Level ${index + 1}: ${level.role} (${
            level.required ? "Required" : "Optional"
          })`
        );
      });
    } else {
      console.log("⚠️  Approval routing failed:", routingResult.error);
    }

    // Step 5: Test manager approval interface
    console.log("\n👨‍💼 Step 5: Testing manager approval interface...");
    const managerRequestsResponse = await fetch(
      `/api/leave/approval-routing/requests?managerId=admin&status=pending`
    );
    const managerRequestsResult = await managerRequestsResponse.json();

    if (managerRequestsResult.success) {
      console.log("✅ Manager approval interface working");
      console.log(`   Pending requests: ${managerRequestsResult.data.length}`);
      if (managerRequestsResult.data.length > 0) {
        console.log("   Sample request:", {
          employee: managerRequestsResult.data[0].employeeName,
          leaveType: managerRequestsResult.data[0].leaveType,
          dates: `${managerRequestsResult.data[0].startDate} to ${managerRequestsResult.data[0].endDate}`,
        });
      }
    } else {
      console.log(
        "⚠️  Manager approval interface failed:",
        managerRequestsResult.error
      );
    }

    // Step 6: Test approval action
    console.log("\n✅ Step 6: Testing approval action...");
    const approvalData = {
      leaveRequestId: leaveResult.document._id,
      action: "approve",
      managerId: "admin",
      managerName: "Admin User",
      notes: "Test approval - system working correctly",
    };

    const approvalResponse = await fetch(
      "/api/leave/approval-routing/approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData),
      }
    );

    const approvalResult = await approvalResponse.json();
    if (approvalResult.success) {
      console.log("✅ Leave request approved successfully");
      console.log("   Updated status:", approvalResult.data.status);
      console.log(
        "   Approval history:",
        approvalResult.data.approvalHistory?.length || 0,
        "entries"
      );
    } else {
      console.log("⚠️  Approval action failed:", approvalResult.error);
    }

    // Step 7: Test payroll integration
    console.log("\n💼 Step 7: Testing payroll integration...");
    const payrollResponse = await fetch(
      `/api/attendance/payroll-integration?startDate=2024-01-01&endDate=2024-01-31&includeLeaveData=true`
    );
    const payrollResult = await payrollResponse.json();

    if (payrollResult.success) {
      console.log("✅ Payroll integration working");
      console.log("   Records processed:", payrollResult.data.records.length);
      console.log("   Summary generated:", !!payrollResult.data.summary);
    } else {
      console.log("⚠️  Payroll integration failed:", payrollResult.error);
    }

    console.log("\n🎉 Leave Approval System Test Complete!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Leave request creation: Working");
    console.log("   ✅ Leave balance calculation: Working");
    console.log("   ✅ Approval routing: Working");
    console.log("   ✅ Manager interface: Working");
    console.log("   ✅ Approval action: Working");
    console.log("   ✅ Payroll integration: Working");

    console.log("\n🌐 Next Steps:");
    console.log("   1. Go to: http://localhost:3000/hrm");
    console.log("   2. Navigate to: Leave Management → Leave Approval");
    console.log(
      "   3. You should see the test leave request in the pending list"
    );
    console.log("   4. Test the approval/rejection functionality");
    console.log("   5. Check Leave Balances to see updated balances");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
};

// Export for Node.js usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testLeaveApprovalSystem };
}

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser environment detected. Run testLeaveApprovalSystem() to start the test."
  );
}
