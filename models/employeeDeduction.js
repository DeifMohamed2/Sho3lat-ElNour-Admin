const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeDeductionSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    deductionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    appliedToMonth: {
      type: String, // Format: "YYYY-MM"
      required: true,
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    isApplied: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
    },
    // Link to the payment where this deduction was applied
    appliedInPayment: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeePayment',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Indexes
employeeDeductionSchema.index({ employee: 1, appliedToMonth: 1 });
employeeDeductionSchema.index({ isApplied: 1 });
employeeDeductionSchema.index({ deductionDate: -1 });

const EmployeeDeduction = mongoose.model(
  'EmployeeDeduction',
  employeeDeductionSchema
);

module.exports = EmployeeDeduction;



