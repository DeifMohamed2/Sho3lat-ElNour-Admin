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

    // 1️⃣ Ignore handshake requests
    if (req.query.Stamp === '9999' && !req.body) return;
    if (table && table !== 'ATTLOG') return;

    // 2️⃣ Parse RAW TEXT
    let data = {};
    if (typeof req.body === 'string') {
      req.body.split('\n').forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) data[k.trim()] = v.trim();
      });
    }

    const userId = data.PIN || data.ID;
    const dateTime = data.DateTime;
    const verify = data.Verify || '15';

    if (!userId || !dateTime) return;

    const scanTime = new Date(dateTime.replace(' ', 'T'));
    if (isNaN(scanTime.getTime())) return;

    const verifyMap = {
      '1': 'Fingerprint',
      '4': 'Card',
      '15': 'Face',
    };

    console.log(`
📥 ATTENDANCE RECEIVED
SN: ${deviceSN}
USER: ${userId}
TIME: ${scanTime}
METHOD: ${verifyMap[verify] || 'Unknown'}
`);

    const today = new Date(scanTime);
    today.setHours(0, 0, 0, 0);

    const isAfter3PM = scanTime.getHours() >= 15;

    // 3️⃣ Student
    const student = await Student.findOne({
      zktecoUserId: userId.toString(),
      isActive: true,
    }).populate('class');

    if (student) {
      return handleStudent(student, scanTime, today, isAfter3PM, deviceSN);
    }

    // 4️⃣ Employee
    const employee = await Employee.findOne({
      zktecoUserId: userId.toString(),
      isActive: true,
    });

    if (employee) {
      return handleEmployee(employee, scanTime, today, isAfter3PM, deviceSN);
    }

    console.log(`⚠ Unknown ZKTeco user: ${userId}`);
  } catch (err) {
    console.error('❌ ZKTeco error:', err);
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
