// Terminal script to create admin user
// Run with: node create-admin-terminal.js

const fetch = require("node-fetch");

const createAdminUser = async () => {
  console.log("🔧 Creating Admin User via Terminal...");

  try {
    // Step 1: Create employee
    console.log("\n1️⃣ Creating employee...");
    const employeeData = {
      personalDetails: {
        name: "Admin User",
        dateOfBirth: "1990-01-01",
        address: "Admin Address",
        contactNumber: "+1234567890",
        email: "admin@company.com",
        employeeId: "ADMIN001",
        password:
          "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // "password"
      },
      department: "IT",
      designation: "System Administrator",
      workLocation: "Office",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    };

    const employeeResponse = await fetch("http://localhost:3000/api/employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });

    const employeeResult = await employeeResponse.json();

    if (!employeeResult.success) {
      console.log("❌ Failed to create employee:", employeeResult.error);
      return;
    }

    const employeeId = employeeResult.employee._id;
    console.log("✅ Employee created with ID:", employeeId);

    // Step 2: Assign admin role
    console.log("\n2️⃣ Assigning admin role...");
    const roleData = {
      userId: employeeId,
      email: "admin@company.com",
      role: "ADMIN",
      assignedBy: "system",
    };

    const roleResponse = await fetch("http://localhost:3000/api/auth/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    });

    const roleResult = await roleResponse.json();

    if (roleResult.message) {
      console.log("✅ Admin role assigned successfully");
    } else {
      console.log("❌ Failed to assign admin role:", roleResult.error);
      return;
    }

    // Step 3: Test login
    console.log("\n3️⃣ Testing admin login...");
    const loginData = {
      employeeId: "ADMIN001",
      password: "password",
    };

    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    const loginResult = await loginResponse.json();

    if (loginResult.success) {
      console.log("✅ Admin login successful!");
      console.log("   Employee ID:", loginResult.data.employee.employeeId);
      console.log("   Name:", loginResult.data.employee.name);
      console.log("   Role:", loginResult.data.employee.role);

      console.log("\n🎉 Admin user setup completed!");
      console.log("\n📋 Login Credentials:");
      console.log("   Employee ID: ADMIN001");
      console.log("   Password: password");
      console.log("   Role: ADMIN");

      console.log("\n🔗 Next Steps:");
      console.log("1. Go to: http://localhost:3000/login");
      console.log("2. Use the credentials above to login");
      console.log("3. You should be redirected to the HRM dashboard");
    } else {
      console.log("❌ Admin login failed:", loginResult.error);
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
};

// Run the function
createAdminUser();
