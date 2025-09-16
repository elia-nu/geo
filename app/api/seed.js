const { getDb } = require("./mongo.js");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

async function seed() {
  const db = await getDb();

  // Seed attendance
  const attendancePath = path.join(process.cwd(), "data", "attendance.json");
  const attendanceData = JSON.parse(fs.readFileSync(attendancePath, "utf-8"));
  await db.collection("attendance").deleteMany({});
  await db.collection("attendance").insertMany(attendanceData);

  // Seed geofences
  const geofencesPath = path.join(process.cwd(), "data", "geofences.json");
  const geofencesRaw = JSON.parse(fs.readFileSync(geofencesPath, "utf-8"));
  // Convert geofences object to array of { name, lat, lng, radius }
  const geofencesData = Object.entries(geofencesRaw).map(([name, value]) => ({
    name,
    ...value,
  }));
  await db.collection("geofences").deleteMany({});
  await db.collection("geofences").insertMany(geofencesData);

  // Seed admin user
  console.log("Creating admin user...");

  // Hash the default password "admin123"
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminEmployee = {
    personalDetails: {
      name: "System Administrator",
      dateOfBirth: "1990-01-01",
      address: "Admin Office, Company HQ",
      contactNumber: "+1 (555) 000-0000",
      email: "admin@company.com",
      employeeId: "ADMIN001",
      password: hashedPassword,
    },
    department: "IT",
    designation: "System Administrator",
    workLocation: "Office",
    workLocations: ["Office", "Remote"], // Support multiple locations
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
  };

  // Clear existing admin employee if exists
  await db.collection("employees").deleteOne({
    "personalDetails.employeeId": "ADMIN001",
  });

  // Insert admin employee
  const adminResult = await db.collection("employees").insertOne(adminEmployee);
  const adminEmployeeId = adminResult.insertedId.toString();

  console.log("Admin employee created with ID:", adminEmployeeId);

  // Create admin role
  const adminRole = {
    userId: adminEmployeeId,
    email: "admin@company.com",
    role: "ADMIN",
    permissions: [
      "employee.create",
      "employee.read",
      "employee.update",
      "employee.delete",
      "document.create",
      "document.read",
      "document.update",
      "document.delete",
      "reports.read",
      "reports.export",
      "audit.read",
      "settings.manage",
      "user.create",
      "user.update",
      "user.delete",
      "notifications.manage",
      "project.create",
      "project.read",
      "project.update",
      "project.delete",
      "milestone.create",
      "milestone.read",
      "milestone.update",
      "milestone.delete",
      "alert.create",
      "alert.read",
      "alert.update",
      "alert.delete",
    ],
    assignedBy: "system",
    assignedAt: new Date(),
    isActive: true,
  };

  // Clear existing admin role if exists
  await db.collection("user_roles").deleteOne({ userId: adminEmployeeId });

  // Insert admin role
  await db.collection("user_roles").insertOne(adminRole);

  console.log("Admin role assigned successfully");

  // Create additional sample employees with different roles
  const sampleEmployees = [
    {
      personalDetails: {
        name: "John Doe",
        dateOfBirth: "1990-05-15",
        address: "123 Main St, New York, NY 10001",
        contactNumber: "+1 (555) 123-4567",
        email: "john.doe@company.com",
        employeeId: "EMP001",
        password: await bcrypt.hash("password123", 10),
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
      workLocations: ["New York", "Remote"],
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
        employeeId: "HR001",
        password: await bcrypt.hash("password123", 10),
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
      workLocations: ["San Francisco"],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
    },
  ];

  // Clear existing sample employees
  await db.collection("employees").deleteMany({
    "personalDetails.employeeId": { $in: ["EMP001", "HR001"] },
  });

  // Insert sample employees
  const employeesResult = await db
    .collection("employees")
    .insertMany(sampleEmployees);
  const employeeIds = Object.values(employeesResult.insertedIds).map((id) =>
    id.toString()
  );

  // Assign roles to sample employees
  const employeeRoles = [
    {
      userId: employeeIds[0], // John Doe
      email: "john.doe@company.com",
      role: "EMPLOYEE",
      permissions: [
        "employee.read.own",
        "employee.update.own",
        "document.read.own",
        "document.create.own",
      ],
      assignedBy: "system",
      assignedAt: new Date(),
      isActive: true,
    },
    {
      userId: employeeIds[1], // Jane Smith
      email: "jane.smith@company.com",
      role: "HR_MANAGER",
      permissions: [
        "employee.create",
        "employee.read",
        "employee.update",
        "document.create",
        "document.read",
        "document.update",
        "document.delete",
        "reports.read",
        "reports.export",
        "audit.read",
        "notifications.manage",
        "project.read",
        "milestone.read",
        "alert.read",
      ],
      assignedBy: "system",
      assignedAt: new Date(),
      isActive: true,
    },
  ];

  // Clear existing roles for these employees
  await db.collection("user_roles").deleteMany({
    userId: { $in: employeeIds },
  });

  // Insert employee roles
  await db.collection("user_roles").insertMany(employeeRoles);

  console.log("Sample employees and roles created successfully");

  // Create sample projects
  const sampleProjects = [
    {
      name: "Website Redesign Project",
      description:
        "Complete redesign of the company website with modern UI/UX and improved performance",
      category: "development",
      status: "active",
      priority: "high",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-03-15"),
      actualStartDate: new Date("2024-01-15"),
      actualEndDate: null,
      progress: 65,
      budget: 50000,
      actualCost: 32000,
      projectManager: adminEmployeeId,
      teamMembers: [employeeIds[0]], // John Doe
      client: "Internal",
      scope:
        "Redesign homepage, product pages, and user dashboard with responsive design",
      deliverables: [
        "Wireframes",
        "Design mockups",
        "Frontend implementation",
        "Testing",
      ],
      risks: ["Tight timeline", "Resource availability"],
      dependencies: [],
      tags: ["web", "design", "frontend"],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
      lastModifiedBy: adminEmployeeId,
    },
    {
      name: "Mobile App Development",
      description:
        "Development of a mobile application for employee management and attendance tracking",
      category: "development",
      status: "planning",
      priority: "critical",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-06-30"),
      actualStartDate: null,
      actualEndDate: null,
      progress: 15,
      budget: 75000,
      actualCost: 5000,
      projectManager: employeeIds[0], // John Doe
      teamMembers: [adminEmployeeId],
      client: "Internal",
      scope: "Native mobile app for iOS and Android with offline capabilities",
      deliverables: [
        "App design",
        "iOS app",
        "Android app",
        "Backend API",
        "Testing",
      ],
      risks: ["Platform compatibility", "App store approval"],
      dependencies: [],
      tags: ["mobile", "app", "ios", "android"],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
      lastModifiedBy: adminEmployeeId,
    },
    {
      name: "Marketing Campaign Q2",
      description:
        "Quarterly marketing campaign to increase brand awareness and lead generation",
      category: "marketing",
      status: "active",
      priority: "medium",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-03-31"),
      actualStartDate: new Date("2024-01-01"),
      actualEndDate: null,
      progress: 40,
      budget: 25000,
      actualCost: 12000,
      projectManager: employeeIds[1], // Jane Smith
      teamMembers: [],
      client: "Internal",
      scope:
        "Digital marketing campaign across social media, email, and content marketing",
      deliverables: [
        "Campaign strategy",
        "Content creation",
        "Social media posts",
        "Email campaigns",
      ],
      risks: ["Budget constraints", "Market competition"],
      dependencies: [],
      tags: ["marketing", "campaign", "social-media"],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
      lastModifiedBy: adminEmployeeId,
    },
  ];

  // Clear existing sample projects
  await db.collection("projects").deleteMany({
    name: { $in: sampleProjects.map((p) => p.name) },
  });

  // Insert sample projects
  const projectsResult = await db
    .collection("projects")
    .insertMany(sampleProjects);
  const projectIds = Object.values(projectsResult.insertedIds).map((id) =>
    id.toString()
  );

  console.log("Sample projects created successfully");

  // Create sample milestones for the first project
  const sampleMilestones = [
    {
      projectId: projectIds[0], // Website Redesign Project
      name: "Design Phase Complete",
      description: "Complete all wireframes and design mockups for the website",
      dueDate: new Date("2024-02-15"),
      actualCompletionDate: new Date("2024-02-10"),
      status: "completed",
      progress: 100,
      dependencies: [],
      assignedTo: employeeIds[0], // John Doe
      deliverables: [
        "Homepage wireframe",
        "Product page designs",
        "Dashboard mockup",
      ],
      notes: "Design phase completed ahead of schedule",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
    },
    {
      projectId: projectIds[0], // Website Redesign Project
      name: "Frontend Development",
      description:
        "Implement the frontend components based on approved designs",
      dueDate: new Date("2024-03-01"),
      actualCompletionDate: null,
      status: "in-progress",
      progress: 70,
      dependencies: [],
      assignedTo: employeeIds[0], // John Doe
      deliverables: [
        "Homepage implementation",
        "Product pages",
        "Responsive design",
      ],
      notes: "Making good progress on frontend development",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
    },
    {
      projectId: projectIds[0], // Website Redesign Project
      name: "Testing and Launch",
      description: "Complete testing and deploy the new website",
      dueDate: new Date("2024-03-15"),
      actualCompletionDate: null,
      status: "pending",
      progress: 0,
      dependencies: [],
      assignedTo: adminEmployeeId,
      deliverables: [
        "QA testing",
        "Performance optimization",
        "Production deployment",
      ],
      notes: "Waiting for frontend development to complete",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
    },
    {
      projectId: projectIds[1], // Mobile App Development
      name: "App Design and Planning",
      description: "Complete app design and technical planning",
      dueDate: new Date("2024-02-28"),
      actualCompletionDate: null,
      status: "in-progress",
      progress: 30,
      dependencies: [],
      assignedTo: employeeIds[0], // John Doe
      deliverables: [
        "App wireframes",
        "Technical architecture",
        "UI/UX design",
      ],
      notes: "Working on app architecture and design",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminEmployeeId,
    },
  ];

  // Clear existing sample milestones
  await db.collection("milestones").deleteMany({
    projectId: { $in: projectIds },
  });

  // Insert sample milestones
  await db.collection("milestones").insertMany(sampleMilestones);

  console.log("Sample milestones created successfully");

  console.log("\n=== SEEDING COMPLETE ===");
  console.log("Admin Login Credentials:");
  console.log("Employee ID: ADMIN001");
  console.log("Password: admin123");
  console.log("\nSample Employee Login Credentials:");
  console.log("Employee ID: EMP001, Password: password123 (Employee role)");
  console.log("Employee ID: HR001, Password: password123 (HR Manager role)");
  console.log("\nSample Projects Created:");
  console.log("- Website Redesign Project (Active)");
  console.log("- Mobile App Development (Planning)");
  console.log("- Marketing Campaign Q2 (Active)");
}

seed();
