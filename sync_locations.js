import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/geo";

async function syncLocations() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("geo");
    const locs = await db.collection("work_locations").find({}).toArray();
    for (const loc of locs) {
      const name = loc.name || loc.siteName || "";
      const siteName = loc.siteName || loc.name || "";
      const address = loc.address || loc.fullAddress || "";
      await db.collection("work_locations").updateOne(
        { _id: loc._id },
        { $set: { name, siteName, address } }
      );
    }
    console.log(`✅ Synced ${locs.length} work locations with name and siteName.`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

syncLocations();
