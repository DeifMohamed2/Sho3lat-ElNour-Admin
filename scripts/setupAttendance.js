// Quick Setup Script for Automated Attendance System
// Run this to create sample data for testing

require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/student');
const Employee = require('./models/employee');
const Class = require('./models/class');

const dbURI = 'mongodb://localhost:27017/sho3latElnour';

async function setupAttendanceSystem() {
  try {
    await mongoose.connect(dbURI);

    console.log('\n✅ Connected to database\n');

    // Create sample class if it doesn't exist
    let sampleClass = await Class.findOne({ className: 'Sample Class A' });

    if (!sampleClass) {
      sampleClass = new Class({
        className: 'Sample Class A',
        academicLevel: 'Year 1',
        section: 'A',
        capacity: 30,
        isActive: true,
      });
      await sampleClass.save();
      console.log('✅ Created sample class: Sample Class A');
    }

    console.log('\n📋 Instructions for ZKTeco Device Setup:\n');
    console.log('1. Configure your ZKTeco SenseFace device:');
    console.log('   - Set Device Type: T&A PUSH (not Access Control)');
    console.log('   - Push Server IP: YOUR_SERVER_IP');
    console.log('   - Push Server Port: 8310');
    console.log('   - Push Endpoint: /webhook/zkteco/cdata\n');

    console.log('2. To assign ZKTeco User IDs to students:');
    console.log('   a) Get student ID from admin panel');
    console.log('   b) Send PUT request:');
    console.log('      PUT /admin/assign-student-zkteco-id/:studentId');
    console.log('      Body: { "zktecoUserId": "1001" }\n');

    console.log('3. To assign ZKTeco User IDs to employees:');
    console.log('   a) Get employee ID from admin panel');
    console.log('   b) Send PUT request:');
    console.log('      PUT /admin/assign-employee-zkteco-id/:employeeId');
    console.log('      Body: { "zktecoUserId": "2001" }\n');

    console.log('4. Register User IDs in ZKTeco device with face scans\n');

    console.log('5. Test attendance by scanning face at device\n');

    console.log('6. Check server console logs for:');
    console.log('   🎓 Processing STUDENT attendance');
    console.log('   👔 Processing EMPLOYEE attendance\n');

    console.log('7. View reports via API:');
    console.log('   GET /admin/daily-class-attendance?date=YYYY-MM-DD');
    console.log('   GET /admin/employee-attendance-report\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📚 Full documentation: AUTOMATED_ATTENDANCE_SYSTEM.md\n');
    console.log('🚀 System is ready! Start your server with: node app.js\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupAttendanceSystem();
