// Test script for overdue payment functionality
const API_BASE = 'http://localhost:3000/api';

async function testOverduePayments() {
  console.log('🧪 Testing Overdue Payment Functionality\n');

  try {
    // Test 1: Get overdue payments summary across all projects
    console.log('📊 Test 1: Getting overdue payments summary...');
    const summaryResponse = await fetch(`${API_BASE}/cron/check-overdue-payments`);
    const summaryData = await summaryResponse.json();
    
    console.log('Summary Response:', JSON.stringify(summaryData, null, 2));
    console.log('✅ Summary test completed\n');

    // Test 2: Run overdue check cron job
    console.log('🔄 Test 2: Running overdue check cron job...');
    const cronResponse = await fetch(`${API_BASE}/cron/check-overdue-payments`, {
      method: 'POST'
    });
    const cronData = await cronResponse.json();
    
    console.log('Cron Job Response:', JSON.stringify(cronData, null, 2));
    console.log('✅ Cron job test completed\n');

    // Test 3: Check specific project (if any projects exist)
    if (summaryData.success && summaryData.projects && summaryData.projects.length > 0) {
      const projectId = summaryData.projects[0].projectId;
      console.log(`🎯 Test 3: Checking specific project (${projectId})...`);
      
      // Manual overdue check for specific project
      const projectCheckResponse = await fetch(
        `${API_BASE}/projects/${projectId}/income?action=check-overdue`,
        { method: 'PATCH' }
      );
      const projectCheckData = await projectCheckResponse.json();
      
      console.log('Project Check Response:', JSON.stringify(projectCheckData, null, 2));
      console.log('✅ Project-specific test completed\n');

      // Get income data to see updated statuses
      console.log('📋 Test 4: Getting updated income data...');
      const incomeResponse = await fetch(`${API_BASE}/projects/${projectId}/income`);
      const incomeData = await incomeResponse.json();
      
      console.log('Income Data Response:', JSON.stringify(incomeData, null, 2));
      console.log('✅ Income data test completed\n');
    } else {
      console.log('⚠️  No projects found for project-specific testing\n');
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testOverduePayments();