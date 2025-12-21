const express = require('express');
const Admin = require('../models/admin');
const router = express.Router();
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;

const adminController = require('../controllers/adminController.js');
const employeeController = require('../controllers/employeeController.js');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    res.status(401).redirect('/');
  }

  try {
    const decode = jwt.verify(token, jwtSecret);
    req.adminId = decode.adminId;
    // console.log(decode.adminId);
    await Admin.findOne({ _id: decode.adminId }).then((result) => {
      // console.log(result);
      req.admin = result;
      if (result.role === 'Admin') {
        next();
      } else {
        res.clearCookie('token');
        res.status(301).redirect('/');
      }
    });
  } catch (error) {
    res.status(401).redirect('/');
  }
};

router.get('/dashboard', authMiddleware, adminController.dashboard);
router.get('/dashboard-data', authMiddleware, adminController.getDashboardData);

router.get('/employee', authMiddleware, adminController.Employee_Get);

router.post('/add-employee', authMiddleware, adminController.addEmployee);

router.get('/all-employee', authMiddleware, adminController.getEmployees);

router.put('/update-salary/:id', authMiddleware, adminController.updateSalary);

router.get('/get-employee/:id', authMiddleware, adminController.getEmployee);

router.put('/get-employee/:id', authMiddleware, adminController.updateEmployee);

router.delete(
  '/delete-employee/:id',
  authMiddleware,
  adminController.deleteEmployee
);

router.get('/employee-log/:id', authMiddleware, adminController.getEmployeeLog);

// Render employee log page
router.get('/employee-log', authMiddleware, (req, res) => {
  res.render('Admin/employeeLog', {
    title: 'Employee Log',
    path: '/admin/employee-log',
  });
});

// Student Management Routes (from employee)
router.get('/add-student', authMiddleware, employeeController.getAddStudent);
router.get('/all-students', authMiddleware, employeeController.getAllStudents);
router.get('/get-student/:id', authMiddleware, employeeController.getStudent);
router.put(
  '/update-student/:id',
  authMiddleware,
  employeeController.updateStudent
);
router.post('/add-student', authMiddleware, employeeController.addStudent);
router.get('/search-student', authMiddleware, employeeController.searchStudent);

// Student Payments
router.post(
  '/add-student-payment',
  authMiddleware,
  employeeController.addStudentPayment
);
router.put(
  '/update-student-payment/:studentId/:paymentId',
  authMiddleware,
  employeeController.updateStudentPayment
);
router.delete(
  '/delete-student-payment/:studentId/:paymentId',
  authMiddleware,
  employeeController.deleteStudentPayment
);
router.get(
  '/get-student-payments',
  authMiddleware,
  employeeController.getStudentPayments
);

// Removed teacher-based WhatsApp send route
// router.get('/send-wa', authMiddleware, employeeController.sendWa);
router.delete(
  '/delete-student/:id',
  authMiddleware,
  employeeController.deleteStudent
);
router.post(
  '/send-code-again/:id',
  authMiddleware,
  employeeController.sendCodeAgain
);

// Student Blocking Management
router.post(
  '/block-student/:studentId',
  authMiddleware,
  employeeController.blockStudent
);
router.post(
  '/unblock-student/:studentId',
  authMiddleware,
  employeeController.unblockStudent
);

// Installment Management
router.post(
  '/add-installment',
  authMiddleware,
  employeeController.addInstallmentPayment
);
router.get(
  '/installment-history/:studentId',
  authMiddleware,
  employeeController.getInstallmentHistory
);
router.put(
  '/update-course-details',
  authMiddleware,
  employeeController.updateCourseDetails
);

// Attendance Management
router.get('/attendance', authMiddleware, employeeController.getAttendance);
router.post(
  '/attend-student',
  authMiddleware,
  employeeController.attendStudent
);
router.get('/getDeviceData', authMiddleware, employeeController.getDeviceData);
router.get(
  '/get-attended-students',
  authMiddleware,
  employeeController.getAttendedStudents
);
router.delete(
  '/delete-attend-student/:id',
  authMiddleware,
  employeeController.deleteAttendStudent
);
router.get(
  '/download-attendance-excel',
  authMiddleware,
  employeeController.downloadAttendanceExcel
);
router.put(
  '/edit-student-amount-remaining-and-paid/:id',
  authMiddleware,
  employeeController.editStudentAmountRemainingAndPaid
);
router.put(
  '/select-device/:deviceId',
  authMiddleware,
  employeeController.selectDevice
);
// Removed duplicate route - using adminController.deleteInvoice instead
router.put(
  '/update-invoice/:invoiceId',
  authMiddleware,
  employeeController.updateInvoice
);

// Attendance by date routes (kept for other functionality)
router.get(
  '/attendance-by-date',
  authMiddleware,
  employeeController.getAttendanceByDate
);
router.get(
  '/download-attendance-excel-by-date-range',
  authMiddleware,
  employeeController.downloadAttendanceExcelByDate
);
router.get(
  '/download-sendExcelEmployeeByDate/:id',
  authMiddleware,
  employeeController.downloadAndSendExcelForEmployeeByDate
);

// Student Logs
// REMOVED: student-logs routes - replaced with student-attendance-log

// billing Route removed - using Admin-billing instead

router.get('/all-bills', authMiddleware, adminController.allBills);

router.get(
  '/download-excel',
  authMiddleware,
  adminController.downloadBillExcel
);

// Billing Route

router.get('/Admin-billing', authMiddleware, adminController.admin_billing_Get);

router.post('/Admin-add-bill', authMiddleware, adminController.Admin_addBill);

router.get(
  '/Admin-get-all-bills',
  authMiddleware,
  adminController.Admin_getAllBills
);

// LogOut

router.get('/logout', authMiddleware, adminController.logOut);


// ========== NEW SYSTEM ROUTES ========== //

// Class Management Routes
router.get('/classes', authMiddleware, adminController.classes_Get);
router.get('/all-classes', authMiddleware, adminController.getAllClasses);
router.post('/add-class', authMiddleware, adminController.addClass);
router.get('/get-class/:id', authMiddleware, adminController.getClass);
router.put('/update-class/:id', authMiddleware, adminController.updateClass);
router.delete('/delete-class/:id', authMiddleware, adminController.deleteClass);

// Student Logs (Audit) Routes
// REMOVED: student-logs routes - replaced with student-attendance-log

// Employee Payment & Deduction Routes
router.post(
  '/add-employee-payment',
  authMiddleware,
  adminController.addEmployeePayment
);
router.get(
  '/get-employee-payments',
  authMiddleware,
  adminController.getEmployeePayments
);
router.get(
  '/get-employee-payment/:paymentId',
  authMiddleware,
  adminController.getEmployeePayment
);
router.put(
  '/update-employee-payment/:paymentId',
  authMiddleware,
  adminController.updateEmployeePayment
);
router.delete(
  '/delete-employee-payment/:paymentId',
  authMiddleware,
  adminController.deleteEmployeePayment
);
router.post(
  '/add-employee-deduction',
  authMiddleware,
  adminController.addEmployeeDeduction
);
router.get(
  '/get-employee-deductions',
  authMiddleware,
  adminController.getEmployeeDeductions
);
router.get(
  '/employee-salary-history/:employeeId',
  authMiddleware,
  adminController.getEmployeeSalaryHistory
);

// Attendance Management Routes
router.get('/attendance', authMiddleware, adminController.attendance_Get);
router.get(
  '/get-attendance',
  authMiddleware,
  adminController.getAttendanceByDate
);
router.get(
  '/get-students-by-class',
  authMiddleware,
  adminController.getStudentsByClass
);
router.post(
  '/record-attendance',
  authMiddleware,
  adminController.recordAttendance
);
router.get(
  '/student-attendance-history',
  authMiddleware,
  adminController.getStudentAttendanceHistory
);

// Billing/Invoice Management Routes (using Admin-billing page)
router.post('/create-invoice', authMiddleware, adminController.createInvoice);
router.get('/get-invoices', authMiddleware, adminController.getInvoices);
router.get(
  '/invoice-summary',
  authMiddleware,
  adminController.getInvoiceSummary
);
router.get('/get-invoice/:id', authMiddleware, adminController.getInvoiceById);
router.delete(
  '/delete-invoice/:invoiceId',
  authMiddleware,
  adminController.deleteInvoice
);

// ========== AUTOMATED ATTENDANCE SYSTEM ROUTES ========== //

// ZKTeco Device ID Management
router.put(
  '/assign-student-zkteco-id/:studentId',
  authMiddleware,
  adminController.assignStudentZKTecoId
);
router.put(
  '/assign-employee-zkteco-id/:employeeId',
  authMiddleware,
  adminController.assignEmployeeZKTecoId
);

// Daily Class Attendance Reports
router.get(
  '/daily-class-attendance',
  authMiddleware,
  adminController.getDailyClassAttendanceReport
);
router.get(
  '/class-attendance-summary/:classId',
  authMiddleware,
  adminController.getClassAttendanceSummary
);

// Employee Attendance Reports
router.get(
  '/employee-attendance-report',
  authMiddleware,
  adminController.getEmployeeAttendanceReport
);
router.get(
  '/employee-attendance-detail/:employeeId',
  authMiddleware,
  adminController.getEmployeeAttendanceDetail
);

// ==================== NEW DASHBOARD VIEWS ====================

// Student Attendance Dashboard - Main view
router.get('/student-attendance-dashboard', authMiddleware, (req, res) => {
  res.render('Admin/studentAttendance', {
    title: 'حضور الطلاب',
    path: '/admin/student-attendance-dashboard',
  });
});

// Student Attendance Dashboard - API endpoint
router.get(
  '/student-attendance-dashboard-data',
  authMiddleware,
  adminController.studentAttendanceDashboard_Get
);

// Employee Attendance Dashboard - Main view
router.get('/employee-attendance-dashboard', authMiddleware, (req, res) => {
  res.render('Admin/employeeAttendance', {
    title: 'حضور الموظفين',
    path: '/admin/employee-attendance-dashboard',
  });
});

// Employee Attendance Dashboard - API endpoint
router.get(
  '/employee-attendance-dashboard-data',
  authMiddleware,
  adminController.employeeAttendanceDashboard_Get
);

// Export Student Attendance Dashboard
router.get(
  '/export-student-attendance',
  authMiddleware,
  adminController.exportStudentAttendanceDashboard
);

// Export Employee Attendance Dashboard
router.get(
  '/export-employee-attendance',
  authMiddleware,
  adminController.exportEmployeeAttendanceDashboard
);

// Student Log - Individual student complete history view
router.get('/student-log-view/:id', authMiddleware, (req, res) => {
  res.render('Admin/studentAttendanceLog', {
    title: 'سجل الطالب',
    path: '/admin/student-log-view',
  });
});

// Student Log - API endpoint
router.get('/student-log/:id', authMiddleware, adminController.studentLog_Get);
router.get('/student-log-by-code/:code', authMiddleware, adminController.studentLogByCode_Get);
router.get('/student-attendance-log', authMiddleware, (req, res) => {
  res.render('Admin/studentAttendanceLog', {
    title: 'سجل الطالب الشامل',
    path: '/admin/student-attendance-log',
  });
});

// Employee Log - Individual employee complete history view
router.get('/employee-log-view/:id', authMiddleware, (req, res) => {
  res.render('Admin/employeeAttendanceLog', {
    title: 'سجل الموظف',
    path: '/admin/employee-log-view',
  });
});

// Employee Log - API endpoint (already exists but we're keeping both)
router.get(
  '/employee-log-data/:id',
  authMiddleware,
  adminController.employeeLog_Get
);
router.get('/employee-log-by-code/:code', authMiddleware, adminController.employeeLogByCode_Get);
router.get('/employee-attendance-log', authMiddleware, (req, res) => {
  res.render('Admin/employeeAttendanceLog', {
    title: 'سجل الموظف الشامل',
    path: '/admin/employee-attendance-log',
  });
});

module.exports = router;
