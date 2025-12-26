const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/student');

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

const {
  parentLogin,

  getAttendanceHistory,
  getPaymentHistory,
  getFinancialSummary,
  getDashboard,
  getTodayAttendance,
  getNotifications,
  markNotificationRead,
} = require('../controllers/parentController');

// ================================= MIDDLEWARE ================================ //

/**
 * Parent Authentication Middleware
 * Validates JWT token from Authorization header (Bearer token)
 * Supports student switching: Parents can access data for any of their children
 * by passing ?studentId=xxx in query params or x-student-id in headers
 * Attaches student object to req.student
 */
const parentAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح. يرجى تسجيل الدخول',
        message_en: 'Unauthorized. Please login',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Store the parent phone from token
    const parentPhone = decoded.parentPhone;

    // Check if parent wants to switch to a different student
    // Accept studentId from query params or custom header
    const requestedStudentId = req.query.studentId || req.headers['x-student-id'];

    let targetStudentId = decoded.studentId; // Default to the student from token

    // If a specific student is requested, verify it belongs to this parent
    if (requestedStudentId) {
      const requestedStudent = await Student.findById(requestedStudentId).lean();

      if (!requestedStudent) {
        return res.status(404).json({
          success: false,
          message: 'الطالب المطلوب غير موجود',
          message_en: 'Requested student not found',
        });
      }

      // Verify the requested student belongs to this parent
      const belongsToParent = 
        requestedStudent.parentPhone1 === parentPhone || 
        requestedStudent.parentPhone2 === parentPhone;

      if (!belongsToParent) {
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى بيانات هذا الطالب',
          message_en: 'You are not authorized to access this student\'s data',
        });
      }

      targetStudentId = requestedStudentId;
    }

    // Get the target student from database
    const student = await Student.findById(targetStudentId)
      .populate('class', 'className academicLevel section')
      .lean();

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'الطالب غير موجود',
        message_en: 'Student not found',
      });
    }

    // Check if student is active
    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'حساب الطالب غير نشط',
        message_en: 'Student account is inactive',
      });
    }

    // Check if student is blocked
    if (student.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'حساب الطالب محظور',
        message_en: 'Student account is blocked',
        blockReason: student.blockReason,
      });
    }

    // Attach student to request
    req.student = student;
    req.studentId = student._id;
    req.parentPhone = parentPhone;
    req.isStudentSwitched = !!requestedStudentId; // Flag to indicate if student was switched

    next();
  } catch (error) {
    console.error('Parent auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'رمز غير صالح',
        message_en: 'Invalid token',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
        message_en: 'Session expired. Please login again',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'خطأ في المصادقة',
      message_en: 'Authentication error',
    });
  }
};

// ================================= AUTHENTICATION ================================ //

/**
 * Parent Login
 * Authenticate with Parent Phone + Any Student Code
 * POST /api/parent/login
 * Body: { phoneNumber, studentCode }
 * Returns: { success, token, student, students[] }
 */
router.post('/login', parentLogin);


/**
 * Get Dashboard (Combined Data)
 * GET /api/parent/dashboard
 * Headers: Authorization: Bearer <token>
 */
router.get('/dashboard', parentAuthMiddleware, getDashboard);


/**
 * Get Attendance History
 * GET /api/parent/attendance
 * Headers: Authorization: Bearer <token>
 * Query: startDate, endDate, limit
 */
router.get('/attendance', parentAuthMiddleware, getAttendanceHistory);

/**
 * Get Payment History
 * GET /api/parent/payments
 * Headers: Authorization: Bearer <token>
 * Query: limit
 */
router.get('/payments', parentAuthMiddleware, getPaymentHistory);

/**
 * Get Financial Summary
 * GET /api/parent/financial-summary
 * Headers: Authorization: Bearer <token>
 */
router.get('/financial-summary', parentAuthMiddleware, getFinancialSummary);


// ================================= HOME PAGE APIs ================================ //

/**
 * Get Today's Attendance
 * GET /api/parent/attendance/today
 * Headers: Authorization: Bearer <token>
 */
router.get('/attendance/today', parentAuthMiddleware, getTodayAttendance);

/**
 * Get Notifications
 * GET /api/parent/notifications
 * Headers: Authorization: Bearer <token>
 * Query: limit, page
 */
router.get('/notifications', parentAuthMiddleware, getNotifications);

/**
 * Mark Notification as Read
 * POST /api/parent/notifications/:id/read
 * Headers: Authorization: Bearer <token>
 */
router.post('/notifications/:id/read', parentAuthMiddleware, markNotificationRead);

module.exports = router;
