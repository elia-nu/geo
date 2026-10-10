import { MongoClient } from "mongodb";

// Prefer MONGODB_URI environment variable; fallback to local MongoDB instance for Linux VPS
const uri =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/geo";

const options = {
  // Keep a warm pool so subsequent API routes don't pay full TLS/handshake cost.
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 8_000,
  connectTimeoutMS: 10_000,
};

let clientPromise;

function createClientPromise() {
  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    // Clear cache so the next request can retry.
    global._mongoClientPromise = null;
    throw err;
  });
}

if (!global._mongoClientPromise) {
  global._mongoClientPromise = createClientPromise();
}
clientPromise = global._mongoClientPromise;

function getDefaultDb(client) {
  const dbName = process.env.MONGODB_DB || "geo";
  return client.db(dbName);
}

export async function getDb() {
  try {
    const client = await clientPromise;
    return getDefaultDb(client);
  } catch (err) {
    global._mongoClientPromise = createClientPromise();
    clientPromise = global._mongoClientPromise;
    const client = await clientPromise;
    return getDefaultDb(client);
  }
}

export const employeeSchema = {
  personalDetails: {
    name: String,
    dateOfBirth: Date,
    address: String,
    contactNumber: String,
    email: String,
  },
  employmentHistory: [
    {
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
    },
  ],
  certifications: [
    {
      title: String,
      institution: String,
      dateObtained: Date,
      expiryDate: Date,
    },
  ],
  skills: [String],
  healthRecords: {
    bloodType: String,
    allergies: [String],
    medicalConditions: [String],
  },
};
