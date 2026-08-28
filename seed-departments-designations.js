import { getDb } from "./app/api/mongo.js";

// All unique designations across the organization (available for all departments)
export const ALL_DESIGNATIONS = [
  "General Manager",
  "G/ Manager",
  "Deputy Manager",
  "D/Manager",
  "Supervision Team Leader",
  "Resident Engineer",
  "Assistant Resident Engineer",
  "Design Department Head",
  "Senior Structural Engineer",
  "Structural Engineer",
  "Senior Architect",
  "Architect",
  "Electrical Engineer",
  "Sanitary Engineer",
  "Office Engineer Department Head",
  "Office Engineer",
  "Contract Admin Department Head",
  "Contract Administrator",
  "CAD Expert",
  "Draftsperson",
  "Administration and Finance",
  "Finance officer",
  "Accountant",
  "HR Manager",
  "HR Officer",
  "IT officer",
  "System Administrator",
  "Record Officer",
  "Project Coordinator",
  "Quantity Surveyor",
  "Secretary",
  "Executive Assistant",
  "Driver",
  "Janitor",
];

// All 7 Official Departments
export const SEED_DEPARTMENTS = [
  {
    departmentId: "DEP-001",
    name: "Finance and Administration",
    shortName: "Administration",
    aliases: ["Administration", "Finance and Administration", "Finance", "HR"],
    description: "Financial management, accounting, human resources, office administration, and corporate support services.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-002",
    name: "Design Department",
    shortName: "Design",
    aliases: ["Design", "Design Department", "Architectural & Structural Design"],
    description: "Architectural design, structural engineering, electrical, and MEP design documentation.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-003",
    name: "Contract Administration and Procurement Department",
    shortName: "Contract Admin",
    aliases: ["Contract Admin", "Contract Administration and Procurement Department", "Procurement"],
    description: "Contract drafting, legal compliance, claims management, procurement, and quantity surveying.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-004",
    name: "Supervision and Project Follow-up Department",
    shortName: "Supervision",
    aliases: ["Supervision", "Supervision and Project Follow-up Department", "Field Supervision"],
    description: "Construction site supervision, resident engineering, quality control, and progress follow-up.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-005",
    name: "Office Engineering",
    shortName: "Office Engineering",
    aliases: ["Office Engineering", "Office Engineering Department"],
    description: "Technical office engineering, submittals review, reporting, and drawing management.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-006",
    name: "Management",
    shortName: "Management",
    aliases: ["Management", "Supervision / Operations Management", "Operations"],
    description: "Operational management, project coordination, and divisional supervision.",
    budget: 0,
    status: "active",
  },
  {
    departmentId: "DEP-007",
    name: "Top Management",
    shortName: "Top Management",
    aliases: ["Top Management", "Executive Management / General Manager", "Executive Management"],
    description: "Executive leadership, strategic decisions, board relations, and overall firm governance.",
    budget: 0,
    status: "active",
  },
];

export async function seedDepartmentsAndDesignations() {
  try {
    console.log("🚀 Starting Departments & Designations Seeding...\n");
    const db = await getDb();

    // Unique sorted designations
    const sortedDesignations = Array.from(new Set(ALL_DESIGNATIONS)).sort((a, b) =>
      a.localeCompare(b)
    );

    console.log(`📋 Total Unique Designations to assign to all departments: ${sortedDesignations.length}`);
    console.log(`🏢 Total Departments to seed: ${SEED_DEPARTMENTS.length}\n`);

    const results = [];

    for (const dept of SEED_DEPARTMENTS) {
      // Look for existing department by departmentId, name, or aliases
      const matchCriteria = [
        { departmentId: dept.departmentId },
        { name: { $regex: new RegExp(`^${dept.name}$`, "i") } },
        { name: { $regex: new RegExp(`^${dept.shortName}$`, "i") } },
      ];

      if (dept.aliases && dept.aliases.length > 0) {
        dept.aliases.forEach((alias) => {
          matchCriteria.push({ name: { $regex: new RegExp(`^${alias}$`, "i") } });
          matchCriteria.push({ aliases: { $regex: new RegExp(`^${alias}$`, "i") } });
        });
      }

      const existing = await db.collection("departments").findOne({
        $or: matchCriteria,
      });

      const docData = {
        departmentId: dept.departmentId,
        name: dept.name,
        shortName: dept.shortName,
        aliases: dept.aliases,
        description: dept.description,
        designations: sortedDesignations, // Designations for all departments (not restricted)
        budget: dept.budget || 0,
        status: dept.status || "active",
        updatedAt: new Date(),
      };

      if (existing) {
        await db.collection("departments").updateOne(
          { _id: existing._id },
          {
            $set: docData,
            $setOnInsert: { createdAt: new Date(), employeeCount: 0 },
          }
        );
        console.log(`   🔄 Updated: [${dept.departmentId}] ${dept.name} (${dept.shortName}) - ${sortedDesignations.length} designations`);
        results.push({ id: existing._id, ...docData, action: "updated" });
      } else {
        const insertRes = await db.collection("departments").insertOne({
          ...docData,
          employeeCount: 0,
          createdAt: new Date(),
        });
        console.log(`   ✨ Created: [${dept.departmentId}] ${dept.name} (${dept.shortName}) - ${sortedDesignations.length} designations`);
        results.push({ id: insertRes.insertedId, ...docData, action: "created" });
      }
    }

    // Also link any existing employees with matching department names to departmentId
    console.log("\n🔗 Syncing employee department references...");
    const deptsInDb = await db.collection("departments").find().toArray();
    for (const d of deptsInDb) {
      const namesToMatch = [d.name, d.shortName, ...(d.aliases || [])].filter(Boolean);
      await db.collection("employees").updateMany(
        {
          $or: [
            { department: { $in: namesToMatch } },
            { "personalDetails.department": { $in: namesToMatch } },
          ],
        },
        {
          $set: {
            departmentId: d._id,
          },
        }
      );
    }

    console.log("\n========================================================");
    console.log("🎉 DEPARTMENTS & DESIGNATIONS SEEDED SUCCESSFULLY!");
    console.log("========================================================");
    console.log(`• Total Departments: ${SEED_DEPARTMENTS.length}`);
    SEED_DEPARTMENTS.forEach((d, i) => {
      console.log(`  ${i + 1}. [${d.departmentId}] ${d.name} (Alias: ${d.shortName})`);
    });
    console.log(`\n• Total Designations per Department: ${sortedDesignations.length} (available for all)`);
    console.log("========================================================\n");

    return {
      success: true,
      departments: results,
      designations: sortedDesignations,
    };
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed-departments-designations.js")) {
  seedDepartmentsAndDesignations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
