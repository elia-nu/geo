import { MongoClient } from "mongodb";

const uri = "mongodb://localhost:27017/geo";
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(); // default DB, can specify name if needed
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
