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
 * Returns cron expression to run after checkout time + delay
 */
async function getAbsenceMarkingSchedule() {
  try {
    const settings = await AttendanceSettings.getSettings();
    
    // Get checkout time in total minutes
    const checkoutTimeMinutes = settings.studentCheckOutThresholdHour * 60 + settings.studentCheckOutThresholdMinute;
    
    // Add the configurable delay (default: 1 minute)
    const delayMinutes = settings.absenceMarkingDelayMinutes || 1;
    let scheduledMinutes = checkoutTimeMinutes + delayMinutes;
    
    // Handle overflow past midnight
    if (scheduledMinutes >= 24 * 60) {
      scheduledMinutes = scheduledMinutes - (24 * 60);
    }
    
    // Convert back to hours and minutes
    const hour = Math.floor(scheduledMinutes / 60);
    const minute = scheduledMinutes % 60;
    
    // Cron format: minute hour * * *
    // Runs daily at the specified time
    const cronExpression = `${minute} ${hour} * * *`;
    
    console.log(`📅 Absence marking scheduled for: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
    console.log(`   (Checkout: ${settings.studentCheckOutThresholdHour.toString().padStart(2, '0')}:${settings.studentCheckOutThresholdMinute.toString().padStart(2, '0')} + ${delayMinutes} min delay)`);
    console.log(`   Cron expression: ${cronExpression}`);
    
    return cronExpression;
  } catch (error) {
    console.error('Error getting absence marking schedule:', error);
    // Default: Run at 3:00 AM daily
    return '0 3 * * *';
  }
}

/**
 * Reschedule both student and employee absence marking jobs
 * Called when settings are updated
 */
async function rescheduleAbsenceMarking() {
  try {
    const scheduler = require('../utils/scheduler');
    
    // ========== RESCHEDULE STUDENT ABSENCE MARKING ==========
    const studentCronExpression = await getAbsenceMarkingSchedule();
    
    if (scheduler.hasJob('student-absence-marker')) {
      scheduler.rescheduleJob('student-absence-marker', studentCronExpression);
      console.log('✅ Student absence marking job rescheduled');
    } else {
      // Job doesn't exist, create it
      scheduler.scheduleJob(
        'student-absence-marker',
        studentCronExpression,
        async () => {
          console.log('\n🔔 Automated STUDENT absence marking triggered by scheduler');
          await markAbsentStudents();
        }
      );
      console.log('✅ Student absence marking job created');
    }
    
    // ========== RESCHEDULE EMPLOYEE ABSENCE MARKING ==========
    const employeeCronExpression = await getEmployeeAbsenceMarkingSchedule();
    
    if (scheduler.hasJob('employee-absence-marker')) {
      scheduler.rescheduleJob('employee-absence-marker', employeeCronExpression);
      console.log('✅ Employee absence marking job rescheduled');
    } else {
      // Job doesn't exist, create it
      scheduler.scheduleJob(
        'employee-absence-marker',
        employeeCronExpression,
        async () => {
          console.log('\n🔔 Automated EMPLOYEE absence marking triggered by scheduler');
          await markAbsentEmployees();
        }
      );
      console.log('✅ Employee absence marking job created');
    }
    
    return { 
      success: true, 
      studentCronExpression, 
      employeeCronExpression 
    };
  } catch (error) {
    console.error('Error rescheduling absence marking:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all employees who didn't attend as absent for today
 * This runs automatically after employee checkout time
 */
async function markAbsentEmployees() {
  const Employee = require('../models/employee');
  const EmployeeAttendance = require('../models/employeeAttendance');
  
  try {
    console.log('\n🔄 ===== AUTOMATED EMPLOYEE ABSENCE MARKING STARTED =====');
    console.log(`⏰ Time: ${formatEgyptDate(getEgyptDate())}`);
    
    // Get today's date boundaries in Egypt timezone
    const today = getEgyptDate();
    const { start: dayStart, end: dayEnd } = getEgyptDayBoundaries(today);
    
    console.log(`📅 Processing date: ${formatEgyptDate(dayStart, 'YYYY-MM-DD')}`);
    
    // Get all active employees
    const allEmployees = await Employee.find({ 
      isActive: { $ne: false }
    });
    
    console.log(`👥 Total active employees: ${allEmployees.length}`);
    
    // Get all attendance records for today
    const todayAttendance = await EmployeeAttendance.find({
      date: {
        $gte: dayStart,
        $lte: dayEnd
      }
    }).select('employee');
    
    // Create a Set of employee IDs who have attendance records
    const attendedEmployeeIds = new Set(
      todayAttendance.map(att => att.employee.toString())
    );
    
    console.log(`✅ Employees with attendance records: ${attendedEmployeeIds.size}`);
    
    // Find employees who don't have any attendance record
    const absentEmployees = allEmployees.filter(
      employee => !attendedEmployeeIds.has(employee._id.toString())
    );
    
    console.log(`❌ Employees to mark as absent: ${absentEmployees.length}`);
    
    if (absentEmployees.length === 0) {
      console.log('✨ All employees have attendance records. No action needed.');
      console.log('===== AUTOMATED EMPLOYEE ABSENCE MARKING COMPLETED =====\n');
      return {
        success: true,
        totalEmployees: allEmployees.length,
        markedAbsent: 0,
        alreadyRecorded: attendedEmployeeIds.size,
        message: 'All employees have attendance records'
      };
    }
    
    // Create absent records for employees who didn't attend
    const absentRecords = [];
    for (const employee of absentEmployees) {
      const record = {
        employee: employee._id,
        date: dayStart,
        status: 'Absent',
        isAutomated: true,
        markedAbsentAutomatically: true,
        createdAt: getEgyptDate()
      };
      
      absentRecords.push(record);
      
      console.log(`  📝 Marking absent: ${employee.employeeName} (${employee.employeeCode})`);
    }
    
    // Bulk insert absent records
    const result = await EmployeeAttendance.insertMany(absentRecords);
    
    console.log(`\n✅ Successfully marked ${result.length} employees as absent`);
    console.log('===== AUTOMATED EMPLOYEE ABSENCE MARKING COMPLETED =====\n');
    
    return {
      success: true,
      totalEmployees: allEmployees.length,
      markedAbsent: result.length,
      alreadyRecorded: attendedEmployeeIds.size,
      absentEmployees: absentEmployees.map(e => ({
        name: e.employeeName,
        code: e.employeeCode
      }))
    };
    
  } catch (error) {
    console.error('❌ Error in automated employee absence marking:', error);
    console.log('===== AUTOMATED EMPLOYEE ABSENCE MARKING FAILED =====\n');
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the cron schedule for employee absence marking
 */
async function getEmployeeAbsenceMarkingSchedule() {
  try {
    const settings = await AttendanceSettings.getSettings();
    
    // Get employee checkout time in total minutes
    const checkoutTimeMinutes = settings.employeeCheckOutThresholdHour * 60 + settings.employeeCheckOutThresholdMinute;
    
    // Add the configurable delay (default: 1 minute)
    const delayMinutes = settings.absenceMarkingDelayMinutes || 1;
    let scheduledMinutes = checkoutTimeMinutes + delayMinutes;
    
    // Handle overflow past midnight
    if (scheduledMinutes >= 24 * 60) {
      scheduledMinutes = scheduledMinutes - (24 * 60);
    }
    
    // Convert back to hours and minutes
    const hour = Math.floor(scheduledMinutes / 60);
    const minute = scheduledMinutes % 60;
    
    // Cron format: minute hour * * *
    const cronExpression = `${minute} ${hour} * * *`;
    
    console.log(`📅 Employee absence marking scheduled for: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} daily`);
    console.log(`   (Checkout: ${settings.employeeCheckOutThresholdHour.toString().padStart(2, '0')}:${settings.employeeCheckOutThresholdMinute.toString().padStart(2, '0')} + ${delayMinutes} min delay)`);
    console.log(`   Cron expression: ${cronExpression}`);
    
    return cronExpression;
  } catch (error) {
    console.error('Error getting employee absence marking schedule:', error);
    // Default: Run at 4:00 PM daily
    return '0 16 * * *';
  }
}

module.exports = {
  markAbsentStudents,
  markAbsentEmployees,
  getAbsenceMarkingSchedule,
  getEmployeeAbsenceMarkingSchedule,
  rescheduleAbsenceMarking
};
