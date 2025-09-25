import { NextResponse } from "next/server";
import { getDb } from "../../mongo";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "overview";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = await getDb();
    let report = {};

    switch (reportType) {
      case "overview":
        report = await generateOverviewReport(db);
        break;
      case "departments":
        report = await generateDepartmentReport(db);
        break;
      case "documents":
        report = await generateDocumentReport(db, startDate, endDate);
        break;
      case "skills":
        report = await generateSkillsReport(db);
        break;
      case "locations":
        report = await generateLocationReport(db);
        break;
      case "certifications":
        report = await generateCertificationReport(db);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

async function generateOverviewReport(db) {
  const [employees, documents, notifications] = await Promise.all([
    db.collection("employees").find({}).toArray(),
    db.collection("documents").find({}).toArray(),
    db.collection("notifications").find({}).limit(100).toArray(),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Employee statistics
  const totalEmployees = employees.length;
  const newEmployeesThisMonth = employees.filter(
    (emp) => new Date(emp.createdAt) >= thirtyDaysAgo
  ).length;

  // Document statistics
  const totalDocuments = documents.length;
  const expiringDocuments = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    const expiryDate = new Date(doc.expiryDate);
    return (
      expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) &&
      expiryDate >= now
    );
  }).length;
  const expiredDocuments = documents.filter((doc) => {
    if (!doc.expiryDate) return false;
    return new Date(doc.expiryDate) < now;
  }).length;

  // Department distribution
  const departmentStats = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  // Location distribution
  const locationStats = employees.reduce((acc, emp) => {
    const location = emp.workLocation || "Not specified";
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {});

  // Recent activity
  const recentNotifications = notifications.filter(
    (notif) => new Date(notif.sentAt) >= sevenDaysAgo
  ).length;

  return {
    summary: {
      totalEmployees,
      newEmployeesThisMonth,
      totalDocuments,
      expiringDocuments,
      expiredDocuments,
      recentNotifications,
    },
    departmentDistribution: Object.entries(departmentStats).map(
      ([name, count]) => ({
        name,
        count,
        percentage: ((count / totalEmployees) * 100).toFixed(1),
      })
    ),
    locationDistribution: Object.entries(locationStats).map(
      ([name, count]) => ({
        name,
        count,
        percentage: ((count / totalEmployees) * 100).toFixed(1),
      })
    ),
    generatedAt: new Date().toISOString(),
  };
}

async function generateDepartmentReport(db) {
  const employees = await db.collection("employees").find({}).toArray();

  const departmentReport = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unassigned";

    if (!acc[dept]) {
      acc[dept] = {
        name: dept,
        totalEmployees: 0,
        designations: {},
        skills: {},
        locations: {},
        averageExperience: 0,
        totalExperience: 0,
      };
    }

    acc[dept].totalEmployees++;

    // Designation breakdown
    const designation = emp.designation || "Not specified";
    acc[dept].designations[designation] =
      (acc[dept].designations[designation] || 0) + 1;

    // Skills breakdown
    if (emp.skills && emp.skills.length > 0) {
      emp.skills.forEach((skill) => {
        acc[dept].skills[skill] = (acc[dept].skills[skill] || 0) + 1;
      });
    }

    // Location breakdown
    const location = emp.workLocation || "Not specified";
    acc[dept].locations[location] = (acc[dept].locations[location] || 0) + 1;

    // Calculate experience (if employment history exists)
    if (emp.employmentHistory && emp.employmentHistory.length > 0) {
      const totalExp = emp.employmentHistory.reduce((sum, job) => {
        const start = new Date(job.startDate);
        const end = job.endDate ? new Date(job.endDate) : new Date();
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
        return sum + years;
      }, 0);
      acc[dept].totalExperience += totalExp;
    }

    return acc;
  }, {});

  // Calculate average experience for each department
  Object.keys(departmentReport).forEach((dept) => {
    if (departmentReport[dept].totalEmployees > 0) {
      departmentReport[dept].averageExperience = (
        departmentReport[dept].totalExperience /
        departmentReport[dept].totalEmployees
      ).toFixed(1);
    }
  });

  return {
    departments: Object.values(departmentReport),
    generatedAt: new Date().toISOString(),
  };
}

async function generateDocumentReport(db, startDate, endDate) {
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      uploadDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };
  }

  const documents = await db.collection("documents").find(dateFilter).toArray();
  const employees = await db.collection("employees").find({}).toArray();
  const employeeMap = employees.reduce((map, emp) => {
    map[emp._id.toString()] = emp;
    return map;
  }, {});

  const now = new Date();
  const documentStats = {
    total: documents.length,
    byType: {},
    byStatus: {
      active: 0,
      expiring: 0,
      expired: 0,
    },
    byEmployee: {},
    uploadTrend: {},
  };

  documents.forEach((doc) => {
    // Type breakdown
    const type = doc.documentType || "Other";
    documentStats.byType[type] = (documentStats.byType[type] || 0) + 1;

    // Status breakdown
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      if (expiryDate < now) {
        documentStats.byStatus.expired++;
      } else if (expiryDate <= thirtyDaysFromNow) {
        documentStats.byStatus.expiring++;
      } else {
        documentStats.byStatus.active++;
      }
    } else {
      documentStats.byStatus.active++;
    }

    // Employee breakdown
    const employee = employeeMap[doc.employeeId];
    if (employee) {
      const empName = employee.personalDetails.name;
      documentStats.byEmployee[empName] =
        (documentStats.byEmployee[empName] || 0) + 1;
    }

    // Upload trend (by month)
    const uploadMonth = new Date(doc.uploadDate).toISOString().substring(0, 7); // YYYY-MM
    documentStats.uploadTrend[uploadMonth] =
      (documentStats.uploadTrend[uploadMonth] || 0) + 1;
  });

  return {
    ...documentStats,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    generatedAt: new Date().toISOString(),
  };
}

async function generateSkillsReport(db) {
  const employees = await db.collection("employees").find({}).toArray();

  const skillsStats = {};
  const departmentSkills = {};

  employees.forEach((emp) => {
    const dept = emp.department || "Unassigned";

    if (!departmentSkills[dept]) {
      departmentSkills[dept] = {};
    }

    if (emp.skills && emp.skills.length > 0) {
      emp.skills.forEach((skill) => {
        skillsStats[skill] = (skillsStats[skill] || 0) + 1;
        departmentSkills[dept][skill] =
          (departmentSkills[dept][skill] || 0) + 1;
      });
    }
  });

  const topSkills = Object.entries(skillsStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([skill, count]) => ({
      skill,
      count,
      percentage: ((count / employees.length) * 100).toFixed(1),
    }));

  return {
    totalUniqueSkills: Object.keys(skillsStats).length,
    topSkills,
    skillsByDepartment: departmentSkills,
    generatedAt: new Date().toISOString(),
  };
}

async function generateLocationReport(db) {
  const employees = await db.collection("employees").find({}).toArray();

  const locationStats = {};
  const departmentByLocation = {};

  employees.forEach((emp) => {
    const location = emp.workLocation || "Not specified";
    const dept = emp.department || "Unassigned";

    locationStats[location] = (locationStats[location] || 0) + 1;

    if (!departmentByLocation[location]) {
      departmentByLocation[location] = {};
    }
    departmentByLocation[location][dept] =
      (departmentByLocation[location][dept] || 0) + 1;
  });

  const locationBreakdown = Object.entries(locationStats).map(
    ([location, count]) => ({
      location,
      employeeCount: count,
      percentage: ((count / employees.length) * 100).toFixed(1),
      departments: departmentByLocation[location],
    })
  );

  return {
    totalLocations: Object.keys(locationStats).length,
    locationBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

async function generateCertificationReport(db) {
  const employees = await db.collection("employees").find({}).toArray();

  const certificationStats = {
    totalCertifications: 0,
    expiringSoon: 0,
    expired: 0,
    byInstitution: {},
    byEmployee: {},
    expiryTrend: {},
  };

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  employees.forEach((emp) => {
    if (emp.certifications && emp.certifications.length > 0) {
      const empName = emp.personalDetails.name;
      certificationStats.byEmployee[empName] = emp.certifications.length;

      emp.certifications.forEach((cert) => {
        certificationStats.totalCertifications++;

        const institution = cert.institution || "Unknown";
        certificationStats.byInstitution[institution] =
          (certificationStats.byInstitution[institution] || 0) + 1;

        if (cert.expiryDate) {
          const expiryDate = new Date(cert.expiryDate);
          const expiryMonth = expiryDate.toISOString().substring(0, 7);
          certificationStats.expiryTrend[expiryMonth] =
            (certificationStats.expiryTrend[expiryMonth] || 0) + 1;

          if (expiryDate < now) {
            certificationStats.expired++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            certificationStats.expiringSoon++;
          }
        }
      });
    }
  });

  return {
    ...certificationStats,
    generatedAt: new Date().toISOString(),
  };
}
