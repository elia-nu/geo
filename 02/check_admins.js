import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/geo";

async function checkAdmins() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("geo");

    const empAdmins = await db.collection("employees").find({
      $or: [
        { role: "ADMIN" },
        { "personalDetails.employeeId": { $regex: /admin/i } },
        { employeeId: { $regex: /admin/i } },
      ],
    }).toArray();

    console.log("Admins in employees collection:");
    empAdmins.forEach(e => {
      console.log({
        _id: e._id,
        name: e.name || e.personalDetails?.name,
        employeeId: e.employeeId || e.personalDetails?.employeeId,
        email: e.email || e.personalDetails?.email,
        role: e.role,
        hasPassword: !!(e.password || e.personalDetails?.password)
      });
    });

    const roles = await db.collection("user_roles").find({ role: "ADMIN" }).toArray();
    console.log("\nAdmin user_roles:");
    console.log(roles);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

checkAdmins();
