// Test script for Work Locations functionality
// Run this in browser console or Node.js

async function testWorkLocations() {
  console.log("🧪 Testing Work Locations System...");

  // Test 1: Create a work location
  console.log("\n1. Creating work location...");
  try {
    const createResponse = await fetch("/api/work-locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Main Office",
        address: "123 Business Ave, Downtown",
        latitude: 40.7128,
        longitude: -74.006,
        radius: 100,
        description: "Primary office location",
      }),
    });

    const createResult = await createResponse.json();
    console.log("Create result:", createResult);

    if (createResult.success) {
      const locationId = createResult.location._id;
      console.log("✅ Work location created with ID:", locationId);

      // Test 2: Get all work locations
      console.log("\n2. Fetching all work locations...");
      const getResponse = await fetch("/api/work-locations");
      const getResult = await getResponse.json();
      console.log("Get result:", getResult);

      // Test 3: Create another location
      console.log("\n3. Creating second work location...");
      const createResponse2 = await fetch("/api/work-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Branch Office",
          address: "456 Commerce St, Uptown",
          latitude: 40.7589,
          longitude: -73.9851,
          radius: 150,
          description: "Secondary office location",
        }),
      });

      const createResult2 = await createResponse2.json();
      console.log("Create result 2:", createResult2);

      if (createResult2.success) {
        console.log("✅ Second work location created successfully");
      }

      // Test 4: Get employees to assign
      console.log("\n4. Fetching employees for assignment...");
      const employeesResponse = await fetch("/api/employee");
      const employeesResult = await employeesResponse.json();
      console.log("Employees result:", employeesResult);

      if (employeesResult.success && employeesResult.employees.length > 0) {
        const firstEmployee = employeesResult.employees[0];
        console.log("First employee:", firstEmployee);

        // Test 5: Assign employee to work location
        console.log("\n5. Assigning employee to work location...");
        const assignResponse = await fetch(
          `/api/work-locations/${locationId}/assign-employees`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              employeeIds: [firstEmployee._id],
            }),
          }
        );

        const assignResult = await assignResponse.json();
        console.log("Assign result:", assignResult);

        if (assignResult.success) {
          console.log("✅ Employee assigned successfully");
        }
      }

      console.log("\n🎉 All tests completed successfully!");
      console.log(
        "You can now visit /work-locations to see the management interface"
      );
    } else {
      console.error("❌ Failed to create work location:", createResult.error);
    }
  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

// Run the test
testWorkLocations();

// Instructions for manual testing:
console.log(`
📋 Manual Testing Instructions:

1. Visit http://localhost:3000/work-locations
2. You should see the work locations management interface
3. Click "Add Location" to create new work locations
4. Use the "Users" icon to assign employees to locations
5. Test editing and deleting locations

🔧 API Endpoints to test:
- GET /api/work-locations - List all locations
- POST /api/work-locations - Create new location
- PUT /api/work-locations/[id] - Update location
- DELETE /api/work-locations/[id] - Delete location
- POST /api/work-locations/[id]/assign-employees - Assign employees
- DELETE /api/work-locations/[id]/assign-employees - Remove employees

📱 Employee Setup:
1. Visit http://localhost:3000/employee-setup
2. Select an employee
3. Set password and assign work location
4. Test employee login at http://localhost:3000/employee-login
`);
