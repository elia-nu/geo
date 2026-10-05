import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { getMongoUri } from "./getMongoUri.js";

const uri = getMongoUri();

export const ADMIN_CREDENTIALS = {
  employeeId: "ADMIN001",
  password: "password",
  name: "System Administrator",
  email: "admin@company.com",
  contactNumber: "+251911000000",
  department: "Top Management",
  designation: "System Administrator",
  workLocation: "Head Office",
};

export async function seedAdmin(db) {
  console.log("👑 Seeding Administrator Account...");

  // 1. Ensure Head Office work location exists
  let headOffice = await db.collection("work_locations").findOne({
    $or: [{ name: "Head Office" }, { siteName: "Head Office" }],
  });

  if (!headOffice) {
    const locResult = await db.collection("work_locations").insertOne({
      name: "Head Office",
      siteName: "Head Office",
      address: "Asmara Road, Addis Ababa, Ethiopia",
      fullAddress: "Asmara Road, Addis Ababa, Ethiopia",
      latitude: 9.02153590361139,
      longitude: 38.8148455028517,
      radius: 500,
      attendanceType: "Fingerprint & GPS Geofence",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedEmployees: [],
    });
    headOffice = { _id: locResult.insertedId, name: "Head Office" };
  }

  // 2. Hash Password
  const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);

  // 3. Upsert Admin Employee
  const employeeData = {
    employeeId: ADMIN_CREDENTIALS.employeeId,
    name: ADMIN_CREDENTIALS.name,
    email: ADMIN_CREDENTIALS.email,
    contactNumber: ADMIN_CREDENTIALS.contactNumber,
    phone: ADMIN_CREDENTIALS.contactNumber,
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
      phone: ADMIN_CREDENTIALS.contactNumber,
      password: hashedPassword,
      department: ADMIN_CREDENTIALS.department,
      designation: ADMIN_CREDENTIALS.designation,
      workLocation: "Head Office",
      address: "Addis Ababa, Ethiopia",
    },
    updatedAt: new Date(),
  };

  const existingAdmin = await db.collection("employees").findOne({
    $or: [
      { employeeId: ADMIN_CREDENTIALS.employeeId },
      { "personalDetails.employeeId": ADMIN_CREDENTIALS.employeeId },
      { email: ADMIN_CREDENTIALS.email },
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
  } else {
    employeeData.createdAt = new Date();
    const insertResult = await db.collection("employees").insertOne(employeeData);
    adminId = insertResult.insertedId;
  }

  // 4. Assign Work Location
  await db.collection("work_locations").updateOne(
    { _id: headOffice._id },
    {
      $addToSet: { assignedEmployees: adminId },
      $set: { updatedAt: new Date() },
    }
  );

  // 5. Upsert User in users collection
  await db.collection("users").updateOne(
    {
      $or: [
        { employeeId: ADMIN_CREDENTIALS.employeeId },
        { email: ADMIN_CREDENTIALS.email },
      ],
    },
    {
      $set: {
        employeeId: ADMIN_CREDENTIALS.employeeId,
        email: ADMIN_CREDENTIALS.email,
        password: hashedPassword,
        name: ADMIN_CREDENTIALS.name,
        role: "ADMIN",
        employeeRefId: adminId,
        isActive: true,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  // 6. Assign ADMIN role in user_roles
  await db.collection("user_roles").updateOne(
    { userId: adminId.toString() },
    {
      $set: {
        userId: adminId.toString(),
        email: ADMIN_CREDENTIALS.email,
        role: "ADMIN",
        permissions: ["*"],
        assignedBy: "system",
        assignedAt: new Date(),
        isActive: true,
      },
    },
    { upsert: true }
  );

  console.log(`✅ Admin account seeded: [${ADMIN_CREDENTIALS.employeeId}] ${ADMIN_CREDENTIALS.email}`);
  return { adminId, employeeId: ADMIN_CREDENTIALS.employeeId };
}

if (process.argv[1]?.endsWith("seedAdmin.js")) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("geo");
    await seedAdmin(db);
    console.log("Admin seeding completed successfully.");
  } finally {
    await client.close();
  }
}
