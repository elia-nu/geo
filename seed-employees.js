import { getDb } from "./app/api/mongo.js";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// Department alias resolver
function findDepartment(deptName, departments) {
  if (!deptName) return null;
  const clean = deptName.trim().toLowerCase();
  return (
    departments.find(
      (d) =>
        d.name?.toLowerCase() === clean ||
        d.shortName?.toLowerCase() === clean ||
        d.departmentId?.toLowerCase() === clean ||
        d.aliases?.some((a) => a.toLowerCase() === clean)
    ) || null
  );
}

// Work location alias resolver
function findWorkLocation(locName, locations) {
  if (!locName) return null;
  const clean = locName.trim().toLowerCase();
  return (
    locations.find(
      (l) =>
        l.name?.toLowerCase() === clean ||
        l.siteName?.toLowerCase() === clean ||
        l.code?.toLowerCase() === clean ||
        l.aliases?.some((a) => a.toLowerCase() === clean)
    ) || null
  );
}

export async function seedEmployees() {
  try {
    console.log("🚀 Starting Employee Seeding with Salary & Bank Account from data/employees.json...\n");
    const db = await getDb();

    // 1. Load reference collections
    const departments = await db.collection("departments").find({}).toArray();
    const workLocations = await db.collection("work_locations").find({}).toArray();

    console.log(`🏢 Loaded ${departments.length} departments for association.`);
    console.log(`📍 Loaded ${workLocations.length} work locations for association.\n`);

    // 2. Read employees.json
    const filePath = path.join(process.cwd(), "data", "employees.json");
    if (!fs.existsSync(filePath)) {
      throw new Error(`Employees JSON file not found at ${filePath}`);
    }

    const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const employeesList = rawData.employees || [];
    console.log(`👥 Found ${employeesList.length} employees to seed.\n`);

    const defaultHashedPassword = await bcrypt.hash("password", 10);
    const results = [];
    const locationAssignmentMap = {}; // locId -> Set(empId)

    for (const emp of employeesList) {
      const empId = emp.employee_id?.trim();
      const fullName = emp.full_name?.trim();
      const phone = emp.phone?.trim() || "";
      const email = emp.email?.trim() || "";
      const designation = emp.designation?.trim() || "";
      const rawDept = emp.department?.trim() || "";
      const rawLoc = emp.work_location?.trim() || "";
      const employmentDate = emp.employment_date ? new Date(emp.employment_date) : null;
      const salary = typeof emp.salary_etb === "number" ? emp.salary_etb : parseFloat(emp.salary_etb) || 0;
      const annualLeave = parseInt(emp.annual_leave_days, 10) || 16;
      const sex = emp.sex?.trim() || "M";
      const bankAccount = emp.bank_account?.trim() || "";
      const bankName = "Commercial Bank of Ethiopia";

      // Match Department
      const matchedDept = findDepartment(rawDept, departments);
      const departmentName = matchedDept ? matchedDept.name : rawDept;
      const departmentId = matchedDept ? matchedDept._id : null;

      // Match Work Location
      const matchedLoc = findWorkLocation(rawLoc, workLocations);
      const locationName = matchedLoc ? matchedLoc.siteName : rawLoc;
      const locationId = matchedLoc ? matchedLoc._id.toString() : null;
      const workLocationsArray = locationId ? [locationId] : [];

      const employeeDoc = {
        employeeId: empId,
        name: fullName,
        firstName: fullName.split(" ")[0] || fullName,
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        email: email,
        phone: phone,
        contactNumber: phone,
        sex: sex,
        designation: designation,
        department: departmentName,
        departmentId: departmentId,
        workLocation: locationName,
        workLocations: workLocationsArray,
        employmentType: emp.employment_type || "Full Time",
        employmentDate: employmentDate,
        annualLeaveDays: annualLeave,
        salary: salary,
        salaryETB: salary,
        grossSalary: salary,
        baseSalary: salary,
        bankAccount: bankAccount,
        bankAccountNumber: bankAccount,
        accountNumber: bankAccount,
        bankName: bankName,
        status: "active",
        password: defaultHashedPassword,
        personalDetails: {
          name: fullName,
          firstName: fullName.split(" ")[0] || fullName,
          lastName: fullName.split(" ").slice(1).join(" ") || "",
          employeeId: empId,
          email: email,
          phone: phone,
          contactNumber: phone,
          sex: sex,
          designation: designation,
          department: departmentName,
          workLocation: locationName,
          employmentType: emp.employment_type || "Full Time",
          employmentDate: employmentDate,
          salary: salary,
          salaryETB: salary,
          grossSalary: salary,
          baseSalary: salary,
          bankAccount: bankAccount,
          bankAccountNumber: bankAccount,
          accountNumber: bankAccount,
          bankName: bankName,
          password: defaultHashedPassword,
          address: locationName || "Addis Ababa, Ethiopia",
        },
        payrollDetails: {
          grossSalary: salary,
          baseSalary: salary,
          salary: salary,
          bankAccount: bankAccount,
          bankAccountNumber: bankAccount,
          bankName: bankName,
        },
        financialDetails: {
          salary: salary,
          grossSalary: salary,
          bankAccount: bankAccount,
          bankName: bankName,
        },
        healthRecords: {
          bloodType: "O+",
          allergies: [],
          medicalConditions: [],
        },
        leaveBalance: {
          annual: 16,
          used: 0,
        },
        skills: [],
        certifications: [],
        employmentHistory: [],
        updatedAt: new Date(),
      };

      // Upsert into employees collection
      const existing = await db.collection("employees").findOne({
        $or: [{ employeeId: empId }, { "personalDetails.employeeId": empId }],
      });

      let savedEmpId;
      if (existing) {
        savedEmpId = existing._id;
        await db.collection("employees").updateOne(
          { _id: savedEmpId },
          {
            $set: employeeDoc,
            $setOnInsert: { createdAt: new Date() },
          }
        );
        console.log(`   🔄 [${empId}] ${fullName.padEnd(23, " ")} | Salary: ETB ${salary.toString().padStart(6, " ")} | Bank: ${bankAccount || "N/A"}`);
      } else {
        employeeDoc.createdAt = new Date();
        const insertRes = await db.collection("employees").insertOne(employeeDoc);
        savedEmpId = insertRes.insertedId;
        console.log(`   ✨ [${empId}] ${fullName.padEnd(23, " ")} | Salary: ETB ${salary.toString().padStart(6, " ")} | Bank: ${bankAccount || "N/A"}`);
      }

      // Upsert into leave_balances collection - ONLY 16 days Annual Leave
      const fullYears = Math.max(
        0,
        Math.floor(
          (new Date() - (employmentDate || new Date())) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      );

      const leaveBalanceDoc = {
        employeeId: savedEmpId,
        employeeName: fullName,
        employmentDate: employmentDate || new Date(),
        yearsOfService: Math.floor(fullYears * 100) / 100,
        balances: {
          annual: {
            yearlyAllowance: 16,
            baseAllowance: 16,
            seniorityBonus: 0,
            totalEarned: 16,
            carriedForward: 0,
            expiredDays: 0,
            available: 16,
            used: 0,
            pending: 0,
            description: "Annual Leave",
            formula: "16 Days Standard Annual Leave",
            rolloverPolicy: "Rollover with 2-year postponement expiry limit",
          },
        },
        adjustments: [],
        updatedAt: new Date(),
        lastCalculated: new Date(),
      };

      await db.collection("leave_balances").updateOne(
        { employeeId: savedEmpId },
        {
          $set: leaveBalanceDoc,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      // Track location assignment
      if (matchedLoc) {
        const locIdStr = matchedLoc._id.toString();
        if (!locationAssignmentMap[locIdStr]) {
          locationAssignmentMap[locIdStr] = new Set();
        }
        locationAssignmentMap[locIdStr].add(savedEmpId);
      }

      // Ensure user_roles has entry
      const isTopManagement = rawDept.toLowerCase().includes("top management") || designation.toLowerCase().includes("g/ manager");
      const roleName = isTopManagement ? "ADMIN" : "EMPLOYEE";
      await db.collection("user_roles").updateOne(
        { userId: savedEmpId.toString() },
        {
          $setOnInsert: {
            userId: savedEmpId.toString(),
            email: email || `${empId.toLowerCase()}@efengineering-architect.com`,
            role: roleName,
            permissions: isTopManagement
              ? ["employee.create", "employee.read", "employee.update", "employee.delete", "reports.read", "attendance.manage"]
              : ["employee.read.own", "employee.update.own", "document.read.own"],
            assignedBy: "system",
            assignedAt: new Date(),
            isActive: true,
          },
        },
        { upsert: true }
      );

      results.push({ id: savedEmpId, ...employeeDoc });
    }

    // 3. Update assignedEmployees in work_locations
    console.log("\n🔗 Updating work_locations assignedEmployees...");
    for (const [locIdStr, empIdSet] of Object.entries(locationAssignmentMap)) {
      const empIdsArray = Array.from(empIdSet);
      await db.collection("work_locations").updateOne(
        { _id: new (await import("mongodb")).ObjectId(locIdStr) },
        {
          $addToSet: { assignedEmployees: { $each: empIdsArray } },
          $set: { updatedAt: new Date() },
        }
      );
    }

    // 4. Update employee count per department
    console.log("🏢 Updating department employee counts...");
    for (const dept of departments) {
      const count = await db.collection("employees").countDocuments({
        $or: [
          { departmentId: dept._id },
          { department: dept.name },
          { department: dept.shortName },
          { "personalDetails.department": dept.name },
          { "personalDetails.department": dept.shortName },
        ],
      });
      await db.collection("departments").updateOne(
        { _id: dept._id },
        { $set: { employeeCount: count, updatedAt: new Date() } }
      );
    }

    console.log("\n========================================================");
    console.log("🎉 ALL EMPLOYEES SEEDED WITH SALARY & BANK ACCOUNTS!");
    console.log("========================================================");
    console.log(`• Total Employees Seeded : ${results.length}`);
    console.log(`• Salary & Bank Accounts : Seeded on root, personalDetails, payrollDetails`);
    console.log(`• Default Password       : "password"`);
    console.log("========================================================\n");

    return {
      success: true,
      totalEmployees: results.length,
      employees: results,
    };
  } catch (error) {
    console.error("❌ Employee seeding failed:", error);
    throw error;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed-employees.js")) {
  seedEmployees()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
