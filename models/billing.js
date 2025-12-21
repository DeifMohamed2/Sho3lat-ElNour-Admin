const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// INVOICE SYSTEM - CENTRAL FINANCIAL TRACKING
const billingSchema = new Schema(
  {
    // Invoice Type
    invoiceType: {
      type: String,
      enum: ['IN', 'OUT'],
      required: true,
    },

    // Invoice Details
    invoiceNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Categories
    category: {
      type: String,
      enum: [
        // IN Categories (إيرادات)
        'student_payment',        // مصروفات طالب
        'canteen_income',         // إيرادات المقصف
        'course_fees',            // رسوم الدورات
        'registration_fees',      // رسوم التسجيل
        'book_sales',             // مبيعات الكتب
        'other_income',           // إيرادات أخرى
        
        // OUT Categories (مصروفات)
        'teacher_salary',         // راتب معلم
        'employee_salary',        // راتب موظف
        'rent',                   // إيجار
        'utilities',              // مرافق عامة
        'electric',               // كهرباء
        'water',                  // مياه
        'internet',               // إنترنت
        'phone',                  // هاتف
        'maintenance',            // صيانة
        'supplies',               // لوازم مكتبية
        'equipment',              // معدات
        'furniture',              // أثاث
        'transportation',        // مواصلات
        'fuel',                   // وقود
        'food',                   // طعام
        'cleaning',               // نظافة
        'security',               // أمن
        'insurance',              // تأمين
        'marketing',              // تسويق وإعلان
        'advertising',            // إعلانات
        'printing',               // طباعة
        'books',                  // كتب ومواد تعليمية
        'stationery',             // قرطاسية
        'medical',                // طبي
        'training',               // تدريب
        'consulting',             // استشارات
        'legal',                  // قانوني
        'accounting',             // محاسبة
        'bank_fees',              // رسوم بنكية
        'government_fees',        // رسوم حكومية
        'taxes',                  // ضرائب
        'donations',              // تبرعات
        'other_expense',          // مصروفات أخرى
      ],
      required: true,
    },

    // Date
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // References
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: function () {
        return this.category === 'student_payment';
      },
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: function () {
        return this.category === 'teacher_salary';
      },
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: function () {
        return this.category === 'employee_salary';
      },
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'check', 'other'],
      default: 'cash',
    },

    // Audit Trail
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },

    // Attachments
    attachments: [
      {
        filename: String,
        path: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
billingSchema.index({ invoiceType: 1, invoiceDate: -1 });
billingSchema.index({ category: 1, invoiceDate: -1 });
billingSchema.index({ student: 1 });
billingSchema.index({ teacher: 1 });
billingSchema.index({ employee: 1 });
billingSchema.index({ recordedBy: 1 });
billingSchema.index({ createdAt: -1 });

// Auto-generate invoice number
billingSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const type = this.invoiceType;

    // Count documents in the same month
    const count = await mongoose.model('Billing').countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
      invoiceType: type,
    });

    this.invoiceNumber = `${type}-${year}${month}-${String(count + 1).padStart(
      4,
      '0'
    )}`;
  }
  next();
});

const Billing = mongoose.model('Billing', billingSchema);

module.exports = Billing;
