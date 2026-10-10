// Script to seed or update MongoDB with the data from data/employees.json
// Run with: node seed-excel-data.js

import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/geo";

async function seedData() {
  console.log("🚀 Starting database seeding from data/employees.json...");
  const dataPath = path.join(__dirname, "data", "employees.json");
  const rawData = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(rawData);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB:", uri);
    const db = client.db("geo");

    // 1. Seed Work Locations
    console.log("\n📍 Updating Work Locations (Radius = 500m)...");
    const locationsCol = db.collection("work_locations");
    for (const loc of data.work_locations) {
      await locationsCol.updateOne(
        { siteName: loc.site_name },
        {
          $set: {
            siteName: loc.site_name,
            address: loc.full_address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius: loc.radius_meters || 500,
            attendanceType: loc.attendance_type,
            mapLink: loc.map_link,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log(`✅ Upserted ${data.work_locations.length} work locations.`);

    // 2. Seed Departments
    console.log("\n🏢 Updating Departments (All 7 Departments)...");
    const deptsCol = db.collection("departments");
    for (const dept of data.departments) {
      await deptsCol.updateOne(
        { name: dept.name },
        {
          $set: {
            deptId: dept.id,
            name: dept.name,
            aliases: dept.aliases,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log(`✅ Upserted ${data.departments.length} departments.`);

    // 3. Seed Employees
    console.log("\n👥 Updating Employees (Full Time, 16 Fixed Leave Days)...");
    const empCol = db.collection("employees");
    for (const emp of data.employees) {
      await empCol.updateOne(
        { employeeId: emp.employee_id },
        {
          $set: {
            employeeId: emp.employee_id,
            employeeIdCode: emp.employee_id,
            name: emp.full_name,
            sex: emp.sex,
            phone: emp.phone,
            email: emp.email || "",
            department: emp.department,
            designation: emp.designation,
            workLocation: emp.work_location,
            employmentDate: emp.employment_date ? new Date(emp.employment_date) : null,
            employmentType: emp.employment_type || "Full Time",
            annualLeaveDays: emp.annual_leave_days || 16,
            leaveBalance: {
              annual: emp.annual_leave_days || 16,
              accrualEnabled: false,
            },
            salary: emp.salary_etb,
            bankAccount: emp.bank_account,
            status: "active",
            role: "EMPLOYEE",
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
    console.log(`✅ Upserted ${data.employees.length} employees.`);

    console.log("\n✨ Database seeding completed successfully!");
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  } finally {
    await client.close();
  }
}

seedData();
