const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Helper function to generate unique 5-digit student code
const generateStudentCode = async function () {
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Generate random 5-digit number (10000-99999)
    code = Math.floor(10000 + Math.random() * 90000).toString();

    // Check if code already exists
    const existing = await mongoose
      .model('Student')
      .findOne({ studentCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

const studentSchema = new Schema(
  {
    // Basic Information
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentCode: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d{5}$/.test(v);
        },
        message: 'Student code must be exactly 5 digits',
      },
    },

    // Class Assignment (MANDATORY)
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },

    // Parent Information
    parentName: {
      type: String,
      required: true,
      trim: true,
    },
    parentPhone1: {
      type: String,
      required: true,
      trim: true,
    },
    parentPhone2: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },

    // Financial Information
    totalSchoolFees: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      default: function () {
        return this.totalSchoolFees - this.totalPaid;
      },
    },

    // Additional Information
    address: {
      type: String,
      required: false,
      default: '',
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      required: false,
      default: '',
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      default: '',
    },
    blockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },

    // Legacy field for barcode compatibility (optional)
    barCode: {
      type: String,
      required: false,
    },

    // Payment History (stored directly in student)
    payments: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        paymentMethod: {
          type: String,
          enum: ['cash', 'bank_transfer', 'card', 'other'],
          default: 'cash',
        },
        paymentDate: {
          type: Date,
          required: true,
          default: Date.now,
        },
        receivedBy: {
          type: Schema.Types.ObjectId,
          ref: 'Employee',
          required: true,
        },
        notes: {
          type: String,
          default: '',
        },
        receiptNumber: {
          type: String,
          required: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better performance
studentSchema.index({ studentCode: 1 }, { unique: true });
studentSchema.index({ class: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ studentName: 1 });

// Pre-save middleware to generate student code and calculate payments
studentSchema.pre('save', async function (next) {
  if (this.isNew && !this.studentCode) {
    this.studentCode = await generateStudentCode();
  }

  // Calculate totalPaid from payments array
  if (this.payments && Array.isArray(this.payments)) {
    this.totalPaid = this.payments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );
  }

  // Calculate remaining balance
  this.remainingBalance = this.totalSchoolFees - this.totalPaid;

  next();
});

// Static method to generate code (can be called directly)
studentSchema.statics.generateCode = generateStudentCode;

// Virtual for full parent contact
studentSchema.virtual('parentContact').get(function () {
  return {
    name: this.parentName,
    phone1: this.parentPhone1,
    phone2: this.parentPhone2 || null,
  };
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
