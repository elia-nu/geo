// Migration script to add user roles and passwords to existing employees
// Run with: node migrate-existing-employees.js

const fetch = require("node-fetch");

const migrateExistingEmployees = async () => {
  console.log("🔄 Starting migration of existing employees...\n");

  try {
    // Step 1: Check current status
    console.log("1️⃣ Checking current employee status...");
    const statusResponse = await fetch(
      "http://localhost:3000/api/employee/migrate-users?checkOnly=true"
    );
    const statusResult = await statusResponse.json();

    if (!statusResult.success) {
      console.log("❌ Failed to check employee status:", statusResult.error);
      return;
    }

    const status = statusResult.status;
    console.log("📊 Current Status:");
    console.log(`   Total Employees: ${status.totalEmployees}`);
    console.log(`   With Roles: ${status.employeesWithRoles}`);
    console.log(`   Without Roles: ${status.employeesWithoutRoles}`);
    console.log(`   With Passwords: ${status.employeesWithPasswords}`);
    console.log(`   Without Passwords: ${status.employeesWithoutPasswords}`);
    console.log(`   Ready for Login: ${status.employeesReadyForLogin}`);
    console.log(`   Need Fix: ${status.employeesNeedingFix}`);
    console.log("");

    if (status.employeesNeedingFix === 0) {
      console.log("✅ All employees already have roles and passwords!");
      return;
    }

    // Step 2: Show employees that need fixing
    console.log("2️⃣ Employees needing fixes:");
    status.details
      .filter((emp) => emp.needsFix)
      .forEach((emp) => {
        console.log(`   - ${emp.name} (${emp.employeeIdCode})`);
        console.log(`     Email: ${emp.email}`);
        console.log(`     Has Role: ${emp.hasRole ? "✅" : "❌"}`);
        console.log(`     Has Password: ${emp.hasPassword ? "✅" : "❌"}`);
        console.log("");
      });

    // Step 3: Run dry run first
    console.log("3️⃣ Running dry run to see what will be changed...");
    const dryRunResponse = await fetch(
      "http://localhost:3000/api/employee/migrate-users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      }
    );

    const dryRunResult = await dryRunResponse.json();
    if (!dryRunResult.success) {
      console.log("❌ Dry run failed:", dryRunResult.error);
      return;
    }

    console.log("🔍 Dry Run Results:");
    console.log(
      `   Employees without roles: ${dryRunResult.results.employeesWithoutRoles.length}`
    );
    console.log(
      `   Employees without passwords: ${dryRunResult.results.employeesWithoutPasswords.length}`
    );
    console.log("");

    // Step 4: Ask for confirmation (in a real script, you'd use readline)
    console.log("4️⃣ Ready to apply changes...");
    console.log("⚠️  This will:");
    console.log("   - Create EMPLOYEE roles for employees without roles");
    console.log(
      "   - Generate random passwords for employees without passwords"
    );
    console.log("   - Make employees able to login immediately");
    console.log("");

    // For automation, we'll proceed directly
    // In a real scenario, you might want to add a confirmation prompt here
    console.log("🚀 Proceeding with migration...");

    // Step 5: Run actual migration
    const migrationResponse = await fetch(
      "http://localhost:3000/api/employee/migrate-users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, batchSize: 20 }),
      }
    );

    const migrationResult = await migrationResponse.json();
    if (!migrationResult.success) {
      console.log("❌ Migration failed:", migrationResult.error);
      return;
    }

    console.log("✅ Migration completed!");
    console.log("📊 Results:");
    console.log(
      `   Total processed: ${migrationResult.results.totalEmployees}`
    );
    console.log(
      `   Employees fixed: ${migrationResult.results.employeesFixed.length}`
    );
    console.log(`   Errors: ${migrationResult.results.errors.length}`);
    console.log("");

    // Step 6: Show fixed employees
    if (migrationResult.results.employeesFixed.length > 0) {
      console.log("🎉 Fixed employees:");
      migrationResult.results.employeesFixed.forEach((emp) => {
        console.log(`   - ${emp.name} (${emp.employeeIdCode})`);
        console.log(`     Role created: ${emp.roleCreated ? "✅" : "❌"}`);
        console.log(
          `     Password created: ${emp.passwordCreated ? "✅" : "❌"}`
        );
      });
      console.log("");
    }

    // Step 7: Show any errors
    if (migrationResult.results.errors.length > 0) {
      console.log("⚠️  Errors encountered:");
      migrationResult.results.errors.forEach((error) => {
        console.log(`   - ${error.name}: ${error.error}`);
      });
      console.log("");
    }

    // Step 8: Final status check
    console.log("8️⃣ Final status check...");
    const finalStatusResponse = await fetch(
      "http://localhost:3000/api/employee/migrate-users?checkOnly=true"
    );
    const finalStatusResult = await finalStatusResponse.json();

    if (finalStatusResult.success) {
      const finalStatus = finalStatusResult.status;
      console.log("📊 Final Status:");
      console.log(`   Total Employees: ${finalStatus.totalEmployees}`);
      console.log(`   Ready for Login: ${finalStatus.employeesReadyForLogin}`);
      console.log(`   Still Need Fix: ${finalStatus.employeesNeedingFix}`);
      console.log("");

      if (finalStatus.employeesNeedingFix === 0) {
        console.log("🎉 All employees are now ready for login!");
      } else {
        console.log("⚠️  Some employees still need manual attention.");
      }
    }

    console.log("\n✅ Migration process completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  }
};

// Run the migration
migrateExistingEmployees();
