// Debug Token Issues
// Run this in your browser console

const debugToken = async () => {
  console.log("🔍 Debugging Token Issues...");

  try {
    // Step 1: Test login and get token
    console.log("\n1️⃣ Testing login...");
    const loginResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "ADMIN001", password: "password" }),
    });

    const loginResult = await loginResponse.json();
    console.log("Login response:", loginResult);

    if (!loginResult.success) {
      console.log("❌ Login failed:", loginResult.error);
      return;
    }

    const token = loginResult.data.token;
    console.log("✅ Got token:", token.substring(0, 50) + "...");

    // Step 2: Decode token manually
    console.log("\n2️⃣ Decoding token...");
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.log("❌ Invalid token format");
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      console.log("Token payload:", payload);

      // Check expiration
      const currentTime = Date.now() / 1000;
      console.log("Current time:", currentTime);
      console.log("Token expires:", payload.exp);
      console.log("Is expired:", payload.exp < currentTime);

      // Check role
      console.log("Role in token:", payload.role);
      console.log("Is ADMIN:", payload.role === "ADMIN");
    } catch (error) {
      console.log("❌ Error decoding token:", error.message);
      return;
    }

    // Step 3: Store token and test
    console.log("\n3️⃣ Storing token and testing...");
    localStorage.setItem("authToken", token);

    const storedToken = localStorage.getItem("authToken");
    console.log("Stored token exists:", !!storedToken);

    // Step 4: Test HRM page logic
    console.log("\n4️⃣ Testing HRM page logic...");
    try {
      const storedPayload = JSON.parse(atob(storedToken.split(".")[1]));
      const currentTime = Date.now() / 1000;

      console.log("Stored token payload:", storedPayload);
      console.log("Token expired:", storedPayload.exp < currentTime);
      console.log("Has ADMIN role:", storedPayload.role === "ADMIN");

      if (storedPayload.exp < currentTime) {
        console.log("❌ Token is expired!");
      } else if (storedPayload.role !== "ADMIN") {
        console.log("❌ Token does not have ADMIN role!");
      } else {
        console.log("✅ Token is valid and has ADMIN role!");
        console.log("Should be able to access /hrm");
      }
    } catch (error) {
      console.log("❌ Error testing stored token:", error.message);
    }

    // Step 5: Navigate to HRM
    console.log("\n5️⃣ Navigating to /hrm...");
    window.location.href = "/hrm";
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
};

// Alternative: Test with existing token
const testExistingToken = () => {
  console.log("🔍 Testing existing token...");

  const token = localStorage.getItem("authToken");
  if (!token) {
    console.log("❌ No token found in localStorage");
    return;
  }

  console.log("Found token:", token.substring(0, 50) + "...");

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    console.log("Token payload:", payload);
    console.log("Role:", payload.role);
    console.log("Expired:", payload.exp < Date.now() / 1000);

    if (payload.role === "ADMIN" && payload.exp > Date.now() / 1000) {
      console.log("✅ Token is valid for admin access");
      window.location.href = "/hrm";
    } else {
      console.log("❌ Token is invalid for admin access");
    }
  } catch (error) {
    console.log("❌ Error decoding existing token:", error.message);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log("🌐 Browser detected. Available functions:");
  console.log("   • debugToken() - Full token debug");
  console.log("   • testExistingToken() - Test existing token");
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { debugToken, testExistingToken };
}
