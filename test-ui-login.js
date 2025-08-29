// Test UI Login and Navigation
// Run this in your browser console

const testUILogin = async () => {
  console.log("🧪 Testing UI Login and Navigation...");

  try {
    // Step 1: Clear localStorage
    console.log("\n1️⃣ Clearing localStorage...");
    localStorage.clear();
    console.log("   ✅ Cleared localStorage");

    // Step 2: Login via API
    console.log("\n2️⃣ Logging in via API...");
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
    console.log("   Login result:", loginResult);

    if (loginResult.success) {
      console.log("   ✅ Login successful");
      console.log("   Role:", loginResult.data.employee.role);

      // Step 3: Store token
      localStorage.setItem("authToken", loginResult.data.token);
      console.log("   ✅ Token stored");

      // Step 4: Test navigation to /hrm
      console.log("\n3️⃣ Testing navigation to /hrm...");
      console.log("   Current URL:", window.location.href);

      // Navigate to /hrm
      window.location.href = "/hrm";

      console.log("\n🎉 Navigation test completed!");
      console.log("\n📋 What should happen:");
      console.log("   • Should redirect to /hrm");
      console.log("   • Should show HRM dashboard");
      console.log("   • Should not show 'Access denied'");
    } else {
      console.log("   ❌ Login failed:", loginResult.error);
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Alternative: Test with manual token
const testWithManualToken = () => {
  console.log("🔧 Testing with manual token...");

  // Get token from Postman response and paste it here
  const token = "PASTE_YOUR_TOKEN_HERE";

  if (token === "PASTE_YOUR_TOKEN_HERE") {
    console.log("❌ Please paste your token from Postman first");
    console.log("1. Copy the token from your Postman login response");
    console.log("2. Replace 'PASTE_YOUR_TOKEN_HERE' with your actual token");
    console.log("3. Run this function again");
    return;
  }

  localStorage.setItem("authToken", token);
  console.log("✅ Token stored manually");

  // Navigate to HRM
  window.location.href = "/hrm";
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log("🌐 Browser detected. Available functions:");
  console.log("   • testUILogin() - Test full login flow");
  console.log("   • testWithManualToken() - Test with token from Postman");
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testUILogin, testWithManualToken };
}
