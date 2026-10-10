// Fix Admin Password Script
// This script will update the admin user's password to ensure login works

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGO_URI = "mongodb://localhost:27017/geo";

async function fixAdminPassword() {
  let client;

  try {
    console.log("🔧 Fixing Admin Password...\n");

    // Connect to MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Find the admin user
    console.log("\n1️⃣ Finding admin user...");
    const adminUser = await db.collection("employees").findOne({
      $or: [
        { employeeId: "ADMIN001" },
        { "personalDetails.employeeId": "ADMIN001" },
      ],
    });

    if (!adminUser) {
      console.log("❌ Admin user not found");
      return;
    }

    console.log("✅ Found admin user:", adminUser._id);
    console.log(
      "   Current password hash:",
      adminUser.password || adminUser.personalDetails?.password || "None"
    );

    // Hash the correct password
    console.log("\n2️⃣ Hashing new password...");
    const newPassword = "password";
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("✅ Password hashed successfully");

    // Update the password in both possible locations
    console.log("\n3️⃣ Updating password in database...");
    const updateResult = await db.collection("employees").updateOne(
      { _id: adminUser._id },
      {
        $set: {
          "personalDetails.password": hashedPassword,
          password: hashedPassword, // Also set at root level for compatibility
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log("✅ Password updated successfully");
    } else {
      console.log("⚠️  No changes made to password");
    }

    // Ensure admin role exists
    console.log("\n4️⃣ Ensuring admin role exists...");
    const adminPermissions = [
      "user.create",
      "user.read",
      "user.update",
      "user.delete",
      "employee.create",
      "employee.read",
      "employee.update",
      "employee.delete",
      "attendance.read",
      "attendance.update",
      "attendance.delete",
      "attendance.manage",
      "project.create",
      "project.read",
      "project.update",
      "project.delete",
      "project.manage",
      "task.create",
      "task.read",
      "task.update",
      "task.delete",
      "task.assign",
      "leave.approve",
      "leave.reject",
      "leave.read",
      "leave.manage",
      "geofence.create",
      "geofence.read",
      "geofence.update",
      "geofence.delete",
      "report.read",
      "report.generate",
      "report.export",
      "document.create",
      "document.read",
      "document.update",
      "document.delete",
    ];

    const userRole = {
      userId: adminUser._id.toString(),
      email: "admin@company.com",
      role: "ADMIN",
      permissions: adminPermissions,
      assignedBy: "system",
      assignedAt: new Date(),
      isActive: true,
    };

    await db
      .collection("user_roles")
      .updateOne(
        { userId: adminUser._id.toString() },
        { $set: userRole },
        { upsert: true }
      );

    console.log("✅ Admin role ensured");

    // Test the login
    console.log("\n5️⃣ Testing login...");
    const updatedUser = await db
      .collection("employees")
      .findOne({ _id: adminUser._id });
    const testPassword =
      updatedUser.password || updatedUser.personalDetails?.password;

    if (!testPassword) {
      throw new Error("No password found after update");
    }

    const isValid = await bcrypt.compare(newPassword, testPassword);

    if (isValid) {
      console.log("✅ Password verification successful!");

      // Get role for final verification
      const userRoleCheck = await db.collection("user_roles").findOne({
        userId: adminUser._id.toString(),
        isActive: true,
      });

      console.log("\n🎉 Admin user is ready for login!");
      console.log("\n📋 Login Credentials:");
      console.log("   Employee ID: ADMIN001");
      console.log("   Password: password");
      console.log("   Email: admin@company.com");
      console.log("   Role:", userRoleCheck ? userRoleCheck.role : "EMPLOYEE");
      console.log(
        "   Permissions:",
        userRoleCheck ? userRoleCheck.permissions.length : 0,
        "permissions"
      );

      console.log("\n🔗 Next Steps:");
      console.log("1. Start your Next.js application: npm run dev");
      console.log("2. Go to: http://localhost:3000/login");
      console.log("3. Use the credentials above to login");
      console.log("4. You should be redirected to the HRM dashboard");
    } else {
      throw new Error("Password verification still failed after update");
    }
  } catch (error) {
    console.error("❌ Error fixing admin password:", error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 MongoDB connection closed");
    }
  }
}

// Run the script
if (require.main === module) {
  fixAdminPassword()
    .then(() => {
      console.log("\n✨ Password fix completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Password fix failed:", error.message);
      process.exit(1);
    });
}

module.exports = { fixAdminPassword };
