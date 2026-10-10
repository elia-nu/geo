// Debug UI Login Process
// Run this in your browser console

const debugUILogin = async () => {
  console.log("🔍 Debugging UI Login Process...");

  try {
    // Step 1: Clear any existing tokens
    console.log("\n1️⃣ Clearing existing tokens...");
    localStorage.removeItem("authToken");
    console.log("   ✅ Cleared localStorage");

    // Step 2: Test login API directly
    console.log("\n2️⃣ Testing login API...");
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
    console.log("   Login API Response:", loginResult);

    if (loginResult.success) {
      console.log("   ✅ Login API successful");
      console.log("   Role:", loginResult.data.employee.role);
      console.log("   Permissions:", loginResult.data.employee.permissions);

      // Step 3: Store token manually
      console.log("\n3️⃣ Storing token manually...");
      localStorage.setItem("authToken", loginResult.data.token);
      console.log("   ✅ Token stored in localStorage");

      // Step 4: Check token in localStorage
      console.log("\n4️⃣ Checking stored token...");
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        console.log("   ✅ Token found in localStorage");

        // Decode token to check payload
        try {
          const payload = JSON.parse(atob(storedToken.split(".")[1]));
          console.log("   Token payload:", {
            name: payload.name,
            role: payload.role,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            currentTime: new Date().toLocaleString(),
          });

          // Check if token is expired
          const currentTime = Date.now() / 1000;
          if (payload.exp < currentTime) {
            console.log("   ❌ Token is expired!");
          } else {
            console.log("   ✅ Token is valid");
          }

          // Check role
          if (payload.role === "ADMIN") {
            console.log("   ✅ Token has ADMIN role");
          } else {
            console.log("   ❌ Token does not have ADMIN role:", payload.role);
          }
        } catch (error) {
          console.log("   ❌ Error decoding token:", error.message);
        }
      } else {
        console.log("   ❌ No token found in localStorage");
      }

      // Step 5: Test accessing protected route
      console.log("\n5️⃣ Testing protected route access...");
      try {
        const hrmResponse = await fetch("/hrm");
        console.log("   HRM route status:", hrmResponse.status);
        console.log("   HRM route URL:", hrmResponse.url);

        if (hrmResponse.redirected) {
          console.log("   ⚠️ Route was redirected to:", hrmResponse.url);
        }
      } catch (error) {
        console.log("   ❌ Error accessing HRM route:", error.message);
      }

      // Step 6: Test current page authentication
      console.log("\n6️⃣ Testing current page authentication...");
      const currentUrl = window.location.href;
      console.log("   Current URL:", currentUrl);

      if (currentUrl.includes("/login")) {
        console.log("   ⚠️ Currently on login page");
        console.log("   Try navigating to: http://localhost:3000/hrm");
      } else if (currentUrl.includes("/hrm")) {
        console.log("   ✅ Currently on HRM page");
      } else if (currentUrl.includes("/unauthorized")) {
        console.log("   ❌ Currently on unauthorized page");
      }

      console.log("\n🎉 UI Login Debug completed!");
      console.log("\n📋 Summary:");
      console.log("   • Login API: ✅ Working");
      console.log("   • Token Storage: ✅ Working");
      console.log("   • Token Validation: Check above");
      console.log("   • Role Assignment: Check above");

      console.log("\n🔗 Next Steps:");
      console.log("1. If token is valid and has ADMIN role:");
      console.log("   - Go to: http://localhost:3000/hrm");
      console.log("   - Should work now");
      console.log("2. If token is expired or wrong role:");
      console.log("   - Run the fix script again");
    } else {
      console.log("   ❌ Login API failed:", loginResult.error);
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
};

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🌐 Browser detected. Run debugUILogin() to debug the UI login process."
  );
}

// Export for Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { debugUILogin };
}
