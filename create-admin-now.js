// Create Admin User Script
// Run this in your browser console after logging in

const createAdminUser = async () => {
  console.log("🔧 Creating Admin User...");

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

    const employeeResponse = await fetch("/api/employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });

    const employeeResult = await employeeResponse.json();
    console.log("Employee creation response:", employeeResult);

    if (!employeeResult.success && !employeeResult.insertedId) {
      console.log("❌ Failed to create employee:", employeeResult.error);
      return;
    }

    const employeeId =
      employeeResult.insertedId || employeeResult.employee?._id;
    console.log("✅ Employee created with ID:", employeeId);

    // Step 2: Assign admin role
    console.log("\n2️⃣ Assigning admin role...");
    const roleData = {
      userId: employeeId,
      email: "admin@company.com",
      role: "ADMIN",
      assignedBy: "system",
    };

    const roleResponse = await fetch("/api/auth/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleData),
    });

    const roleResult = await roleResponse.json();
    console.log("Role assignment response:", roleResult);

    if (roleResult.message) {
      console.log("✅ Admin role assigned successfully!");
      console.log("\n🎉 Admin user created successfully!");
      console.log("📧 Email: admin@company.com");
      console.log("🔑 Password: password");
      console.log("🆔 Employee ID: ADMIN001");
      console.log(
        "\nYou can now log in with these credentials to access project management."
      );
    } else {
      console.log("❌ Failed to assign admin role:", roleResult.error);
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};

// Run the function
createAdminUser();
