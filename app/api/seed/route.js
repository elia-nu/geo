import { NextResponse } from "next/server";
import { getDb } from "../mongo";

export async function POST() {
  try {
    const db = await getDb();

    // Sample employees data
    const sampleEmployees = [
      {
        personalDetails: {
          name: "John Doe",
          dateOfBirth: "1990-05-15",
          address: "123 Main St, New York, NY 10001",
          contactNumber: "+1 (555) 123-4567",
          email: "john.doe@company.com",
        },
        employmentHistory: [
          {
            position: "Software Engineer",
            company: "Tech Corp",
            startDate: "2020-01-15",
            endDate: null,
            description: "Full-stack development",
          },
        ],
        certifications: [
          {
            title: "AWS Certified Developer",
            issuer: "Amazon Web Services",
            issueDate: "2022-03-10",
            expiryDate: "2025-03-10",
          },
        ],
        skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS"],
        healthRecords: {
          bloodType: "O+",
          allergies: ["Peanuts"],
          medicalConditions: [],
        },
        department: "IT",
        designation: "Senior Software Engineer",
        workLocation: "New York",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      },
      {
        personalDetails: {
          name: "Jane Smith",
          dateOfBirth: "1988-08-22",
          address: "456 Oak Ave, San Francisco, CA 94102",
          contactNumber: "+1 (555) 987-6543",
          email: "jane.smith@company.com",
        },
        employmentHistory: [],
        certifications: [],
        skills: ["Project Management", "Agile", "Scrum", "Leadership"],
        healthRecords: {
          bloodType: "A+",
          allergies: [],
          medicalConditions: [],
        },
        department: "HR",
        designation: "HR Manager",
        workLocation: "San Francisco",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      },
      {
        personalDetails: {
          name: "Mike Johnson",
          dateOfBirth: "1985-12-03",
          address: "789 Pine St, London, UK",
          contactNumber: "+44 20 7946 0958",
          email: "mike.johnson@company.com",
        },
        employmentHistory: [],
        certifications: [],
        skills: ["Financial Analysis", "Excel", "SAP", "Budgeting"],
        healthRecords: {
          bloodType: "B+",
          allergies: ["Shellfish"],
          medicalConditions: [],
        },
        department: "Finance",
        designation: "Financial Analyst",
        workLocation: "London",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      },
      {
        personalDetails: {
          name: "Sarah Wilson",
          dateOfBirth: "1992-03-18",
          address: "321 Cedar Rd, Remote",
          contactNumber: "+1 (555) 456-7890",
          email: "sarah.wilson@company.com",
        },
        employmentHistory: [],
        certifications: [],
        skills: [
          "Digital Marketing",
          "SEO",
          "Social Media",
          "Content Creation",
        ],
        healthRecords: {
          bloodType: "AB-",
          allergies: [],
          medicalConditions: [],
        },
        department: "Marketing",
        designation: "Digital Marketing Specialist",
        workLocation: "Remote",
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "active",
      },
    ];

    // Clear existing employees (optional - remove this in production)
    await db.collection("employees").deleteMany({});

    // Insert sample employees
    const result = await db.collection("employees").insertMany(sampleEmployees);

    return NextResponse.json(
      {
        message: "Sample data seeded successfully",
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error seeding data:", error);
    return NextResponse.json(
      { error: "Failed to seed sample data" },
      { status: 500 }
    );
  }
}
