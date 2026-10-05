import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { seedDepartments } from "./seedDepartments.js";
import { seedDesignations } from "./seedDesignations.js";
import { seedRolesAndPermissions } from "./seedRolesAndPermissions.js";
import { seedAdmin, ADMIN_CREDENTIALS } from "./seedAdmin.js";
import { getMongoUri } from "./getMongoUri.js";
import employeesList from "./employees.data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = getMongoUri();

// Ensure standard work locations exist
const STANDARD_LOCATIONS = [
  { siteName: "Head Office", address: "Asmara Road, Addis Ababa, Ethiopia", lat: 9.0215, lng: 38.8148 },
  { siteName: "Bonga University", address: "Bonga, Keffa, Ethiopia", lat: 7.2758, lng: 36.2372 },
  { siteName: "Jigjiga MOA", address: "Jigjiga, Somali Region, Ethiopia", lat: 9.3533, lng: 42.7956 },
  { siteName: "Dambi Dolo University", address: "Dambi Dolo, Oromia, Ethiopia", lat: 8.5333, lng: 34.8000 },
  { siteName: "Mattu University", address: "Mattu, Ilubabor, Ethiopia", lat: 8.2974, lng: 35.5847 },
  { siteName: "Borana University", address: "Yabelo, Borana, Ethiopia", lat: 4.8833, lng: 38.0833 },
  { siteName: "AACRA Garage", address: "Kality, Addis Ababa, Ethiopia", lat: 8.9167, lng: 38.7500 },
  { siteName: "FDRE, Ministry of Health", address: "Mekanisa, Addis Ababa, Ethiopia", lat: 9.0000, lng: 38.7300 },
  { siteName: "Entoto Riverside 40 Dereja", address: "Entoto, Addis Ababa, Ethiopia", lat: 9.0800, lng: 38.7600 },
];

async function ensureWorkLocations(db) {
  const col = db.collection("work_locations");
  for (const loc of STANDARD_LOCATIONS) {
    await col.updateOne(
      { $or: [{ name: loc.siteName }, { siteName: loc.siteName }] },
      {
        $set: {
          name: loc.siteName,
          siteName: loc.siteName,
          address: loc.address,
          fullAddress: loc.address,
          latitude: loc.lat,
          longitude: loc.lng,
          radius: 500,
          attendanceType: "GPS Geofence",
          status: "active",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          assignedEmployees: [],
        },
      },
      { upsert: true }
    );
  }
}

export async function seedEmployees(db, options = { runDependencies: true }) {
  console.log("\n========================================================");
  console.log("🚀 STARTING COMPLETE EMPLOYEE & USER SEEDING");
  console.log("========================================================");

  // 1. Run prerequisites if requested
  if (options.runDependencies) {
    console.log("\n--- Step 1: Seeding Roles & Permissions ---");
    await seedRolesAndPermissions(db);

    console.log("\n--- Step 2: Seeding Departments ---");
    await seedDepartments(db);

    console.log("\n--- Step 3: Seeding Designations ---");
    await seedDesignations(db);

    console.log("\n--- Step 4: Seeding Administrator Account ---");
    await seedAdmin(db);
  }

  // 2. Ensure Work Locations exist
  console.log("\n--- Step 5: Verifying Work Locations & Geofences ---");
  await ensureWorkLocations(db);

  // 3. Cache lookup maps
  const departments = await db.collection("departments").find({}).toArray();
  const designations = await db.collection("designations").find({}).toArray();
  const workLocations = await db.collection("work_locations").find({}).toArray();

  const deptMap = new Map(departments.map((d) => [d.name.trim().toLowerCase(), d]));
  const desigMap = new Map(designations.map((d) => [d.name.trim().toLowerCase(), d]));
  const locMap = new Map(workLocations.map((l) => [(l.siteName || l.name || "").trim().toLowerCase(), l]));

  console.log(`Loaded ${departments.length} departments, ${designations.length} designations, and ${workLocations.length} locations for mapping.`);

  // 4. Hash default password
  const defaultPassword = "password";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const seededEmployees = [];
  const locationAssignments = {}; // locId -> Set(empId)

  console.log(`\n--- Step 6: Processing ${employeesList.length} Employees ---`);

  for (const emp of employeesList) {
    const empId = emp.employeeId?.trim();
    const fullName = emp.fullName?.trim();
    const phone = emp.phoneNumber?.trim() || "";
    const email = emp.email?.trim() || `${empId.toLowerCase()}@efengineering-architect.com`;
    const rawDept = emp.department?.trim() || "Top Management";
    const rawDesig = emp.designation?.trim() || "Employee";
    const rawLoc = emp.assignedWorkLocation?.trim() || "Head office";
    const employmentDate = emp.employmentDate ? new Date(emp.employmentDate) : new Date();
    const salary = Number(emp.salary || 0);
    const bankAccount = String(emp.bankAccountNo || "").trim();
    const sex = emp.sex?.trim() || "M";
    const bankName = "Commercial Bank of Ethiopia";

    // Resolve Department & Designation
    const matchedDept = deptMap.get(rawDept.toLowerCase());
    const matchedDesig = desigMap.get(rawDesig.toLowerCase());
    const matchedLoc = locMap.get(rawLoc.toLowerCase()) || locMap.get("head office");

    const deptId = matchedDept ? matchedDept._id : null;
    const desigId = matchedDesig ? matchedDesig._id : null;
    const locId = matchedLoc ? matchedLoc._id : null;

    const firstName = fullName.split(" ")[0] || fullName;
    const lastName = fullName.split(" ").slice(1).join(" ") || "";

    const employeeDoc = {
      employeeId: empId,
      name: fullName,
      fullName: fullName,
      firstName,
      lastName,
      email,
      phone,
      contactNumber: phone,
      sex,
      department: matchedDept ? matchedDept.name : rawDept,
      departmentId: deptId,
      designation: matchedDesig ? matchedDesig.name : rawDesig,
      designationId: desigId,
      workLocation: matchedLoc ? (matchedLoc.siteName || matchedLoc.name) : rawLoc,
      workLocations: locId ? [locId.toString()] : [],
      employmentType: emp.employmentType || "Full Time",
      employmentDate,
      salary,
      salaryETB: salary,
      grossSalary: salary,
      baseSalary: salary,
      bankAccount,
      bankAccountNumber: bankAccount,
      accountNumber: bankAccount,
      bankName,
      status: "active",
      password: hashedPassword,
      personalDetails: {
        employeeId: empId,
        name: fullName,
        fullName: fullName,
        firstName,
        lastName,
        email,
        phone,
        contactNumber: phone,
        sex,
        department: matchedDept ? matchedDept.name : rawDept,
        departmentId: deptId,
        designation: matchedDesig ? matchedDesig.name : rawDesig,
        designationId: desigId,
        workLocation: matchedLoc ? (matchedLoc.siteName || matchedLoc.name) : rawLoc,
        employmentType: emp.employmentType || "Full Time",
        employmentDate,
        salary,
        salaryETB: salary,
        grossSalary: salary,
        baseSalary: salary,
        bankAccount,
        bankAccountNumber: bankAccount,
        accountNumber: bankAccount,
        bankName,
        password: hashedPassword,
        address: matchedLoc ? (matchedLoc.siteName || matchedLoc.name) : "Addis Ababa, Ethiopia",
      },
      payrollDetails: {
        grossSalary: salary,
        baseSalary: salary,
        salary,
        bankAccount,
        bankAccountNumber: bankAccount,
        bankName,
      },
      financialDetails: {
        salary,
        grossSalary: salary,
        bankAccount,
        bankName,
      },
      leaveBalance: {
        annual: 16,
        used: 0,
      },
      updatedAt: new Date(),
    };

    // Upsert into employees collection
    const existing = await db.collection("employees").findOne({
      $or: [{ employeeId: empId }, { "personalDetails.employeeId": empId }],
    });

    let savedId;
    if (existing) {
      savedId = existing._id;
      await db.collection("employees").updateOne(
        { _id: savedId },
        {
          $set: employeeDoc,
          $setOnInsert: { createdAt: new Date() },
        }
      );
    } else {
      employeeDoc.createdAt = new Date();
      const insertRes = await db.collection("employees").insertOne(employeeDoc);
      savedId = insertRes.insertedId;
    }

    // Upsert user account in users collection for login
    const isTopManagement =
      rawDept.toLowerCase().includes("top management") ||
      rawDesig.toLowerCase().includes("general manager") ||
      rawDesig.toLowerCase().includes("deputy manager");

    const roleName = isTopManagement ? "ADMIN" : "EMPLOYEE";

    await db.collection("users").updateOne(
      {
        $or: [{ employeeId: empId }, { email: email }],
      },
      {
        $set: {
          employeeId: empId,
          email: email,
          name: fullName,
          password: hashedPassword,
          role: roleName,
          employeeRefId: savedId,
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Upsert into user_roles collection
    const rolePermissions = isTopManagement
      ? ["*"]
      : [
          "employee.read.own",
          "employee.update.own",
          "document.read.own",
          "document.create.own",
          "attendance.checkin",
          "leave.request",
          "task.read.own",
        ];

    await db.collection("user_roles").updateOne(
      { userId: savedId.toString() },
      {
        $set: {
          userId: savedId.toString(),
          employeeId: empId,
          email: email,
          role: roleName,
          permissions: rolePermissions,
          assignedBy: "system_seeder",
          assignedAt: new Date(),
          isActive: true,
        },
      },
      { upsert: true }
    );

    // Initialize 16-day Annual Leave in leave_balances
    const leaveBalanceDoc = {
      employeeId: savedId,
      employeeName: fullName,
      employmentDate,
      yearsOfService: 1,
      balances: {
        annual: {
          yearlyAllowance: 16,
          baseAllowance: 16,
          seniorityBonus: 0,
          totalEarned: 16,
          carriedForward: 0,
          available: 16,
          used: 0,
          pending: 0,
          description: "Annual Leave",
        },
      },
      adjustments: [],
      updatedAt: new Date(),
      lastCalculated: new Date(),
    };

    await db.collection("leave_balances").updateOne(
      { employeeId: savedId },
      {
        $set: leaveBalanceDoc,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    // Track location assignment
    if (locId) {
      const locKey = locId.toString();
      if (!locationAssignments[locKey]) {
        locationAssignments[locKey] = [];
      }
      locationAssignments[locKey].push(savedId);
    }

    seededEmployees.push({
      id: savedId,
      employeeId: empId,
      name: fullName,
      department: employeeDoc.department,
      designation: employeeDoc.designation,
      workLocation: employeeDoc.workLocation,
      role: roleName,
    });
  }

  // 5. Update assignedEmployees in work_locations
  console.log("\n--- Step 7: Updating Location Assignments ---");
  for (const [locIdStr, empIds] of Object.entries(locationAssignments)) {
    await db.collection("work_locations").updateOne(
      { _id: new ObjectId(locIdStr) },
      {
        $addToSet: { assignedEmployees: { $each: empIds } },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // 6. Update employeeCount per department
  console.log("\n--- Step 8: Updating Department Employee Counters ---");
  for (const dept of departments) {
    const count = await db.collection("employees").countDocuments({
      $or: [
        { departmentId: dept._id },
        { department: dept.name },
        { "personalDetails.department": dept.name },
      ],
    });
    await db.collection("departments").updateOne(
      { _id: dept._id },
      { $set: { employeeCount: count, updatedAt: new Date() } }
    );
  }

  console.log("\n========================================================");
  console.log("🎉 ALL EMPLOYEES & USER ACCOUNTS SEEDED SUCCESSFULLY!");
  console.log("========================================================");
  console.log(`• Total Employees Seeded : ${seededEmployees.length}`);
  console.log(`• Default User Password  : "${defaultPassword}"`);
  console.log(`• Admin Account          : ${ADMIN_CREDENTIALS.employeeId} (${ADMIN_CREDENTIALS.email})`);
  console.log(`• Roles Seeded           : ADMIN, HR_MANAGER, HR_STAFF, MANAGER, PROJECT_MANAGER, FINANCE, EMPLOYEE`);
  console.log("========================================================\n");

  return {
    success: true,
    totalSeeded: seededEmployees.length,
    employees: seededEmployees,
  };
}

if (process.argv[1]?.endsWith("seedEmployees.js")) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("geo");
    await seedEmployees(db, { runDependencies: true });
    console.log("Employee seeder completed successfully.");
  } catch (error) {
    console.error("Employee seeder failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}
