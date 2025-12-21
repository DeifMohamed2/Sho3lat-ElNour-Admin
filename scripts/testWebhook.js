// ZKTeco Webhook Simulator - For Testing Without Physical Device
// This simulates webhook calls from ZKTeco SenseFace devices

const axios = require('axios');

const SERVER_URL = 'http://localhost:8310';

// Simulate student attendance scan
async function simulateStudentScan(userId, scanType = 'Check In') {
  try {
    const now = new Date();
    const dateTime = now.toISOString().replace('T', ' ').substring(0, 19);

    // ZKTeco format: UserID, DateTime, Status, Verify (tab-separated)
    // Status: 0 = Check In, 1 = Check Out
    // Verify: 15 = Face Recognition
    const statusCode = scanType === 'Check In' ? '0' : '1';
    const webhookData = `${userId}\t${dateTime}\t${statusCode}\t15`;

    console.log(`\n📤 Simulating ${scanType} for Student ID: ${userId}`);
    console.log(`   Time: ${dateTime}`);
    console.log(`   Data: ${webhookData}\n`);

    const response = await axios.post(
      `${SERVER_URL}/webhook/zkteco/cdata?SN=SIMULATOR-001`,
      webhookData,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );

    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Simulate employee attendance scan
async function simulateEmployeeScan(userId, scanType = 'Check In') {
  try {
    const now = new Date();
    const dateTime = now.toISOString().replace('T', ' ').substring(0, 19);

    const statusCode = scanType === 'Check In' ? '0' : '1';
    const webhookData = `${userId}\t${dateTime}\t${statusCode}\t15`;

    console.log(`\n📤 Simulating ${scanType} for Employee ID: ${userId}`);
    console.log(`   Time: ${dateTime}`);
    console.log(`   Data: ${webhookData}\n`);

    const response = await axios.post(
      `${SERVER_URL}/webhook/zkteco/cdata?SN=SIMULATOR-001`,
      webhookData,
      {
        headers: {
          'Content-Type': 'text/plain',
        },
      }
    );

    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Simulate a full day scenario
async function simulateFullDay() {
  console.log('\n🎬 Simulating Full Day Attendance Scenario...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Morning - Students arrive
  console.log('📅 MORNING - Students Arriving\n');
  await simulateStudentScan('1001', 'Check In'); // On time
  await sleep(1000);
  await simulateStudentScan('1002', 'Check In'); // On time
  await sleep(1000);
  await simulateStudentScan('1003', 'Check In'); // Late (if after 8:15)

  await sleep(2000);

  // Morning - Employees arrive
  console.log('\n📅 MORNING - Employees Arriving\n');
  await simulateEmployeeScan('2001', 'Check In');
  await sleep(1000);
  await simulateEmployeeScan('2002', 'Check In');

  await sleep(2000);

  // Afternoon - Students leave
  console.log('\n📅 AFTERNOON - Students Leaving\n');
  await simulateStudentScan('1001', 'Check Out');
  await sleep(1000);
  await simulateStudentScan('1002', 'Check Out');
  await sleep(1000);
  await simulateStudentScan('1003', 'Check Out');

  await sleep(2000);

  // Evening - Employees leave
  console.log('\n📅 EVENING - Employees Leaving\n');
  await simulateEmployeeScan('2001', 'Check Out');
  await sleep(1000);
  await simulateEmployeeScan('2002', 'Check Out');

  console.log('\n✅ Full day simulation complete!');
  console.log('\n💡 Check server logs and database for results\n');
}

// Helper function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Menu
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('\n🔧 ZKTeco Webhook Simulator\n');
  console.log('Usage:');
  console.log('  node testWebhook.js student <userId> [in|out]');
  console.log('  node testWebhook.js employee <userId> [in|out]');
  console.log('  node testWebhook.js fullday');
  console.log('\nExamples:');
  console.log('  node testWebhook.js student 1001 in');
  console.log('  node testWebhook.js employee 2001 out');
  console.log('  node testWebhook.js fullday\n');
  console.log('⚠️  Note: Make sure server is running on port 8310\n');
  process.exit(0);
}

const command = args[0];

if (command === 'fullday') {
  simulateFullDay();
} else if (command === 'student') {
  const userId = args[1];
  const scanType = args[2] === 'out' ? 'Check Out' : 'Check In';
  if (!userId) {
    console.error('❌ Error: Please provide user ID');
    process.exit(1);
  }
  simulateStudentScan(userId, scanType);
} else if (command === 'employee') {
  const userId = args[1];
  const scanType = args[2] === 'out' ? 'Check Out' : 'Check In';
  if (!userId) {
    console.error('❌ Error: Please provide user ID');
    process.exit(1);
  }
  simulateEmployeeScan(userId, scanType);
} else {
  console.error('❌ Unknown command:', command);
  console.log('Run without arguments to see usage');
  process.exit(1);
}
