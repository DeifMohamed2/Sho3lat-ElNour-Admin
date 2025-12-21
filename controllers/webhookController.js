// controllers/webhookController.js

const Student = require('../models/student');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const EmployeeAttendance = require('../models/employeeAttendance');
const { parseToEgyptTime, getEgyptDayBoundaries, formatEgyptDate } = require('../utils/timezone');

/* =======================
   DEVICE PING
======================= */
exports.handleZKTecoPing = (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  console.log(`✓ ZKTeco ping from ${sn}`);
  res.status(200).send('OK');
};

/* =======================
   DEVICE REGISTRY
======================= */
exports.handleZKTecoRegistry = (req, res) => {
  const sn = req.query.SN || 'UNKNOWN';
  console.log(`📋 ZKTeco registry from ${sn}`);
  res.status(200).send('OK');
};

/* =======================
   ATTENDANCE HANDLER
======================= */
exports.handleZKTecoAttendance = async (req, res) => {
  res.status(200).send('OK'); // VERY IMPORTANT

  try {
    const table = req.query.table;
    const deviceSN = req.query.SN || 'UNKNOWN';
    const stamp = req.query.Stamp;

    // Debug: Print all query parameters
    console.log(`\n🔍 REQUEST DETAILS:`);
    console.log(`Method: ${req.method}`);
    console.log(`Query Params:`, req.query);
    console.log(`Body Type: ${typeof req.body}`);
    console.log(`Body Length: ${req.body ? req.body.length : 0}`);

    // 1️⃣ Ignore handshake requests
    if (stamp === '9999' && !req.body) {
      console.log(`🔌 Handshake from ${deviceSN}`);
      return;
    }
    if (table && table !== 'ATTLOG') {
      console.log(`⏭️  Skipping table: ${table} (not ATTLOG)`);
      return;
    }

    // 2️⃣ Debug: Print raw body to understand format
    if (req.body) {
      console.log(`\n🔍 RAW BODY RECEIVED:`);
      console.log(`Content: "${req.body}"`);
      // Show hex dump for debugging if needed
      if (req.body.length < 200) {
        console.log(`Hex: ${Buffer.from(req.body).toString('hex')}`);
      }
    } else {
      console.log(`⚠️  No body received`);
    }

    // 3️⃣ Parse ZKTeco ATTLOG format
    // Format: PIN\tDateTime\tStatus\tVerify (tab-separated)
    // Alternative: PIN=value\nDateTime=value (key=value)
    let userId = null;
    let dateTime = null;
    let status = null;
    let verify = '15';

    if (typeof req.body === 'string' && req.body.trim()) {
      const lines = req.body.split('\n').filter(line => line.trim());
      
      console.log(`\n📝 Parsing ${lines.length} line(s):`);
      
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        console.log(`  Line ${i + 1}: "${trimmedLine}"`);
        
        // Try tab-separated format (ZKTeco standard: PIN\tDateTime\tStatus\tVerify)
        if (trimmedLine.includes('\t')) {
          const parts = trimmedLine.split('\t');
          console.log(`  → Tab-separated format detected (${parts.length} parts)`);
          if (parts.length >= 2) {
            userId = parts[0].trim();
            dateTime = parts[1].trim();
            status = parts[2]?.trim() || null;
            verify = parts[3]?.trim() || '15';
            console.log(`  → Parsed: PIN=${userId}, DateTime=${dateTime}, Status=${status}, Verify=${verify}`);
            break;
          }
        }
        
        // Try key=value format (fallback)
        if (trimmedLine.includes('=')) {
          const equalIndex = trimmedLine.indexOf('=');
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          
          console.log(`  → Key=value format: ${key}=${value}`);
          
          if (key === 'PIN' || key === 'ID') {
            userId = value;
          } else if (key === 'DateTime' || key === 'Time') {
            dateTime = value;
          } else if (key === 'Verify') {
            verify = value;
          } else if (key === 'Status') {
            status = value;
          }
        }
      }
      
      // Also try parsing as single line with spaces (some devices send: "PIN DateTime Status Verify")
      if (!userId && !dateTime && lines.length > 0) {
        const firstLine = lines[0].trim();
        // Check if it looks like space-separated values
        if (firstLine.match(/^\d+\s+\d{4}-\d{2}-\d{2}/)) {
          const parts = firstLine.split(/\s+/);
          if (parts.length >= 2) {
            userId = parts[0];
            dateTime = parts.slice(1, 3).join(' ') + ' ' + (parts[3] || '00:00:00');
            console.log(`  → Space-separated format detected: PIN=${userId}, DateTime=${dateTime}`);
          }
        }
      }
    }

    // 4️⃣ Print ID clearly in console
    if (userId) {
      console.log(`\n🎯 ZKTeco ID RECEIVED: ${userId}`);
    } else {
      console.log(`\n⚠️  NO ID FOUND IN REQUEST`);
      console.log(`Body: ${JSON.stringify(req.body)}`);
      return;
    }

    if (!dateTime) {
      console.log(`⚠️  NO DATETIME FOUND IN REQUEST`);
      return;
    }

    // 5️⃣ Parse datetime to Egypt timezone (format: YYYY-MM-DD HH:MM:SS)
    let scanTime;
    try {
      // ZKTeco format: "2025-01-24 14:30:00"
      // Parse assuming time from device is in Egypt timezone
      scanTime = parseToEgyptTime(dateTime);
      if (isNaN(scanTime.getTime())) {
        console.log(`⚠️  Could not parse datetime: ${dateTime}`);
        return;
      }
    } catch (err) {
      console.log(`⚠️  Datetime parse error: ${err.message}`);
      return;
    }

    const verifyMap = {
      '0': 'Password',
      '1': 'Fingerprint',
      '2': 'RF Card',
      '4': 'Card',
      '8': 'Voice',
      '15': 'Face',
      '16': 'Face+Password',
      '17': 'Face+Fingerprint',
    };

    console.log(`
📥 ATTENDANCE RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Device SN: ${deviceSN}
👤 User ID: ${userId}
🕐 DateTime: ${dateTime}
⏰ Parsed Time (Egypt): ${formatEgyptDate(scanTime)}
🔐 Method: ${verifyMap[verify] || 'Unknown'} (${verify})
${status ? `📊 Status: ${status}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    // Get day boundaries in Egypt timezone
    const { start: today } = getEgyptDayBoundaries(scanTime);
    const scanHour = scanTime.getHours(); // Hour in Egypt timezone
    const scanMinute = scanTime.getMinutes(); // Minute in Egypt timezone
    const isAfter3PM = scanHour >= 15;

    // 6️⃣ Try to find Student by studentCode
    // ZKTeco device sends student code as user ID
    const student = await Student.findOne({
      studentCode: userId.toString(),
    }).populate('class');

    if (student) {
      console.log(`✅ Found Student: ${student.studentName} (Code: ${student.studentCode})`);
      return handleStudent(student, scanTime, today, isAfter3PM, deviceSN);
    }

    // 7️⃣ Try to find Employee by employeeCode
    // ZKTeco device sends employee code as user ID
    const employee = await Employee.findOne({
      employeeCode: userId.toString(),
      isActive: true,
    });

    if (employee) {
      console.log(`✅ Found Employee: ${employee.employeeName} (Code: ${employee.employeeCode})`);
      const verifyMethodMap = {
        '0': 'Password',
        '1': 'Fingerprint',
        '2': 'RFID Card',
        '4': 'RFID Card',
        '8': 'Face Recognition',
        '15': 'Face Recognition',
        '16': 'Face Recognition',
        '17': 'Face Recognition',
      };
      const verifyMethod = verifyMethodMap[verify] || 'Fingerprint';
      return handleEmployee(employee, scanTime, today, isAfter3PM, deviceSN, verifyMethod);
    }

    // 8️⃣ Not found in either students or employees
    console.log(`\n⚠️  Unknown ZKTeco user ID: ${userId}`);
    console.log(`   Searched in:`);
    console.log(`   - Students by studentCode`);
    console.log(`   - Employees by employeeCode`);
    console.log(`   Please check if this user ID (${userId}) matches a student or employee code`);
    
    // Try to find any student or employee with this code for debugging (including inactive)
    const debugStudent = await Student.findOne({ studentCode: userId.toString() });
    const debugEmployee = await Employee.findOne({ employeeCode: userId.toString() });
    
    if (debugStudent && !debugStudent.isActive) {
      console.log(`   ⚠️  Found inactive student: ${debugStudent.studentName} (Code: ${debugStudent.studentCode})`);
    }
    if (debugEmployee && !debugEmployee.isActive) {
      console.log(`   ⚠️  Found inactive employee: ${debugEmployee.employeeName} (Code: ${debugEmployee.employeeCode})`);
    }
  } catch (err) {
    console.error('❌ ZKTeco error:', err);
    console.error('Stack:', err.stack);
  }
};

/* =======================
   STUDENT LOGIC
======================= */
async function handleStudent(student, scanTime, today, isAfter3PM, deviceSN) {
  let record = await Attendance.findOne({
    student: student._id,
    date: today,
  });

  if (!record) {
    record = await Attendance.create({
      student: student._id,
      class: student.class?._id,
      date: today,
      status: isAfter3PM ? 'Late' : 'Present',
      entryTime: scanTime,
      deviceSN,
      isAutomated: true,
    });
    console.log('✅ Student check-in');
  } else if (isAfter3PM && !record.exitTime) {
    record.exitTime = scanTime;
    await record.save();
    console.log('✅ Student check-out');
  }
}

/* =======================
   EMPLOYEE LOGIC
======================= */
async function handleEmployee(employee, scanTime, today, isAfter3PM, deviceSN, verifyMethod = 'Fingerprint') {
  let record = await EmployeeAttendance.findOne({
    employee: employee._id,
    date: today,
  });

  const scanHour = scanTime.getHours();
  const scanMinute = scanTime.getMinutes();
  
  // Determine scan type: Check In (before 3PM) or Check Out (after 3PM)
  const scanType = isAfter3PM ? 'Check Out' : 'Check In';

  // Determine if employee is late (work starts at 8:00 AM, late after 8:15 AM)
  // Only applies to check-ins before 3PM
  const workStartHour = 8;
  const workStartMinute = 15;
  const isLate = !isAfter3PM && (scanHour > workStartHour || (scanHour === workStartHour && scanMinute > workStartMinute));

  if (!record) {
    // Create new attendance record (first scan of the day)
    const initialStatus = isLate ? 'Late' : 'Present';
    
    record = await EmployeeAttendance.create({
      employee: employee._id,
      date: today,
      checkInTime: isAfter3PM ? null : scanTime, // Only set if it's a check-in
      checkOutTime: isAfter3PM ? scanTime : null, // Only set if it's a check-out (edge case)
      status: initialStatus,
      scans: [{
        scanTime: scanTime,
        scanType: scanType,
        verifyMethod: verifyMethod,
        deviceSN: deviceSN,
      }],
      deviceSN,
      isAutomated: true,
    });
    console.log(`✅ Employee ${scanType.toLowerCase()}: ${employee.employeeName}${isLate ? ' (Late)' : ' (Present)'}`);
  } else {
    // Update existing record - add scan to scans array
    record.scans.push({
      scanTime: scanTime,
      scanType: scanType,
      verifyMethod: verifyMethod,
      deviceSN: deviceSN,
    });

    // Update check-in/check-out times (only first of each type)
    if (!isAfter3PM && !record.checkInTime) {
      // First check-in of the day
      record.checkInTime = scanTime;
      
      // Update status if late (only set Late on first check-in)
      if (isLate) {
        record.status = 'Late';
      }
      console.log(`✅ Employee check-in: ${employee.employeeName}${isLate ? ' (Late)' : ' (Present)'}`);
    } else if (isAfter3PM && !record.checkOutTime) {
      // First check-out of the day
      record.checkOutTime = scanTime;
      
      // Recalculate totalHours after setting checkOutTime
      if (record.checkInTime && record.checkOutTime) {
        const diffMs = record.checkOutTime.getTime() - record.checkInTime.getTime();
        record.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        if (record.totalHours < 0) record.totalHours = 0;
      }
      
      console.log(`✅ Employee check-out: ${employee.employeeName}`);
    } else {
      // Additional scan (multiple entries/exits)
      console.log(`✅ Employee additional ${scanType.toLowerCase()}: ${employee.employeeName}`);
    }

    await record.save();
  }
}
