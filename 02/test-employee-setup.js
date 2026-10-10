// Quick Employee Setup Test Script
// Run this in your browser console or as a Node.js script

const testEmployeeSetup = async () => {
  console.log("🚀 Starting Employee Setup Test...");
  
  // Step 1: Get all employees
  console.log("\n📋 Step 1: Fetching employees...");
  try {
    const employeesResponse = await fetch("/api/employee");
    const employeesResult = await employeesResponse.json();
    
    if (!employeesResult.success) {
      console.error("❌ Failed to fetch employees");
      return;
    }
    
    const employees = employeesResult.employees || [];
    console.log(`✅ Found ${employees.length} employees`);
    
    if (employees.length === 0) {
      console.log("⚠️  No employees found. Please add employees first.");
      return;
    }
    
    // Show first employee for testing
    const testEmployee = employees[0];
    console.log(`\n👤 Test Employee: ${testEmployee.personalDetails?.name || testEmployee.name}`);
    console.log(`   ID: ${testEmployee._id}`);
    console.log(`   Employee ID: ${testEmployee.personalDetails?.employeeId || testEmployee.employeeId || 'Not set'}`);
    
    // Step 2: Set password for first employee
    console.log("\n🔐 Step 2: Setting password...");
    const passwordResponse = await fetch("/api/employee/setup-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: testEmployee._id,
        password: "test123"
      })
    });
    
    const passwordResult = await passwordResponse.json();
    if (passwordResult.success) {
      console.log("✅ Password set successfully");
      console.log("   Username: " + (testEmployee.personalDetails?.employeeId || testEmployee.employeeId || testEmployee._id));
      console.log("   Password: test123");
    } else {
      console.error("❌ Failed to set password:", passwordResult.error);
    }
    
    // Step 3: Set work location (using a sample location)
    console.log("\n📍 Step 3: Setting work location...");
    const workLocation = {
      name: "Test Office",
      address: "123 Test Street, Test City",
      latitude: 40.7128,  // New York coordinates for testing
      longitude: -74.0060,
      radius: 100
    };
    
    const locationResponse = await fetch(`/api/employee/${testEmployee._id}/work-location`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workLocation })
    });
    
    const locationResult = await locationResponse.json();
    if (locationResult.success) {
      console.log("✅ Work location set successfully");
      console.log("   Location: " + workLocation.name);
      console.log("   Coordinates: " + workLocation.latitude + ", " + workLocation.longitude);
      console.log("   Radius: " + workLocation.radius + "m");
    } else {
      console.error("❌ Failed to set location:", locationResult.error);
    }
    
    // Step 4: Test login
    console.log("\n🔑 Step 4: Testing login...");
    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: testEmployee.personalDetails?.employeeId || testEmployee.employeeId || testEmployee._id,
        password: "test123"
      })
    });
    
    const loginResult = await loginResponse.json();
    if (loginResult.success) {
      console.log("✅ Login successful!");
      console.log("   Employee: " + loginResult.data.employee.name);
      console.log("   Token: " + loginResult.data.token.substring(0, 20) + "...");
      console.log("\n🎉 Setup complete! Employee can now log in at /employee-login");
    } else {
      console.error("❌ Login failed:", loginResult.error);
    }
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
};

// Instructions for running this script
console.log(`
📖 HOW TO USE THIS SCRIPT:

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Copy and paste this entire script
4. Press Enter to run it

OR

1. Save this as a .js file
2. Run with Node.js: node test-employee-setup.js

The script will:
- Find the first employee in your database
- Set a password: "test123"
- Set a work location in New York
- Test the login functionality

After running, the employee can log in at:
http://localhost:3000/employee-login

Login credentials will be shown in the console output.
`);

// Uncomment the line below to auto-run the setup
// testEmployeeSetup();
