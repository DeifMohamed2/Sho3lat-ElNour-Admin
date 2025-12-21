const Student = require('../models/student');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const EmployeeAttendance = require('../models/employeeAttendance');

/**
 * ZKTeco Webhook Controller
 * Handles automatic attendance tracking from ZKTeco devices
 */

// Handle device ping/health check (ZKTeco getrequest)
const handleZKTecoPing = (req, res) => {
  const deviceSN = req.query.SN || req.query.sn || 'Unknown';
  console.log(`✓ ZKTeco device ping from: ${deviceSN}`);
  // ZKTeco expects "OK" response
  res.status(200).send('OK');
};

// Handle device registry (ZKTeco device registration)
const handleZKTecoRegistry = (req, res) => {
  const deviceSN = req.query.SN || req.body.SN || 'Unknown';
  console.log(`📋 ZKTeco device registry from: ${deviceSN}`);
  console.log('   Registry data:', req.query, req.body);
  // ZKTeco expects "OK" response
  res.status(200).send('OK');
};

/**
 * Main webhook handler for ZKTeco Push Protocol (ADMS)
 * Receives data automatically from ZKTeco devices when someone scans
 * 
 * ZKTeco Push Protocol Format:
 * - Query params: SN=DeviceSN&table=ATTLOG
 * - Body/Form data: ID=UserID&DateTime=2025-01-20 10:35:22&Verify=Face
 * - Or raw text: SN=CF9xxxx\ntable=ATTLOG\nID=12\nDateTime=2025-01-20 10:35:22\nVerify=Face
 */
const handleZKTecoAttendance = async (req, res) => {
  try {
    // Always respond quickly with "OK" - ZKTeco devices require this
    res.status(200).send('OK');

    // Parse incoming data from ZKTeco Push Protocol
    let userId, dateTime, verifyMethod, deviceSN, table;

    // Get device serial number from query params (most common)
    deviceSN = req.query.SN || req.query.sn || 'Unknown';
    table = req.query.table || req.query.Table || 'ATTLOG';

    // ZKTeco sends data in different formats
    // Format 1: Query parameters + Form data
    if (req.body && typeof req.body === 'object') {
      userId = req.body.ID || req.body.id || req.body.PIN || req.body.pin || req.body.UserID;
      dateTime = req.body.DateTime || req.body.datetime || req.body.Date || req.body.date;
      verifyMethod = req.body.Verify || req.body.verify || req.body.VerifyType || 'Face';
    }
    
    // Format 2: Raw text format (line-separated)
    if (!userId && req.body && typeof req.body === 'string') {
      const lines = req.body.split('\n');
      const data = {};
      
      lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          data[key] = value;
        }
      });
      
      userId = data.ID || data.id || data.PIN;
      dateTime = data.DateTime || data.datetime;
      verifyMethod = data.Verify || data.verify || 'Face';
      deviceSN = data.SN || data.sn || deviceSN;
    }

    // Format 3: URL-encoded form data
    if (!userId && req.query.ID) {
      userId = req.query.ID || req.query.id || req.query.PIN;
      dateTime = req.query.DateTime || req.query.datetime;
      verifyMethod = req.query.Verify || req.query.verify || 'Face';
    }

    // Validate required fields
    if (!userId || !dateTime) {
      console.log('⚠ Invalid ZKTeco data - missing userId or dateTime');
      console.log('   Received data:', { 
        query: req.query, 
        body: req.body,
        headers: req.headers['content-type']
      });
      return;
    }

    // Parse date (ZKTeco format: "2025-01-20 10:35:22")
    let scanTime;
    try {
      // Try parsing ZKTeco date format
      scanTime = new Date(dateTime.replace(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, '$1-$2-$3T$4:$5:$6'));
      if (isNaN(scanTime.getTime())) {
        scanTime = new Date(dateTime);
      }
    } catch (e) {
      scanTime = new Date(dateTime);
    }
    
    if (isNaN(scanTime.getTime())) {
      console.log(`⚠ Invalid date format: ${dateTime}`);
      return;
    }

    // Map verification method (ZKTeco format)
    const verifyMethodMap = {
      '0': 'Password',
      '1': 'Fingerprint',
      '4': 'RFID Card',
      '15': 'Face Recognition',
      'Face': 'Face Recognition',
      'Finger': 'Fingerprint',
      'Card': 'RFID Card',
      'Password': 'Password',
    };
    const verificationMethod = verifyMethodMap[verifyMethod] || verifyMethod || 'Face Recognition';

    console.log(`\n📥 ZKTeco Push Received:`);
    console.log(`   Device SN: ${deviceSN}`);
    console.log(`   Table: ${table}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Time: ${scanTime.toLocaleString('ar-EG')}`);
    console.log(`   Method: ${verificationMethod}`);

    // Determine if scan is check-in or check-out based on time
    // Before 3 PM (15:00) = Check In (حضور)
    // After 3 PM (15:00) = Check Out (انصراف) if already checked in
    const scanHour = scanTime.getHours();
    const scanMinute = scanTime.getMinutes();
    const isAfter3PM = scanHour >= 15; // 3 PM = 15:00

    // Get today's date (normalized to start of day)
    const today = new Date(scanTime);
    today.setHours(0, 0, 0, 0);

    // Check if user is a student or employee
    const student = await Student.findOne({ 
      zktecoUserId: userId.toString(),
      isActive: true 
    }).populate('class');

    if (student) {
      await handleStudentAttendance(student, scanTime, today, isAfter3PM, verificationMethod, deviceSN);
      return;
    }

    const employee = await Employee.findOne({ 
      zktecoUserId: userId.toString(),
      isActive: true 
    });

    if (employee) {
      await handleEmployeeAttendance(employee, scanTime, today, isAfter3PM, verificationMethod, deviceSN);
      return;
    }

    console.log(`⚠ User ID ${userId} not found in system (Student or Employee)`);

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
  }
};

/**
 * Handle student attendance
 */
const handleStudentAttendance = async (student, scanTime, today, isAfter3PM, verifyMethod, deviceSN) => {
  try {
    console.log(`\n🎓 Processing STUDENT attendance:`);
    console.log(`   Name: ${student.studentName}`);
    console.log(`   Code: ${student.studentCode}`);
    console.log(`   Class: ${student.class?.className || 'N/A'}`);

    // Check if attendance record exists for today
    let attendance = await Attendance.findOne({
      student: student._id,
      date: today,
    });

    if (!attendance) {
      // First scan of the day - Create new attendance record
      const status = isAfter3PM ? 'Late' : 'Present';
      
      attendance = new Attendance({
        student: student._id,
        class: student.class._id,
        date: today,
        status: status,
        entryTime: scanTime,
        exitTime: isAfter3PM ? scanTime : null,
        verifyMethod: verifyMethod,
        deviceSN: deviceSN,
        isAutomated: true,
        notes: isAfter3PM ? 'Late arrival' : 'Automated entry',
      });

      await attendance.save();
      console.log(`✅ Created attendance record - ${isAfter3PM ? 'Late Entry' : 'Entry'}`);
    } else {
      // Attendance record exists - Update exit time if after 3 PM
      if (isAfter3PM && !attendance.exitTime) {
        attendance.exitTime = scanTime;
        attendance.status = attendance.status === 'Present' ? 'Present' : attendance.status;
        attendance.notes = attendance.notes ? `${attendance.notes} | Exit recorded` : 'Exit recorded';
        await attendance.save();
        console.log(`✅ Updated attendance - Exit recorded`);
      } else if (!isAfter3PM && !attendance.entryTime) {
        // Entry time missing, update it
        attendance.entryTime = scanTime;
        attendance.status = 'Present';
        await attendance.save();
        console.log(`✅ Updated attendance - Entry recorded`);
      } else {
        console.log(`ℹ️  Attendance already recorded for today`);
      }
    }

    console.log(`✅ Student attendance processed successfully\n`);

  } catch (error) {
    console.error(`❌ Error processing student attendance:`, error);
  }
};

/**
 * Handle employee attendance
 */
const handleEmployeeAttendance = async (employee, scanTime, today, isAfter3PM, verifyMethod, deviceSN) => {
  try {
    console.log(`\n👤 Processing EMPLOYEE attendance:`);
    console.log(`   Name: ${employee.employeeName}`);
    console.log(`   Code: ${employee.employeeCode}`);

    // Check if attendance record exists for today
    let attendance = await EmployeeAttendance.findOne({
      employee: employee._id,
      date: today,
    });

    if (!attendance) {
      // First scan of the day - Create new attendance record
      attendance = new EmployeeAttendance({
        employee: employee._id,
        date: today,
        checkInTime: scanTime,
        checkOutTime: isAfter3PM ? scanTime : null,
        scans: [{
          scanTime: scanTime,
          scanType: isAfter3PM ? 'Check Out' : 'Check In',
          verifyMethod: verifyMethod,
          deviceSN: deviceSN,
        }],
        status: isAfter3PM ? 'Half-Day' : 'Present',
        isAutomated: true,
        notes: isAfter3PM ? 'Late check-in' : 'Automated check-in',
      });

      await attendance.save();
      console.log(`✅ Created attendance record - ${isAfter3PM ? 'Late Check-In' : 'Check-In'}`);
    } else {
      // Attendance record exists
      if (isAfter3PM && !attendance.checkOutTime) {
        // Check-out after 3 PM
        attendance.checkOutTime = scanTime;
        attendance.scans.push({
          scanTime: scanTime,
          scanType: 'Check Out',
          verifyMethod: verifyMethod,
          deviceSN: deviceSN,
        });
        
        // Recalculate total hours
        if (attendance.checkInTime) {
          const diffMs = attendance.checkOutTime - attendance.checkInTime;
          attendance.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        }
        
        await attendance.save();
        console.log(`✅ Updated attendance - Check-Out recorded (Total hours: ${attendance.totalHours})`);
      } else if (!isAfter3PM && !attendance.checkInTime) {
        // Check-in before 3 PM (missing check-in)
        attendance.checkInTime = scanTime;
        attendance.status = 'Present';
        attendance.scans.push({
          scanTime: scanTime,
          scanType: 'Check In',
          verifyMethod: verifyMethod,
          deviceSN: deviceSN,
        });
        await attendance.save();
        console.log(`✅ Updated attendance - Check-In recorded`);
      } else if (!isAfter3PM) {
        // Additional check-in (e.g., after lunch break)
        attendance.scans.push({
          scanTime: scanTime,
          scanType: 'Check In',
          verifyMethod: verifyMethod,
          deviceSN: deviceSN,
        });
        await attendance.save();
        console.log(`✅ Added additional Check-In scan`);
      } else {
        // Additional check-out
        attendance.scans.push({
          scanTime: scanTime,
          scanType: 'Check Out',
          verifyMethod: verifyMethod,
          deviceSN: deviceSN,
        });
        await attendance.save();
        console.log(`✅ Added additional Check-Out scan`);
      }
    }

    console.log(`✅ Employee attendance processed successfully\n`);

  } catch (error) {
    console.error(`❌ Error processing employee attendance:`, error);
  }
};

module.exports = {
  handleZKTecoAttendance,
  handleZKTecoPing,
  handleZKTecoRegistry,
};

