// Complete Admin User Creation Script
// This script creates an admin user with all necessary components:
// 1. Employee record with hashed password
// 2. Work location (if none exists)
// 3. Admin role assignment
// 4. Login verification

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

const MONGO_URI = "mongodb://localhost:27017/geo";
const ADMIN_CREDENTIALS = {
  employeeId: "ADMIN001",
  password: "password", // Using existing password
  name: "System Administrator",
  email: "admin@company.com",
};

async function createAdminUser() {
  let client;

  try {
    console.log("🚀 Starting Admin User Creation Process...\n");

    // Connect to MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    // Step 1: Check if admin user already exists
    console.log("\n1️⃣ Checking for existing admin user...");
    const existingEmployee = await db.collection("employees").findOne({
      $or: [
        { employeeId: ADMIN_CREDENTIALS.employeeId },
        { "personalDetails.employeeId": ADMIN_CREDENTIALS.employeeId },
      ],
    });

    if (existingEmployee) {
      console.log(
        "⚠️  Admin user already exists. Updating role and testing login..."
      );
      await assignAdminRole(db, existingEmployee._id.toString());
      await testLogin(db, existingEmployee);
      return;
    }

    // Step 2: Create or get default work location
    console.log("\n2️⃣ Setting up work location...");
    let workLocation = await db
      .collection("work_locations")
      .findOne({ name: "Head Office" });

    if (!workLocation) {
      console.log("   Creating default work location...");
      const locationResult = await db.collection("work_locations").insertOne({
        name: "Head Office",
        address: "Main Office Building",
        latitude: 40.7128,
        longitude: -74.006,
        radius: 100,
        description: "Main office location for administrators",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
        assignedEmployees: [],
      });

      workLocation = {
        _id: locationResult.insertedId,
        name: "Head Office",
      };
      console.log("   ✅ Work location created:", workLocation._id);
    } else {
      console.log("   ✅ Using existing work location:", workLocation._id);
    }

    // Step 3: Hash password
    console.log("\n3️⃣ Hashing password...");
    const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
    console.log("   ✅ Password hashed successfully");

    // Step 4: Create employee record
    console.log("\n4️⃣ Creating admin employee record...");
    const employeeData = {
      personalDetails: {
        name: ADMIN_CREDENTIALS.name,
        dateOfBirth: new Date("1990-01-01"),
        address: "Admin Address",
        contactNumber: "+1234567890",
        email: ADMIN_CREDENTIALS.email,
        employeeId: ADMIN_CREDENTIALS.employeeId,
        password: hashedPassword,
        department: "IT Administration",
        workLocation: "Head Office",
      },
      employeeId: ADMIN_CREDENTIALS.employeeId, // Also store at root level for compatibility
      department: "IT Administration",
      designation: "System Administrator",
      workLocation: "Head Office",
      workLocations: [workLocation._id], // New multi-location support
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const employeeResult = await db
      .collection("employees")
      .insertOne(employeeData);
    console.log(
      "   ✅ Admin employee created with ID:",
      employeeResult.insertedId
    );

    // Step 5: Assign work location to employee
    console.log("\n5️⃣ Assigning employee to work location...");
    await db.collection("work_locations").updateOne(
      { _id: workLocation._id },
      {
        $addToSet: { assignedEmployees: employeeResult.insertedId },
        $set: { updatedAt: new Date() },
      }
    );
    console.log("   ✅ Employee assigned to work location");

    // Step 6: Assign admin role
    console.log("\n6️⃣ Assigning admin role...");
    await assignAdminRole(db, employeeResult.insertedId.toString());

    // Step 7: Test login
    console.log("\n7️⃣ Testing admin login...");
    const createdEmployee = await db
      .collection("employees")
      .findOne({ _id: employeeResult.insertedId });
    await testLogin(db, createdEmployee);

    console.log("\n🎉 Admin user creation completed successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`   Employee ID: ${ADMIN_CREDENTIALS.employeeId}`);
    console.log(`   Password: ${ADMIN_CREDENTIALS.password}`);
    console.log(`   Email: ${ADMIN_CREDENTIALS.email}`);
    console.log(`   Role: ADMIN`);

    console.log("\n🔗 Next Steps:");
    console.log("1. Start your Next.js application: npm run dev");
    console.log("2. Go to: http://localhost:3000/login");
    console.log("3. Use the credentials above to login");
    console.log("4. You should be redirected to the HRM dashboard");
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log("\n🔌 MongoDB connection closed");
    }
  }
}

async function assignAdminRole(db, employeeId) {
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
    userId: employeeId,
    email: ADMIN_CREDENTIALS.email,
    role: "ADMIN",
    permissions: adminPermissions,
    assignedBy: "system",
    assignedAt: new Date(),
    isActive: true,
  };

  await db
    .collection("user_roles")
    .updateOne({ userId: employeeId }, { $set: userRole }, { upsert: true });

  console.log("   ✅ Admin role assigned successfully");
}

async function testLogin(db, employee) {
  try {
    // Simulate login verification
    const hasPassword = employee.password || employee.personalDetails?.password;

    if (!hasPassword) {
      throw new Error("No password found for employee");
    }

    // Check password
    const isValidPassword = await bcrypt.compare(
      ADMIN_CREDENTIALS.password,
      hasPassword
    );
    if (!isValidPassword) {
      throw new Error("Password verification failed");
    }

    // Check work locations
    const hasWorkLocations =
      employee.workLocations &&
      Array.isArray(employee.workLocations) &&
      employee.workLocations.length > 0;
    const hasOldLocation =
      employee.workLocation || employee.personalDetails?.workLocation;

    if (!hasWorkLocations && !hasOldLocation) {
      throw new Error("No work locations assigned");
    }

    // Get user role
    const userRole = await db.collection("user_roles").findOne({
      userId: employee._id.toString(),
      isActive: true,
    });

    if (!userRole || userRole.role !== "ADMIN") {
      throw new Error("Admin role not found or not active");
    }

    console.log("   ✅ Login test successful!");
    console.log("   📊 Employee Details:");
    console.log(`      - ID: ${employee._id}`);
    console.log(
      `      - Employee ID: ${
        employee.employeeId || employee.personalDetails?.employeeId
      }`
    );
    console.log(
      `      - Name: ${employee.personalDetails?.name || employee.name}`
    );
    console.log(
      `      - Email: ${employee.personalDetails?.email || employee.email}`
    );
    console.log(`      - Role: ${userRole.role}`);
    console.log(
      `      - Permissions: ${userRole.permissions.length} permissions assigned`
    );
    console.log(
      `      - Work Locations: ${
        hasWorkLocations ? employee.workLocations.length : 1
      } locations`
    );
  } catch (error) {
    console.error("   ❌ Login test failed:", error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log("\n✨ Script completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error.message);
      process.exit(1);
    });
}

module.exports = { createAdminUser };
