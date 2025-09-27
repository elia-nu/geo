// Browser-based Admin User Creation Script
// Run this in your browser console while on your Next.js application
// Make sure your development server is running on localhost:3000

const createAdminUserBrowser = async () => {
  console.log("🚀 Starting Browser Admin User Creation...\n");

  const ADMIN_DATA = {
    employeeId: "ADMIN001",
    password: "password", // Standard password for existing system
    name: "System Administrator",
    email: "admin@company.com",
  };

  try {
    // Step 1: Check if admin user already exists
    console.log("1️⃣ Checking for existing admin user...");
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();

    if (employeesResult.success) {
      const existingAdmin = employeesResult.employees.find(
        (emp) =>
          emp.personalDetails?.employeeId === ADMIN_DATA.employeeId ||
          emp.employeeId === ADMIN_DATA.employeeId
      );

      if (existingAdmin) {
        console.log("⚠️  Admin user already exists. Updating role...");
        await assignAdminRole(existingAdmin._id);
        await testAdminLogin();
        return;
      }
    }

    // Step 2: Create or get work location
    console.log("\n2️⃣ Setting up work location...");
    let workLocationId = await getOrCreateWorkLocation();

    // Step 3: Create admin employee
    console.log("\n3️⃣ Creating admin employee...");
    const employeeData = {
      personalDetails: {
        name: ADMIN_DATA.name,
        dateOfBirth: "1990-01-01",
        address: "Admin Address",
        contactNumber: "+1234567890",
        email: ADMIN_DATA.email,
        employeeId: ADMIN_DATA.employeeId,
        password:
          "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // 'password' hashed
        department: "IT Administration",
        workLocation: "Head Office",
      },
      department: "IT Administration",
      designation: "System Administrator",
      workLocation: "Head Office",
      workLocations: workLocationId ? [workLocationId] : [],
      status: "active",
    };

    const employeeResponse = await fetch("/api/employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });

    const employeeResult = await employeeResponse.json();
    console.log("   Employee creation response:", employeeResult);

    if (!employeeResponse.ok) {
      throw new Error(`Failed to create employee: ${employeeResult.error}`);
    }

    const employeeId =
      employeeResult.insertedId || employeeResult.employee?._id;
    console.log("   ✅ Admin employee created with ID:", employeeId);

    // Step 4: Assign admin role
    console.log("\n4️⃣ Assigning admin role...");
    await assignAdminRole(employeeId);

    // Step 5: Test login
    console.log("\n5️⃣ Testing admin login...");
    await testAdminLogin();

    console.log("\n🎉 Admin user creation completed successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`   Employee ID: ${ADMIN_DATA.employeeId}`);
    console.log(`   Password: ${ADMIN_DATA.password}`);
    console.log(`   Email: ${ADMIN_DATA.email}`);
    console.log(`   Role: ADMIN`);

    console.log("\n🔗 Next Steps:");
    console.log("1. Go to: http://localhost:3000/login");
    console.log("2. Use the credentials above to login");
    console.log("3. You should be redirected to the HRM dashboard");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};

async function getOrCreateWorkLocation() {
  try {
    // Get existing work locations
    const locationsResponse = await fetch("/api/work-locations");
    const locationsResult = await locationsResponse.json();

    if (locationsResult.success && locationsResult.locations.length > 0) {
      const headOffice = locationsResult.locations.find(
        (loc) => loc.name === "Head Office"
      );
      if (headOffice) {
        console.log(
          "   ✅ Using existing Head Office location:",
          headOffice._id
        );
        return headOffice._id;
      }

      // Use first available location
      console.log(
        "   ✅ Using existing location:",
        locationsResult.locations[0]._id
      );
      return locationsResult.locations[0]._id;
    }

    // Create new work location
    console.log("   Creating default work location...");
    const locationData = {
      name: "Head Office",
      address: "Main Office Building",
      latitude: 40.7128,
      longitude: -74.006,
      radius: 100,
      description: "Main office location for administrators",
    };

    const createLocationResponse = await fetch("/api/work-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locationData),
    });

    const createLocationResult = await createLocationResponse.json();

    if (createLocationResponse.ok) {
      console.log(
        "   ✅ Work location created:",
        createLocationResult.location._id
      );
      return createLocationResult.location._id;
    } else {
      console.log(
        "   ⚠️  Could not create work location, proceeding without it"
      );
      return null;
    }
  } catch (error) {
    console.log("   ⚠️  Error with work location setup:", error.message);
    return null;
  }
}

async function assignAdminRole(employeeId) {
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

  if (roleResponse.ok) {
    console.log("   ✅ Admin role assigned successfully");
  } else {
    console.log("   ❌ Failed to assign admin role:", roleResult.error);
    throw new Error(`Failed to assign admin role: ${roleResult.error}`);
  }
}

async function testAdminLogin() {
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

  if (loginResult.success && loginResult.data.employee.role === "ADMIN") {
    console.log("   ✅ Admin login test successful!");
    console.log("   📊 Employee Details:");
    console.log(`      - Employee ID: ${loginResult.data.employee.employeeId}`);
    console.log(`      - Name: ${loginResult.data.employee.name}`);
    console.log(`      - Email: ${loginResult.data.employee.email}`);
    console.log(`      - Role: ${loginResult.data.employee.role}`);
    console.log(
      `      - Permissions: ${loginResult.data.employee.permissions.length} permissions`
    );

    // Store token for testing
    localStorage.setItem("authToken", loginResult.data.token);
    console.log("   🔑 Auth token saved to localStorage");
  } else {
    console.log("   ❌ Login test failed:", loginResult);
    throw new Error(
      `Login test failed: ${loginResult.error || "Unknown error"}`
    );
  }
}

// Auto-display instructions when script is loaded
if (typeof window !== "undefined") {
  console.log("🌐 Browser Admin Creation Script Loaded");
  console.log("📝 To create an admin user, run: createAdminUserBrowser()");
  console.log(
    "⚠️  Make sure your Next.js dev server is running on localhost:3000"
  );
}

// Export for Node.js compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createAdminUserBrowser };
}
