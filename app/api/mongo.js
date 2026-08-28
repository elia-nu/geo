import { MongoClient } from "mongodb";

// Prefer env; fall back to the known Atlas URI used by this project.
//const uri =
  //process.env.MONGODB_URI || "mongodb://localhost:27017/geo";
const uri =
  process.env.MONGODB_URI || "mongodb+srv://datwii1277_db_user:ZWzpF1fP6I59UBRH@cluster0.njtcgok.mongodb.net/?appName=Cluster0";

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

export async function getDb() {
  try {
    const client = await clientPromise;
    return client.db("geo");
  } catch (err) {
    global._mongoClientPromise = createClientPromise();
    clientPromise = global._mongoClientPromise;
    const client = await clientPromise;
    return client.db("geo");
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
