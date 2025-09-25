// Debug Admin User Creation
// Run this in your browser console to diagnose issues

const debugAdminCreation = async () => {
  console.log("🔍 Debugging Admin User Creation...");

  try {
    // Step 1: Check if server is running
    console.log("\n1️⃣ Checking server status...");
    try {
      const serverResponse = await fetch("/api/employee");
      console.log("   Server status:", serverResponse.status);
      if (serverResponse.status === 200) {
        console.log("   ✅ Server is running");
      } else {
        console.log("   ❌ Server returned status:", serverResponse.status);
      }
    } catch (error) {
      console.log("   ❌ Cannot connect to server:", error.message);
      console.log(
        "   Make sure your Next.js server is running on http://localhost:3000"
      );
      return;
    }

    // Step 2: Check if employee API exists
    console.log("\n2️⃣ Testing employee API...");
    try {
      const testResponse = await fetch("/api/employee", {
        method: "GET",
      });
      console.log("   Employee API status:", testResponse.status);
    } catch (error) {
      console.log("   ❌ Employee API error:", error.message);
    }

    // Step 3: Check if roles API exists
    console.log("\n3️⃣ Testing roles API...");
    try {
      const rolesResponse = await fetch("/api/auth/roles", {
        method: "GET",
      });
      console.log("   Roles API status:", rolesResponse.status);
    } catch (error) {
      console.log("   ❌ Roles API error:", error.message);
    }

    // Step 4: Check if login API exists
    console.log("\n4️⃣ Testing login API...");
    try {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: "test", password: "test" }),
      });
      console.log("   Login API status:", loginResponse.status);
    } catch (error) {
      console.log("   ❌ Login API error:", error.message);
    }

    // Step 5: Try to create employee with minimal data
    console.log("\n5️⃣ Testing employee creation with minimal data...");
    const minimalEmployeeData = {
      personalDetails: {
        name: "Test Admin",
        employeeId: "TEST001",
        password:
          "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
      },
      department: "IT",
      workLocation: "Office",
      status: "active",
    };

    try {
      const createResponse = await fetch("/api/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minimalEmployeeData),
      });

      const createResult = await createResponse.json();
      console.log("   Create response status:", createResponse.status);
      console.log("   Create response:", createResult);

      if (createResult.success) {
        console.log("   ✅ Employee creation successful!");

        // Step 6: Try to assign role
        console.log("\n6️⃣ Testing role assignment...");
        const roleData = {
          userId: createResult.employee._id,
          email: "test@company.com",
          role: "ADMIN",
          assignedBy: "system",
        };

        try {
          const roleResponse = await fetch("/api/auth/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(roleData),
          });

          const roleResult = await roleResponse.json();
          console.log("   Role assignment status:", roleResponse.status);
          console.log("   Role assignment result:", roleResult);

          if (roleResult.message) {
            console.log("   ✅ Role assignment successful!");
          } else {
            console.log("   ❌ Role assignment failed:", roleResult.error);
          }
        } catch (error) {
          console.log("   ❌ Role assignment error:", error.message);
        }
      } else {
        console.log("   ❌ Employee creation failed:", createResult.error);
      }
    } catch (error) {
      console.log("   ❌ Employee creation error:", error.message);
    }

    console.log("\n🔍 Debug completed!");
    console.log("\n📋 Common Issues:");
    console.log("   • Server not running on http://localhost:3000");
    console.log("   • Missing API routes");
    console.log("   • Database connection issues");
    console.log("   • Invalid data format");
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run debugAdminCreation() to diagnose admin creation issues."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { debugAdminCreation };
}
