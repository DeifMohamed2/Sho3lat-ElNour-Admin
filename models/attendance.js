const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// AUTOMATED STUDENT ATTENDANCE MODEL - ZKTeco Webhook Integration
const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Early-Leave', 'Permission'],
      required: true,
    },
    // Entry scan timestamp (arrival)
    entryTime: {
      type: Date,
      default: null,
    },
    // Exit scan timestamp (departure)
    exitTime: {
      type: Date,
      default: null,
    },
    // Verification method from device
    verifyMethod: {
      type: String,
      enum: [
        'Face Recognition',
        'Fingerprint',
        'RFID Card',
        'Password',
        'Manual',
      ],
      default: 'Face Recognition',
    },
    // Device information
    deviceSN: {
      type: String,
      default: null,
    },
    // Automated vs Manual entry
    isAutomated: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
    // For manual entries only
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: false,
    },
    // Permission/Leave details
    leaveReason: {
      type: String,
      default: '',
    },
    // For attendance changes/corrections
    wasModified: {
      type: Boolean,
      default: false,
    },
    modificationHistory: [
      {
        previousStatus: String,
        newStatus: String,
        reason: String,
        modifiedBy: {
          type: Schema.Types.ObjectId,
          ref: 'Employee',
        },
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Compound index to prevent duplicate attendance records for same student on same date
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Indexes for common queries
attendanceSchema.index({ class: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });
attendanceSchema.index({ deviceSN: 1, date: -1 });
attendanceSchema.index({ isAutomated: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
