const Employee = require('../models/employee');
const Billing = require('../models/billing');
const Attendance = require('../models/attendance');
const Student = require('../models/student');
const Admin = require('../models/admin');
const Class = require('../models/class');
// StudentPayment model removed - payments now stored in Student model
const EmployeePayment = require('../models/employeePayment');
const EmployeeDeduction = require('../models/employeeDeduction');
const EmployeeAttendance = require('../models/employeeAttendance');
const excelJS = require('exceljs');
const schedule = require('node-schedule');
const path = require('path');
const qrcode = require('qrcode');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');

// Helper function to get category Arabic names
const getCategoryArabicNames = () => {
  return {
    // IN Categories (إيرادات)
    student_payment: 'مصروفات طالب',
    canteen_income: 'إيرادات المقصف',
    course_fees: 'رسوم الدورات',
    registration_fees: 'رسوم التسجيل',
    book_sales: 'مبيعات الكتب',
    other_income: 'إيرادات أخرى',

    // OUT Categories (مصروفات)
    employee_salary: 'راتب موظف',
    rent: 'إيجار',
    utilities: 'مرافق عامة',
    electric: 'كهرباء',
    water: 'مياه',
    internet: 'إنترنت',
    phone: 'هاتف',
    maintenance: 'صيانة',
    supplies: 'لوازم مكتبية',
    equipment: 'معدات',
    furniture: 'أثاث',
    transportation: 'مواصلات',
    fuel: 'وقود',
    food: 'طعام',
    cleaning: 'نظافة',
    security: 'أمن',
    insurance: 'تأمين',
    marketing: 'تسويق',
    advertising: 'إعلانات',
    printing: 'طباعة',
    books: 'كتب ومواد تعليمية',
    stationery: 'قرطاسية',
    medical: 'طبي',
    training: 'تدريب',
    consulting: 'استشارات',
    legal: 'قانوني',
    accounting: 'محاسبة',
    bank_fees: 'رسوم بنكية',
    government_fees: 'رسوم حكومية',
    taxes: 'ضرائب',
    donations: 'تبرعات',
    other_expense: 'مصروفات أخرى',

    // Legacy category mappings
    salaries: 'الرواتب',
    canteen_in: 'مقصف (داخل)',
    canteen_out: 'مقصف (خارج)',
    equipments: 'المعدات والأجهزة',
    electric_invoices: 'فواتير الكهرباء',
    other: 'أخرى',
  };
};

// Helper function to get date range based on period
const getDateRange = (period, customStart = null, customEnd = null) => {
  const now = new Date();
  let startDate, endDate;

  if (customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else {
    switch (period) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
};

const dashboard = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const { startDate: start, endDate: end } = getDateRange(
      period,
      startDate,
      endDate
    );

    // Get all analytics data
    const analytics = await getDashboardAnalytics(start, end);

    res.render('Admin/dashboard', {
      title: 'Dashboard',
      path: '/admin/dashboard',
      analytics,
      period,
      startDate: start,
      endDate: end,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
};

// NEW DASHBOARD ANALYTICS - SCHOOL MANAGEMENT FOCUSED
const getDashboardAnalytics = async (startDate, endDate) => {
  try {
    console.log('Dashboard Analytics - Date Range:', { startDate, endDate });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch all required data concurrently
    const [
      totalStudents,
      totalEmployees,
      totalClasses,
      activeStudents,
      todayAttendance,
      monthlyAttendance,
      totalOutstandingFees,
      monthlyIncome,
      monthlyExpenses,
      allStudents,
      recentPayments,
    ] = await Promise.all([
      Student.countDocuments(),
      Employee.countDocuments(),
      Class.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true }),

      // Today's attendance summary
      Attendance.countDocuments({
        date: { $gte: today, $lte: todayEnd },
        status: { $in: ['Present', 'Late'] },
      }),

      // Monthly attendance for percentage calculation
      Attendance.find({
        date: { $gte: startDate, $lte: endDate },
      }).lean(),

      // Outstanding fees
      Student.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
      ]),

      // Monthly income (student payments) - from payments array in Student model
      Student.aggregate([
        {
          $match: {
            isActive: true,
          },
        },
        {
          $unwind: {
            path: '$payments',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            'payments.paymentDate': { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } },
      ]),

      // Monthly expenses (salaries + operational)
      Billing.aggregate([
        {
          $match: {
            invoiceType: 'OUT',
            invoiceDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // All students for remaining balance calculation
      Student.find({ isActive: true })
        .select('totalSchoolFees totalPaid remainingBalance')
        .lean(),

      // Recent payments for activity feed - from payments array in Student model
      Student.aggregate([
        {
          $match: { isActive: true },
        },
        { $unwind: '$payments' },
        { $sort: { 'payments.paymentDate': -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'employees',
            localField: 'payments.receivedBy',
            foreignField: '_id',
            as: 'receivedByInfo',
          },
        },
        {
          $project: {
            studentName: 1,
            studentCode: 1,
            payment: {
              amount: '$payments.amount',
              paymentMethod: '$payments.paymentMethod',
              paymentDate: '$payments.paymentDate',
              notes: '$payments.notes',
              receivedBy: { $arrayElemAt: ['$receivedByInfo', 0] },
            },
          },
        },
      ]),
    ]);

    // Calculate today's attendance percentage
    const todayAttendancePercentage =
      activeStudents > 0
        ? ((todayAttendance / activeStudents) * 100).toFixed(1)
        : 0;

    // Calculate monthly attendance percentage
    const uniqueStudentAttendance = new Set();
    const presentCount = monthlyAttendance.filter((a) => {
      const key = `${a.student}-${new Date(a.date).toDateString()}`;
      if (a.status === 'Present' || a.status === 'Late') {
        uniqueStudentAttendance.add(key);
        return true;
      }
      return false;
    }).length;

    const totalPossibleAttendance =
      activeStudents * getWorkingDays(startDate, endDate);
    const monthlyAttendancePercentage =
      totalPossibleAttendance > 0
        ? ((presentCount / totalPossibleAttendance) * 100).toFixed(1)
        : 0;

    // Calculate financial totals
    const monthlyIncomeTotal = monthlyIncome[0]?.total || 0;
    const monthlyExpensesTotal = monthlyExpenses[0]?.total || 0;
    const netBalance = monthlyIncomeTotal - monthlyExpensesTotal;
    const outstandingFeesTotal = totalOutstandingFees[0]?.total || 0;

    // Calculate upcoming salary obligations
    const upcomingSalaries = await calculateUpcomingSalaries();

    // Get expense breakdown by category
    const expenseBreakdown = await Billing.aggregate([
      {
        $match: {
          invoiceType: 'OUT',
          invoiceDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Get monthly trend data (last 6 months)
    const monthlyTrend = await getMonthlyTrendData();

    // Class-wise student distribution
    const classDistribution = await Student.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      { $unwind: '$classInfo' },
      {
        $group: {
          _id: '$class',
          className: { $first: '$classInfo.className' },
          academicLevel: { $first: '$classInfo.academicLevel' },
          count: { $sum: 1 },
        },
      },
      { $sort: { academicLevel: 1 } },
    ]);

    return {
      // Core Metrics
      totalStudents,
      totalEmployees,
      totalClasses,
      activeStudents,

      // Attendance Metrics
      todayAttendance,
      todayAttendancePercentage,
      monthlyAttendancePercentage,

      // Financial Metrics
      monthlyIncome: monthlyIncomeTotal,
      monthlyExpenses: monthlyExpensesTotal,
      netBalance,
      outstandingFees: outstandingFeesTotal,
      upcomingSalaries,

      // Breakdown Data
      expenseBreakdown,
      classDistribution,
      monthlyTrend,
      recentPayments,

      // Period Info
      period: {
        startDate,
        endDate,
      },
    };
  } catch (error) {
    console.error('Analytics error:', error);
    throw error;
  }
};

// Helper: Calculate working days between two dates
const getWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    // Count all days except Friday (or adjust based on your school's schedule)
    if (day !== 5) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

// Helper: Calculate upcoming salary obligations
const calculateUpcomingSalaries = async () => {
  // Add employee salaries
  const employees = await Employee.find().select('employeeSalary').lean();
  const employeeSalaries = employees.reduce(
    (sum, emp) => sum + (emp.employeeSalary || 0),
    0
  );

  return employeeSalaries;
};

// Helper: Get monthly trend data (last 6 months)
const getMonthlyTrendData = async () => {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const [income, expenses] = await Promise.all([
      Student.aggregate([
        {
          $match: { isActive: true },
        },
        { $unwind: '$payments' },
        {
          $match: {
            'payments.paymentDate': { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } },
      ]),

      Billing.aggregate([
        {
          $match: {
            invoiceType: 'OUT',
            invoiceDate: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const incomeTotal = income[0]?.total || 0;
    const expensesTotal = expenses[0]?.total || 0;

    months.push({
      month: monthStart.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
      income: incomeTotal,
      expenses: expensesTotal,
      profit: incomeTotal - expensesTotal,
    });
  }

  return months;
};

// Helper function to get monthly data
const getMonthlyData = async () => {
  const months = [];
  const now = new Date();

  // Create all month ranges first
  const monthRanges = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    monthRanges.push({
      monthStart,
      monthEnd,
      monthLabel: monthStart.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      }),
    });
  }

  // Fetch all data in parallel for better performance
  const dataPromises = monthRanges.map(async ({ monthStart, monthEnd }) => {
    const [attendanceData, billingData] = await Promise.all([
      Attendance.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      })
        .select('studentsPresent.feesApplied')
        .lean(),

      Billing.find({
        createdAt: { $gte: monthStart, $lte: monthEnd },
      })
        .select('billAmount billCategory')
        .lean(),
    ]);

    let revenue = 0;
    let expenses = 0;

    // Calculate revenue
    for (const attendance of attendanceData) {
      for (const student of attendance.studentsPresent) {
        revenue += student.feesApplied || 0;
      }
    }

    // Calculate expenses (exclude canteen_in)
    for (const bill of billingData) {
      if (bill.billCategory !== 'canteen_in') {
        expenses += bill.billAmount;
      }
    }

    return { revenue, expenses, profit: revenue - expenses };
  });

  const results = await Promise.all(dataPromises);

  // Combine results with month labels
  monthRanges.forEach(({ monthLabel }, index) => {
    months.push({
      month: monthLabel,
      ...results[index],
    });
  });

  return months;
};

const getWeeklyData = async (startDate, endDate) => {
  const weeks = [];
  const currentDate = new Date(startDate);

  // Create all week ranges first
  const weekRanges = [];
  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    weekRanges.push({
      weekStart,
      weekEnd,
      weekLabel: `Week ${weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Fetch all data in parallel for better performance
  const dataPromises = weekRanges.map(async ({ weekStart, weekEnd }) => {
    const [attendanceData, billingData] = await Promise.all([
      Attendance.find({
        createdAt: { $gte: weekStart, $lte: weekEnd },
      })
        .select('studentsPresent.feesApplied')
        .lean(),

      Billing.find({
        createdAt: { $gte: weekStart, $lte: weekEnd },
      })
        .select('billAmount billCategory')
        .lean(),
    ]);

    let revenue = 0;
    let expenses = 0;

    // Calculate revenue
    for (const attendance of attendanceData) {
      for (const student of attendance.studentsPresent) {
        revenue += student.feesApplied || 0;
      }
    }

    // Calculate expenses (exclude canteen_in)
    for (const bill of billingData) {
      if (bill.billCategory !== 'canteen_in') {
        expenses += bill.billAmount;
      }
    }

    return { revenue, expenses, profit: revenue - expenses };
  });

  const results = await Promise.all(dataPromises);

  // Combine results with week labels
  weekRanges.forEach(({ weekLabel }, index) => {
    weeks.push({
      week: weekLabel,
      ...results[index],
    });
  });

  return weeks;
};

// Enhanced API endpoint for dashboard data with comprehensive analytics
const getDashboardData = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const { startDate: start, endDate: end } = getDateRange(
      period,
      startDate,
      endDate
    );

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds timeout
    });

    // Get base analytics
    const baseAnalyticsPromise = getDashboardAnalytics(start, end);
    
    // Get additional analytics in parallel
    const [
      baseAnalytics,
      monthlyData,
      weeklyData,
      teacherPerformance,
      expenseDetails,
      revenueBreakdown
    ] = await Promise.race([
      Promise.all([
        baseAnalyticsPromise,
        getMonthlyData(),
        getWeeklyData(start, end),
        getTeacherPerformance(start, end),
        getExpenseDetails(start, end),
        getRevenueBreakdown(start, end)
      ]),
      timeoutPromise
    ]);

    // Combine all analytics
    const comprehensiveAnalytics = {
      ...baseAnalytics,
      monthlyData,
      weeklyData,
      teacherPerformance,
      expenseDetails,
      revenueBreakdown,
      expenseCategories: expenseDetails.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {})
    };

    res.json(comprehensiveAnalytics);
  } catch (error) {
    console.error('Dashboard data error:', error);
    if (error.message === 'Request timeout') {
      res
        .status(408)
        .json({ error: 'Request timeout - data loading took too long' });
    } else {
      res.status(500).json({ error: 'Error fetching dashboard data' });
    }
  }
};

// Enhanced teacher performance analytics
const getTeacherPerformance = async (startDate, endDate) => {
  try {
    const teachers = await Employee.find({ employeeType: 'teacher' })
      .select('employeeName employeeCode')
      .lean();

    const performance = await Promise.all(
      teachers.map(async (teacher) => {
        // Get students assigned to this teacher
        const students = await Student.find({
          isActive: true,
          // Assuming there's a teacher field or relationship
        })
          .select('totalSchoolFees payments')
          .lean();

        // Calculate total fees from students
        let totalFees = 0;
        let studentCount = 0;
        let teacherInvoices = 0;

        students.forEach((student) => {
          const periodPayments = student.payments?.filter(
            (p) =>
              new Date(p.paymentDate) >= startDate &&
              new Date(p.paymentDate) <= endDate
          ) || [];
          
          const periodTotal = periodPayments.reduce(
            (sum, p) => sum + (p.amount || 0),
            0
          );
          totalFees += periodTotal;
          if (student.totalSchoolFees > 0) studentCount++;
        });

        // Get teacher invoices (bills)
        const invoices = await Billing.find({
          invoiceType: 'OUT',
          invoiceDate: { $gte: startDate, $lte: endDate },
          // Assuming there's a teacher field in billing
        }).lean();

        teacherInvoices = invoices.reduce(
          (sum, inv) => sum + (inv.amount || 0),
          0
        );

        // Calculate center fees (assuming 20% or from a field)
        const centerFees = totalFees * 0.2; // Adjust based on your logic
        const netRevenue = totalFees - centerFees - teacherInvoices;
        const percentage =
          totalFees > 0 ? ((centerFees / totalFees) * 100).toFixed(1) : 0;

        return {
          teacherName: teacher.employeeName,
          teacherCode: teacher.employeeCode,
          studentCount,
          totalFees,
          centerFees,
          teacherInvoices,
          netRevenue,
          percentage: parseFloat(percentage)
        };
      })
    );

    return performance
      .filter((p) => p.totalFees > 0)
      .sort((a, b) => b.totalFees - a.totalFees);
  } catch (error) {
    console.error('Error getting teacher performance:', error);
    return [];
  }
};

// Get detailed expense breakdown
const getExpenseDetails = async (startDate, endDate) => {
  try {
    const expenses = await Billing.find({
      invoiceType: 'OUT',
      invoiceDate: { $gte: startDate, $lte: endDate }
    })
      .select('amount category billName invoiceDate')
      .lean();

    return expenses.map((exp) => ({
      amount: exp.amount || 0,
      category: exp.category || 'other',
      billName: exp.billName || 'N/A',
      date: exp.invoiceDate
    }));
  } catch (error) {
    console.error('Error getting expense details:', error);
    return [];
  }
};

// Get revenue breakdown by source
const getRevenueBreakdown = async (startDate, endDate) => {
  try {
    // Student payments
    const studentPayments = await Student.aggregate([
      { $match: { isActive: true } },
      { $unwind: { path: '$payments', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'payments.paymentDate': { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$payments.amount' } } }
    ]);

    // Canteen income
    const canteenIncome = await Billing.aggregate([
      {
        $match: {
          invoiceType: 'IN',
          category: 'canteen_income',
          invoiceDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return {
      studentPayments: studentPayments[0]?.total || 0,
      canteenIncome: canteenIncome[0]?.total || 0
    };
  } catch (error) {
    console.error('Error getting revenue breakdown:', error);
    return { studentPayments: 0, canteenIncome: 0 };
  }
};

const Employee_Get = (req, res) => {
  res.render('Admin/employee', {
    title: 'Add Employee',
    path: '/admin/employee',
  });
};

const addEmployee = async (req, res) => {
  try {
    const {
      employeeName,
      employeePhoneNumber,
      employeeType,
      employmentType,
      employeeSalary,
      hourlyRate,
    } = req.body;

    if (employeePhoneNumber.length !== 11) {
      return res
        .status(400)
        .send({ message: 'رقم الهاتف يجب ان يكون مكون من 11 رقم' });
    }

    if (
      employmentType === 'Full-Time' &&
      (!employeeSalary || employeeSalary < 0)
    ) {
      return res
        .status(400)
        .send({ message: 'لازم الراتب الشهري يكون اكبر من 0 للدوام الكامل' });
    }

    if (employmentType === 'Part-Time' && (!hourlyRate || hourlyRate < 0)) {
      return res
        .status(400)
        .send({ message: 'لازم السعر بالساعة يكون اكبر من 0 للدوام الجزئي' });
    }

    // Generate unique employee code before creating employee
    const employeeCode = await Employee.generateEmployeeCode();

    const employee = new Employee({
      employeeCode,
      employeeName,
      employeePhoneNumber,
      employeeType: employeeType || 'other',
      employmentType,
      employeeSalary: employmentType === 'Full-Time' ? employeeSalary : 0,
      hourlyRate: employmentType === 'Part-Time' ? hourlyRate : 0,
      role: 'Employee',
    });

    const result = await employee.save();
    res.status(201).send(result);
  } catch (err) {
    console.log(err);
    if (err.message && err.message.includes('employee code')) {
      res
        .status(400)
        .send({
          message: 'فشل في إنشاء كود موظف فريد. يرجى المحاولة مرة أخرى.',
        });
    } else {
      res
        .status(400)
        .send({ message: ' رقم الهاتف موجود مسبقا او يوجد مشكله فنيه اخري' });
    }
  }
};

const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json(employees); // Ensure you're sending JSON
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.' });
  }
};

const updateSalary = async (req, res) => {
  const { id } = req.params;
  const { kpi, loss } = req.body;

  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });

    // Update employee's KPIs and Losses
    if (kpi < 0 || loss < 0) {
      return res
        .status(400)
        .send({ error: 'KPIs and Losses must be positive' });
    }

    if (kpi > 0) {
      employee.KPIs.push({
        kpi,
        date: new Date(),
      });
    }
    if (loss > 0) {
      employee.Losses.push({
        loss,
        date: new Date(),
      });
    }
    // Update totals
    employee.totalKPIs += kpi;
    employee.totalLosses += loss;
    employee.totalSalary =
      employee.employeeSalary + employee.totalKPIs - employee.totalLosses;

    await employee.save();
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error updating employee salary' });
  }
};

const getEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });
    console.log('Employee:', employee);
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error fetching employee' });
  }
};

const getEmployeeLog = async (req, res) => {
  const { id } = req.params;
  try {
    console.log('Fetching employee log for ID:', id);

    // Get employee details
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });
    console.log('Employee found:', employee.employeeName);
    console.log('Employee details:', {
      id: employee._id,
      name: employee.employeeName,
      phone: employee.employeePhoneNumber,
      salary: employee.employeeSalary,
      totalSalary: employee.totalSalary,
    });

    // Get salary history (bills with salaryEmployee = this employee)
    const salaryHistory = await Billing.find({
      salaryEmployee: id,
      billCategory: 'salaries',
    }).sort({ createdAt: -1 });
    console.log('Salary history found:', salaryHistory.length, 'records');

    // KPI history removed - feature deprecated
    const kpiHistory = [];

    // Get attendance records where this employee was involved
    const attendanceHistory = await Attendance.find({
      $or: [
        { 'studentsPresent.addedBy': id },
        { 'studentsPresent.addedBy': id.toString() },
        { finalizedBy: id },
        { finalizedBy: id.toString() },
      ],
    }).sort({ createdAt: -1 });
    console.log(
      'Attendance history found:',
      attendanceHistory.length,
      'records'
    );

    // Debug: Let's also check all attendance records to see the structure
    const allAttendance = await Attendance.find({}).limit(5);
    console.log(
      'Sample attendance records structure:',
      allAttendance.map((a) => ({
        id: a._id,
        studentsPresent: a.studentsPresent
          ? a.studentsPresent.map((s) => ({
              addedBy: s.addedBy,
              addedByType: typeof s.addedBy,
            }))
          : [],
        finalizedBy: a.finalizedBy,
        finalizedByType: typeof a.finalizedBy,
        course: a.course,
      }))
    );

    // Debug: Check specific attendance records for this employee
    if (attendanceHistory.length > 0) {
      console.log('First attendance record details:', {
        id: attendanceHistory[0]._id,
        course: attendanceHistory[0].course,
        studentsPresent: attendanceHistory[0].studentsPresent
          ? attendanceHistory[0].studentsPresent.length
          : 0,
        totalAmount: attendanceHistory[0].totalAmount,
        totalFees: attendanceHistory[0].totalFees,
      });
    }

    // Calculate totals
    const totalStudents = attendanceHistory.reduce((total, attendance) => {
      return (
        total +
        (attendance.studentsPresent ? attendance.studentsPresent.length : 0)
      );
    }, 0);

    const totalRevenue = attendanceHistory.reduce((total, attendance) => {
      return (
        total +
        (attendance.studentsPresent
          ? attendance.studentsPresent.reduce((sum, student) => {
              return sum + (student.feesApplied || 0);
            }, 0)
          : 0)
      );
    }, 0);

    // Calculate total salary from salary history
    const totalSalary = salaryHistory.reduce(
      (sum, salary) => sum + salary.billAmount,
      0
    );

    // Calculate total KPIs (KPI feature removed)
    const totalKPIs = 0;

    // Calculate total losses (if any - for now set to 0 as there's no loss field in KPI model)
    const totalLosses = 0;

    console.log('Calculated totals:', {
      totalStudents,
      totalRevenue,
      totalSalary,
      totalKPIs,
      totalLosses,
    });

    // Create enhanced employee object with calculated totals
    const enhancedEmployee = {
      ...employee.toObject(),
      totalSalary,
      totalKPIs,
      totalLosses,
    };

    res.json({
      employee: enhancedEmployee,
      salaryHistory,
      kpiHistory,
      attendanceHistory,
      totalStudents,
      totalRevenue,
    });
  } catch (error) {
    console.error('Error fetching employee log:', error);
    res.status(500).send({ error: 'Error fetching employee log' });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const {
    employeeName,
    employeePhoneNumber,
    employeeType,
    employmentType,
    employeeSalary,
    hourlyRate,
  } = req.body;

  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });

    // Validate and apply updates
    if (typeof employeeName === 'string' && employeeName.trim().length > 0) {
      employee.employeeName = employeeName;
    }
    if (
      typeof employeePhoneNumber === 'string' &&
      employeePhoneNumber.trim().length > 0
    ) {
      employee.employeePhoneNumber = employeePhoneNumber;
    }
    if (employeeType) {
      employee.employeeType = employeeType;
    }
    if (employmentType) {
      employee.employmentType = employmentType;
    }

    // Update salary based on employment type
    if (employmentType === 'Full-Time') {
      if (employeeSalary !== undefined) {
        const base = Number(employeeSalary);
        if (!Number.isFinite(base) || base < 0) {
          return res
            .status(400)
            .send({ error: 'Salary must be a valid number >= 0' });
        }
        employee.employeeSalary = base;
        employee.hourlyRate = 0;
      }
    } else if (employmentType === 'Part-Time') {
      if (hourlyRate !== undefined) {
        const rate = Number(hourlyRate);
        if (!Number.isFinite(rate) || rate < 0) {
          return res
            .status(400)
            .send({ error: 'Hourly rate must be a valid number >= 0' });
        }
        employee.hourlyRate = rate;
        employee.employeeSalary = 0;
      }
    }

    // Recompute total salary based on base, KPIs and losses
    employee.totalSalary =
      (Number(employee.employeeSalary) || 0) +
      (employee.totalKPIs || 0) -
      (employee.totalLosses || 0);

    await employee.save();
    res.status(200).send(employee);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error updating employee' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findByIdAndDelete(id);
    if (!employee) return res.status(404).send({ error: 'Employee not found' });
    res.status(200).send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Error deleting employee' });
  }
};

// router.put('/employee/:id/update-salary', authMiddleware, async (req, res) => {

// });

// ================================= Billing ================================ //

// billing_Get removed - using admin_billing_Get instead

const allBills = async (req, res) => {
  const { startDate, endDate, employee } = req.query;

  try {
    // Initialize the query object for filtering
    const query = {};

    if (startDate && !isNaN(new Date(startDate))) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(new Date(endDate))) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = endOfDay;
    }
    if (employee) {
      query.employee = employee;
    }

    // Common date calculations
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const weekStart = new Date(todayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const weekEnd = new Date(todayEnd);

    const monthStart = new Date(todayStart);
    monthStart.setUTCDate(1);
    const monthEnd = new Date(todayEnd);

    // Fetch filtered results
    const filteredBills = await Billing.find(query)
      .populate('employee', 'employeeName')
      .sort({ createdAt: -1 });

    // Fetch grouped bills
    const billsToday = await Billing.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    const billsThisWeek = await Billing.find({
      createdAt: { $gte: weekStart, $lte: weekEnd },
    });

    const billsThisMonth = await Billing.find({
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const allBills = await Billing.find({})
      .populate('employee', 'employeeName')
      .sort({ createdAt: -1 });

    // Helpers
    const mapCategory = (bill) => {
      if (bill.billCategory) return bill.billCategory;
      // legacy field mapping
      if (bill.category === 'salaries_out') return 'salaries';
      if (bill.category === 'canteen_out') return 'canteen_out';
      if (bill.category === 'government_out') return 'government_fees';
      if (bill.category === 'electric_out') return 'electric_invoices';
      if (bill.category === 'income') return 'canteen_in';
      return 'other';
    };

    const computeSummary = (bills) => {
      let income = 0;
      let expenses = 0;
      for (const bill of bills) {
        const category = mapCategory(bill);
        if (category === 'canteen_in') income += bill.billAmount;
        else expenses += bill.billAmount;
      }
      const total = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
      return {
        count: bills.length,
        total,
        income,
        expenses,
        net: income - expenses,
        bills,
      };
    };

    res.status(200).send({
      filtered: computeSummary(filteredBills),
      today: computeSummary(billsToday),
      week: computeSummary(billsThisWeek),
      month: computeSummary(billsThisMonth),
      all: computeSummary(allBills),
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).send({ error: 'An error occurred while fetching bills' });
  }
};

const downloadBillExcel = async (req, res) => {
  const { startDate, endDate, employee } = req.query;

  try {
    // Prepare the query for filtering
    const query = {};
    if (startDate)
      query.createdAt = { ...query.createdAt, $gte: new Date(startDate) };
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: endOfDay };
    }
    if (employee) query.employee = employee;

    // Fetch bills from the database
    const bills = await Billing.find(query)
      .populate('employee', 'employeeName')
      .sort({ createdAt: -1 });

    // Create a new workbook and worksheet
    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bills');

    // Add headers with styling
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Product Name', key: 'billName', width: 30 },
      { header: 'Category', key: 'billCategory', width: 20 },
      { header: 'Amount', key: 'billAmount', width: 15 },
      { header: 'Notes', key: 'billNote', width: 40 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add rows with alternating styles
    bills.forEach((bill, index) => {
      const categoryNames = getCategoryArabicNames();

      const row = worksheet.addRow({
        date: new Date(bill.createdAt).toLocaleString(),
        employeeName: bill.employee?.employeeName || 'N/A',
        billName: bill.billName,
        billCategory:
          categoryNames[bill.billCategory] ||
          categoryNames[bill.category] ||
          'غير محدد',
        billAmount: bill.billAmount,
        billNote: bill.billNote,
      });

      // Apply alternating row background color
      const bgColor = index % 2 === 0 ? 'F3F6FB' : 'FFFFFF'; // Light grey for alternate rows
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Optional: Add a total row
    const totalAmount = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
    const totalRow = worksheet.addRow({
      date: 'Total',
      billAmount: totalAmount,
    });
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 4) {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D9EAD3' }, // Light green
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF' },
        };
      }
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=bills.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.status(200);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating Excel file');
  }
};

const sendDailyBillExcel = async () => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);

    const query = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    const bills = await Billing.find(query).populate(
      'employee',
      'employeeName'
    );

    const workbook = new excelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bills');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Product Name', key: 'billName', width: 30 },
      { header: 'Amount', key: 'billAmount', width: 15 },
      { header: 'Notes', key: 'billNote', width: 40 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1F4E78' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    bills.forEach((bill, index) => {
      const row = worksheet.addRow({
        date: new Date(bill.createdAt).toLocaleString(),
        employeeName: bill.employee?.employeeName || 'N/A',
        billName: bill.billName,
        billAmount: bill.billAmount,
        billNote: bill.billNote,
      });

      const bgColor = index % 2 === 0 ? 'F3F6FB' : 'FFFFFF';
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const totalAmount = bills.reduce((sum, bill) => sum + bill.billAmount, 0);
    const totalRow = worksheet.addRow({
      date: 'Total',
      billAmount: totalAmount,
    });
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 4) {
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D9EAD3' },
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF' },
        };
      }
    });

    const fileName = `daily-bill-report-${
      new Date().toISOString().split('T')[0]
    }.xlsx`;
    const filePath = path.join(__dirname, fileName);
    await workbook.xlsx.writeFile(filePath);

    const fileUrl = `http://localhost:8400//download-bill-excel/${fileName}`;
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Excel = buffer.toString('base64');

    await waapi.postInstancesIdClientActionSendMedia(
      {
        mediaUrl: fileUrl,
        chatId: '2' + '01092257120' + '@c.us',
        mediaBase64: base64Excel,
        mediaName: fileName,
        mediaCaption: `Bill Report for ${new Date().toLocaleDateString()}`,
      },
      { id: '24954' }
    );

    console.log('Daily bill report sent successfully.');

    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error sending daily bill report:', error);
  }
};

// schedule.scheduleJob('45 21 * * *', sendDailyBillExcel);

// ================================= END Billing ================================ //

// ================================= KPIs ================================ //

// REMOVED: KPI functionality removed
// const kpi_Get = async (req, res) => {
//   const employees = await Employee.find();
//   res.render('Admin/KPIs', {
//     title: 'KPIs',
//     path: '/admin/kpi',
//     employees,
//   });
// };

// REMOVED: KPI functionality removed
// const addKpi = async (req, res) => {
//   // Function removed
// };

// REMOVED: KPI functionality removed
// const getKPIs = async (req, res) => {
//   // Function removed
// };

// ================================= END KPIs ================================ //

// ================================= Billing ================================ //

const admin_billing_Get = async (req, res) => {
  try {
    const employees = await Employee.find({}).select('employeeName');
    const students = await Student.find({}).select('studentName studentCode');

    res.render('Admin/adminBilling', {
      title: 'Billing Management',
      path: '/admin/Admin-billing',
      employees,
      students,
    });
  } catch (error) {
    console.error('Error loading billing page:', error);
    res.status(500).send('Error loading page');
  }
};

const Admin_addBill = (req, res) => {
  const {
    billName,
    billAmount,
    billNote,
    billPhoto,
    billCategory,
    employeeId,
  } = req.body;

  console.log('Received bill data:', {
    billName,
    billAmount,
    billNote,
    billPhoto,
    billCategory,
    employeeId,
  });

  if (billAmount < 0) {
    res.status(400).send({ message: 'لازم Amount يكون اكبر من 0' });
    return;
  }

  if (billName.length < 3) {
    res.status(400).send({ message: 'اسم الفاتوره لازم يكون اكتر من 3 احرف' });
    return;
  }

  if (!billCategory) {
    console.log('billCategory is missing or empty:', billCategory);
    res.status(400).send({ message: 'يجب اختيار فئة الفاتورة' });
    return;
  }

  // Validate employee selection for salary bills
  if (billCategory === 'salaries' && !employeeId) {
    res.status(400).send({ message: 'يجب اختيار الموظف للرواتب' });
    return;
  }

  const bill = new Billing({
    billName,
    billAmount,
    billNote: billNote || '',
    billPhoto: billPhoto || '',
    billCategory,
    employee: '674f4a6658bf4795e24ab04a',
    salaryEmployee: billCategory === 'salaries' ? employeeId : undefined,
  });

  bill
    .save()
    .then((result) => {
      res.status(201).send(result);
    })
    .catch((err) => {
      console.log(err);
      res.status(400).send({ message: 'هناك مشكله فنيه' });
    });
};

const Admin_getAllBills = async (req, res) => {
  try {
    const allBills = await Billing.find({
      employee: '674f4a6658bf4795e24ab04a',
    }).sort({
      createdAt: -1,
    });
    console.log(allBills);
    res.send(allBills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).send({ error: 'An error occurred while fetching bills' });
  }
};

// ================================= LogOut ================================ //

const logOut = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

// ================================= Center Fees Collection ================================ //

// REMOVED: Center Fees functionality removed
// const centerFees_Get = async (req, res) => {
//   // Function removed
// };

const getCenterFeesData = async (req, res) => {
  try {
    const { startDate, endDate, collected, period } = req.query;

    // Build query
    const query = {};

    // Support period shortcuts similar to dashboard
    let rangeStart = startDate ? new Date(startDate) : null;
    let rangeEnd = endDate ? new Date(endDate) : null;
    if (period && !startDate && !endDate) {
      const { startDate: s, endDate: e } = getDateRange(period);
      rangeStart = s;
      rangeEnd = e;
    }
    if (rangeStart && rangeEnd) {
      query.createdAt = { $gte: rangeStart, $lte: rangeEnd };
    }

    if (collected !== undefined) {
      query.centerFeesCollected = collected === 'true';
    }

    // Get attendance records with populated employee data
    const attendanceRecords = await Attendance.find(query)
      .populate('finalizedBy', 'employeeName')
      .populate('studentsPresent.addedBy', 'employeeName')
      .populate('invoices.addedBy', 'employeeName')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate totals
    let totalSessions = 0;
    let totalCenterFees = 0;
    let totalCollected = 0;
    let totalPending = 0;

    let totalTeacherInvoices = 0;

    const processedRecords = attendanceRecords.map((record) => {
      const sessionCenterFees = record.studentsPresent.reduce(
        (sum, student) => {
          return sum + (student.feesApplied || 0);
        },
        0
      );

      // Get employee name with better fallback logic
      // Collect all unique employees who participated
      const employeeIds = new Set();
      const employeeNames = [];

      // Add finalizedBy employee if exists
      if (record.finalizedBy?._id) {
        employeeIds.add(record.finalizedBy._id.toString());
        employeeNames.push(record.finalizedBy.employeeName);
      }

      // Add all employees who added students
      record.studentsPresent.forEach((student) => {
        if (student.addedBy?._id) {
          const employeeId = student.addedBy._id.toString();
          if (!employeeIds.has(employeeId)) {
            employeeIds.add(employeeId);
            employeeNames.push(student.addedBy.employeeName);
          }
        }
      });

      // Add all employees who created invoices
      record.invoices.forEach((invoice) => {
        if (invoice.addedBy?._id) {
          const employeeId = invoice.addedBy._id.toString();
          if (!employeeIds.has(employeeId)) {
            employeeIds.add(employeeId);
            employeeNames.push(invoice.addedBy.employeeName);
          }
        }
      });

      const employeeName =
        employeeNames.length > 0 ? employeeNames.join(', ') : 'Unknown';

      totalSessions++;
      totalCenterFees += sessionCenterFees;

      if (record.centerFeesCollected) {
        totalCollected += sessionCenterFees;
      } else {
        totalPending += sessionCenterFees;
      }

      return {
        _id: record._id,
        date: record.createdAt,
        employeeName: employeeName,
        employeeCount: employeeNames.length,
        studentCount: record.studentsPresent.length,
        centerFees: sessionCenterFees,
        totalAmount: record.totalAmount,
        centerFeesCollected: record.centerFeesCollected || false,
        studentsPresent: record.studentsPresent,
      };
    });

    // Also compute billing-based expenses and canteen income for the same range
    let totalExpenses = 0;
    let totalCanteenIn = 0;
    let totalEmployeeKPIs = 0;
    const expenseCategories = {
      salaries: 0,
      canteen_out: 0,
      government_fees: 0,
      electric_invoices: 0,
      equipments: 0,
      other: 0,
    };

    const billQuery = {};
    if (rangeStart && rangeEnd) {
      billQuery.createdAt = { $gte: rangeStart, $lte: rangeEnd };
    }

    const billingData = await Billing.find(billQuery)
      .select('billAmount billCategory category createdAt')
      .lean();

    billingData.forEach((bill) => {
      // Use the category field from new billing model, fallback to billCategory for legacy
      const category = bill.category || bill.billCategory || 'other_expense';

      // Check if it's an income category
      const incomeCategories = [
        'student_payment',
        'canteen_income',
        'course_fees',
        'registration_fees',
        'book_sales',
        'other_income',
        'canteen_in',
      ];

      if (incomeCategories.includes(category)) {
        totalCanteenIn += bill.billAmount;
      } else {
        // It's an expense
        if (expenseCategories[category] === undefined) {
          expenseCategories[category] = 0;
        }
        expenseCategories[category] += bill.billAmount;
        totalExpenses += bill.billAmount;
      }
    });

    // Employee KPIs (bonuses) - feature removed
    totalEmployeeKPIs = 0;

    const totalCenterRevenue = totalCenterFees + totalCanteenIn;
    const netProfit = totalCenterRevenue - totalExpenses;

    res.json({
      records: processedRecords,
      summary: {
        totalSessions,
        totalCenterFees,
        totalCollected,
        totalPending,
        totalExpenses,
        totalCanteenIn,
        totalCenterRevenue,
        totalEmployeeKPIs,
        netProfit,
        expenseCategories,
      },
    });
  } catch (error) {
    console.error('Error fetching center fees data:', error);
    res.status(500).json({ error: 'Error fetching center fees data' });
  }
};

const collectCenterFees = async (req, res) => {
  try {
    const { attendanceIds } = req.body;

    if (
      !attendanceIds ||
      !Array.isArray(attendanceIds) ||
      attendanceIds.length === 0
    ) {
      return res.status(400).json({ error: 'No attendance records selected' });
    }

    // Update all selected attendance records
    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      { $set: { centerFeesCollected: true, collectedAt: new Date() } }
    );

    // Create a collection log
    try {
      const sessions = await Attendance.find({ _id: { $in: attendanceIds } })
        .select('createdAt studentsPresent')
        .lean();
      const totalCenterFees = sessions.reduce(
        (sum, r) =>
          sum +
          (r.studentsPresent || []).reduce(
            (s, st) => s + (st.feesApplied || 0),
            0
          ),
        0
      );
      const dates = sessions
        .map((s) => new Date(s.createdAt))
        .sort((a, b) => a - b);
      const periodStart = dates[0] || new Date();
      const periodEnd = dates[dates.length - 1] || new Date();

      // CollectCenterFeesLog feature removed - logging disabled
    } catch (e) {
      console.error('collectCenterFees log error:', e);
      // continue even if logging fails
    }

    res.json({
      success: true,
      message: `Successfully collected center fees for ${result.modifiedCount} sessions`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error collecting center fees:', error);
    res.status(500).json({ error: 'Error collecting center fees' });
  }
};

// Collect all pending within current filter and log
const collectAllCenterFees = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const query = { centerFeesCollected: { $ne: true } };
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const sessions = await Attendance.find(query)
      .select('createdAt studentsPresent')
      .lean();
    if (!sessions.length) {
      return res
        .status(400)
        .json({ error: 'No pending sessions in selected period' });
    }

    const attendanceIds = sessions.map((s) => s._id);
    const totalCenterFees = sessions.reduce(
      (sum, r) =>
        sum +
        (r.studentsPresent || []).reduce(
          (s, st) => s + (st.feesApplied || 0),
          0
        ),
      0
    );
    const dates = sessions
      .map((s) => new Date(s.createdAt))
      .sort((a, b) => a - b);
    const periodStart = startDate
      ? new Date(startDate)
      : dates[0] || new Date();
    const periodEnd = endDate
      ? new Date(endDate)
      : dates[dates.length - 1] || new Date();

    const result = await Attendance.updateMany(
      { _id: { $in: attendanceIds } },
      { $set: { centerFeesCollected: true, collectedAt: new Date() } }
    );

    // CollectCenterFeesLog feature removed - logging disabled

    res.json({
      success: true,
      message: `Collected ${result.modifiedCount} sessions. Total: ${totalCenterFees} EGP`,
      modifiedCount: result.modifiedCount,
      totalCenterFees,
    });
  } catch (error) {
    console.error('Error collecting all center fees:', error);
    res.status(500).json({ error: 'Error collecting all center fees' });
  }
};

// Fetch collection logs
const getCenterFeesLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    // CollectCenterFeesLog feature removed
    res.json({ logs: [] });
  } catch (error) {
    console.error('Error fetching center fees logs:', error);
    res.status(500).json({ error: 'Error fetching center fees logs' });
  }
};

// ================================= END Center Fees Collection ================================ //

// ================================= Admin Change Password (OTP) ================================ //

// REMOVED: Change Password functionality removed
// const changeAdminPassword_Get = async (req, res) => {
//   // Function removed
// };

const requestAdminOtp = async (req, res) => {
  try {
    const { phoneNumber, currentPassword } = req.body;
    if (!phoneNumber || !currentPassword) {
      return res
        .status(400)
        .json({ error: 'Phone and current password are required' });
    }
    const admin = await Admin.findOne({
      phoneNumber,
      password: currentPassword,
    });
    if (!admin) {
      return res.status(404).json({ error: 'Invalid phone or password' });
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    req.session.adminOtp = { phoneNumber, code, expiresAt };

    // Send OTP via WhatsApp - REMOVED: waService utility deleted
    // try {
    //   await waService.sendWasenderMessage(
    //     `Your OTP code is ${code}. It expires in 5 minutes.`,
    //     phoneNumber,
    //     waService.DEFAULT_ADMIN_PHONE
    //   );
    // } catch (e) {
    //   console.error('WA send error:', e.message || e);
    //   // proceed even if WA send fails for testing
    // }

    res.json({ success: true, expiresAt });
  } catch (error) {
    console.error('requestAdminOtp error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyAdminOtpAndChange = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const sessionOtp = req.session.adminOtp;
    if (!sessionOtp) return res.status(400).json({ error: 'No OTP requested' });
    if (!otp || !newPassword)
      return res
        .status(400)
        .json({ error: 'OTP and new password are required' });
    if (Date.now() > sessionOtp.expiresAt)
      return res.status(400).json({ error: 'OTP expired' });
    if (otp !== sessionOtp.code)
      return res.status(400).json({ error: 'Invalid OTP' });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ error: 'الباسورد لازم يكون اكتر من 6 ارقام' });

    const admin = await Admin.findOne({ phoneNumber: sessionOtp.phoneNumber });
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    admin.password = newPassword;
    await admin.save();
    req.session.adminOtp = null;
    res.json({ success: true });
  } catch (error) {
    console.error('verifyAdminOtp error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};



// ================================= CLASS MANAGEMENT ================================ //

// Multer configuration for schedule image uploads
const scheduleImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/schedules');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      'schedule-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const uploadScheduleImage = multer({
  storage: scheduleImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
}).single('scheduleImage');

const classes_Get = (req, res) => {
  res.render('Admin/classes', {
    title: 'Class Management',
    path: '/admin/classes',
  });
};

const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .sort({ academicLevel: 1, section: 1 })
      .lean();

    // Get student count for each class
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          class: cls._id,
          isActive: true,
        });
        return { ...cls, studentCount };
      })
    );

    res.json(classesWithCount);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Error fetching classes' });
  }
};

const addClass = async (req, res) => {
  uploadScheduleImage(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { className, academicLevel, section, capacity, notes } = req.body;

      const classData = {
        className,
        academicLevel,
        section,
        capacity,
        notes,
      };

      // Add schedule image path if file was uploaded
      if (req.file) {
        classData.scheduleImage = '/uploads/schedules/' + req.file.filename;
      }

      const newClass = new Class(classData);

      await newClass.save();
      res.json({ message: 'Class added successfully', class: newClass });
    } catch (error) {
      // Delete uploaded file if database save fails
      if (req.file) {
        const filePath = path.join(__dirname, '../public', req.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      console.error('Error adding class:', error);
      if (error.code === 11000) {
        res
          .status(400)
          .json({ error: 'Class with this level and section already exists' });
      } else {
        res.status(500).json({ error: 'Error adding class' });
      }
    }
  });
};

const getClass = async (req, res) => {
  try {
    const classData = await Class.findById(req.params.id).lean();

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Get students in this class
    const students = await Student.find({
      class: classData._id,
      isActive: true,
    })
      .select('studentName studentCode totalSchoolFees remainingBalance')
      .lean();

    res.json({ class: classData, students });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Error fetching class' });
  }
};

const updateClass = async (req, res) => {
  uploadScheduleImage(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { className, academicLevel, section, capacity, isActive, notes } =
        req.body;

      const updateData = { className, academicLevel, section, capacity, isActive, notes };

      // If a new image was uploaded, update the path and delete old image
      if (req.file) {
        const oldClass = await Class.findById(req.params.id);
        
        // Delete old image if it exists
        if (oldClass && oldClass.scheduleImage) {
          const oldImagePath = path.join(__dirname, '../public', oldClass.scheduleImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        updateData.scheduleImage = '/uploads/schedules/' + req.file.filename;
      }

      const updatedClass = await Class.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedClass) {
        // Delete uploaded file if class not found
        if (req.file) {
          const filePath = path.join(__dirname, '../public/uploads/schedules/', req.file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
        return res.status(404).json({ error: 'Class not found' });
      }

      res.json({ message: 'Class updated successfully', class: updatedClass });
    } catch (error) {
      // Delete uploaded file if update fails
      if (req.file) {
        const filePath = path.join(__dirname, '../public/uploads/schedules/', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Error updating class' });
    }
  });
};

const deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // Check if there are students in this class
    const studentCount = await Student.countDocuments({
      class: classId,
      isActive: true,
    });

    if (studentCount > 0) {
      return res.status(400).json({
        error: `Cannot delete class. There are ${studentCount} active students in this class. Please reassign them first.`,
      });
    }

    const deletedClass = await Class.findByIdAndDelete(classId);

    if (!deletedClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Delete schedule image if it exists
    if (deletedClass.scheduleImage) {
      const imagePath = path.join(__dirname, '../public', deletedClass.scheduleImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      message: 'Class deleted successfully',
      class: deletedClass,
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Error deleting class' });
  }
};

// Delete schedule image for a class
const deleteScheduleImage = async (req, res) => {
  try {
    const classId = req.params.id;
    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (!classData.scheduleImage) {
      return res.status(400).json({ error: 'No schedule image to delete' });
    }

    // Delete the image file
    const imagePath = path.join(__dirname, '../public', classData.scheduleImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Update the class to remove the image path
    classData.scheduleImage = '';
    await classData.save();

    res.json({ message: 'Schedule image deleted successfully', class: classData });
  } catch (error) {
    console.error('Error deleting schedule image:', error);
    res.status(500).json({ error: 'Error deleting schedule image' });
  }
};

// ================================= END CLASS MANAGEMENT ================================ //

// ================================= STUDENT LOGS (AUDIT) ================================ //

// REMOVED: studentLogs_Get and getStudentLogs - replaced with studentLogByCode_Get

// ================================= EMPLOYEE PAYMENT & DEDUCTIONS ================================ //

const addEmployeePayment = async (req, res) => {
  try {
    const {
      employeeId,
      paymentMonth,
      baseSalary,
      hoursWorked,
      bonuses,
      extras,
      extraNotes,
      deductions,
      deductionDetails,
      paymentMethod,
      receiptNumber,
      notes,
    } = req.body;

    // Check if payment already exists for this employee and month
    const existingPayment = await EmployeePayment.findOne({
      employee: employeeId,
      paymentMonth: paymentMonth,
    });

    if (existingPayment) {
      return res.status(400).json({
        error: 'تم إضافة راتب لهذا الشهر مسبقاً',
        message: `يوجد بالفعل دفعة راتب لشهر ${paymentMonth}. يرجى تعديل الدفعة الموجودة أو اختيار شهر آخر.`,
        existingPaymentId: existingPayment._id,
      });
    }

    // Calculate total amount before creating payment
    const base = parseFloat(baseSalary) || 0;
    const bonus = parseFloat(bonuses) || 0;
    const extra = parseFloat(extras) || 0;
    const deduction = parseFloat(deductions) || 0;
    const totalAmount = base + bonus + extra - deduction;

    const payment = new EmployeePayment({
      employee: employeeId,
      paymentMonth,
      baseSalary: base,
      hoursWorked: hoursWorked || 0,
      bonuses: bonus,
      extras: extra,
      extraNotes: extraNotes || '',
      deductions: deduction,
      deductionDetails: deductionDetails || '',
      totalAmount: totalAmount,
      paymentMethod: paymentMethod || 'cash',
      paidBy: req.adminId || req.employeeId,
      receiptNumber: receiptNumber || '',
      notes: notes || '',
    });

    await payment.save();

    // Create invoice record
    const invoice = new Billing({
      invoiceType: 'OUT',
      description: `Employee salary payment for ${paymentMonth}`,
      amount: payment.totalAmount,
      category: 'employee_salary',
      employee: employeeId,
      invoiceDate: new Date(),
      paymentMethod,
      recordedBy: req.adminId || req.employeeId,
      notes,
    });

    await invoice.save();

    res.json({ message: 'Payment recorded successfully', payment });
  } catch (error) {
    console.error('Error adding employee payment:', error);
    res.status(500).json({ error: 'Error recording payment' });
  }
};

const getEmployeePayments = async (req, res) => {
  try {
    const { employeeId, month } = req.query;

    const query = {};
    if (employeeId) query.employee = employeeId;
    if (month) query.paymentMonth = month;

    const payments = await EmployeePayment.find(query)
      .sort({ paymentDate: -1 })
      .populate('employee', 'employeeName employmentType employeeType')
      .populate('paidBy', 'employeeName')
      .lean();

    res.json(payments);
  } catch (error) {
    console.error('Error fetching employee payments:', error);
    res.status(500).json({ error: 'Error fetching payments' });
  }
};

const addEmployeeDeduction = async (req, res) => {
  try {
    const { employeeId, amount, reason, appliedToMonth, notes } = req.body;

    const deduction = new EmployeeDeduction({
      employee: employeeId,
      amount,
      reason,
      appliedToMonth,
      addedBy: req.adminId || req.employeeId,
      notes,
    });

    await deduction.save();
    res.json({ message: 'Deduction added successfully', deduction });
  } catch (error) {
    console.error('Error adding employee deduction:', error);
    res.status(500).json({ error: 'Error adding deduction' });
  }
};

const getEmployeeDeductions = async (req, res) => {
  try {
    const { employeeId, month } = req.query;

    const query = {};
    if (employeeId) query.employee = employeeId;
    if (month) query.appliedToMonth = month;

    const deductions = await EmployeeDeduction.find(query)
      .sort({ deductionDate: -1 })
      .populate('employee', 'employeeName')
      .populate('addedBy', 'employeeName')
      .lean();

    res.json(deductions);
  } catch (error) {
    console.error('Error fetching employee deductions:', error);
    res.status(500).json({ error: 'Error fetching deductions' });
  }
};

const getEmployeeSalaryHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const [payments, deductions] = await Promise.all([
      EmployeePayment.find({ employee: employeeId })
        .sort({ paymentDate: -1 })
        .populate('paidBy', 'employeeName')
        .lean(),
      EmployeeDeduction.find({ employee: employeeId })
        .sort({ deductionDate: -1 })
        .populate('addedBy', 'employeeName')
        .lean(),
    ]);

    // Calculate summary
    // Total paid = sum of all payment totalAmount (this is the final amount after deductions)
    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.totalAmount || 0),
      0
    );

    // Total deductions applied in payments = sum of deductions from all payments
    // This represents deductions that were actually applied when paying salaries
    const totalDeductionsFromPayments = payments.reduce(
      (sum, p) => sum + (p.deductions || 0),
      0
    );

    // Total gross salary (before deductions) = baseSalary + bonuses + extras from all payments
    const totalGrossSalary = payments.reduce((sum, p) => {
      return sum + (p.baseSalary || 0) + (p.bonuses || 0) + (p.extras || 0);
    }, 0);

    // Total deductions (all deductions, including pending)
    const totalDeductionsAll = deductions.reduce(
      (sum, d) => sum + (d.amount || 0),
      0
    );

    // Pending deductions (not yet applied to any payment)
    const pendingDeductions = deductions
      .filter((d) => !d.isApplied)
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const totalPayments = payments.length;

    res.json({
      employee,
      payments,
      deductions,
      summary: {
        totalPaid, // This is net amount (already has deductions subtracted)
        totalDeductions: totalDeductionsFromPayments, // Deductions applied in payments
        totalGrossSalary, // Gross salary before deductions
        totalDeductionsAll, // All deductions (applied + pending)
        pendingDeductions, // Deductions not yet applied
        totalPayments,
        netAmount: totalPaid, // Net amount = what was actually paid (totalAmount already includes deductions)
      },
    });
  } catch (error) {
    console.error('Error fetching employee salary history:', error);
    res.status(500).json({ error: 'Error fetching salary history' });
  }
};

const updateEmployeePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const {
      paymentMonth,
      paymentDate,
      baseSalary,
      hoursWorked,
      bonuses,
      extras,
      extraNotes,
      deductions,
      deductionDetails,
      paymentMethod,
      receiptNumber,
      notes,
    } = req.body;

    const payment = await EmployeePayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Calculate total amount
    const base = parseFloat(baseSalary) || 0;
    const bonus = parseFloat(bonuses) || 0;
    const extra = parseFloat(extras) || 0;
    const deduction = parseFloat(deductions) || 0;
    const totalAmount = base + bonus + extra - deduction;

    // Update payment fields
    payment.paymentMonth = paymentMonth || payment.paymentMonth;
    payment.paymentDate = paymentDate
      ? new Date(paymentDate)
      : payment.paymentDate;
    payment.baseSalary = base;
    payment.hoursWorked = hoursWorked || 0;
    payment.bonuses = bonus;
    payment.extras = extra;
    payment.extraNotes = extraNotes || '';
    payment.deductions = deduction;
    payment.deductionDetails = deductionDetails || '';
    payment.totalAmount = totalAmount;
    payment.paymentMethod = paymentMethod || payment.paymentMethod;
    payment.receiptNumber = receiptNumber || '';
    payment.notes = notes || '';

    await payment.save();

    // Update invoice if exists
    const invoice = await Billing.findOne({
      employee: payment.employee,
      category: 'employee_salary',
      invoiceDate: payment.paymentDate,
    });

    if (invoice) {
      invoice.amount = totalAmount;
      invoice.paymentMethod = payment.paymentMethod;
      invoice.notes = notes || invoice.notes;
      await invoice.save();
    }

    res.json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    console.error('Error updating employee payment:', error);
    res.status(500).json({ error: 'Error updating payment' });
  }
};

const deleteEmployeePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await EmployeePayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Delete associated invoice if exists
    await Billing.deleteMany({
      employee: payment.employee,
      category: 'employee_salary',
      amount: payment.totalAmount,
      invoiceDate: payment.paymentDate,
    });

    // Delete payment
    await EmployeePayment.findByIdAndDelete(paymentId);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee payment:', error);
    res.status(500).json({ error: 'Error deleting payment' });
  }
};

const getEmployeePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await EmployeePayment.findById(paymentId)
      .populate('employee', 'employeeName')
      .populate('paidBy', 'employeeName')
      .lean();

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching employee payment:', error);
    res.status(500).json({ error: 'Error fetching payment' });
  }
};

// ================================= END EMPLOYEE PAYMENT & DEDUCTIONS ================================ //

// ================================= ATTENDANCE MANAGEMENT ================================ //

// Get attendance page with classes
const attendance_Get = async (req, res) => {
  try {
    const classes = await Class.find({}).sort({ academicLevel: 1, section: 1 });

    res.render('Admin/attendance', {
      title: 'Attendance Management',
      path: '/admin/attendance',
      allClasses: classes,
    });
  } catch (error) {
    console.error('Error loading attendance page:', error);
    res.status(500).send('Error loading page');
  }
};

// Get attendance records for a specific date and class
const getAttendanceByDate = async (req, res) => {
  try {
    const { date, classId } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const query = { date: attendanceDate };
    if (classId) query.class = classId;

    const attendanceRecords = await Attendance.find(query)
      .populate('student', 'studentCode studentName studentPhone parentPhone1')
      .populate('class', 'academicLevel section')
      .populate('recordedBy', 'employeeName')
      .populate('modifiedBy', 'employeeName')
      .sort({ 'student.studentName': 1 })
      .lean();

    res.json({ success: true, records: attendanceRecords });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Error fetching attendance records' });
  }
};

// Get students by class for attendance taking
const getStudentsByClass = async (req, res) => {
  try {
    const { classId, date } = req.query;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    // Get all students in the class
    const students = await Student.find({ class: classId })
      .select('studentCode studentName studentPhone parentPhone1')
      .sort({ studentName: 1 })
      .lean();

    // If date is provided, get existing attendance records
    let existingAttendance = [];
    if (date) {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);

      existingAttendance = await Attendance.find({
        class: classId,
        date: attendanceDate,
      })
        .select('student status')
        .lean();
    }

    // Merge students with their attendance status
    const studentsWithAttendance = students.map((student) => {
      const attendance = existingAttendance.find(
        (a) => a.student.toString() === student._id.toString()
      );

      return {
        ...student,
        attendanceStatus: attendance ? attendance.status : null,
        attendanceId: attendance ? attendance._id : null,
      };
    });

    res.json({ success: true, students: studentsWithAttendance });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Error fetching students' });
  }
};

// Record bulk attendance (create/update)
const recordAttendance = async (req, res) => {
  try {
    const { date, classId, attendance } = req.body;
    const employeeId = req.adminId;

    if (!date || !classId || !Array.isArray(attendance)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Parse date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    // Process each attendance record
    for (const record of attendance) {
      try {
        const { studentId, status, notes } = record;

        // Check if attendance already exists
        const existing = await Attendance.findOne({
          student: studentId,
          date: attendanceDate,
        });

        if (existing) {
          // Update existing record
          existing.status = status;
          if (notes) existing.notes = notes;

          // Add to modification history
          existing.modificationHistory.push({
            modifiedBy: employeeId,
            modifiedAt: new Date(),
            previousStatus: existing.status,
            newStatus: status,
            reason: notes || 'Status updated',
          });

          existing.modifiedBy = employeeId;
          await existing.save();

          results.updated++;
        } else {
          // Create new attendance record
          const newAttendance = new Attendance({
            student: studentId,
            class: classId,
            date: attendanceDate,
            status,
            notes,
            recordedBy: employeeId,
          });

          await newAttendance.save();
          results.created++;
        }
      } catch (error) {
        console.error(
          'Error processing attendance for student:',
          record.studentId,
          error
        );
        results.errors.push({
          studentId: record.studentId,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: 'Attendance recorded successfully',
      results,
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Error recording attendance' });
  }
};

// Get attendance details for a student
const getStudentAttendanceHistory = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const query = { student: studentId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('class', 'academicLevel section')
      .populate('recordedBy', 'employeeName')
      .sort({ date: -1 })
      .lean();

    // Calculate statistics
    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter((a) => a.status === 'Present').length,
      absent: attendanceRecords.filter((a) => a.status === 'Absent').length,
      late: attendanceRecords.filter((a) => a.status === 'Late').length,
    };

    stats.attendanceRate =
      stats.total > 0
        ? (((stats.present + stats.late) / stats.total) * 100).toFixed(1)
        : 0;

    res.json({
      success: true,
      records: attendanceRecords,
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: 'Error fetching attendance history' });
  }
};

// ================================= END ATTENDANCE MANAGEMENT ================================ //

// ================================= BILLING/INVOICE MANAGEMENT ================================ //

// invoices_Get removed - using admin_billing_Get instead

// Create new invoice (IN or OUT)
const createInvoice = async (req, res) => {
  try {
    const {
      invoiceType,
      description,
      amount,
      category,
      studentId,
      employeeId,
      paymentMethod,
      notes,
      billPhoto,
    } = req.body;

    if (!invoiceType || !['IN', 'OUT'].includes(invoiceType)) {
      return res.status(400).json({ error: 'Invalid invoice type' });
    }

    if (!description || !amount || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Map old category names to new ones for backward compatibility
    const categoryMap = {
      student_fees: 'student_payment',
    };
    const mappedCategory = categoryMap[category] || category;

    const invoiceData = {
      invoiceType,
      description,
      amount: parseFloat(amount),
      category: mappedCategory,
      student: studentId || undefined,
      employee: employeeId || undefined,
      paymentMethod: paymentMethod || 'cash',
      recordedBy: req.adminId,
      notes: notes || '',
    };

    // Add photo if provided (for backward compatibility with old bill system)
    if (billPhoto) {
      invoiceData.attachments = [
        {
          filename: 'bill-photo',
          path: billPhoto,
          uploadDate: new Date(),
        },
      ];
    }

    const invoice = new Billing(invoiceData);
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice created successfully',
      invoice,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Error creating invoice' });
  }
};

// Get invoices with filters
const getInvoices = async (req, res) => {
  try {
    const { invoiceType, category, startDate, endDate, studentId } = req.query;

    const query = {};

    if (invoiceType) query.invoiceType = invoiceType;
    if (category) query.category = category;
    if (studentId) query.student = studentId;

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = end;
      }
    }

    const invoices = await Billing.find(query)
      .populate('student', 'studentName studentCode')
      .populate('employee', 'employeeName')
      .populate('recordedBy', 'employeeName')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Error fetching invoices' });
  }
};

// Get invoice summary/statistics
const getInvoiceSummary = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let start, end;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to current month
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    const query = {
      invoiceDate: {
        $gte: start,
        $lte: end,
      },
    };

    const [inInvoices, outInvoices] = await Promise.all([
      Billing.find({ ...query, invoiceType: 'IN' }),
      Billing.find({ ...query, invoiceType: 'OUT' }),
    ]);

    // Calculate totals
    const totalIncome = inInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = outInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    // Category breakdown
    const categoryBreakdown = {};

    inInvoices.forEach((inv) => {
      if (!categoryBreakdown[inv.category]) {
        categoryBreakdown[inv.category] = { IN: 0, OUT: 0 };
      }
      categoryBreakdown[inv.category].IN += inv.amount;
    });

    outInvoices.forEach((inv) => {
      if (!categoryBreakdown[inv.category]) {
        categoryBreakdown[inv.category] = { IN: 0, OUT: 0 };
      }
      categoryBreakdown[inv.category].OUT += inv.amount;
    });

    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        netBalance,
        inCount: inInvoices.length,
        outCount: outInvoices.length,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching invoice summary:', error);
    res.status(500).json({ error: 'Error fetching summary' });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Billing.findById(id)
      .populate('student', 'studentName studentCode')
      .populate('employee', 'employeeName')
      .populate('recordedBy', 'employeeName')
      .lean();

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Error fetching invoice' });
  }
};

// Delete invoice (soft delete - mark as cancelled)
const deleteInvoice = async (req, res) => {
  try {
    // Support both :id and :invoiceId parameter names
    const invoiceId = req.params.id || req.params.invoiceId;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }

    const invoice = await Billing.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Instead of deleting, mark as cancelled
    invoice.notes = `${
      invoice.notes || ''
    } [CANCELLED by Admin on ${new Date().toISOString()}]`;
    invoice.amount = 0; // Set amount to 0 to exclude from calculations
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ error: 'Error cancelling invoice' });
  }
};

// ================================= END BILLING/INVOICE MANAGEMENT ================================ //

// ========== AUTOMATED ATTENDANCE SYSTEM FUNCTIONS ========== //

// Note: ZKTeco User ID assignment functions removed
// The system now uses studentCode and employeeCode directly from ZKTeco device

// Delete Student Attendance Record (Hard Delete)
const deleteStudentAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const adminId = req.adminId;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attendance = await Attendance.findById(attendanceId);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Hard delete - permanently remove from database
    await Attendance.findByIdAndDelete(attendanceId);

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student attendance:', error);
    res.status(500).json({ error: 'Error deleting attendance record' });
  }
};

// Delete Employee Attendance Record (Hard Delete)
const deleteEmployeeAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const adminId = req.adminId;

    console.log(`🗑️  Delete employee attendance request: ${attendanceId} by admin: ${adminId}`);

    if (!adminId) {
      console.log('❌ Unauthorized: No admin ID');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!attendanceId) {
      console.log('❌ Missing attendance ID');
      return res.status(400).json({ error: 'Attendance ID is required' });
    }

    const attendance = await EmployeeAttendance.findById(attendanceId);

    if (!attendance) {
      console.log(`❌ Attendance record not found: ${attendanceId}`);
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    console.log(`✅ Found attendance record: ${attendanceId} for employee: ${attendance.employee}`);

    // Hard delete - permanently remove from database
    await EmployeeAttendance.findByIdAndDelete(attendanceId);

    console.log(`✅ Successfully deleted employee attendance: ${attendanceId}`);

    res.json({
      success: true,
      message: 'Employee attendance record deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting employee attendance:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Error deleting attendance record',
      details: error.message 
    });
  }
};

// Get Daily Class Attendance Report
const getDailyClassAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const DailyClassAttendance = require('../models/dailyClassAttendance');

    const reports = await DailyClassAttendance.find({
      date: { $gte: dayStart, $lte: dayEnd },
    })
      .populate('class')
      .populate('presentStudents.student', 'studentName studentCode')
      .populate('absentStudents.student', 'studentName studentCode')
      .populate('lateStudents.student', 'studentName studentCode')
      .sort({ 'class.className': 1 });

    res.json({
      success: true,
      date: targetDate,
      reports: reports,
    });
  } catch (error) {
    console.error('Error getting daily class attendance report:', error);
    res.status(500).json({ error: 'Error getting attendance report' });
  }
};

// Get Class Attendance Summary
const getClassAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const DailyClassAttendance = require('../models/dailyClassAttendance');

    const summaries = await DailyClassAttendance.find({
      class: classId,
      date: { $gte: start, $lte: end },
    })
      .populate('class')
      .populate('presentStudents.student', 'studentName studentCode')
      .populate('absentStudents.student', 'studentName studentCode')
      .populate('lateStudents.student', 'studentName studentCode')
      .sort({ date: -1 });

    // Calculate overall statistics
    const totalDays = summaries.length;
    const avgAttendanceRate =
      summaries.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) /
      (totalDays || 1);

    res.json({
      success: true,
      classId: classId,
      period: { start, end },
      totalDays: totalDays,
      avgAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
      summaries: summaries,
    });
  } catch (error) {
    console.error('Error getting class attendance summary:', error);
    res.status(500).json({ error: 'Error getting class attendance summary' });
  }
};

// Get Employee Attendance Report
const getEmployeeAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const attendances = await EmployeeAttendance.find({
      date: { $gte: start, $lte: end },
    })
      .populate('employee', 'employeeName employeeCode employeeType')
      .sort({ date: -1 });

    // Group by employee
    const byEmployee = {};
    for (const att of attendances) {
      const empId = att.employee._id.toString();
      if (!byEmployee[empId]) {
        byEmployee[empId] = {
          employee: att.employee,
          totalDays: 0,
          presentDays: 0,
          lateDays: 0,
          totalHours: 0,
          records: [],
        };
      }

      byEmployee[empId].totalDays++;
      if (att.status === 'Present') byEmployee[empId].presentDays++;
      if (att.status === 'Late') byEmployee[empId].lateDays++;
      byEmployee[empId].totalHours += att.totalHours || 0;
      byEmployee[empId].records.push(att);
    }

    const summary = Object.values(byEmployee);

    res.json({
      success: true,
      period: { start, end },
      summary: summary,
      totalRecords: attendances.length,
    });
  } catch (error) {
    console.error('Error getting employee attendance report:', error);
    res.status(500).json({ error: 'Error getting employee attendance report' });
  }
};

// Get Employee Attendance Detail
const getEmployeeAttendanceDetail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const attendances = await EmployeeAttendance.find({
      employee: employeeId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendances.length;
    const presentDays = attendances.filter(
      (a) => a.status === 'Present'
    ).length;
    const lateDays = attendances.filter((a) => a.status === 'Late').length;
    const totalHours = attendances.reduce(
      (sum, a) => sum + (a.totalHours || 0),
      0
    );
    const totalScans = attendances.reduce(
      (sum, a) => sum + (a.scans?.length || 0),
      0
    );

    res.json({
      success: true,
      employee: employee,
      period: { start, end },
      statistics: {
        totalDays,
        presentDays,
        lateDays,
        totalHours: Math.round(totalHours * 100) / 100,
        totalScans,
        avgHoursPerDay:
          totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
      },
      attendances: attendances,
    });
  } catch (error) {
    console.error('Error getting employee attendance detail:', error);
    res.status(500).json({ error: 'Error getting employee attendance detail' });
  }
};

// ==================== NEW DASHBOARD VIEW FUNCTIONS ====================

// Student Attendance Dashboard
const studentAttendanceDashboard_Get = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const classId = req.query.classId;
    const status = req.query.status;
    const search = req.query.search;
    const tab = req.query.tab; // 'present', 'absent', 'departed'

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Build query
    const query = {
      date: {
        $gte: selectedDate,
        $lt: nextDay,
      },
    };

    // Apply class filter
    if (classId) {
      query.class = classId;
    }

    // Apply status filter
    if (status) {
      if (status === 'departed') {
        query.exitTime = { $exists: true, $ne: null };
      } else {
        query.status = status;
      }
    }

    // Apply tab filter
    if (tab === 'present') {
      query.$or = [
        { status: 'Present', entryTime: { $exists: true, $ne: null } },
        { status: 'Late', entryTime: { $exists: true, $ne: null } }
      ];
    } else if (tab === 'absent') {
      query.status = 'Absent';
    } else if (tab === 'departed') {
      query.exitTime = { $exists: true, $ne: null };
    }

    // Get all attendance for the selected date
    let attendance = await Attendance.find(query)
      .populate('student', 'studentName studentCode parentName parentPhone1')
      .populate('class', 'className academicLevel section')
      .sort({ status: 1, 'student.studentName': 1 });

    // Apply search filter on populated data
    if (search) {
      const searchLower = search.toLowerCase();
      attendance = attendance.filter(att => {
        const studentName = att.student?.studentName?.toLowerCase() || '';
        const studentCode = att.student?.studentCode?.toLowerCase() || '';
        return studentName.includes(searchLower) || studentCode.includes(searchLower);
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error in studentAttendanceDashboard_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الحضور' });
  }
};

// Export Student Attendance Dashboard to Excel
const exportStudentAttendanceDashboard = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const classId = req.query.classId;
    const status = req.query.status;
    const search = req.query.search;
    const tab = req.query.tab;

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Build query (same as dashboard)
    const query = {
      date: {
        $gte: selectedDate,
        $lt: nextDay,
      },
    };

    if (classId) {
      query.class = classId;
    }

    if (status) {
      if (status === 'departed') {
        query.exitTime = { $exists: true, $ne: null };
      } else {
        query.status = status;
      }
    }

    if (tab === 'present') {
      query.$or = [
        { status: 'Present', entryTime: { $exists: true, $ne: null } },
        { status: 'Late', entryTime: { $exists: true, $ne: null } }
      ];
    } else if (tab === 'absent') {
      query.status = 'Absent';
    } else if (tab === 'departed') {
      query.exitTime = { $exists: true, $ne: null };
    }

    let attendance = await Attendance.find(query)
      .populate('student', 'studentName studentCode parentName parentPhone1')
      .populate('class', 'className academicLevel section')
      .sort({ status: 1, 'student.studentName': 1 });

    if (search) {
      const searchLower = search.toLowerCase();
      attendance = attendance.filter(att => {
        const studentName = att.student?.studentName?.toLowerCase() || '';
        const studentCode = att.student?.studentCode?.toLowerCase() || '';
        return studentName.includes(searchLower) || studentCode.includes(searchLower);
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('حضور الطلاب');

    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '000000' },
      },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    // Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `تقرير حضور الطلاب - ${new Date(date).toLocaleDateString('ar-EG')}`;
    titleCell.style = {
      font: { bold: true, size: 16, color: { argb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8F9FA' },
      },
    };

    // Headers
    const headers = ['#', 'اسم الطالب', 'كود الطالب', 'الفصل', 'وقت الحضور', 'وقت الانصراف', 'الحالة', 'طريقة التحقق'];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Data rows
    attendance.forEach((att, index) => {
      const entryTime = att.entryTime ? new Date(att.entryTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
      const exitTime = att.exitTime ? new Date(att.exitTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
      const statusText = att.status === 'Present' ? 'حاضر' : att.status === 'Late' ? 'متأخر' : att.status === 'Absent' ? 'غائب' : att.status;

      worksheet.addRow([
        index + 1,
        att.student?.studentName || 'غير معروف',
        att.student?.studentCode || 'N/A',
        att.class?.className || 'غير محدد',
        entryTime,
        exitTime,
        statusText,
        att.verifyMethod || 'Face Recognition'
      ]);
    });

    // Apply cell styles
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        row.eachCell((cell) => {
          cell.style = cellStyle;
        });
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 8 },
      { width: 25 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 18 },
    ];

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const fileName = `حضور_الطلاب_${date.replace(/-/g, '_')}.xlsx`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting student attendance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تصدير البيانات' });
  }
};

// Employee Attendance Dashboard
const employeeAttendanceDashboard_Get = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const employeeType = req.query.employeeType;
    const status = req.query.status;
    const search = req.query.search;
    const tab = req.query.tab; // 'present', 'absent', 'departed'

    // Use Egypt timezone for date boundaries to match webhook storage
    const { getEgyptDayBoundaries } = require('../utils/timezone');
    const selectedDate = new Date(date);
    const { start: dayStart, end: dayEnd } = getEgyptDayBoundaries(selectedDate);

    // Build query using Egypt timezone boundaries
    const query = {
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    };

    // Apply status filter
    if (status) {
      if (status === 'departed') {
        query.checkOutTime = { $exists: true, $ne: null };
      } else {
        query.status = status;
      }
    }

    // Apply tab filter
    if (tab === 'present') {
      // Show records with Present or Late status (even if checkInTime is null - handle edge cases)
      query.status = { $in: ['Present', 'Late'] };
    } else if (tab === 'absent') {
      query.$or = [
        { status: 'Absent' },
        { status: 'On-Leave' }
      ];
    } else if (tab === 'departed') {
      // Show records with checkOutTime (regardless of checkInTime)
      query.checkOutTime = { $exists: true, $ne: null };
      // Remove status filter for departed tab to show all departed employees
      delete query.status;
    }

    // Get all employee attendance for the selected date
    let attendance = await EmployeeAttendance.find(query)
      .populate(
        'employee',
        'employeeName employeeCode employeeType employeePhoneNumber'
      )
      .sort({ status: 1, 'employee.employeeName': 1 })
      .lean(); // Convert to plain objects for easier manipulation

    // Filter out records from departed tab where checkOutTime is the same as checkInTime
    // (meaning they haven't actually checked out yet)
    if (tab === 'departed') {
      attendance = attendance.filter(att => {
        if (!att.checkInTime || !att.checkOutTime) return false;
        // Check if check-out time is actually different from check-in time (at least 1 minute difference)
        const timeDiff = Math.abs(new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime());
        return timeDiff > 60000; // 1 minute in milliseconds
      });
    }

    // Apply employee type filter on populated data
    if (employeeType) {
      attendance = attendance.filter(att => att.employee?.employeeType === employeeType);
    }

    // Apply search filter on populated data
    if (search) {
      const searchLower = search.toLowerCase();
      attendance = attendance.filter(att => {
        const employeeName = att.employee?.employeeName?.toLowerCase() || '';
        const employeeCode = att.employee?.employeeCode?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeCode.includes(searchLower);
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error in employeeAttendanceDashboard_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الحضور' });
  }
};

// Export Employee Attendance Dashboard to Excel
const exportEmployeeAttendanceDashboard = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const employeeType = req.query.employeeType;
    const status = req.query.status;
    const search = req.query.search;
    const tab = req.query.tab;

    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Build query (same as dashboard)
    const query = {
      date: {
        $gte: selectedDate,
        $lt: nextDay,
      },
    };

    if (status) {
      if (status === 'departed') {
        query.checkOutTime = { $exists: true, $ne: null };
      } else {
        query.status = status;
      }
    }

    if (tab === 'present') {
      // Show records with Present or Late status (even if checkInTime is null)
      query.status = { $in: ['Present', 'Late'] };
    } else if (tab === 'absent') {
      query.$or = [
        { status: 'Absent' },
        { status: 'On-Leave' }
      ];
    } else if (tab === 'departed') {
      query.checkOutTime = { $exists: true, $ne: null };
    }

    let attendance = await EmployeeAttendance.find(query)
      .populate(
        'employee',
        'employeeName employeeCode employeeType employeePhoneNumber'
      )
      .sort({ status: 1, 'employee.employeeName': 1 })
      .lean();

    // Filter out records from departed tab where checkOutTime is the same as checkInTime
    if (tab === 'departed') {
      attendance = attendance.filter(att => {
        if (!att.checkInTime || !att.checkOutTime) return false;
        // Check if check-out time is actually different from check-in time (at least 1 minute difference)
        const timeDiff = Math.abs(new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime());
        return timeDiff > 60000; // 1 minute in milliseconds
      });
    }

    if (employeeType) {
      attendance = attendance.filter(att => att.employee?.employeeType === employeeType);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      attendance = attendance.filter(att => {
        const employeeName = att.employee?.employeeName?.toLowerCase() || '';
        const employeeCode = att.employee?.employeeCode?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeCode.includes(searchLower);
      });
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('حضور الموظفين');

    // Styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' }, size: 12 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '000000' },
      },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    const cellStyle = {
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } },
      },
    };

    // Title
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `تقرير حضور الموظفين - ${new Date(date).toLocaleDateString('ar-EG')}`;
    titleCell.style = {
      font: { bold: true, size: 16, color: { argb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8F9FA' },
      },
    };

    // Headers
    const headers = ['#', 'اسم الموظف', 'كود الموظف', 'النوع', 'وقت الحضور', 'وقت الانصراف', 'عدد المسحات', 'ساعات العمل', 'الحالة', 'رقم الهاتف'];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Data rows
    attendance.forEach((att, index) => {
      const checkInTime = att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
      const checkOutTime = att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-';
      const statusText = att.status === 'Present' ? 'حاضر' : att.status === 'Late' ? 'متأخر' : att.status === 'Absent' ? 'غائب' : att.status === 'On-Leave' ? 'إجازة' : att.status;
      const employeeTypeText = att.employee?.employeeType === 'teacher' ? 'معلم' : 'إداري';

      worksheet.addRow([
        index + 1,
        att.employee?.employeeName || 'غير معروف',
        att.employee?.employeeCode || 'N/A',
        employeeTypeText,
        checkInTime,
        checkOutTime,
        att.scans?.length || 0,
        (att.totalHours || 0).toFixed(1) + 'س',
        statusText,
        att.employee?.employeePhoneNumber || '-'
      ]);
    });

    // Apply cell styles
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 2) {
        row.eachCell((cell) => {
          cell.style = cellStyle;
        });
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 8 },
      { width: 25 },
      { width: 15 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    const fileName = `حضور_الموظفين_${date.replace(/-/g, '_')}.xlsx`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting employee attendance:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ في تصدير البيانات' });
  }
};

// Student Log - Complete attendance and payment history
const studentLog_Get = async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get student details
    const student = await Student.findById(studentId).populate(
      'class',
      'className'
    );

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'الطالب غير موجود' });
    }

    // Get all attendance records
    const attendance = await Attendance.find({ student: studentId })
      .populate('class', 'className')
      .sort({ date: -1 });

    // Get payment history from student.payments array
    const payments = student.payments || [];

    res.json({
      success: true,
      student,
      attendance,
      payments,
    });
  } catch (error) {
    console.error('Error in studentLog_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الطالب' });
  }
};

// Employee Log - Complete attendance, payments, and deductions history
const employeeLog_Get = async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Get employee details
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: 'الموظف غير موجود' });
    }

    // Get all attendance records with scans
    const attendance = await EmployeeAttendance.find({
      employee: employeeId,
    }).sort({ date: -1 });

    // Get payment history
    const payments = await EmployeePayment.find({ employee: employeeId }).sort({
      paymentDate: -1,
    });

    // Get deductions history
    const deductions = await EmployeeDeduction.find({
      employee: employeeId,
    }).sort({ deductionDate: -1 });

    res.json({
      success: true,
      employee,
      attendance,
      payments,
      deductions,
    });
  } catch (error) {
    console.error('Error in employeeLog_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

// Student Log by Code - Search by student code
const studentLogByCode_Get = async (req, res) => {
  try {
    const studentCode = req.params.code;

    // Get student by code
    const student = await Student.findOne({ studentCode })
      .populate('class', 'className academicLevel section')
      .populate('payments.receivedBy', 'employeeName');

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: 'الطالب غير موجود' });
    }

    // Get all attendance records from DailyClassAttendance
    const DailyClassAttendance = require('../models/dailyClassAttendance');
    const allClassAttendance = await DailyClassAttendance.find({
      $or: [
        { 'presentStudents.student': student._id },
        { 'absentStudents.student': student._id },
        { 'lateStudents.student': student._id },
        { 'earlyLeaveStudents.student': student._id },
      ],
    })
      .populate('class', 'className')
      .sort({ date: -1 });

    // Transform to unified format
    const attendance = [];
    for (const classAtt of allClassAttendance) {
      // Check present students
      const present = classAtt.presentStudents.find(
        (s) => s.student.toString() === student._id.toString()
      );
      if (present) {
        attendance.push({
          date: classAtt.date,
          class: classAtt.class,
          status: 'Present',
          entryTime: present.entryTime,
          exitTime: present.exitTime,
        });
        continue;
      }

      // Check late students
      const late = classAtt.lateStudents.find(
        (s) => s.student.toString() === student._id.toString()
      );
      if (late) {
        attendance.push({
          date: classAtt.date,
          class: classAtt.class,
          status: 'Late',
          entryTime: late.entryTime,
        });
        continue;
      }

      // Check early leave students
      const earlyLeave = classAtt.earlyLeaveStudents.find(
        (s) => s.student.toString() === student._id.toString()
      );
      if (earlyLeave) {
        attendance.push({
          date: classAtt.date,
          class: classAtt.class,
          status: 'Early-Leave',
          exitTime: earlyLeave.exitTime,
          leaveReason: earlyLeave.reason,
        });
        continue;
      }

      // Check absent students
      const absent = classAtt.absentStudents.find(
        (s) => s.student.toString() === student._id.toString()
      );
      if (absent) {
        attendance.push({
          date: classAtt.date,
          class: classAtt.class,
          status: 'Absent',
        });
      }
    }

    // Get payment history from student.payments array
    const payments = student.payments || [];

    res.json({
      success: true,
      student,
      attendance,
      payments,
    });
  } catch (error) {
    console.error('Error in studentLogByCode_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الطالب' });
  }
};

// Employee Log by Code - Search by employee code
const employeeLogByCode_Get = async (req, res) => {
  try {
    const employeeCode = req.params.code;

    // Get employee by code
    const employee = await Employee.findOne({ employeeCode });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: 'الموظف غير موجود' });
    }

    // Get all attendance records with scans
    const attendance = await EmployeeAttendance.find({
      employee: employee._id,
    }).sort({ date: -1 });

    // Get payment history
    const payments = await EmployeePayment.find({ employee: employee._id })
      .populate('paidBy', 'employeeName')
      .sort({ paymentDate: -1 });

    // Get deductions history
    const deductions = await EmployeeDeduction.find({
      employee: employee._id,
    })
      .populate('addedBy', 'employeeName')
      .sort({ deductionDate: -1 });

    res.json({
      success: true,
      employee,
      attendance,
      payments,
      deductions,
    });
  } catch (error) {
    console.error('Error in employeeLogByCode_Get:', error);
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب بيانات الموظف' });
  }
};

// ==================== ATTENDANCE SETTINGS ====================

const AttendanceSettings = require('../models/AttendanceSettings');

// Render attendance settings page
const attendanceSettings_Get = async (req, res) => {
  try {
    res.render('Admin/attendanceSettings', {
      title: 'إعدادات الحضور',
      path: '/admin/attendance-settings',
    });
  } catch (error) {
    console.error('Error rendering attendance settings:', error);
    res.status(500).send('Error loading attendance settings page');
  }
};

// Get attendance settings data (API endpoint)
const getAttendanceSettingsData = async (req, res) => {
  try {
    const settings = await AttendanceSettings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching attendance settings:', error);
    res.status(500).json({ error: 'Error fetching attendance settings' });
  }
};

// Update attendance settings
const updateAttendanceSettings = async (req, res) => {
  try {
    const {
      studentWorkStartHour,
      studentWorkStartMinute,
      studentLateThresholdHour,
      studentLateThresholdMinute,
      studentCheckOutThresholdHour,
      studentCheckOutThresholdMinute,
      employeeWorkStartHour,
      employeeWorkStartMinute,
      employeeLateThresholdHour,
      employeeLateThresholdMinute,
      employeeCheckOutThresholdHour,
      employeeCheckOutThresholdMinute,
      absenceMarkingDelayMinutes,
    } = req.body;

    // Validate input
    const validateTime = (hour, minute, fieldName) => {
      if (hour < 0 || hour > 23) {
        throw new Error(`${fieldName} hour must be between 0 and 23`);
      }
      if (minute < 0 || minute > 59) {
        throw new Error(`${fieldName} minute must be between 0 and 59`);
      }
    };

    validateTime(studentWorkStartHour, studentWorkStartMinute, 'Student work start');
    validateTime(studentLateThresholdHour, studentLateThresholdMinute, 'Student late threshold');
    validateTime(studentCheckOutThresholdHour, studentCheckOutThresholdMinute, 'Student check-out threshold');
    validateTime(employeeWorkStartHour, employeeWorkStartMinute, 'Employee work start');
    validateTime(employeeLateThresholdHour, employeeLateThresholdMinute, 'Employee late threshold');
    validateTime(employeeCheckOutThresholdHour, employeeCheckOutThresholdMinute, 'Employee check-out threshold');

    // Validate absence marking delay
    const delay = parseInt(absenceMarkingDelayMinutes) || 1;
    if (delay < 0 || delay > 120) {
      throw new Error('Absence marking delay must be between 0 and 120 minutes');
    }

    // Update settings
    const settings = await AttendanceSettings.updateSettings({
      studentWorkStartHour,
      studentWorkStartMinute,
      studentLateThresholdHour,
      studentLateThresholdMinute,
      studentCheckOutThresholdHour,
      studentCheckOutThresholdMinute,
      employeeWorkStartHour,
      employeeWorkStartMinute,
      employeeLateThresholdHour,
      employeeLateThresholdMinute,
      employeeCheckOutThresholdHour,
      employeeCheckOutThresholdMinute,
      absenceMarkingDelayMinutes: delay,
    });

    // Reschedule absence marking job with new settings
    try {
      const { rescheduleAbsenceMarking } = require('../services/absenceMarker');
      await rescheduleAbsenceMarking();
    } catch (scheduleError) {
      console.error('Warning: Could not reschedule absence marking:', scheduleError);
    }

    console.log('✅ Attendance settings updated:', settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating attendance settings:', error);
    res.status(500).json({ error: error.message || 'Error updating attendance settings' });
  }
};

// Reset attendance settings to defaults
const resetAttendanceSettings = async (req, res) => {
  try {
    const settings = await AttendanceSettings.resetToDefaults();
    console.log('✅ Attendance settings reset to defaults');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error resetting attendance settings:', error);
    res.status(500).json({ error: 'Error resetting attendance settings' });
  }
};

// ==================== AUTOMATED ABSENCE MARKING ====================

// Manual trigger for absence marking (for testing) - marks BOTH students and employees
const triggerAbsenceMarking = async (req, res) => {
  try {
    const { markAbsentStudents, markAbsentEmployees } = require('../services/absenceMarker');
    
    console.log('\n🔔 Manual absence marking triggered by admin');
    
    // Mark students absent
    console.log('📚 Marking students absent...');
    const studentResult = await markAbsentStudents();
    
    // Mark employees absent
    console.log('👔 Marking employees absent...');
    const employeeResult = await markAbsentEmployees();
    
    res.json({
      success: true,
      message: 'Absence marking completed for both students and employees',
      students: studentResult,
      employees: employeeResult
    });
  } catch (error) {
    console.error('Error in manual absence marking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== MODULE EXPORTS ====================

module.exports = {
  dashboard,
  getDashboardData,
  Employee_Get,
  addEmployee,
  getEmployees,
  updateSalary,
  getEmployee,
  updateEmployee,

  allBills,
  downloadBillExcel,

  admin_billing_Get,
  Admin_addBill,
  Admin_getAllBills,
  // logOut,
  logOut,
  getEmployeeLog,
  deleteEmployee,

  // New Functions
  classes_Get,
  getAllClasses,
  addClass,
  getClass,
  updateClass,
  deleteClass,
  deleteScheduleImage,

  // Attendance Management
  attendance_Get,
  getAttendanceByDate,
  getStudentsByClass,
  recordAttendance,
  getStudentAttendanceHistory,
  deleteStudentAttendance,
  deleteEmployeeAttendance,

  // Billing/Invoice Management (using admin_billing_Get)
  createInvoice,
  getInvoices,
  getInvoiceSummary,
  getInvoiceById,
  deleteInvoice,

  // Employee Payment & Deductions
  addEmployeePayment,
  getEmployeePayments,
  updateEmployeePayment,
  deleteEmployeePayment,
  getEmployeePayment,
  addEmployeeDeduction,
  getEmployeeDeductions,
  getEmployeeSalaryHistory,

  // Automated Attendance System
  getDailyClassAttendanceReport,
  getClassAttendanceSummary,
  getEmployeeAttendanceReport,
  getEmployeeAttendanceDetail,

  // New Dashboard Views
  studentAttendanceDashboard_Get,
  employeeAttendanceDashboard_Get,
  exportStudentAttendanceDashboard,
  exportEmployeeAttendanceDashboard,
  studentLog_Get,
  employeeLog_Get,
  studentLogByCode_Get,
  employeeLogByCode_Get,

  // Attendance Settings
  attendanceSettings_Get,
  getAttendanceSettingsData,
  updateAttendanceSettings,
  resetAttendanceSettings,

  // Automated Absence Marking
  triggerAbsenceMarking,
};
