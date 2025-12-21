# 📚 Sho3lat Elnour Admin System - Complete Documentation

## 🎯 Table of Contents
- [System Overview](#system-overview)
- [Quick Start Guide](#quick-start-guide)
- [System Architecture](#system-architecture)
- [Main Features](#main-features)
- [Database Models](#database-models)
- [API Routes](#api-routes)
- [Controllers Explained](#controllers-explained)
- [Authentication & Security](#authentication--security)
- [WhatsApp Integration](#whatsapp-integration)
- [Troubleshooting](#troubleshooting)

---

## 🏫 System Overview

**Sho3lat Elnour Admin System** is a comprehensive educational center management platform designed to handle all aspects of running a tutoring center. The system manages students, teachers, attendance tracking, billing, and communications through an integrated WhatsApp messaging system.

### What This System Does:
- ✅ **Student Management**: Register, track, and manage student information
- ✅ **Teacher Management**: Handle teacher schedules, courses, and payments
- ✅ **Attendance Tracking**: Digital attendance with real-time updates
- ✅ **Billing System**: Track expenses, revenues, and financial reports
- ✅ **Payment Handling**: Manage installments and payment tracking
- ✅ **WhatsApp Integration**: Automated notifications and messages
- ✅ **Reports & Analytics**: KPI tracking and performance metrics
- ✅ **Multi-Role Access**: Admin and employee roles with different permissions

### Technology Stack:
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (via Mongoose)
- **View Engine**: EJS (Embedded JavaScript Templates)
- **Authentication**: JWT (JSON Web Tokens) + Cookies
- **Session Management**: Express Session + MongoDB Store
- **WhatsApp API**: Custom integration for messaging
- **Excel Export**: ExcelJS for reports
- **File Upload**: Express-Fileupload

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or remote)
- WhatsApp Business API credentials (optional)

### Installation Steps

1. **Clone or Navigate to Project**
```bash
cd "/Users/deifmohamed/Desktop/Sho3lat Elnour/Sho3lat ElNour Admin"
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables**
Create a `.env` file in the root directory with:
```env
JWT_SECRET=your_secret_key_here
WAZIPER_INSTANCE_ID=your_whatsapp_instance_id
WAAPIAPI=your_whatsapp_api_key
LOGO=your_logo_url_or_path
DEFAULT_ADMIN_PHONE=01092257120
```

4. **Start MongoDB**
Make sure MongoDB is running on your system:
```bash
# MongoDB should be running on mongodb://localhost:27017/sho3latElnour
```

5. **Create First Admin User**
```bash
node scripts/createAdmin.js
```

6. **Start the Application**
```bash
# Development mode with auto-restart
nodemon app

# Production mode
node app.js
```

7. **Access the System**
Open your browser and navigate to:
```
http://localhost:8310
```

---

## 🏗️ System Architecture

### Project Structure
```
Sho3lat ElNour Admin/
├── app.js                      # Main application entry point
├── package.json                # Dependencies and scripts
├── .env                        # Environment variables (DO NOT COMMIT!)
│
├── controllers/                # Business logic
│   ├── adminController.js      # Admin-specific features
│   ├── employeeController.js   # Employee/Teacher features
│   └── mainController.js       # Login and main routes
│
├── models/                     # Database schemas
│   ├── admin.js               # Admin user model
│   ├── student.js             # Student information
│   ├── teacher.js             # Teacher information
│   ├── attendance.js          # Attendance records
│   ├── billing.js             # Financial transactions
│   ├── employee.js            # Employee data
│   ├── kpi.js                 # Key Performance Indicators
│   └── superViser.js          # Supervisor model
│
├── routes/                    # API endpoint definitions
│   ├── adminRoute.js          # Admin routes
│   └── mainRoute.js           # Public routes
│
├── views/                     # EJS templates
│   ├── index.ejs              # Login page
│   ├── 404.ejs                # Error page
│   └── Admin/                 # Admin panel views
│       ├── dashboard.ejs
│       ├── addStudent.ejs
│       ├── attendance.ejs
│       ├── billing.ejs
│       └── partials/          # Reusable components
│           ├── head.ejs
│           ├── aside.ejs
│           └── nav.ejs
│
├── public/                    # Static files
│   ├── assets/               # CSS, JS, Images
│   ├── exports/              # Generated Excel files
│   └── js/                   # Frontend JavaScript
│       └── adminJS/          # Admin-specific JS
│
├── utils/                    # Helper functions
│   ├── wasender.js          # WhatsApp sender utility
│   ├── waService.js         # WhatsApp service
│   └── waziper.js           # Student code generator
│
└── scripts/                 # Utility scripts
    ├── createAdmin.js       # Create admin user
    └── seedSupervisor.js    # Seed supervisor data
```

### Request Flow
```
Client Browser
    ↓
[Express Server] (app.js)
    ↓
[Routes] (adminRoute.js / mainRoute.js)
    ↓
[Middleware] (Authentication Check)
    ↓
[Controllers] (Business Logic)
    ↓
[Models] (MongoDB via Mongoose)
    ↓
[Response] (JSON or Rendered EJS View)
```

---

## ⭐ Main Features

### 1. 👨‍🎓 Student Management

#### **Add New Student**
- Register students with personal information
- Assign teachers and courses
- Set payment plans (per session or per course)
- Auto-generate unique student codes (format: `1234G`)
- WhatsApp welcome message sent automatically

**How It Works:**
1. Navigate to "إضافة طالب" (Add Student)
2. Fill in student details:
   - Name
   - Phone number
   - Parent phone number
   - School name
   - Select teachers and courses
   - Choose payment type
3. System generates unique student code
4. Welcome message sent via WhatsApp
5. Student added to database

#### **Student Search**
Search students by:
- Student Code (e.g., `1234G`)
- Phone Number
- Name (partial match)
- Barcode

#### **Edit Student Information**
- Update personal details
- Modify payment amounts
- Change assigned teachers
- Update course enrollments
- Track installment payments

#### **Student Blocking**
- Block students temporarily
- Prevent attendance marking
- Unblock when needed
- Track blocking history

### 2. 👨‍🏫 Teacher Management

#### **Add New Teacher**
Teachers are configured with:
- **Basic Info**: Name, phone number, subject
- **Payment**: Fee per session/course, payment type
- **Schedule**: Weekly timetable with time slots
- **Courses**: Multiple courses per teacher
- **Room Assignment**: Which classroom for each session

**Example Teacher Schedule:**
```javascript
{
  Saturday: [
    { startTime: "09:00", endTime: "11:00", roomID: "Room 1" },
    { startTime: "14:00", endTime: "16:00", roomID: "Room 2" }
  ],
  Sunday: [
    { startTime: "10:00", endTime: "12:00", roomID: "Room 1" }
  ]
}
```

#### **Teacher Schedule View**
- Visual calendar showing all teacher schedules
- See which rooms are occupied
- Avoid scheduling conflicts
- View teacher availability

#### **Teacher Courses**
Each teacher can have multiple courses:
```javascript
courses: [
  { courseName: "Math - Grade 1", coursePrice: 100 },
  { courseName: "Math - Grade 2", coursePrice: 120 }
]
```

### 3. 📋 Attendance System

#### **How Attendance Works:**

**Step 1: Start Attendance Session**
- Select teacher and course
- System creates attendance record
- Ready to mark students present

**Step 2: Mark Students Present**
- Scan student code or enter manually
- System validates student
- Records amount paid
- Applies center fees if configured
- Updates student balance

**Step 3: Add Teacher Invoices (Optional)**
- Add expenses (materials, transportation, etc.)
- Deducted from teacher's payment
- Full tracking of all deductions

**Step 4: Finalize Attendance**
- Review total amounts
- Calculate teacher net payment
- Lock the attendance record
- Cannot be modified after finalization

**Step 5: Collect Center Fees**
- Mark fees as collected
- Track payment to center
- Generate financial reports

#### **Attendance Features:**
- ✅ Real-time student marking
- ✅ Automatic payment calculation
- ✅ Fee tracking
- ✅ Excel export of attendance
- ✅ Date range reports
- ✅ Teacher payment calculation
- ✅ Invoice management

### 4. 💰 Billing & Financial Management

#### **Expense Categories:**
- **Salaries**: Employee wages
- **Canteen In**: Cafeteria revenue
- **Canteen Out**: Cafeteria expenses
- **Government Fees**: Official payments
- **Electric Invoices**: Utility bills
- **Equipments**: Furniture, supplies
- **Other**: Miscellaneous expenses

#### **Bill Creation:**
```javascript
{
  billName: "Teacher Salary - Ahmed",
  billAmount: 5000,
  billNote: "December salary",
  billCategory: "salaries",
  billPhoto: "receipt.jpg",  // Optional
  employee: employeeId,       // Who created it
  salaryEmployee: teacherId   // For salary bills
}
```

#### **Financial Reports:**
- Filter by date range
- Filter by category
- Export to Excel
- View total income/expenses
- Calculate profit/loss

### 5. 💳 Payment & Installments

#### **Payment Types:**

**Per Session Payment:**
- Student pays for each class attended
- Amount deducted per attendance
- Track remaining balance

**Per Course Payment:**
- Student pays fixed amount for entire course
- Can be split into installments
- Track payment progress

#### **Installment System:**
Students can pay in installments:
```javascript
{
  courseId: "course_123",
  installmentAmount: 200,
  installmentDate: "2025-01-15",
  paidBy: "cash",
  note: "First installment"
}
```

**Installment Features:**
- Multiple installments per course
- Track payment history
- Send payment reminders
- View pending amounts
- Calculate total paid/remaining

### 6. 📱 WhatsApp Integration

#### **Automated Messages:**

**1. Welcome Message (New Student)**
```
مرحباً [Student Name]!

كود الطالب الخاص بك: [1234G]

نتمنى لك تجربة تعليمية مميزة
```

**2. Attendance Confirmation**
Sent after each attendance marking with payment details

**3. Payment Reminders**
Bulk notifications for students with pending payments

**4. Custom Messages**
Send personalized messages to selected students

#### **Notification System:**

**Pre-built Templates:**
Create message templates for:
- Payment reminders
- Class cancellations
- Schedule changes
- Announcements

**Bulk Messaging:**
- Select students by filter
- Send to all students
- Send to specific teacher's students
- Send to students with balances

**Message Placeholders:**
```
{studentName} - Student's name
{studentCode} - Unique code
{balance} - Remaining balance
{teacherName} - Teacher's name
{courseName} - Course name
```

### 7. 📊 KPI & Analytics

Track important metrics:
- **Total Students**: Active student count
- **Total Revenue**: Income from all sources
- **Total Expenses**: All expenses
- **Net Profit**: Revenue - Expenses
- **Attendance Rate**: Average student attendance
- **Payment Collection Rate**: Paid vs Pending
- **Teacher Utilization**: Classes per teacher

#### **Reports Available:**
- Daily attendance reports
- Monthly financial summary
- Teacher performance reports
- Student payment history
- Attendance by date range
- Custom date filters

### 8. 📝 Student Logs

Track all student activities:
- Registration date
- Attendance history
- Payment history
- Message history
- Course enrollments
- Teacher assignments
- Balance changes

**View Options:**
- Filter by student
- Filter by date range
- Export to Excel
- Search and sort

### 9. 👥 Employee Management

**Employee Roles:**
- **Admin**: Full system access
- **Employee**: Limited access to specific features

**Employee Features:**
- Create employee accounts
- Assign roles and permissions
- Track employee activities
- View employee logs
- Manage employee salaries

---

## 🗄️ Database Models

### Student Model
```javascript
{
  studentName: String,              // Student's full name
  studentPhoneNumber: String,       // Unique phone number
  studentParentPhone: String,       // Parent/guardian phone
  studentCode: String,              // Format: "1234G" (unique)
  barCode: String,                  // Optional barcode for scanning
  schoolName: String,               // School student attends
  bookTaken: Boolean,               // Has student received books?
  attendanceNumber: Number,         // Total attendance count
  studentAmount: Number,            // Amount per session/course
  paymentType: "perSession" | "perCourse",
  
  // Teacher assignments
  selectedTeachers: [{
    teacherId: ObjectId,
    courses: [{
      courseName: String,
      amountPay: Number,
      amountPaid: Number,       // Total paid so far
      amountRemaining: Number,  // Balance remaining
      installments: [{
        installmentAmount: Number,
        installmentDate: String,
        paidBy: String,
        note: String,
        createdAt: Date
      }]
    }]
  }],
  
  isBlocked: Boolean,           // Is student blocked?
  blockReason: String,          // Why blocked?
  
  timestamps: { createdAt, updatedAt }
}
```

### Teacher Model
```javascript
{
  teacherName: String,
  teacherPhoneNumber: String,
  subjectName: String,          // Main subject (e.g., "Mathematics")
  teacherFees: Number,          // Payment per session
  paymentType: "perSession" | "perCourse",
  
  // Weekly schedule
  schedule: {
    Saturday: [{
      startTime: "HH:MM",
      endTime: "HH:MM",
      roomID: String
    }],
    Sunday: [...],
    Monday: [...],
    // ... etc
  },
  
  // Courses taught
  courses: [{
    courseName: String,
    coursePrice: Number
  }],
  
  timestamps: { createdAt, updatedAt }
}
```

### Attendance Model
```javascript
{
  // Students present in this session
  studentsPresent: [{
    student: ObjectId,          // Student reference
    addedBy: ObjectId,          // Employee who marked present
    amountPaid: Number,         // Amount student paid
    feesApplied: Number         // Center fees deducted
  }],
  
  teacher: ObjectId,            // Teacher reference
  course: String,               // Course name
  date: String,                 // Format: "YYYY-MM-DD"
  
  // Financial tracking
  totalAmount: Number,          // Total collected from students
  totalFees: Number,            // Total center fees
  
  // Teacher invoices/expenses
  invoices: [{
    invoiceDetails: String,
    invoiceAmount: Number,
    time: String,
    addedBy: ObjectId
  }],
  
  // Teacher payment
  netProfitToTeacher: {
    amount: Number,             // Final payment to teacher
    feesAmount: Number          // Total deductions
  },
  
  // Status flags
  isFinalized: Boolean,         // Is session closed?
  finalizedBy: ObjectId,        // Who finalized it?
  centerFeesCollected: Boolean, // Have fees been collected?
  collectedAt: Date,            // When collected?
  
  timestamps: { createdAt, updatedAt }
}
```

### Billing Model
```javascript
{
  billName: String,
  billAmount: Number,
  billNote: String,
  billPhoto: String,            // File path/URL
  billCategory: "salaries" | "canteen_in" | "canteen_out" | 
                "government_fees" | "electric_invoices" | 
                "equipments" | "other",
  
  employee: ObjectId,           // Who created the bill
  salaryEmployee: ObjectId,     // For salary bills only
  
  timestamps: { createdAt, updatedAt }
}
```

### Admin Model
```javascript
{
  role: "Admin" | "Employee",
  phoneNumber: String,          // Unique, used for login
  password: String,             // Hashed with bcrypt
  device: String,               // WhatsApp device ID (optional)
  
  timestamps: { createdAt, updatedAt }
}
```

---

## 🛣️ API Routes

### Public Routes (No Authentication)
```javascript
GET  /                  // Login page
POST /login             // Login endpoint
```

### Admin Routes (Requires Authentication)

#### Dashboard
```javascript
GET  /admin/dashboard   // Main dashboard
```

#### Student Management
```javascript
GET  /admin/add-student                    // Add student page
POST /admin/add-student                    // Create new student
GET  /admin/all-students                   // Get all students
GET  /admin/get-student/:id                // Get single student
PUT  /admin/update-student/:id             // Update student
DELETE /admin/delete-student/:id           // Delete student
POST /admin/search-student                 // Search students
POST /admin/send-code-again/:id            // Resend student code
POST /admin/block-student/:studentId       // Block student
POST /admin/unblock-student/:studentId     // Unblock student
```

#### Teacher Management
```javascript
GET  /admin/teacher                        // Teachers page
POST /admin/add-teacher                    // Create new teacher
GET  /admin/all-teachers                   // Get all teachers
GET  /admin/get-teacher/:id                // Get single teacher
PUT  /admin/update-teacher/:id             // Update teacher
GET  /admin/teacher-sechdule               // View schedule
```

#### Attendance
```javascript
GET  /admin/attendance                     // Attendance page
POST /admin/attend-student                 // Mark student present
GET  /admin/get-attended-students          // Get session students
DELETE /admin/delete-attend-student/:id    // Remove attendance
GET  /admin/download-attendance-excel      // Export to Excel
GET  /admin/handel-attendance              // Handle attendance page
GET  /admin/attendance-by-date             // Filter by date
```

#### Payments & Installments
```javascript
POST /admin/add-installment                // Add installment payment
GET  /admin/installment-history/:studentId // Get payment history
PUT  /admin/update-course-details          // Update course info
PUT  /admin/edit-student-amount-remaining-and-paid/:id // Adjust balance
```

#### Billing
```javascript
GET  /admin/billing                        // Billing page
POST /admin/add-bill                       // Create new bill
GET  /admin/all-bills                      // Get all bills
DELETE /admin/delete-bill/:id              // Delete bill
```

#### Invoices (Teacher Expenses)
```javascript
POST /admin/add-teacher-invoice            // Add invoice to session
DELETE /admin/delete-invoice/:invoiceId    // Remove invoice
PUT  /admin/update-invoice/:invoiceId      // Update invoice
```

#### Notifications & Messages
```javascript
GET  /admin/notifications                  // Notifications page
GET  /admin/students-with-balances         // Students with pending payments
GET  /admin/students-with-installments     // Students with installments
POST /admin/send-notification              // Send single notification
POST /admin/send-bulk-notifications        // Send bulk notifications
GET  /admin/notification-templates         // Get saved templates
POST /admin/save-notification-template     // Save new template
DELETE /admin/delete-notification-template/:id // Delete template
PUT  /admin/update-notification-template/:id   // Update template
```

#### Send Messages
```javascript
GET  /admin/send-messages                  // Messages page
GET  /admin/all-students-for-messages      // Get students for messaging
POST /admin/send-message                   // Send WhatsApp message
```

#### Reports & Logs
```javascript
GET  /admin/student-logs                   // Student logs page
GET  /admin/student-logs-data              // Get logs data
GET  /admin/teacher-report                 // Teacher report page
GET  /admin/download-teacher-excel         // Export teacher report
```

#### WhatsApp Connection
```javascript
GET  /admin/connect-whatsapp               // WhatsApp connection page
PUT  /admin/select-device/:deviceId        // Set WhatsApp device
GET  /admin/getDeviceData                  // Get device info
```

#### Settings
```javascript
GET  /admin/change-password                // Change password page
POST /admin/change-password                // Update password
```

---

## 🎮 Controllers Explained

### AdminController (adminController.js)
Handles admin-specific features:
- Dashboard statistics
- Advanced reports
- System configuration
- Attendance details view
- Excel export functionality

**Key Functions:**
- `getDashboard`: Load dashboard with KPIs
- `attendanceDetails_Get`: View attendance details
- `getAttendanceDetails`: Get specific attendance record
- `downloadAttendanceExcel`: Export attendance to Excel

### EmployeeController (employeeController.js)
Handles day-to-day operations:

**Student Operations:**
- `addStudent`: Create new student with WhatsApp notification
- `updateStudent`: Modify student information
- `searchStudent`: Search by code/phone/name
- `deleteStudent`: Remove student from system
- `blockStudent/unblockStudent`: Block/unblock students

**Teacher Operations:**
- `addTeacher`: Create teacher with schedule
- `updateTeacher`: Modify teacher information
- `getTeachers`: List all teachers
- `teacherSechdule`: View teacher schedules

**Attendance Operations:**
- `attendStudent`: Mark student present
- `getAttendedStudents`: Get session attendance
- `deleteAttendStudent`: Remove attendance mark
- `downloadAttendanceExcel`: Export attendance

**Payment Operations:**
- `addInstallmentPayment`: Record installment payment
- `getInstallmentHistory`: View payment history
- `editStudentAmountRemainingAndPaid`: Adjust balances

**Notification Operations:**
- `sendNotification`: Send single WhatsApp message
- `sendBulkNotifications`: Send to multiple students
- `getNotificationTemplates`: Get saved templates
- `saveNotificationTemplate`: Save new template

**Billing Operations:**
- `getAllBills`: Get all expenses
- (Billing functions in employeeController)

### MainController (mainController.js)
Handles authentication:
- `getLogin`: Display login page
- `login`: Authenticate user and set JWT cookie
- `logout`: Clear session and redirect

---

## 🔐 Authentication & Security

### How Authentication Works:

#### 1. Login Process
```javascript
POST /login
Body: { phoneNumber: "01092257120", password: "password123" }

// Server validates credentials
// If valid, creates JWT token
// Stores token in HTTP-only cookie
// Redirects to dashboard
```

#### 2. JWT Token Structure
```javascript
{
  adminId: "user_mongodb_id",
  role: "Admin",
  iat: 1234567890,  // Issued at
  exp: 1234567890   // Expires at
}
```

#### 3. Authentication Middleware
```javascript
// Every /admin/* route checks:
const authMiddleware = async (req, res, next) => {
  // 1. Get token from cookie
  const token = req.cookies.token;
  
  // 2. Verify JWT token
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // 3. Load user from database
  const admin = await Admin.findById(decoded.adminId);
  
  // 4. Attach to request
  req.admin = admin;
  req.adminId = admin._id;
  
  // 5. Check role
  if (admin.role === 'Admin') {
    next(); // Allow access
  } else {
    redirect('/'); // Deny access
  }
};
```

### Security Features:
- ✅ **Password Hashing**: bcrypt with salt rounds
- ✅ **JWT Tokens**: Secure token-based auth
- ✅ **HTTP-Only Cookies**: XSS protection
- ✅ **Role-Based Access**: Admin vs Employee permissions
- ✅ **Session Management**: MongoDB session store
- ✅ **CORS Protection**: Cross-origin security

### Password Management:
```javascript
// Creating admin (scripts/createAdmin.js)
const hashedPassword = await bcrypt.hash(password, 10);

// Verifying login
const isValid = await bcrypt.compare(enteredPassword, storedHash);
```

---

## 📱 WhatsApp Integration

### Setup WhatsApp Connection:

#### 1. Get API Credentials
- Sign up for WhatsApp Business API
- Get `WAZIPER_INSTANCE_ID` and `WAAPIAPI` key
- Add to `.env` file

#### 2. Connect Device
- Navigate to "ربط الواتساب" (Connect WhatsApp)
- Enter device ID
- Scan QR code (if required)
- Save device connection

#### 3. Configure in Admin
```javascript
PUT /admin/select-device/:deviceId
// Saves device ID to admin account
// All messages sent from this device
```

### WhatsApp Services (utils/)

#### wasender.js - Send Messages
```javascript
const sendWaMessage = async (phoneNumber, message) => {
  // Sends WhatsApp message via API
  // Returns success/failure status
};
```

#### waService.js - WhatsApp API Integration
Handles API calls to WhatsApp provider

#### waziper.js - Student Code Generator
```javascript
// Generates unique student codes
const StudentCodeUtils = {
  generateUniqueStudentCode(Student) {
    // Generates 1000-9999 + 'G'
    // Checks database for uniqueness
    // Returns: "1234G"
  },
  
  isValidStudentCode(code) {
    // Validates format: ^\d{4}G$
  },
  
  extractNumericCode(code) {
    // "1234G" → "1234"
  },
  
  createStudentCode(number) {
    // 123 → "0123G"
  }
};
```

### Message Types:

#### 1. Welcome Message (Auto-sent)
```javascript
// Sent when new student registered
const message = `
مرحباً ${studentName}!

تم تسجيلك بنجاح في مركز شعلة النور

كود الطالب الخاص بك: ${studentCode}

للحضور، قم بإعطاء هذا الكود للموظف

نتمنى لك تجربة تعليمية مميزة!
`;
```

#### 2. Payment Reminder
```javascript
const message = `
عزيزي ${studentName}

رصيدك المتبقي: ${balance} جنيه

يرجى سداد المبلغ المستحق

شكراً لتعاونكم
`;
```

#### 3. Custom Messages
Send any custom message to selected students

### Bulk Notification Features:
- Select all students
- Filter by teacher
- Filter by balance (only students with debts)
- Filter by installment status
- Use message templates
- Track sent messages

---

## 🔧 Troubleshooting

### Common Issues & Solutions:

#### 1. "Cannot connect to MongoDB"
**Problem**: MongoDB not running or wrong connection string

**Solution**:
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection string in app.js
const dbURI = 'mongodb://localhost:27017/sho3latElnour';
```

#### 2. "Cannot read properties of undefined (reading 'device')"
**Problem**: Admin doesn't have device configured

**Solution**:
- Navigate to "ربط الواتساب"
- Select WhatsApp device
- Save configuration
- Or ensure code handles null device:
```javascript
const device = user && user.device ? user.device : null;
```

#### 3. "Could not find the include file './partials/nav.ejs'"
**Problem**: Missing EJS partial file

**Solution**:
File has been created at: `views/Admin/partials/nav.ejs`

#### 4. "JWT token invalid"
**Problem**: Token expired or JWT_SECRET changed

**Solution**:
```bash
# Clear cookies in browser
# Or logout and login again
# Check JWT_SECRET in .env matches
```

#### 5. "Student code already exists"
**Problem**: Duplicate student code generation

**Solution**:
System automatically retries up to 100 times. If persists:
```bash
# Check database for duplicates
# Re-index student codes
# See: STUDENT_CODE_IMPROVEMENTS.md
```

#### 6. "WhatsApp messages not sending"
**Problem**: WhatsApp API not configured or invalid credentials

**Solution**:
- Check `.env` file has correct API keys
- Verify WhatsApp device is connected
- Check API quota/limits
- Test with single message first

#### 7. "Port 8310 already in use"
**Problem**: Another instance running or port conflict

**Solution**:
```bash
# Find process using port
lsof -i :8310

# Kill process
kill -9 <PID>

# Or change port in app.js
app.listen(8311);
```

#### 8. "Session expired"
**Problem**: MongoDB session store connection lost

**Solution**:
- Check MongoDB is running
- Restart application
- Clear browser cookies

---

## 📊 Usage Examples

### Example 1: Adding a New Student

**Step-by-Step:**
1. Login as admin
2. Click "إضافة طالب" (Add Student)
3. Fill form:
   - Name: "محمد أحمد"
   - Phone: "01012345678"
   - Parent Phone: "01098765432"
   - School: "مدرسة النور"
4. Select teacher: "أ. أحمد - رياضيات"
5. Select course: "Grade 1 Math"
6. Set payment: 100 EGP per session
7. Click "إضافة" (Add)
8. Student code generated: "1234G"
9. WhatsApp message sent automatically
10. Student appears in student list

### Example 2: Recording Attendance

**Step-by-Step:**
1. Navigate to "الحضور" (Attendance)
2. Select teacher: "أ. أحمد"
3. Select course: "Grade 1 Math"
4. Click "بدء الحصة" (Start Session)
5. For each student:
   - Enter student code: "1234G"
   - Confirm amount paid: 100 EGP
   - Click "إضافة" (Add)
6. Review students present
7. Add teacher invoices if any (optional)
8. Click "إنهاء الحصة" (Finalize)
9. Review summary:
   - Total collected: 500 EGP
   - Teacher invoices: 50 EGP
   - Center fees: 50 EGP
   - Net to teacher: 400 EGP
10. Click "تأكيد" (Confirm)
11. Attendance saved and locked

### Example 3: Sending Payment Reminders

**Step-by-Step:**
1. Navigate to "الإشعارات" (Notifications)
2. Click "الطلاب بأرصدة متبقية" (Students with Balances)
3. Review list of students with debts
4. Select message template or write custom message
5. Use placeholders: `{studentName}`, `{balance}`
6. Preview message
7. Click "إرسال للكل" (Send to All)
8. System sends WhatsApp messages
9. Confirmation shown for each message
10. Messages logged in system

---

## 📈 Best Practices

### 1. Data Management
- ✅ Regular database backups
- ✅ Keep student codes organized
- ✅ Finalize attendance sessions daily
- ✅ Collect center fees promptly
- ✅ Export reports regularly

### 2. Security
- ✅ Use strong JWT_SECRET
- ✅ Change default admin password
- ✅ Don't share admin credentials
- ✅ Keep `.env` file secure
- ✅ Regular password updates

### 3. WhatsApp Usage
- ✅ Test messages before bulk send
- ✅ Use templates for consistency
- ✅ Don't spam students
- ✅ Monitor API quota
- ✅ Keep device connected

### 4. Financial Tracking
- ✅ Record all expenses immediately
- ✅ Add invoice details
- ✅ Upload receipt photos
- ✅ Reconcile daily
- ✅ Generate monthly reports

### 5. Student Management
- ✅ Keep contact info updated
- ✅ Track attendance regularly
- ✅ Follow up on absences
- ✅ Monitor payment status
- ✅ Send regular updates to parents

---

## 🚀 Advanced Features

### Custom Reports
Export attendance and financial data to Excel for custom analysis

### Bulk Operations
- Import students from Excel
- Export student list
- Bulk message sending
- Batch payment updates

### System Logs
Track all activities:
- Who added what student
- Who marked attendance
- Who sent messages
- Financial transactions

---

## 📞 Support & Maintenance

### Logging
All errors logged to console for debugging

### Database Maintenance
```bash
# Backup database
mongodump --db sho3latElnour --out ./backup

# Restore database
mongorestore --db sho3latElnour ./backup/sho3latElnour
```

### Updating System
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Restart application
nodemon app
```

---

## 📝 Additional Documentation

- **STUDENT_CODE_IMPROVEMENTS.md**: Details on student code generation system
- **README.md**: Quick project overview

---

## 🎓 Conclusion

This system provides a complete solution for managing an educational center. From student registration to financial tracking, everything is integrated and automated where possible.

**Key Takeaways:**
- Student management with unique codes
- Teacher scheduling and payment tracking
- Attendance system with real-time updates
- Integrated WhatsApp notifications
- Complete financial tracking
- Reports and analytics

For questions or issues, refer to the troubleshooting section or check the code comments in the controllers.

---

**Version**: 1.0.0  
**Last Updated**: December 19, 2025  
**Maintained by**: Sho3lat Elnour Team
