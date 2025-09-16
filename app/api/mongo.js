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

export const projectSchema = {
  name: String,
  description: String,
  category: String,
  status: String, // 'planning', 'active', 'on-hold', 'completed', 'cancelled'
  priority: String, // 'low', 'medium', 'high', 'critical'
  startDate: Date,
  endDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,
  progress: Number, // 0-100
  budget: Number,
  actualCost: Number,
  projectManager: String, // Employee ID
  teamMembers: [String], // Array of Employee IDs
  client: String,
  scope: String,
  deliverables: [String],
  risks: [String],
  dependencies: [String], // Array of Project IDs
  tags: [String],
  createdAt: Date,
  updatedAt: Date,
  createdBy: String, // Employee ID
  lastModifiedBy: String, // Employee ID
};

export const milestoneSchema = {
  projectId: String, // Project ID
  name: String,
  description: String,
  dueDate: Date,
  actualCompletionDate: Date,
  status: String, // 'pending', 'in-progress', 'completed', 'overdue'
  progress: Number, // 0-100
  dependencies: [String], // Array of Milestone IDs
  assignedTo: String, // Employee ID
  deliverables: [String],
  notes: String,
  createdAt: Date,
  updatedAt: Date,
  createdBy: String, // Employee ID
};

export const projectAlertSchema = {
  projectId: String, // Project ID
  milestoneId: String, // Milestone ID (optional)
  type: String, // 'delay', 'milestone', 'budget', 'risk', 'update'
  severity: String, // 'low', 'medium', 'high', 'critical'
  title: String,
  message: String,
  isRead: Boolean,
  isResolved: Boolean,
  triggeredAt: Date,
  resolvedAt: Date,
  resolvedBy: String, // Employee ID
  recipients: [String], // Array of Employee IDs
  metadata: Object, // Additional context data
};

export const projectUpdateSchema = {
  projectId: String, // Project ID
  milestoneId: String, // Milestone ID (optional)
  type: String, // 'progress', 'milestone', 'issue', 'general'
  title: String,
  content: String,
  attachments: [String], // Array of file paths
  author: String, // Employee ID
  isPublic: Boolean,
  createdAt: Date,
  updatedAt: Date,
};
