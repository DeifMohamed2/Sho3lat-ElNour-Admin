const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Attendance = require('../models/attendance');
const StudentPayment = require('../models/studentPayment');

// Simple authentication middleware for parent API
// Parents authenticate using student code
const parentAuth = async (req, res, next) => {
  const { studentCode } = req.headers;

  if (!studentCode) {
    return res.status(401).json({ error: 'Student code required' });
  }

  try {
    const student = await Student.findOne({
      studentCode: studentCode.trim(),
      isActive: true,
    });

    if (!student) {
      return res.status(401).json({ error: 'Invalid student code' });
    }

    req.student = student;
    next();
  } catch (error) {
    console.error('Parent auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// ================================= PARENT READ-ONLY APIs ================================ //

// Get student profile
router.get('/student-profile', parentAuth, async (req, res) => {
  try {
    const student = await req.student.populate(
      'class',
      'className academicLevel section'
    );

    res.json({
      studentName: student.studentName,
      studentCode: student.studentCode,
      class: student.class,
      parentName: student.parentName,
      totalSchoolFees: student.totalSchoolFees,
      totalPaid: student.totalPaid,
      remainingBalance: student.remainingBalance,
      isActive: student.isActive,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Get attendance history
router.get('/attendance-history', parentAuth, async (req, res) => {
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
      records: attendanceRecords,
      statistics: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendancePercentage,
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Error fetching attendance history' });
  }
});

// Get payment history
router.get('/payment-history', parentAuth, async (req, res) => {
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
      payments,
      totalPaid: req.student.totalPaid,
      totalFees: req.student.totalSchoolFees,
      remainingBalance: req.student.remainingBalance,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Error fetching payment history' });
  }
});

// Get financial summary
router.get('/financial-summary', parentAuth, async (req, res) => {
  try {
    const student = req.student;

    // Get recent payments
    const recentPayments = await StudentPayment.find({
      student: student._id,
      isReversed: false,
    })
      .sort({ paymentDate: -1 })
      .limit(5)
      .select('amount paymentDate')
      .lean();

    // Calculate payment progress percentage
    const paymentProgress =
      student.totalSchoolFees > 0
        ? ((student.totalPaid / student.totalSchoolFees) * 100).toFixed(1)
        : 0;

    res.json({
      totalSchoolFees: student.totalSchoolFees,
      totalPaid: student.totalPaid,
      remainingBalance: student.remainingBalance,
      paymentProgress: parseFloat(paymentProgress),
      recentPayments,
      lastPaymentDate: recentPayments[0]?.paymentDate || null,
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ error: 'Error fetching financial summary' });
  }
});

// Get combined student dashboard
router.get('/dashboard', parentAuth, async (req, res) => {
  try {
    const student = await req.student.populate(
      'class',
      'className academicLevel section'
    );

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
      .select('amount paymentDate')
      .lean();

    res.json({
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
    res.status(500).json({ error: 'Error fetching dashboard' });
  }
});

module.exports = router;
