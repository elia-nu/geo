// Debug script to check leave requests
// Run this in your browser console

const debugLeaveRequests = async () => {
  console.log("🔍 Debugging Leave Requests...");

  try {
    // Step 1: Check all employees
    console.log("\n1️⃣ Checking employees...");
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();

    if (employeesResult.success) {
      console.log(`Found ${employeesResult.employees.length} employees`);
      employeesResult.employees.forEach((emp, index) => {
        console.log(
          `${index + 1}. ${emp.personalDetails?.name || emp.name} (ID: ${
            emp._id
          })`
        );
      });
    }

    // Step 2: Check all leave requests
    console.log("\n2️⃣ Checking all leave requests...");
    const allRequestsResponse = await fetch(
      "/api/attendance/documents?type=leave"
    );
    const allRequestsResult = await allRequestsResponse.json();

    if (allRequestsResult.success) {
      console.log(`Found ${allRequestsResult.data.length} leave requests`);
      allRequestsResult.data.forEach((req, index) => {
        console.log(
          `${index + 1}. Employee: ${req.employeeName} (${req.employeeId})`
        );
        console.log(`   Status: ${req.status}, Type: ${req.leaveType}`);
        console.log(`   Dates: ${req.startDate} to ${req.endDate}`);
        console.log(`   Reason: ${req.reason}`);
      });
    }

    // Step 3: Test specific manager approval
    console.log("\n3️⃣ Testing manager approval...");
    const managerId = "68b049c2c04c31ba7af8f312"; // John Doe
    const requestsResponse = await fetch(
      `/api/leave/approval-routing/requests?managerId=${managerId}&status=pending`
    );
    const requestsResult = await requestsResponse.json();

    if (requestsResult.success) {
      console.log(
        `Manager ${managerId} can approve ${requestsResult.data.length} requests`
      );
      requestsResult.data.forEach((req, index) => {
        console.log(
          `${index + 1}. ${req.employeeName} - ${req.leaveType} leave`
        );
      });
    } else {
      console.log("❌ Manager approval API failed:", requestsResult.error);
    }

    // Step 4: Check specific leave request
    console.log("\n4️⃣ Checking specific leave request...");
    const specificRequestId = "68aee2adacf64b48ab01c356"; // Your request ID
    const specificResponse = await fetch(
      `/api/attendance/documents?type=leave&employeeId=68ada2ab57e7f15bd0897143`
    );
    const specificResult = await specificResponse.json();

    if (specificResult.success) {
      console.log(
        `Found ${specificResult.data.length} requests for employee 68ada2ab57e7f15bd0897143`
      );
      specificResult.data.forEach((req, index) => {
        console.log(`${index + 1}. ID: ${req._id}, Status: ${req.status}`);
      });
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run debugLeaveRequests() to start debugging."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { debugLeaveRequests };
}
