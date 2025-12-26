// Automated Attendance Service - ZKTeco SenseFace Integration
// Handles webhook processing for students and employees

const Student = require('../models/student');
const Employee = require('../models/employee');
const Attendance = require('../models/attendance');
const EmployeeAttendance = require('../models/employeeAttendance');
const DailyClassAttendance = require('../models/dailyClassAttendance');
const { parseToEgyptTime, getEgyptDayBoundaries } = require('../utils/timezone');
const { sendAttendanceNotification } = require('./fcmService');

// Utility: Get start and end of day (Egypt timezone)
function getDayBoundaries(date = null) {
  return getEgyptDayBoundaries(date);
}

// Utility: Parse ZKTeco date format to Egypt timezone
function parseZKTecoDate(dateString) {
  return parseToEgyptTime(dateString);
}

// Utility: Convert verify code to readable format
function parseVerifyMethod(verifyCode) {
  const verifyMap = {
    0: 'Password',
    1: 'Fingerprint',
    4: 'RFID Card',
    15: 'Face Recognition',
  };

  return verifyMap[verifyCode] || 'Face Recognition';
}

// Utility: Convert status code to readable format
function parseStatus(statusCode) {
  const statusMap = {
    0: 'Check In',
    1: 'Check Out',
  };

  return statusMap[statusCode] || 'Unknown';
}

// Process Student Attendance from Webhook
async function processStudentAttendance(attendanceData) {
  try {
    const { UserID, DateTime, Status, Verify, DeviceSN } = attendanceData;

    console.log(`\n🎓 Processing STUDENT attendance`);
    console.log(`   UserID: ${UserID}`);
    console.log(`   DateTime: ${DateTime}`);
    console.log(`   Status: ${Status}`);

    // Find student by studentCode (ZKTeco sends student code as User ID)
    const student = await Student.findOne({ studentCode: UserID }).populate(
      'class'
    );

    if (!student) {
      console.log(`❌ Student with code ${UserID} not found`);
      return { success: false, message: 'Student not found' };
    }

    if (!student.class) {
      console.log(`❌ Student ${student.studentName} has no class assigned`);
      return { success: false, message: 'Student has no class' };
    }

    console.log(
      `✅ Found student: ${student.studentName} (Code: ${student.studentCode})`
    );
    console.log(`   Class: ${student.class.className}`);

    // Parse date and time
    const scanTime = parseZKTecoDate(DateTime);
    const { start: dayStart, end: dayEnd } = getDayBoundaries(scanTime);

    // Find or create attendance record for today
    let attendance = await Attendance.findOne({
      student: student._id,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (!attendance) {
      // Create new attendance record
      attendance = new Attendance({
        student: student._id,
        class: student.class._id,
        date: dayStart,
        status: 'Present', // Will be updated based on time
        entryTime: scanTime,
        verifyMethod: Verify || 'Face Recognition',
        deviceSN: DeviceSN || 'Unknown',
        isAutomated: true,
      });

      console.log(
        `✅ Created new attendance record for ${student.studentName}`
      );
    } else {
      // Update existing record
      if (Status === 'Check In' && !attendance.entryTime) {
        attendance.entryTime = scanTime;
        console.log(`✅ Updated entry time for ${student.studentName}`);
      } else if (Status === 'Check Out') {
        attendance.exitTime = scanTime;
        console.log(`✅ Updated exit time for ${student.studentName}`);
      }
    }

    // Determine if student is late (example: class starts at 8:00 AM)
    const classStartHour = 8;
    const scanHour = scanTime.getHours();
    const scanMinute = scanTime.getMinutes();

    if (
      scanHour > classStartHour ||
      (scanHour === classStartHour && scanMinute > 15)
    ) {
      if (
        attendance.status !== 'Early-Leave' &&
        attendance.status !== 'Permission'
      ) {
        attendance.status = 'Late';
      }
    }

    await attendance.save();

    console.log(`✅ Attendance saved successfully for ${student.studentName}`);
    console.log(`   Status: ${attendance.status}`);
    console.log(`   Entry: ${attendance.entryTime}`);
    console.log(`   Exit: ${attendance.exitTime || 'Not yet'}`);

    // Send FCM notification to parent
    try {
      await sendAttendanceNotification(
        student._id,
        attendance.status,
        attendance.entryTime || scanTime
      );
      console.log(`📱 FCM notification sent for ${student.studentName}`);
    } catch (notifError) {
      console.error('⚠️ Error sending FCM notification:', notifError.message);
      // Don't fail attendance recording if notification fails
    }

    // Update daily class attendance summary
    await updateDailyClassAttendance(student.class._id, dayStart);

    return {
      success: true,
      message: 'Student attendance recorded',
      student: student.studentName,
      status: attendance.status,
    };
  } catch (error) {
    console.error('❌ Error processing student attendance:', error);
    return { success: false, message: error.message };
  }
}

// Process Employee Attendance from Webhook
async function processEmployeeAttendance(attendanceData) {
  try {
    const { UserID, DateTime, Status, Verify, DeviceSN } = attendanceData;

    console.log(`\n👔 Processing EMPLOYEE attendance`);
    console.log(`   UserID: ${UserID}`);
    console.log(`   DateTime: ${DateTime}`);
    console.log(`   Status: ${Status}`);

    // Find employee by employeeCode (ZKTeco sends employee code as User ID)
    const employee = await Employee.findOne({ employeeCode: UserID });

    if (!employee) {
      console.log(`❌ Employee with code ${UserID} not found`);
      return { success: false, message: 'Employee not found' };
    }

    console.log(
      `✅ Found employee: ${employee.employeeName} (Code: ${employee.employeeCode})`
    );

    // Parse date and time
    const scanTime = parseZKTecoDate(DateTime);
    const { start: dayStart, end: dayEnd } = getDayBoundaries(scanTime);

    // Find or create attendance record for today
    let attendance = await EmployeeAttendance.findOne({
      employee: employee._id,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (!attendance) {
      // Create new attendance record
      attendance = new EmployeeAttendance({
        employee: employee._id,
        date: dayStart,
        checkInTime: scanTime,
        status: 'Present',
        scans: [],
        isAutomated: true,
      });

      console.log(
        `✅ Created new attendance record for ${employee.employeeName}`
      );
    }

    // Add scan to scans array
    const scan = {
      scanTime: scanTime,
      scanType: Status || 'Unknown',
      verifyMethod: Verify || 'Face Recognition',
      deviceSN: DeviceSN || 'Unknown',
    };

    attendance.scans.push(scan);

    // Update check-in/check-out times
    if (Status === 'Check In') {
      if (!attendance.checkInTime) {
        attendance.checkInTime = scanTime;
      }
      console.log(`✅ Check-in recorded: ${scanTime}`);
    } else if (Status === 'Check Out') {
      attendance.checkOutTime = scanTime;
      console.log(`✅ Check-out recorded: ${scanTime}`);
    }

    // Determine if employee is late (example: work starts at 8:00 AM)
    const workStartHour = 8;
    const scanHour = scanTime.getHours();

    if (attendance.checkInTime) {
      const checkInHour = attendance.checkInTime.getHours();
      const checkInMinute = attendance.checkInTime.getMinutes();

      if (
        checkInHour > workStartHour ||
        (checkInHour === workStartHour && checkInMinute > 15)
      ) {
        attendance.status = 'Late';
      }
    }

    await attendance.save();

    console.log(`✅ Employee attendance saved successfully`);
    console.log(`   Total scans today: ${attendance.scans.length}`);
    console.log(`   Check-in: ${attendance.checkInTime}`);
    console.log(`   Check-out: ${attendance.checkOutTime || 'Not yet'}`);
    console.log(`   Total hours: ${attendance.totalHours}`);

    return {
      success: true,
      message: 'Employee attendance recorded',
      employee: employee.employeeName,
      status: attendance.status,
      totalScans: attendance.scans.length,
    };
  } catch (error) {
    console.error('❌ Error processing employee attendance:', error);
    return { success: false, message: error.message };
  }
}

// Main webhook processor - determines if it's student or employee
async function processAttendanceWebhook(attendanceData) {
  const { UserID } = attendanceData;

  console.log(`\n🔍 Processing attendance webhook for UserID: ${UserID}`);

  try {
    // Try to find as student first by studentCode
    const student = await Student.findOne({ studentCode: UserID });

    if (student) {
      return await processStudentAttendance(attendanceData);
    }

    // Try to find as employee by employeeCode
    const employee = await Employee.findOne({ employeeCode: UserID });

    if (employee) {
      return await processEmployeeAttendance(attendanceData);
    }

    // Not found
    console.log(`❌ UserID ${UserID} not found in students or employees`);
    console.log(`   Searched by studentCode and employeeCode`);

    return {
      success: false,
      message: `UserID ${UserID} not registered in system`,
    };
  } catch (error) {
    console.error('❌ Error in attendance webhook processor:', error);
    return { success: false, message: error.message };
  }
}

// Update Daily Class Attendance Summary
async function updateDailyClassAttendance(classId, date) {
  try {
    const { start: dayStart, end: dayEnd } = getDayBoundaries(date);

    // Get all students in this class
    const students = await Student.find({ class: classId, isActive: true });
    const totalStudents = students.length;

    if (totalStudents === 0) {
      console.log(`⚠️ No students found in class ${classId}`);
      return;
    }

    // Get attendance records for today
    const attendanceRecords = await Attendance.find({
      class: classId,
      date: { $gte: dayStart, $lte: dayEnd },
    }).populate('student');

    // Build lists
    const presentStudents = [];
    const lateStudents = [];
    const earlyLeaveStudents = [];
    const absentStudents = [];

    const attendedStudentIds = new Set();

    for (const record of attendanceRecords) {
      attendedStudentIds.add(record.student._id.toString());

      if (record.status === 'Present') {
        presentStudents.push({
          student: record.student._id,
          entryTime: record.entryTime,
          exitTime: record.exitTime,
        });
      } else if (record.status === 'Late') {
        lateStudents.push({
          student: record.student._id,
          entryTime: record.entryTime,
          minutesLate: 0, // Calculate if needed
        });
      } else if (record.status === 'Early-Leave') {
        earlyLeaveStudents.push({
          student: record.student._id,
          exitTime: record.exitTime,
          reason: record.leaveReason || '',
        });
      }
    }

    // Find absent students
    for (const student of students) {
      if (!attendedStudentIds.has(student._id.toString())) {
        absentStudents.push({
          student: student._id,
        });
      }
    }

    // Find or create daily summary
    let dailySummary = await DailyClassAttendance.findOne({
      class: classId,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    if (!dailySummary) {
      dailySummary = new DailyClassAttendance({
        class: classId,
        date: dayStart,
      });
    }

    // Update summary
    dailySummary.totalStudents = totalStudents;
    dailySummary.presentStudents = presentStudents;
    dailySummary.absentStudents = absentStudents;
    dailySummary.lateStudents = lateStudents;
    dailySummary.earlyLeaveStudents = earlyLeaveStudents;

    await dailySummary.save();

    console.log(`✅ Daily class attendance summary updated`);
    console.log(
      `   Total: ${totalStudents}, Present: ${presentStudents.length}, Absent: ${absentStudents.length}, Late: ${lateStudents.length}`
    );
  } catch (error) {
    console.error('❌ Error updating daily class attendance:', error);
  }
}

// Mark absent students at end of day (can be run via cron job)
async function markAbsentStudents(date = new Date()) {
  try {
    const { start: dayStart, end: dayEnd } = getDayBoundaries(date);

    console.log(`\n📅 Marking absent students for ${dayStart.toDateString()}`);

    // Get all active students grouped by class
    const students = await Student.find({ isActive: true }).populate('class');

    const classeProcessed = new Set();

    for (const student of students) {
      if (!student.class) continue;

      // Check if student has attendance record for today
      const attendance = await Attendance.findOne({
        student: student._id,
        date: { $gte: dayStart, $lte: dayEnd },
      });

      if (!attendance) {
        // No attendance record - mark as absent
        const newAttendance = new Attendance({
          student: student._id,
          class: student.class._id,
          date: dayStart,
          status: 'Absent',
          isAutomated: true,
          notes: 'Auto-marked absent - no scan detected',
        });

        await newAttendance.save();
        console.log(`   ❌ Marked ${student.studentName} as absent`);
        
        // Send FCM notification for absence
        try {
          await sendAttendanceNotification(student._id, 'Absent', dayStart);
          console.log(`   📱 Absence notification sent for ${student.studentName}`);
        } catch (notifError) {
          console.error(`   ⚠️ Error sending absence notification:`, notifError.message);
        }
      }

      // Track classes to update summaries
      classeProcessed.add(student.class._id.toString());
    }

    // Update all class summaries
    for (const classId of classeProcessed) {
      await updateDailyClassAttendance(classId, date);
    }

    console.log(
      `✅ Absent marking complete for ${classeProcessed.size} classes`
    );
  } catch (error) {
    console.error('❌ Error marking absent students:', error);
  }
}

module.exports = {
  processAttendanceWebhook,
  processStudentAttendance,
  processEmployeeAttendance,
  updateDailyClassAttendance,
  markAbsentStudents,
  parseZKTecoDate,
  parseVerifyMethod,
  parseStatus,
};
