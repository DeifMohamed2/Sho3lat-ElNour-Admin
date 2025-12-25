const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ATTENDANCE SETTINGS MODEL - Singleton Pattern
// Controls timing rules for student and employee attendance
const attendanceSettingsSchema = new Schema(
  {
    // ==================== STUDENT SETTINGS ====================
    
    // Official work start time for students
    studentWorkStartHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 8, // 8:00 AM
      required: true,
    },
    studentWorkStartMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
      required: true,
    },
    
    // Late threshold - students arriving after this time are marked as "Late"
    studentLateThresholdHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 15, // 3:00 PM
      required: true,
    },
    studentLateThresholdMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
      required: true,
    },
    
    // Check-out threshold - scans after this time are considered check-outs
    studentCheckOutThresholdHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 15, // 3:00 PM
      required: true,
    },
    studentCheckOutThresholdMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
      required: true,
    },
    
    // ==================== EMPLOYEE SETTINGS ====================
    
    // Official work start time
    employeeWorkStartHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 8, // 8:00 AM
      required: true,
    },
    employeeWorkStartMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
      required: true,
    },
    
    // Late threshold - employees arriving after this time are marked as "Late"
    employeeLateThresholdHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 8, // 8:15 AM
      required: true,
    },
    employeeLateThresholdMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 15,
      required: true,
    },
    
    // Check-out threshold - scans after this time are considered check-outs
    employeeCheckOutThresholdHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 15, // 3:00 PM
      required: true,
    },
    employeeCheckOutThresholdMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

// Singleton pattern - ensure only one settings document exists
attendanceSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  
  // If no settings exist, create default settings
  if (!settings) {
    settings = await this.create({
      // Student defaults
      studentWorkStartHour: 8,
      studentWorkStartMinute: 0,
      studentLateThresholdHour: 15,
      studentLateThresholdMinute: 0,
      studentCheckOutThresholdHour: 15,
      studentCheckOutThresholdMinute: 0,
      
      // Employee defaults
      employeeWorkStartHour: 8,
      employeeWorkStartMinute: 0,
      employeeLateThresholdHour: 8,
      employeeLateThresholdMinute: 15,
      employeeCheckOutThresholdHour: 15,
      employeeCheckOutThresholdMinute: 0,
    });
  }
  
  return settings;
};

// Update settings (ensures singleton)
attendanceSettingsSchema.statics.updateSettings = async function (updates) {
  let settings = await this.findOne();
  
  if (!settings) {
    // Create new settings with updates
    settings = await this.create(updates);
  } else {
    // Update existing settings
    Object.assign(settings, updates);
    await settings.save();
  }
  
  return settings;
};

// Reset to default values
attendanceSettingsSchema.statics.resetToDefaults = async function () {
  return this.updateSettings({
    // Student defaults
    studentWorkStartHour: 8,
    studentWorkStartMinute: 0,
    studentLateThresholdHour: 15,
    studentLateThresholdMinute: 0,
    studentCheckOutThresholdHour: 15,
    studentCheckOutThresholdMinute: 0,
    
    // Employee defaults
    employeeWorkStartHour: 8,
    employeeWorkStartMinute: 0,
    employeeLateThresholdHour: 8,
    employeeLateThresholdMinute: 15,
    employeeCheckOutThresholdHour: 15,
    employeeCheckOutThresholdMinute: 0,
  });
};

// Helper method to check if a time is after the late threshold
attendanceSettingsSchema.methods.isStudentLate = function (hour, minute) {
  if (hour > this.studentLateThresholdHour) return true;
  if (hour === this.studentLateThresholdHour && minute > this.studentLateThresholdMinute) return true;
  return false;
};

attendanceSettingsSchema.methods.isEmployeeLate = function (hour, minute) {
  if (hour > this.employeeLateThresholdHour) return true;
  if (hour === this.employeeLateThresholdHour && minute > this.employeeLateThresholdMinute) return true;
  return false;
};

attendanceSettingsSchema.methods.isCheckOutTime = function (hour, minute) {
  if (hour > this.employeeCheckOutThresholdHour) return true;
  if (hour === this.employeeCheckOutThresholdHour && minute >= this.employeeCheckOutThresholdMinute) return true;
  return false;
};

const AttendanceSettings = mongoose.model('AttendanceSettings', attendanceSettingsSchema);

module.exports = AttendanceSettings;
