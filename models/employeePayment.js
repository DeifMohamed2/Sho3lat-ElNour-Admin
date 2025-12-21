const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeePaymentSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    paymentMonth: {
      type: String, // Format: "YYYY-MM"
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Salary Calculation
    baseSalary: {
      type: Number,
      required: true,
    },
    // For part-time: hours worked * hourly rate
    hoursWorked: {
      type: Number,
      default: 0,
    },

    // Additional amounts
    bonuses: {
      type: Number,
      default: 0,
    },
    extras: {
      type: Number,
      default: 0,
    },
    extraNotes: {
      type: String,
      default: '',
    },

    // Deductions
    deductions: {
      type: Number,
      default: 0,
    },
    deductionDetails: {
      type: String,
      default: '',
    },

    // Final Amount = baseSalary + bonuses + extras - deductions
    totalAmount: {
      type: Number,
      required: false, // Will be calculated in pre-save hook if not provided
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'other'],
      default: 'cash',
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    receiptNumber: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      default: '',
    },

    // Status
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
employeePaymentSchema.index({ employee: 1, paymentMonth: -1 });
employeePaymentSchema.index({ paymentDate: -1 });
employeePaymentSchema.index({ paidBy: 1 });

// Calculate total before saving
employeePaymentSchema.pre('save', function (next) {
  this.totalAmount =
    this.baseSalary + this.bonuses + this.extras - this.deductions;
  next();
});

const EmployeePayment = mongoose.model('EmployeePayment', employeePaymentSchema);

module.exports = EmployeePayment;



