// controllers/webhookController.js

const Student = require('../models/student');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const EmployeeAttendance = require('../models/employeeAttendance');

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

    // 5️⃣ Parse datetime (format: YYYY-MM-DD HH:MM:SS)
    let scanTime;
    try {
      // ZKTeco format: "2025-01-24 14:30:00"
      scanTime = new Date(dateTime.replace(' ', 'T'));
      if (isNaN(scanTime.getTime())) {
        // Try alternative format
        scanTime = new Date(dateTime);
        if (isNaN(scanTime.getTime())) {
          console.log(`⚠️  Could not parse datetime: ${dateTime}`);
          return;
        }
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
⏰ Parsed Time: ${scanTime.toISOString()}
🔐 Method: ${verifyMap[verify] || 'Unknown'} (${verify})
${status ? `📊 Status: ${status}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

    const today = new Date(scanTime);
    today.setHours(0, 0, 0, 0);

    const isAfter3PM = scanTime.getHours() >= 15;

    // 6️⃣ Try to find Student
    const student = await Student.findOne({
      zktecoUserId: userId.toString(),
      isActive: true,
    }).populate('class');

    if (student) {
      console.log(`✅ Found Student: ${student.studentName} (Code: ${student.studentCode})`);
      return handleStudent(student, scanTime, today, isAfter3PM, deviceSN);
    }

    // 7️⃣ Try to find Employee
    const employee = await Employee.findOne({
      zktecoUserId: userId.toString(),
      isActive: true,
    });

    if (employee) {
      console.log(`✅ Found Employee: ${employee.employeeName} (Code: ${employee.employeeCode})`);
      return handleEmployee(employee, scanTime, today, isAfter3PM, deviceSN);
    }

    console.log(`⚠️  Unknown ZKTeco user ID: ${userId}`);
    console.log(`   Please check if this user ID is assigned to a student or employee`);
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
async function handleEmployee(employee, scanTime, today, isAfter3PM, deviceSN) {
  let record = await EmployeeAttendance.findOne({
    employee: employee._id,
    date: today,
  });

  if (!record) {
    record = await EmployeeAttendance.create({
      employee: employee._id,
      date: today,
      checkInTime: scanTime,
      deviceSN,
      isAutomated: true,
    });
    console.log('✅ Employee check-in');
  } else if (isAfter3PM && !record.checkOutTime) {
    record.checkOutTime = scanTime;
    await record.save();
    console.log('✅ Employee check-out');
  }
}
