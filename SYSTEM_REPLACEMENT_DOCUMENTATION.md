# School Management System - Complete System Replacement

## Overview

This document outlines the complete transformation from a session-based tutoring center system to a professional school attendance and financial management system.

## System Philosophy

### Previous System (DEPRECATED)

- Session-based attendance
- Per-lesson payments
- Teacher-owned students
- Messaging-dependent workflows

### New System (CURRENT)

- School-centric organization
- Daily attendance tracking
- Monthly financial accounting
- Class-based student management
- Employment-based teacher model
- Audit-safe logging
- Self-contained operations

---

## Database Models

### 1. Class Model (`models/class.js`)

**Purpose**: Foundation for student organization

**Fields**:

- `className`: Full class name
- `academicLevel`: Year 1 through Year 12
- `section`: Class section (A, B, C, etc.)
- `capacity`: Maximum student capacity
- `academicYear`: Auto-generated academic year
- `isActive`: Class status
- `notes`: Additional information

**Rules**:

- Classes MUST exist before students can be added
- Unique combination of academicLevel + section + academicYear
- Used for attendance filtering and reports

---

### 2. Student Model (`models/student.js`) - **COMPLETELY REPLACED**

**Purpose**: Student information and financial tracking

**Major Changes**:

- ❌ Removed: `studentTeacher`, `selectedTeachers`, `courses`, `paymentType`, `studentPhoneNumber`
- ✅ Added: Auto-generated 5-digit `studentCode`
- ✅ Added: Mandatory `class` reference
- ✅ Added: `parentName`, `parentPhone1`, `parentPhone2`
- ✅ Added: `totalSchoolFees`, `totalPaid`, `remainingBalance`

**Key Features**:

- Auto-generates unique 5-digit student code on creation
- Code is PERMANENT and cannot be edited
- No direct teacher association
- Simplified financial structure
- Parent-centric contact information

**Pre-save Middleware**:

- Automatically generates student code if not provided
- Calculates remaining balance automatically

---

### 3. StudentPayment Model (`models/studentPayment.js`) - **NEW**

**Purpose**: Append-only payment history

**Fields**:

- `student`: Reference to student
- `amount`: Payment amount
- `paymentMethod`: cash, bank_transfer, card, other
- `paymentDate`: Date of payment
- `receivedBy`: Employee who received payment
- `notes`: Additional notes
- `receiptNumber`: Optional receipt tracking
- `isReversed`: For reversals (append-only audit trail)
- `reversalReason`, `reversedBy`, `reversedAt`: Reversal tracking

**Rules**:

- Payments are NEVER deleted
- Reversals create new records
- Post-save hook updates student's `totalPaid` automatically

---

### 4. Attendance Model (`models/attendance.js`) - **COMPLETELY REPLACED**

**Purpose**: Daily student attendance tracking

**Major Changes**:

- ❌ Removed: Session-based structure, teacher association, payment linkage
- ✅ Changed to: Individual daily attendance records

**Fields**:

- `student`: Student reference
- `class`: Class reference
- `date`: Attendance date
- `status`: Present, Absent, Late
- `notes`: Optional notes
- `recordedBy`: Employee who recorded attendance
- `wasModified`: Tracks if attendance was changed
- `modificationHistory`: Array of changes with reasons

**Rules**:

- One record per student per day (enforced by unique index)
- NO payment linkage
- Modifications require admin confirmation
- Full audit trail of changes

---

### 5. Teacher Model (`models/teacher.js`) - **COMPLETELY REPLACED**

**Purpose**: Employment-based teacher management

**Major Changes**:

- ❌ Removed: `teacherFees`, `paymentType`, `schedule`, `courses`
- ✅ Added: Employment model

**Fields**:

- `teacherName`, `teacherPhone`, `teacherEmail`
- `employmentType`: Full-Time or Part-Time (REQUIRED)
- `monthlySalary`: For full-time teachers
- `hourlyRate`: For part-time teachers
- `subject`: Teacher's specialization
- `qualifications`, `dateOfJoining`, `address`, `nationalId`
- `isActive`, `notes`

**Rules**:

- Teachers are NOT linked to classes
- Teachers are NOT paid per session
- Employment type determines salary structure

---

### 6. TeacherPayment Model (`models/teacherPayment.js`) - **NEW**

**Purpose**: Monthly salary payment tracking

**Fields**:

- `teacher`: Teacher reference
- `paymentMonth`: Format "YYYY-MM"
- `paymentDate`: Actual payment date
- `baseSalary`: Base salary amount
- `hoursWorked`: For part-time calculations
- `bonuses`, `extras`: Additional payments
- `deductions`: Total deductions applied
- `totalAmount`: Final calculated amount
- `paymentMethod`, `receiptNumber`, `notes`

**Calculation**:

```
totalAmount = baseSalary + bonuses + extras - deductions
```

**Pre-save Hook**: Automatically calculates `totalAmount`

---

### 7. TeacherDeduction Model (`models/teacherDeduction.js`) - **NEW**

**Purpose**: Track salary deductions (خصومات)

**Fields**:

- `teacher`: Teacher reference
- `amount`: Deduction amount
- `reason`: Required reason for deduction
- `deductionDate`: When deduction was recorded
- `appliedToMonth`: Which month's salary it applies to
- `addedBy`: Admin/employee who added it
- `isApplied`: Whether it's been applied to a payment
- `appliedInPayment`: Link to the payment where applied

**Rules**:

- Must include reason
- Applied to specific month
- Can track if already applied

---

### 8. EmployeeAttendance Model (`models/employeeAttendance.js`) - **NEW**

**Purpose**: Employee/Teacher attendance with time tracking

**Fields**:

- `employee`: Employee reference
- `date`: Attendance date
- `checkInTime`, `checkOutTime`: Time stamps
- `totalHours`: Auto-calculated
- `status`: Present, Absent, Late, Half-Day, On-Leave
- `notes`: Additional information
- `isManualEntry`, `enteredBy`: For manual corrections

**Features**:

- Automatic hour calculation in pre-save hook
- Prevents duplicate attendance per day
- Used for salary calculations

---

### 9. Billing Model (`models/billing.js`) - **COMPLETELY REPLACED**

**Purpose**: Central invoice and financial tracking

**Major Changes**:

- Complete restructuring to IN/OUT invoice system

**Fields**:

- `invoiceType`: IN or OUT (REQUIRED)
- `invoiceNumber`: Auto-generated
- `description`: Invoice description
- `amount`: Amount
- `category`: Detailed categories for IN and OUT
- `invoiceDate`: Transaction date
- `student`, `teacher`, `employee`: References based on category
- `paymentMethod`: Payment method used
- `recordedBy`: Who recorded the invoice
- `attachments`: File attachments array
- `isVerified`, `verifiedBy`, `verifiedAt`: Verification tracking

**Categories**:

- IN: student_payment, other_income
- OUT: teacher_salary, employee_salary, utilities, electric, water, internet, maintenance, supplies, equipment, rent, transportation, other_expense

**Auto-generation**: Invoice numbers in format: `{TYPE}-{YYYYMM}-{####}`

---

## Controller Updates

### Dashboard Analytics (`controllers/adminController.js`)

**Replaced Function**: `getDashboardAnalytics()`

**New KPIs**:

1. **Core Metrics**:

   - Total students
   - Total teachers (active)
   - Total employees
   - Total classes
   - Active students

2. **Attendance Metrics**:

   - Today's attendance count
   - Today's attendance percentage
   - Monthly attendance percentage (calculated)

3. **Financial Metrics**:

   - Monthly income (from StudentPayment)
   - Monthly expenses (from Billing OUT invoices)
   - Net balance
   - Outstanding student fees
   - Upcoming salary obligations

4. **Breakdown Data**:
   - Expense breakdown by category
   - Class-wise student distribution
   - 6-month financial trend
   - Recent payment activity

**Helper Functions**:

- `getWorkingDays()`: Calculates school days between dates
- `calculateUpcomingSalaries()`: Estimates next month's salary obligations
- `getMonthlyTrendData()`: Last 6 months income/expense/profit

---

### Class Management Controllers

**New Functions**:

1. `classes_Get()`: Render class management page
2. `getAllClasses()`: Get all classes with student counts
3. `addClass()`: Create new class
4. `getClass()`: Get class details with students
5. `updateClass()`: Update class information

---

### Student Logs Controller

**New Functions**:

1. `studentLogs_Get()`: Render student logs page
2. `getStudentLogs()`: Get comprehensive student audit data
   - Attendance history
   - Payment history
   - Statistical summaries
   - Financial status

---

### Teacher Payment Controllers

**New Functions**:

1. `teacherPayments_Get()`: Render payment management page
2. `addTeacherPayment()`: Record salary payment
   - Creates TeacherPayment record
   - Creates Billing OUT invoice automatically
3. `getTeacherPayments()`: Fetch payment history
4. `addTeacherDeduction()`: Add salary deduction
5. `getTeacherDeductions()`: Fetch deduction history

---

## Routes Added

### Class Management

- `GET /admin/classes` - View classes page
- `GET /admin/all-classes` - Fetch all classes
- `POST /admin/add-class` - Create class
- `GET /admin/get-class/:id` - Get class details
- `PUT /admin/update-class/:id` - Update class

### Student Logs

- `GET /admin/student-logs` - View logs page
- `GET /admin/get-student-logs` - Fetch student audit data

### Teacher Payments

- `GET /admin/teacher-payments` - View payments page
- `POST /admin/add-teacher-payment` - Record payment
- `GET /admin/get-teacher-payments` - Fetch payments
- `POST /admin/add-teacher-deduction` - Add deduction
- `GET /admin/get-teacher-deductions` - Fetch deductions

---

## Views Created

### 1. Class Management (`views/Admin/classes.ejs`)

**Features**:

- Grid layout of all classes
- Student count and capacity indicators
- Color-coded fill percentage
- Add/Edit modals
- Academic level in Arabic

**Frontend**: `public/js/adminJS/classes.js`

- Load and display classes
- Add new class
- Edit existing class
- View class details
- Real-time notifications

---

## Migration Notes

### Data Migration Required

1. **Students**:

   - Generate 5-digit codes for existing students
   - Assign students to classes
   - Extract parent information
   - Calculate total fees and payments from old structure

2. **Attendance**:

   - Convert session-based attendance to daily records
   - One record per student per day
   - Remove payment linkages

3. **Teachers**:

   - Determine employment type (Full-Time/Part-Time)
   - Set appropriate salary structure
   - Remove course/session associations

4. **Billing**:
   - Convert to IN/OUT structure
   - Categorize existing records
   - Generate invoice numbers

---

## Key System Rules

### Student Management

1. ✅ Classes MUST exist before adding students
2. ✅ Student codes are auto-generated and permanent
3. ✅ No direct teacher-student association
4. ✅ Parent information is mandatory
5. ✅ Financial tracking is centralized in Student model

### Attendance

1. ✅ Daily attendance only
2. ✅ NOT linked to payments
3. ✅ One record per student per day
4. ✅ Status: Present, Absent, Late
5. ✅ Modifications require admin confirmation

### Teachers

1. ✅ Employment-based (Full-Time or Part-Time)
2. ✅ NOT linked to classes
3. ✅ NOT paid per session
4. ✅ Monthly salary system with deductions

### Financial System

1. ✅ Student payments append-only (no deletions)
2. ✅ All transactions via Billing (IN/OUT)
3. ✅ Full audit trail
4. ✅ Monthly accounting
5. ✅ Reversals create new records

---

## Next Steps

### Remaining Tasks

1. **Update Employee Controller**:

   - Modify student creation to use new model
   - Implement auto code generation
   - Add class selection
   - Remove teacher dependencies

2. **Replace Attendance Controller**:

   - Daily class-based attendance sheets
   - Bulk attendance entry
   - Attendance reports

3. **Update Teacher Controller**:

   - Employment type management
   - Salary configuration
   - Remove course logic

4. **Update Billing Controller**:

   - IN/OUT invoice interface
   - Category management
   - Monthly summaries
   - Verification workflow

5. **Create Reports System**:

   - Student attendance reports
   - Teacher payment reports
   - Financial summaries
   - Export functionality

6. **Parent Mobile APIs**:

   - READ-ONLY endpoints
   - Student profile
   - Attendance history
   - Payment history
   - Remaining balance

7. **Update Dashboard View**:

   - Professional KPI cards
   - Financial charts
   - Attendance summaries
   - Quick actions

8. **Update Student Views**:
   - Class selector
   - Auto-displayed student code
   - Parent information fields
   - Remove teacher selection

---

## Testing Checklist

- [ ] Create class successfully
- [ ] Create student with auto-generated code
- [ ] Student assigned to class
- [ ] Record daily attendance
- [ ] Record student payment
- [ ] Verify payment updates student balance
- [ ] Record teacher payment
- [ ] Add teacher deduction
- [ ] View student logs (complete audit)
- [ ] Dashboard displays correct KPIs
- [ ] Financial reports accurate
- [ ] All invoices tracked properly

---

## Important Notes

⚠️ **Breaking Changes**:

- Old student structure is INCOMPATIBLE
- Old attendance records need conversion
- Teacher payment logic completely changed
- Session-based workflows REMOVED

✅ **Preserved**:

- MVC structure
- Authentication flow
- Routing style
- Core bootstrapping

🔒 **Security**:

- All financial operations logged
- Audit trails maintained
- No silent data modifications
- Admin confirmation required for critical changes

---

## Support & Maintenance

### Model Relationships

```
Class → Students (one-to-many)
Student → StudentPayments (one-to-many)
Student → Attendance (one-to-many)
Teacher → TeacherPayments (one-to-many)
Teacher → TeacherDeductions (one-to-many)
Employee → EmployeeAttendance (one-to-many)
```

### Index Strategy

All models have appropriate indexes for:

- Common queries
- Unique constraints
- Date-based filtering
- Reference lookups

---

**Document Version**: 1.0  
**Last Updated**: December 19, 2025  
**System Status**: In Development - Models Complete, Controllers Partial
