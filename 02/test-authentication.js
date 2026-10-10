// Test Authentication System
// Run this in your browser console to test the authentication flow

const testAuthentication = async () => {
  console.log("🧪 Testing Authentication System...");

  try {
    // Step 1: Test accessing HRM without login
    console.log("\n1️⃣ Testing access to /hrm without authentication...");
    const hrmResponse = await fetch("/hrm");
    console.log("   HRM page status:", hrmResponse.status);

    // Step 2: Check if we have a stored token
    console.log("\n2️⃣ Checking for stored authentication token...");
    const token = localStorage.getItem("authToken");
    if (token) {
      console.log("   ✅ Token found in localStorage");
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        console.log("   Token payload:", {
          name: payload.name,
          role: payload.role,
          exp: new Date(payload.exp * 1000).toLocaleString(),
        });
      } catch (e) {
        console.log("   ❌ Invalid token format");
      }
    } else {
      console.log("   ❌ No token found");
    }

    // Step 3: Test login API
    console.log("\n3️⃣ Testing login API...");
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

    if (loginResult.success) {
      console.log("   ✅ Login successful!");
      console.log("   Role:", loginResult.data.employee.role);
      console.log("   Name:", loginResult.data.employee.name);

      // Store token
      localStorage.setItem("authToken", loginResult.data.token);
      console.log("   Token stored in localStorage");

      // Step 4: Test accessing HRM with authentication
      console.log("\n4️⃣ Testing access to /hrm with authentication...");
      const authenticatedHrmResponse = await fetch("/hrm");
      console.log(
        "   HRM page status (authenticated):",
        authenticatedHrmResponse.status
      );
    } else {
      console.log("   ❌ Login failed:", loginResult.error);
    }

    // Step 5: Test unauthorized access
    console.log("\n5️⃣ Testing unauthorized page...");
    const unauthorizedResponse = await fetch("/unauthorized");
    console.log("   Unauthorized page status:", unauthorizedResponse.status);

    console.log("\n🎉 Authentication test completed!");
    console.log("\n📋 Summary:");
    console.log("   • /hrm should redirect to /login if not authenticated");
    console.log("   • /login should accept valid credentials");
    console.log("   • /hrm should be accessible after successful login");
    console.log("   • /unauthorized should be accessible");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run testAuthentication() to test the auth system."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testAuthentication };
}
