const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// AUTOMATED EMPLOYEE ATTENDANCE MODEL - ZKTeco Webhook Integration
// Supports multiple check-ins/check-outs per day
const employeeAttendanceSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    // First check-in of the day
    checkInTime: {
      type: Date,
      required: false,
    },
    // Last check-out of the day
    checkOutTime: {
      type: Date,
      required: false,
    },
    // All scans throughout the day (for multiple entries/exits)
    scans: [
      {
        scanTime: {
          type: Date,
          required: true,
        },
        scanType: {
          type: String,
          enum: ['Check In', 'Check Out', 'Unknown'],
          required: true,
        },
        verifyMethod: {
          type: String,
          enum: ['Face Recognition', 'Fingerprint', 'RFID Card', 'Password'],
          default: 'Face Recognition',
        },
        deviceSN: {
          type: String,
          default: null,
        },
      },
    ],
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half-Day', 'On-Leave'],
      default: 'Present',
    },
    notes: {
      type: String,
      default: '',
    },
    // Automated vs Manual entry
    isAutomated: {
      type: Boolean,
      default: true,
    },
    // For manual entries or corrections
    isManualEntry: {
      type: Boolean,
      default: false,
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same employee on same date
employeeAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Other indexes
employeeAttendanceSchema.index({ date: -1 });
employeeAttendanceSchema.index({ status: 1 });
employeeAttendanceSchema.index({ isAutomated: 1 });

// Calculate total hours before saving
employeeAttendanceSchema.pre('save', function (next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
  }
  next();
});

const EmployeeAttendance = mongoose.model(
  'EmployeeAttendance',
  employeeAttendanceSchema
);

module.exports = EmployeeAttendance;
