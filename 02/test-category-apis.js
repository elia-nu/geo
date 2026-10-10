// Test script for category management APIs
// Run with: node test-category-apis.js

const BASE_URL = "http://localhost:3000/api";

async function testAPI(endpoint, method = "GET", data = null) {
  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();

    console.log(`${method} ${endpoint}:`, response.status, result);
    return result;
  } catch (error) {
    console.error(`Error testing ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log("🧪 Testing Category Management APIs...\n");

  // Test Project Categories
  console.log("📁 Testing Project Categories:");
  const projectCategory = await testAPI("/project-categories", "POST", {
    name: "Web Development",
    description: "Web application development projects",
    status: "active",
  });

  if (projectCategory?.success) {
    const categoryId = projectCategory.category._id;
    await testAPI(`/project-categories/${categoryId}`, "GET");
    await testAPI(`/project-categories/${categoryId}`, "PUT", {
      name: "Web Development - Updated",
      description: "Updated description",
    });
  }

  // Test Task Categories
  console.log("\n✅ Testing Task Categories:");
  const taskCategory = await testAPI("/task-categories", "POST", {
    name: "Frontend Development",
    description: "Frontend development tasks",
    status: "active",
  });

  if (taskCategory?.success) {
    const categoryId = taskCategory.category._id;
    await testAPI(`/task-categories/${categoryId}`, "GET");
  }

  // Test Budget Allocation Categories
  console.log("\n💰 Testing Budget Allocation Categories:");
  const budgetCategory = await testAPI(
    "/budget-allocation-categories",
    "POST",
    {
      name: "Development Tools",
      description: "Software and development tools budget",
      status: "active",
    }
  );

  if (budgetCategory?.success) {
    const categoryId = budgetCategory.category._id;
    await testAPI(`/budget-allocation-categories/${categoryId}`, "GET");
  }

  // Test Income Categories
  console.log("\n📈 Testing Income Categories:");
  const incomeCategory = await testAPI("/income-categories", "POST", {
    name: "Client Payments",
    description: "Payments received from clients",
    status: "active",
  });

  if (incomeCategory?.success) {
    const categoryId = incomeCategory.category._id;
    await testAPI(`/income-categories/${categoryId}`, "GET");
  }

  // Test listing all categories
  console.log("\n📋 Testing Category Lists:");
  await testAPI("/project-categories");
  await testAPI("/task-categories");
  await testAPI("/budget-allocation-categories");
  await testAPI("/income-categories");

  console.log("\n✅ All tests completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAPI, runTests };
