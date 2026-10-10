import { getDb } from "./app/api/mongo.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const ADMIN_CREDENTIALS = {
  employeeId: "ADMIN001",
  password: "password",
  name: "System Administrator",
  email: "admin@company.com",
  contactNumber: "+251911000000",
  department: "IT Administration",
  designation: "System Administrator",
  workLocation: "Head Office",
};

const ADMIN_PERMISSIONS = [
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
  "audit.read",
  "settings.manage",
  "notifications.manage",
];

async function seedAdmin() {
  try {
    console.log("🚀 Seeding Admin User...\n");

    const db = await getDb();

    // 1. Ensure Work Locations exist
    console.log("1️⃣ Checking Work Locations...");
    let headOffice = await db.collection("work_locations").findOne({
      $or: [{ name: "Head Office" }, { siteName: "Head Office" }],
    });

    if (!headOffice) {
      console.log("   Creating 'Head Office' work location...");
      const locResult = await db.collection("work_locations").insertOne({
        name: "Head Office",
        siteName: "Head Office",
        address: "Asmara Road, Addis Ababa, Ethiopia",
        fullAddress: "Asmara Road, Addis Ababa, Ethiopia",
        latitude: 9.02153590361139,
        longitude: 38.8148455028517,
        radius: 500,
        attendanceType: "Fingerprint & GPS Geofence",
        description: "Main Head Office",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedEmployees: [],
      });
      headOffice = { _id: locResult.insertedId, name: "Head Office" };
      console.log("   ✅ 'Head Office' created with ID:", locResult.insertedId.toString());
    } else {
      console.log("   ✅ 'Head Office' exists with ID:", headOffice._id.toString());
    }

    // Also populate other locations if table is empty
    const totalLocations = await db.collection("work_locations").countDocuments();
    if (totalLocations <= 1) {
      const csvPath = path.join(process.cwd(), "data", "work_locations.csv");
      if (fs.existsSync(csvPath)) {
        console.log("   Seeding standard work locations from work_locations.csv...");
        const csvContent = fs.readFileSync(csvPath, "utf-8");
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        const [headers, ...dataRows] = lines;
        for (const row of dataRows) {
          // Parse CSV with quoted strings
          const match = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 5) {
            const siteName = cols[0];
            const address = cols[1];
            const lat = parseFloat(cols[2]);
            const lng = parseFloat(cols[3]);
            const radius = parseFloat(cols[4]) || 500;
            const attendanceType = cols[5] || "GPS Geofence";
            if (siteName && siteName !== "Head Office") {
              await db.collection("work_locations").updateOne(
                { name: siteName },
                {
                  $setOnInsert: {
                    name: siteName,
                    siteName,
                    address,
                    fullAddress: address,
                    latitude: isNaN(lat) ? 9.0 : lat,
                    longitude: isNaN(lng) ? 38.7 : lng,
                    radius,
                    attendanceType,
                    status: "active",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignedEmployees: [],
                  }
                },
                { upsert: true }
              );
            }
          }
        }
      }
    }

    // 2. Hash Password
    console.log("\n2️⃣ Hashing password...");
    const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);

    // 3. Upsert Admin Employee
    console.log("\n3️⃣ Creating/updating Admin employee record...");
    const employeeData = {
      employeeId: ADMIN_CREDENTIALS.employeeId,
      name: ADMIN_CREDENTIALS.name,
      email: ADMIN_CREDENTIALS.email,
      contactNumber: ADMIN_CREDENTIALS.contactNumber,
      password: hashedPassword,
      department: ADMIN_CREDENTIALS.department,
      designation: ADMIN_CREDENTIALS.designation,
      workLocation: "Head Office",
      workLocations: [headOffice._id.toString(), "Head Office"],
      status: "active",
      personalDetails: {
        name: ADMIN_CREDENTIALS.name,
        employeeId: ADMIN_CREDENTIALS.employeeId,
        email: ADMIN_CREDENTIALS.email,
        contactNumber: ADMIN_CREDENTIALS.contactNumber,
        password: hashedPassword,
        department: ADMIN_CREDENTIALS.department,
        designation: ADMIN_CREDENTIALS.designation,
        workLocation: "Head Office",
        dateOfBirth: "1990-01-01",
        address: "Addis Ababa, Ethiopia",
      },
      updatedAt: new Date(),
    };

    const existingAdmin = await db.collection("employees").findOne({
      $or: [
        { employeeId: ADMIN_CREDENTIALS.employeeId },
        { "personalDetails.employeeId": ADMIN_CREDENTIALS.employeeId },
        { email: ADMIN_CREDENTIALS.email },
        { "personalDetails.email": ADMIN_CREDENTIALS.email },
      ],
    });

    let adminId;
    if (existingAdmin) {
      adminId = existingAdmin._id;
      await db.collection("employees").updateOne(
        { _id: adminId },
        {
          $set: {
            ...employeeData,
            createdAt: existingAdmin.createdAt || new Date(),
          },
        }
      );
      console.log("   ✅ Updated existing admin employee:", adminId.toString());
    } else {
      employeeData.createdAt = new Date();
      const insertResult = await db.collection("employees").insertOne(employeeData);
      adminId = insertResult.insertedId;
      console.log("   ✅ Created new admin employee with ID:", adminId.toString());
    }

    // 4. Assign Work Location
    await db.collection("work_locations").updateOne(
      { _id: headOffice._id },
      {
        $addToSet: { assignedEmployees: adminId },
        $set: { updatedAt: new Date() },
      }
    );

    // 5. Assign ADMIN role in user_roles
    console.log("\n4️⃣ Assigning ADMIN role in user_roles...");
    const userRole = {
      userId: adminId.toString(),
      email: ADMIN_CREDENTIALS.email,
      role: "ADMIN",
      permissions: ADMIN_PERMISSIONS,
      assignedBy: "system",
      assignedAt: new Date(),
      isActive: true,
    };

    await db.collection("user_roles").updateOne(
      { userId: adminId.toString() },
      { $set: userRole },
      { upsert: true }
    );
    console.log("   ✅ Assigned ADMIN role with full permissions");

    // 6. Test login verification logic
    console.log("\n5️⃣ Verifying login check...");
    const verifyEmp = await db.collection("employees").findOne({ _id: adminId });
    const verifyRole = await db.collection("user_roles").findOne({
      userId: adminId.toString(),
      isActive: true,
    });

    const isPassValid = await bcrypt.compare(
      ADMIN_CREDENTIALS.password,
      verifyEmp.password || verifyEmp.personalDetails?.password
    );

    if (!isPassValid) {
      throw new Error("Password verification failed!");
    }
    if (!verifyRole || verifyRole.role !== "ADMIN") {
      throw new Error("Admin role verification failed!");
    }

    console.log("\n========================================================");
    console.log("🎉 ADMIN SEEDED SUCCESSFULLY!");
    console.log("========================================================");
    console.log(`📋 Credentials:`);
    console.log(`   • Employee ID : ${ADMIN_CREDENTIALS.employeeId}`);
    console.log(`   • Email       : ${ADMIN_CREDENTIALS.email}`);
    console.log(`   • Password    : ${ADMIN_CREDENTIALS.password}`);
    console.log(`   • Role        : ${verifyRole.role}`);
    console.log(`   • Name        : ${verifyEmp.personalDetails?.name || verifyEmp.name}`);
    console.log(`   • Work Location: ${verifyEmp.workLocation}`);
    console.log("========================================================");
    console.log("🌐 You can now log in at /login with these credentials.");
    console.log("========================================================\n");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
