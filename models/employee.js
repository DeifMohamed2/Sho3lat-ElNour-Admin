const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Helper function to generate unique 6-digit employee code
const generateEmployeeCode = async function () {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate random 6-digit number (100000-999999)
    code = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if code already exists
    const existing = await mongoose
      .model('Employee')
      .findOne({ employeeCode: code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error(
      'Unable to generate unique employee code after maximum attempts'
    );
  }

  return code;
};

const employeeSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
      default: 'Employee',
    },
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{6}$/.test(v);
        },
        message: 'Employee code must be exactly 6 digits',
      },
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeePhoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    // Employee Type: teacher or other
    employeeType: {
      type: String,
      enum: ['teacher', 'other'],
      default: 'other',
    },
    // Employment Type: Full-Time or Part-Time
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time'],
      required: true,
      default: 'Full-Time',
    },
    // Base salary for Full-Time employees
    employeeSalary: {
      type: Number,
      required: function () {
        return this.employmentType === 'Full-Time';
      },
      default: 0,
    },
    // Hourly rate for Part-Time employees
    hourlyRate: {
      type: Number,
      required: function () {
        return this.employmentType === 'Part-Time';
      },
      default: 0,
    },
    KPIs: {
      type: Array,
      default: [],
      required: false,
    },
    Losses: {
      type: Array,
      default: [],
      required: false,
    },
    totalKPIs: {
      type: Number,
      default: 0,
      required: false,
    },
    totalLosses: {
      type: Number,
      default: 0,
      required: false,
    },
    totalSalary: {
      type: Number,
      required: false,
      default: 0,
    },
    ordersHistory: {
      type: Array,
      default: [],
      required: false,
    },
    device: {
      type: String,
      default: 'device1',
      required: true,
    },
    // ZKTeco Device User ID for automated attendance
    zktecoUserId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
      trim: true,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Export the generate function for use in controllers
employeeSchema.statics.generateEmployeeCode = generateEmployeeCode;

// Indexes
employeeSchema.index({ employeeCode: 1 });
employeeSchema.index({ employeePhoneNumber: 1 });
employeeSchema.index({ isActive: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
