// services/absenceMarker.js
// Automated service to mark students as absent after checkout time

const Student = require('../models/student');
const Attendance = require('../models/attendance');
const AttendanceSettings = require('../models/AttendanceSettings');
const { getEgyptDate, getEgyptDayBoundaries, formatEgyptDate } = require('../utils/timezone');

/**
 * Mark all students who didn't attend as absent for today
 * This runs automatically after checkout time
 */
async function markAbsentStudents() {
  try {
    console.log('\n🔄 ===== AUTOMATED ABSENCE MARKING STARTED =====');
    console.log(`⏰ Time: ${formatEgyptDate(getEgyptDate())}`);
    
    // Get today's date boundaries in Egypt timezone
    const today = getEgyptDate();
    const { start: dayStart, end: dayEnd } = getEgyptDayBoundaries(today);
    
    console.log(`📅 Processing date: ${formatEgyptDate(dayStart, 'YYYY-MM-DD')}`);
    
    // Get all active students
    const allStudents = await Student.find({ 
      isActive: { $ne: false } // Include students where isActive is true or undefined
    }).populate('class', 'className');
    
    console.log(`👥 Total active students: ${allStudents.length}`);
    
    // Get all attendance records for today
    const todayAttendance = await Attendance.find({
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).select('student');
    
    // Create a Set of student IDs who have attendance records
    const attendedStudentIds = new Set(
      todayAttendance.map(att => att.student.toString())
    );
    
    console.log(`✅ Students with attendance records: ${attendedStudentIds.size}`);
    
    // Find students who don't have any attendance record
    const absentStudents = allStudents.filter(
      student => !attendedStudentIds.has(student._id.toString())
    );
    
    console.log(`❌ Students to mark as absent: ${absentStudents.length}`);
    
    if (absentStudents.length === 0) {
      console.log('✨ All students have attendance records. No action needed.');
      console.log('===== AUTOMATED ABSENCE MARKING COMPLETED =====\n');
      return {
        success: true,
        totalStudents: allStudents.length,
        markedAbsent: 0,
        alreadyRecorded: attendedStudentIds.size,
        message: 'All students have attendance records'
      };
    }
    
    // Create absent records for students who didn't attend
    const absentRecords = [];
    for (const student of absentStudents) {
      const record = {
        student: student._id,
        class: student.class?._id,
        date: dayStart,
        status: 'Absent',
        isAutomated: true,
        markedAbsentAutomatically: true,
        createdAt: getEgyptDate()
      };
      
      absentRecords.push(record);
      
      console.log(`  📝 Marking absent: ${student.studentName} (${student.studentCode}) - ${student.class?.className || 'No class'}`);
    }
    
    // Bulk insert absent records
    const result = await Attendance.insertMany(absentRecords);
    
    console.log(`\n✅ Successfully marked ${result.length} students as absent`);
    console.log('===== AUTOMATED ABSENCE MARKING COMPLETED =====\n');
    
    return {
      success: true,
      totalStudents: allStudents.length,
      markedAbsent: result.length,
      alreadyRecorded: attendedStudentIds.size,
      absentStudents: absentStudents.map(s => ({
        name: s.studentName,
        code: s.studentCode,
        class: s.class?.className
      }))
    };
    
  } catch (error) {
    console.error('❌ Error in automated absence marking:', error);
    console.log('===== AUTOMATED ABSENCE MARKING FAILED =====\n');
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the cron schedule based on attendance settings
 * Returns cron expression to run 1 hour after checkout time
 */
async function getAbsenceMarkingSchedule() {
  try {
    const settings = await AttendanceSettings.getSettings();
    
    // Run 1 hour after student checkout time
    const hour = (settings.studentCheckOutThresholdHour + 1) % 24;
    const minute = settings.studentCheckOutThresholdMinute;
    
    // Cron format: minute hour * * *
    // Runs daily at the specified time
    const cronExpression = `${minute} ${hour} * * *`;
    
    console.log(`📅 Absence marking scheduled for: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
    console.log(`   Cron expression: ${cronExpression}`);
    
    return cronExpression;
  } catch (error) {
    console.error('Error getting absence marking schedule:', error);
    // Default: Run at 3:00 AM daily
    return '0 3 * * *';
  }
}

module.exports = {
  markAbsentStudents,
  getAbsenceMarkingSchedule
};
