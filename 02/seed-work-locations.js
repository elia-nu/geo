import { getDb } from "./app/api/mongo.js";
import fs from "fs";
import path from "path";

// Location alias mapping for robust employee linking and geofence resolution
const LOCATION_ALIASES = {
  "Head Office": ["Head office", "Head Office", "HQ", "Asmara Road", "Main Office"],
  "Dambi Dolo University": ["Dambi Dolo University", "Dambidolo University", "Dambi Dolo"],
  "Mattu University": ["Mattu University", "Mattu"],
  "Bonga University": ["Bonga University", "Bonga"],
  "Borana University": ["Borana University", "Yabelo", "Borana"],
  "Jigjiga Quarantine Center": ["Jigjiga Quarantine Center", "Jigjiga", "OIP (RTC's)", "RTC"],
  "Gewane ATVT College": ["Gewane ATVT College", "Gewane ATVT", "Gewane"],
  "AACRA Garage": ["AACRA Garage", "AACRA", "Kality", "Kality Garage"],
  "FDRE, Ministry of Health": ["FDRE, Ministry of Health", "MOH Project AA", "MOH", "Ministry of Health", "Mekanisa"],
  "Entoto Riverside 40 Dereja": ["Entoto Riverside 40 Dereja", "Riverside project (AA)", "Riverside", "40 Dereja", "Entoto"],
  "Nekemt": ["Nekemt", "Nekemte"],
};

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (text) => {
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const values = [];
    let match;
    while ((match = regex.exec(text))) {
      let val = match[1];
      if (val === undefined || match.index === regex.lastIndex) {
        break;
      }
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      values.push(val.trim());
      if (regex.lastIndex >= text.length) break;
    }
    return values;
  };

  const [headerLine, ...dataLines] = lines;
  const records = [];

  for (const line of dataLines) {
    const cols = parseLine(line);
    if (cols.length >= 4) {
      records.push({
        siteName: cols[0],
        fullAddress: cols[1],
        latitude: parseFloat(cols[2]),
        longitude: parseFloat(cols[3]),
        radius: parseInt(cols[4], 10) || 500,
        attendanceType: cols[5] || "GPS Geofence",
        mapLink: cols[6] || "",
      });
    }
  }
  return records;
}

export async function seedWorkLocations() {
  try {
    console.log("🚀 Starting Work Stations / Locations Seeding...\n");
    const db = await getDb();

    const csvPath = path.join(process.cwd(), "data", "work_locations.csv");
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const rawLocations = parseCSV(csvContent);

    console.log(`📄 Parsed ${rawLocations.length} locations from work_locations.csv\n`);

    const locationResults = [];
    const geofenceResults = [];

    for (const [index, loc] of rawLocations.entries()) {
      const code = `LOC-${(index + 1).toString().padStart(3, "0")}`;
      const aliases = LOCATION_ALIASES[loc.siteName] || [loc.siteName];

      const locationDoc = {
        code,
        name: loc.siteName,
        siteName: loc.siteName,
        address: loc.fullAddress,
        fullAddress: loc.fullAddress,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius: loc.radius,
        attendanceType: loc.attendanceType,
        mapLink: loc.mapLink,
        aliases,
        status: "active",
        updatedAt: new Date(),
      };

      // Match by siteName or aliases
      const matchCriteria = [
        { code },
        { name: { $regex: new RegExp(`^${loc.siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { siteName: { $regex: new RegExp(`^${loc.siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      ];

      for (const a of aliases) {
        matchCriteria.push({ name: { $regex: new RegExp(`^${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
        matchCriteria.push({ aliases: { $regex: new RegExp(`^${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
      }

      const existing = await db.collection("work_locations").findOne({
        $or: matchCriteria,
      });

      let locationId;
      if (existing) {
        locationId = existing._id;
        await db.collection("work_locations").updateOne(
          { _id: locationId },
          {
            $set: locationDoc,
            $setOnInsert: { createdAt: new Date(), assignedEmployees: [] },
          }
        );
        console.log(`   🔄 Updated work location [${code}]: "${loc.siteName}" (${loc.latitude}, ${loc.longitude})`);
        locationResults.push({ id: locationId, ...locationDoc, action: "updated" });
      } else {
        const ins = await db.collection("work_locations").insertOne({
          ...locationDoc,
          assignedEmployees: [],
          createdAt: new Date(),
        });
        locationId = ins.insertedId;
        console.log(`   ✨ Created work location [${code}]: "${loc.siteName}" (${loc.latitude}, ${loc.longitude})`);
        locationResults.push({ id: locationId, ...locationDoc, action: "created" });
      }

      // Upsert into geofences collection as well for fast GPS lookup
      await db.collection("geofences").updateOne(
        { name: loc.siteName },
        {
          $set: {
            name: loc.siteName,
            lat: loc.latitude,
            lng: loc.longitude,
            radius: loc.radius,
            workLocationId: locationId,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      geofenceResults.push(loc.siteName);
    }

    // Ensure Admin employee has Head Office in their work locations
    const headOffice = await db.collection("work_locations").findOne({
      $or: [{ name: "Head Office" }, { siteName: "Head Office" }],
    });

    if (headOffice) {
      await db.collection("employees").updateMany(
        {
          $or: [
            { employeeId: "ADMIN001" },
            { role: "ADMIN" },
            { "personalDetails.workLocation": { $in: ["Head Office", "Head office", "HQ"] } },
          ],
        },
        {
          $addToSet: {
            workLocations: headOffice._id.toString(),
          },
          $set: {
            workLocation: "Head Office",
            "personalDetails.workLocation": "Head Office",
          },
        }
      );
    }

    // Sync all employees with their respective work location IDs
    const allLocations = await db.collection("work_locations").find({}).toArray();
    for (const loc of allLocations) {
      const matchNames = [loc.name, loc.siteName, ...(loc.aliases || [])].filter(Boolean);
      await db.collection("employees").updateMany(
        {
          $or: [
            { workLocation: { $in: matchNames } },
            { "personalDetails.workLocation": { $in: matchNames } },
          ],
        },
        {
          $addToSet: {
            workLocations: loc._id.toString(),
          },
        }
      );
    }

    console.log("\n========================================================");
    console.log("🎉 ALL WORK LOCATIONS & GEOFENCES SEEDED SUCCESSFULLY!");
    console.log("========================================================");
    console.log(`• Total Work Locations : ${locationResults.length}`);
    locationResults.forEach((loc, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2, " ")}. [${loc.code}] ${loc.name.padEnd(30, " ")} | Radius: ${loc.radius}m | (${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)})`
      );
    });
    console.log("========================================================\n");

    return {
      success: true,
      locations: locationResults,
      geofences: geofenceResults,
    };
  } catch (error) {
    console.error("❌ Work location seeding failed:", error);
    throw error;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed-work-locations.js")) {
  seedWorkLocations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
