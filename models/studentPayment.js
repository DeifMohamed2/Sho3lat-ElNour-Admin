const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentPaymentSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
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
      unique: true,
      sparse: true,
    },
    // For audit trail
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalReason: {
      type: String,
      default: '',
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    reversedAt: {
      type: Date,
    },
    // Link to original payment if this is a reversal
    originalPayment: {
      type: Schema.Types.ObjectId,
      ref: 'StudentPayment',
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
studentPaymentSchema.index({ student: 1, paymentDate: -1 });
studentPaymentSchema.index({ receivedBy: 1, paymentDate: -1 });
studentPaymentSchema.index({ isReversed: 1 });
studentPaymentSchema.index({ createdAt: -1 });

// Update student's totalPaid after payment is saved
studentPaymentSchema.post('save', async function () {
  if (!this.isReversed) {
    const Student = mongoose.model('Student');
    const student = await Student.findById(this.student);

    if (student) {
      // Recalculate total paid from all non-reversed payments
      const StudentPayment = mongoose.model('StudentPayment');
      const payments = await StudentPayment.find({
        student: this.student,
        isReversed: false,
      });

      const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      student.totalPaid = totalPaid;
      student.remainingBalance = student.totalSchoolFees - totalPaid;
      await student.save();
    }
  }
});

const StudentPayment = mongoose.model('StudentPayment', studentPaymentSchema);

module.exports = StudentPayment;
