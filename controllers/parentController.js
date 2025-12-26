const Student = require('../models/student');
const Class = require('../models/class');
const Attendance = require('../models/attendance');
const StudentPayment = require('../models/studentPayment');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

// ================================= PARENT AUTHENTICATION ================================ //

/**
 * Parent Login API - Step 1: Get all students for a phone number
 * Login using parent phone number only
 * POST /api/parent/login
 * Body: { phoneNumber }
 */
/**
 * Parent Login API
 * Login using parent phone number AND one of their students' codes
 * POST /api/parent/login
 * Body: { phoneNumber, studentCode }
 */
const parentLogin = async (req, res) => {
  try {
    let { phoneNumber, studentCode, fcmToken } = req.body;

    // Trim whitespace
    phoneNumber = phoneNumber ? String(phoneNumber).trim() : '';
    studentCode = studentCode ? String(studentCode).trim() : '';
    fcmToken = fcmToken ? String(fcmToken).trim() : null;

    // Validate input
    if (!phoneNumber || !studentCode) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف وكود الطالب مطلوبان', // Phone number and student code are required
        message_en: 'Phone number and student code are required',
      });
    }

    // 1. Verify that this specific Student Code belongs to this Parent Phone
    const matchedStudent = await Student.findOne({
      studentCode: studentCode,
      $or: [{ parentPhone1: phoneNumber }, { parentPhone2: phoneNumber }],
      isActive: true,
    });

    if (!matchedStudent) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة. تأكد من رقم الهاتف وكود الطالب', // Invalid credentials
        message_en: 'Invalid credentials. Please check phone number and student code',
      });
    }

    if (matchedStudent.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'حساب الطالب محظور', // Student account is blocked
        message_en: 'Student account is blocked',
        blockReason: matchedStudent.blockReason,
      });
    }

    // 2. Update FCM token for ALL students of this parent (if provided)
    if (fcmToken) {
      try {
        await Student.updateMany(
          {
            $or: [{ parentPhone1: phoneNumber }, { parentPhone2: phoneNumber }],
            isActive: true,
          },
          {
            $addToSet: { fcmTokens: fcmToken }, // Add token only if it doesn't exist
          }
        );
        console.log(`✅ FCM token updated for all students of parent: ${phoneNumber}`);
      } catch (error) {
        console.error('Error updating FCM tokens:', error);
        // Don't fail login if FCM update fails
      }
    }

    // 3. Credentials are valid. Now fetch ALL students for this parent.
    const allStudents = await Student.find({
      $or: [{ parentPhone1: phoneNumber }, { parentPhone2: phoneNumber }],
      isActive: true,
    })
      .populate('class', 'className academicLevel section')
      .select('studentName studentCode class parentName totalSchoolFees totalPaid remainingBalance isBlocked blockReason')
      .lean();

    // Filter out blocked students (or handle them as needed - here keeping them but marking blocked)
    const activeStudents = allStudents.filter(s => !s.isBlocked);
    const blockedStudents = allStudents.filter(s => s.isBlocked);

    // Format student list
    const studentList = activeStudents.map(student => ({
      id: student._id,
      name: student.studentName,
      code: student.studentCode,
      class: student.class,
      totalSchoolFees: student.totalSchoolFees,
      totalPaid: student.totalPaid,
      remainingBalance: student.remainingBalance,
    }));

    // Generate JWT token for the MATCHED student (the one used for login)
    // This allows the app to start with a valid session context
    const token = jwt.sign(
      {
        studentId: matchedStudent._id,
        studentCode: matchedStudent.studentCode,
        parentPhone: phoneNumber,
      },
      jwtSecret,
      { expiresIn: '30d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح', // Login successful
      message_en: 'Login successful',
      token, // Return the token immediately
      student: { // Return the matched student initially
        id: matchedStudent._id,
        name: matchedStudent.studentName,
        code: matchedStudent.studentCode,
        class: matchedStudent.class, // Note: populated above in findOne if we added .populate there, but we didn't. Let's rely on the list or lightweight details.
                                     // Actually matchedStudent was not populated. For consistency, let's pick the populated version from allStudents.
        // We find the matched student inside allStudents to get populated fields if needed, or just return basic.
        // Let's populate matchedStudent implicitly by finding it in the list.
       ...studentList.find(s => s.code === matchedStudent.studentCode)
      },
      students: studentList, // Return list of all siblings
      hasBlockedStudents: blockedStudents.length > 0,
      blockedCount: blockedStudents.length,
    });

  } catch (error) {
    console.error('Parent login error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول', // Error during login
      message_en: 'Error during login',
      error: error.message,
    });
  }
};


const getAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const query = { student: req.student._id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .select('date status notes')
      .lean();

    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'Present'
    ).length;
    const lateDays = attendanceRecords.filter(
      (a) => a.status === 'Late'
    ).length;
    const absentDays = attendanceRecords.filter(
      (a) => a.status === 'Absent'
    ).length;
    const attendancePercentage =
      totalDays > 0
        ? (((presentDays + lateDays) / totalDays) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      records: attendanceRecords,
      statistics: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendancePercentage: parseFloat(attendancePercentage),
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل الحضور', // Error fetching attendance history
      message_en: 'Error fetching attendance history',
    });
  }
};

/**
 * Get Payment History
 * GET /api/parent/payments
 * Query params: limit
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const payments = await StudentPayment.find({
      student: req.student._id,
      isReversed: false,
    })
      .sort({ paymentDate: -1 })
      .limit(parseInt(limit))
      .select('amount paymentDate paymentMethod notes receiptNumber')
      .lean();

    res.json({
      success: true,
      payments,
      summary: {
        totalPaid: req.student.totalPaid,
        totalFees: req.student.totalSchoolFees,
        remainingBalance: req.student.remainingBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل المدفوعات', // Error fetching payment history
      message_en: 'Error fetching payment history',
    });
  }
};

/**
 * Get Financial Summary
 * GET /api/parent/financial-summary
 */
const getFinancialSummary = async (req, res) => {
  try {
    const student = req.student;

    // Get recent payments
    const recentPayments = await StudentPayment.find({
      student: student._id,
      isReversed: false,
    })
      .sort({ paymentDate: -1 })
      .limit(5)
      .select('amount paymentDate paymentMethod')
      .lean();

    // Calculate payment progress percentage
    const paymentProgress =
      student.totalSchoolFees > 0
        ? ((student.totalPaid / student.totalSchoolFees) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      financial: {
        totalSchoolFees: student.totalSchoolFees,
        totalPaid: student.totalPaid,
        remainingBalance: student.remainingBalance,
        paymentProgress: parseFloat(paymentProgress),
        lastPaymentDate: recentPayments[0]?.paymentDate || null,
      },
      recentPayments,
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملخص المالي', // Error fetching financial summary
      message_en: 'Error fetching financial summary',
    });
  }
};

/**
 * Get Dashboard (Combined data)
 * GET /api/parent/dashboard
 */
const getDashboard = async (req, res) => {
  try {
    const student = req.student;

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.findOne({
      student: student._id,
      date: { $gte: today, $lte: todayEnd },
    })
      .select('status')
      .lean();

    // Get this month's attendance
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthAttendance = await Attendance.find({
      student: student._id,
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select('status')
      .lean();

    const monthPresent = monthAttendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    const monthTotal = monthAttendance.length;
    const monthPercentage =
      monthTotal > 0 ? ((monthPresent / monthTotal) * 100).toFixed(1) : 0;

    // Get recent payments
    const recentPayments = await StudentPayment.find({
      student: student._id,
      isReversed: false,
    })
      .sort({ paymentDate: -1 })
      .limit(3)
      .select('amount paymentDate paymentMethod')
      .lean();

    res.json({
      success: true,
      student: {
        name: student.studentName,
        code: student.studentCode,
        class: student.class,
      },
      todayAttendance: todayAttendance?.status || 'Not Marked',
      monthlyAttendance: {
        present: monthPresent,
        total: monthTotal,
        percentage: parseFloat(monthPercentage),
      },
      financial: {
        totalFees: student.totalSchoolFees,
        paid: student.totalPaid,
        remaining: student.remainingBalance,
      },
      recentPayments,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب لوحة التحكم', // Error fetching dashboard
      message_en: 'Error fetching dashboard',
    });
  }
};

/**
 * Get Today's Attendance
 * GET /api/parent/attendance/today
 * Query: studentId (optional, defaults to current req.student)
 */
const getTodayAttendance = async (req, res) => {
  try {
    const student = req.student;

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.findOne({
      student: student._id,
      date: { $gte: today, $lte: todayEnd },
    })
      .select('status entryTime exitTime notes date')
      .lean();

    res.json({
      success: true,
      attendance: todayAttendance || null,
      date: today,
    });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب حضور اليوم',
      message_en: 'Error fetching today attendance',
    });
  }
};

/**
 * Get Notifications
 * GET /api/parent/notifications
 * Query: limit (default 10, use '3' for recent), page
 */
const getNotifications = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const student = req.student;

    const notifications = await Notification.find({ recipient: student._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments({ recipient: student._id });
    const unreadCount = await Notification.countDocuments({ recipient: student._id, isRead: false });

    res.json({
      success: true,
      notifications,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإشعارات',
      message_en: 'Error fetching notifications',
    });
  }
};

/**
 * Mark Notification as Read
 * POST /api/parent/notifications/:id/read
 */
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const student = req.student;

    const notification = await Notification.findOne({ _id: id, recipient: student._id });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود',
        message_en: 'Notification not found',
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'تم تحديد الإشعار كمقروء',
      message_en: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الإشعار',
      message_en: 'Error updating notification',
    });
  }
};

module.exports = {
  parentLogin,
  getAttendanceHistory,
  getPaymentHistory,
  getFinancialSummary,
  getDashboard,
  getTodayAttendance,
  getNotifications,
  markNotificationRead,
};

