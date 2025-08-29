// Fix Admin Role Script
// Run this in your browser console

const fixAdminRole = async () => {
  console.log("🔧 Fixing Admin Role...");

  try {
    // Step 1: Find the employee
    console.log("\n1️⃣ Finding employee with ID ADMIN001...");
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();

    if (!employeesResult.success) {
      console.log("❌ Failed to fetch employees:", employeesResult.error);
      return;
    }

    const adminEmployee = employeesResult.employees.find(
      (emp) => emp.personalDetails?.employeeId === "ADMIN001"
    );

    if (!adminEmployee) {
      console.log("❌ Employee with ID ADMIN001 not found");
      console.log(
        "Available employees:",
        employeesResult.employees.map((e) => e.personalDetails?.employeeId)
      );
      return;
    }

    console.log("✅ Found employee:", adminEmployee._id);

    // Step 2: Check current role
    console.log("\n2️⃣ Checking current role...");
    const rolesResponse = await fetch(
      `/api/auth/roles?userId=${adminEmployee._id}`
    );
    const rolesResult = await rolesResponse.json();

    console.log("Current roles:", rolesResult.userRoles);

    // Step 3: Assign admin role
    console.log("\n3️⃣ Assigning admin role...");
    const roleData = {
      userId: adminEmployee._id,
      email: "admin@company.com",
      role: "ADMIN",
      assignedBy: "system",
    };

    const assignResponse = await fetch("/api/auth/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    });

    const assignResult = await assignResponse.json();
    console.log("Role assignment result:", assignResult);

    if (assignResult.message) {
      console.log("✅ Admin role assigned successfully");
    } else {
      console.log("❌ Failed to assign admin role:", assignResult.error);
      return;
    }

    // Step 4: Test login
    console.log("\n4️⃣ Testing admin login...");
    const loginData = {
      employeeId: "ADMIN001",
      password: "password",
    };

    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    const loginResult = await loginResponse.json();
    console.log("Login result:", loginResult);

    if (loginResult.success && loginResult.data.employee.role === "ADMIN") {
      console.log("✅ Admin login successful with ADMIN role!");
      console.log("   Role:", loginResult.data.employee.role);
      console.log("   Permissions:", loginResult.data.employee.permissions);

      // Store token
      localStorage.setItem("authToken", loginResult.data.token);

      console.log("\n🎉 Admin role fixed successfully!");
      console.log("\n🔗 Next Steps:");
      console.log("1. Go to: http://localhost:3000/login");
      console.log("2. Login with ADMIN001 / password");
      console.log("3. Should now access HRM dashboard");
    } else {
      console.log("❌ Login failed or role not ADMIN:", loginResult);
    }
  } catch (error) {
    console.error("❌ Failed to fix admin role:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log("🌐 Browser detected. Run fixAdminRole() to fix the admin role.");
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fixAdminRole };
}
