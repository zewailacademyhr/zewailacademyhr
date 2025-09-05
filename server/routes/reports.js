const express = require('express');
const User = require('../models/User');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// @desc    Generate attendance report
// @route   GET /api/reports/attendance
// @access  Private (HR, Admin)
router.get('/attendance', protect, authorize('hr', 'admin'), validateDateRange, async (req, res) => {
  try {
    let startDate, endDate;
    
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const { department, employee, format = 'json' } = req.query;

    // Build filter
    const attendanceFilter = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (employee) {
      attendanceFilter.employee = employee;
    } else if (department) {
      const employees = await User.find({ department, employmentStatus: 'active' }).select('_id');
      attendanceFilter.employee = { $in: employees.map(emp => emp._id) };
    }

    // Get attendance data
    const attendances = await Attendance.find(attendanceFilter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ date: -1 });

    // Calculate statistics
    const stats = await Attendance.aggregate([
      {
        $match: attendanceFilter
      },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentDays: {
            $sum: {
              $cond: [
                { $in: ['$status', ['present', 'late']] },
                1,
                0
              ]
            }
          },
          absentDays: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'absent'] },
                1,
                0
              ]
            }
          },
          lateDays: {
            $sum: {
              $cond: [
                { $eq: ['$isLate', true] },
                1,
                0
              ]
            }
          },
          totalHours: { $sum: '$totalHours' },
          totalOvertimeHours: { $sum: '$overtimeHours' },
          totalLateMinutes: { $sum: '$lateMinutes' }
        }
      }
    ]);

    const reportData = {
      period: {
        startDate,
        endDate
      },
      filter: {
        department,
        employee
      },
      statistics: stats[0] || {
        totalRecords: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalHours: 0,
        totalOvertimeHours: 0,
        totalLateMinutes: 0
      },
      attendances: attendances.map(att => ({
        id: att._id,
        employee: {
          id: att.employee._id,
          name: `${att.employee.firstName} ${att.employee.lastName}`,
          employeeId: att.employee.employeeId,
          department: att.employee.department?.name || ''
        },
        date: att.date,
        checkInTime: att.checkIn.time,
        checkOutTime: att.checkOut.time,
        totalHours: att.totalHours,
        overtimeHours: att.overtimeHours,
        status: att.status,
        isLate: att.isLate,
        lateMinutes: att.lateMinutes,
        earlyDeparture: att.earlyDeparture,
        earlyDepartureMinutes: att.earlyDepartureMinutes,
        notes: att.notes
      }))
    };

    if (format === 'pdf') {
      // Generate PDF report
      const PDFDocument = require('pdfkit');
      const fs = require('fs');
      const path = require('path');

      const doc = new PDFDocument({ margin: 50 });
      
      // Set up the PDF content
      doc.fontSize(20).text('تقرير الحضور والانصراف', { align: 'center' });
      doc.fontSize(14).text(`الفترة من ${startDate.toLocaleDateString('ar-EG')} إلى ${endDate.toLocaleDateString('ar-EG')}`, { align: 'center' });
      
      // Add statistics
      doc.fontSize(12);
      doc.text(`إجمالي السجلات: ${reportData.statistics.totalRecords}`);
      doc.text(`أيام الحضور: ${reportData.statistics.presentDays}`);
      doc.text(`أيام الغياب: ${reportData.statistics.absentDays}`);
      doc.text(`أيام التأخير: ${reportData.statistics.lateDays}`);
      doc.text(`إجمالي الساعات: ${reportData.statistics.totalHours}`);
      doc.text(`ساعات العمل الإضافي: ${reportData.statistics.totalOvertimeHours}`);

      // Save the PDF
      const fileName = `attendance_report_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/reports', fileName);
      
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      doc.pipe(fs.createWriteStream(filePath));
      doc.end();

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
        }
      });
    } else {
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    console.error('Generate attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Generate leave report
// @route   GET /api/reports/leaves
// @access  Private (HR, Admin)
router.get('/leaves', protect, authorize('hr', 'admin'), validateDateRange, async (req, res) => {
  try {
    let startDate, endDate;
    
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
    } else {
      // Default to current year
      const now = new Date();
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }

    const { department, employee, type, status, format = 'json' } = req.query;

    // Build filter
    const leaveFilter = {
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    };

    if (employee) {
      leaveFilter.employee = employee;
    } else if (department) {
      const employees = await User.find({ department, employmentStatus: 'active' }).select('_id');
      leaveFilter.employee = { $in: employees.map(emp => emp._id) };
    }

    if (type) {
      leaveFilter.type = type;
    }

    if (status) {
      leaveFilter.status = status;
    }

    // Get leave data
    const leaves = await Leave.find(leaveFilter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ startDate: -1 });

    // Calculate statistics
    const stats = await Leave.aggregate([
      {
        $match: leaveFilter
      },
      {
        $group: {
          _id: null,
          totalLeaves: { $sum: 1 },
          approvedLeaves: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'approved'] },
                1,
                0
              ]
            }
          },
          pendingLeaves: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'pending'] },
                1,
                0
              ]
            }
          },
          rejectedLeaves: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'rejected'] },
                1,
                0
              ]
            }
          },
          totalDays: { $sum: '$workingDays' },
          totalApprovedDays: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'approved'] },
                '$workingDays',
                0
              ]
            }
          }
        }
      }
    ]);

    const reportData = {
      period: {
        startDate,
        endDate
      },
      filter: {
        department,
        employee,
        type,
        status
      },
      statistics: stats[0] || {
        totalLeaves: 0,
        approvedLeaves: 0,
        pendingLeaves: 0,
        rejectedLeaves: 0,
        totalDays: 0,
        totalApprovedDays: 0
      },
      leaves: leaves.map(leave => ({
        id: leave._id,
        employee: {
          id: leave.employee._id,
          name: `${leave.employee.firstName} ${leave.employee.lastName}`,
          employeeId: leave.employee.employeeId,
          department: leave.employee.department?.name || ''
        },
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        workingDays: leave.workingDays,
        reason: leave.reason,
        status: leave.status,
        approvedBy: leave.approvedBy ? {
          id: leave.approvedBy._id,
          name: `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}`
        } : null,
        approvedAt: leave.approvedAt,
        createdAt: leave.createdAt
      }))
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate leave report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Generate payroll report
// @route   GET /api/reports/payroll
// @access  Private (HR, Admin)
router.get('/payroll', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { year, month, department, format = 'json' } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'السنة والشهر مطلوبان'
      });
    }

    let payrolls;
    
    if (department) {
      payrolls = await Payroll.getDepartmentPayroll(department, parseInt(year), parseInt(month));
    } else {
      payrolls = await Payroll.find({
        year: parseInt(year),
        month: parseInt(month)
      }).populate('employee', 'firstName lastName employeeId department');
    }

    // Calculate statistics
    const stats = {
      totalEmployees: payrolls.length,
      totalGrossSalary: payrolls.reduce((sum, payroll) => sum + payroll.grossSalary, 0),
      totalDeductions: payrolls.reduce((sum, payroll) => sum + payroll.totalDeductions, 0),
      totalBonuses: payrolls.reduce((sum, payroll) => sum + payroll.totalBonuses, 0),
      totalNetSalary: payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0),
      averageSalary: payrolls.length > 0 
        ? payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0) / payrolls.length 
        : 0,
      payrollsByStatus: {
        pending: payrolls.filter(p => p.paymentStatus === 'pending').length,
        approved: payrolls.filter(p => p.paymentStatus === 'approved').length,
        paid: payrolls.filter(p => p.paymentStatus === 'paid').length,
        cancelled: payrolls.filter(p => p.paymentStatus === 'cancelled').length
      }
    };

    const reportData = {
      period: {
        year: parseInt(year),
        month: parseInt(month)
      },
      filter: {
        department
      },
      statistics: stats,
      payrolls: payrolls.map(payroll => ({
        id: payroll._id,
        employee: {
          id: payroll.employee._id,
          name: `${payroll.employee.firstName} ${payroll.employee.lastName}`,
          employeeId: payroll.employee.employeeId,
          department: payroll.employee.department?.name || ''
        },
        basicSalary: payroll.basicSalary,
        totalBonuses: payroll.totalBonuses,
        totalDeductions: payroll.totalDeductions,
        netSalary: payroll.netSalary,
        currency: payroll.currency,
        paymentStatus: payroll.paymentStatus,
        paymentDate: payroll.paymentDate,
        approvedAt: payroll.approvedAt
      }))
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate payroll report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Generate employee report
// @route   GET /api/reports/employees
// @access  Private (HR, Admin)
router.get('/employees', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { department, employmentStatus, format = 'json' } = req.query;

    // Build filter
    const filter = {};
    
    if (department) {
      filter.department = department;
    }
    
    if (employmentStatus) {
      filter.employmentStatus = employmentStatus;
    }

    // Get employees
    const employees = await User.find(filter)
      .populate('department', 'name nameEn')
      .select('-password')
      .sort({ firstName: 1, lastName: 1 });

    // Calculate statistics
    const stats = {
      totalEmployees: employees.length,
      activeEmployees: employees.filter(emp => emp.employmentStatus === 'active').length,
      inactiveEmployees: employees.filter(emp => emp.employmentStatus === 'inactive').length,
      terminatedEmployees: employees.filter(emp => emp.employmentStatus === 'terminated').length,
      onLeaveEmployees: employees.filter(emp => emp.employmentStatus === 'on_leave').length,
      employeesByRole: {
        admin: employees.filter(emp => emp.role === 'admin').length,
        hr: employees.filter(emp => emp.role === 'hr').length,
        employee: employees.filter(emp => emp.role === 'employee').length
      }
    };

    // Calculate average salary
    const employeesWithSalary = employees.filter(emp => emp.salary && emp.salary > 0);
    const averageSalary = employeesWithSalary.length > 0 
      ? employeesWithSalary.reduce((sum, emp) => sum + emp.salary, 0) / employeesWithSalary.length 
      : 0;

    const reportData = {
      filter: {
        department,
        employmentStatus
      },
      statistics: {
        ...stats,
        averageSalary
      },
      employees: employees.map(emp => ({
        id: emp._id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone,
        employeeId: emp.employeeId,
        role: emp.role,
        department: emp.department ? {
          id: emp.department._id,
          name: emp.department.name,
          nameEn: emp.department.nameEn
        } : null,
        position: emp.position,
        salary: emp.salary,
        employmentStatus: emp.employmentStatus,
        hireDate: emp.hireDate,
        isActive: emp.isActive,
        createdAt: emp.createdAt
      }))
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate employee report error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Send report via WhatsApp
// @route   POST /api/reports/send/whatsapp
// @access  Private (HR, Admin)
router.post('/send/whatsapp', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { phoneNumber, message, reportType, reportData } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف والرسالة مطلوبان'
      });
    }

    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Format message for WhatsApp
    const formattedMessage = `*تقرير ${reportType}*\n\n${message}`;

    const result = await client.messages.create({
      body: formattedMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${phoneNumber}`
    });

    // Create notification record
    await Notification.createNotification({
      recipient: req.user._id,
      title: 'تم إرسال التقرير عبر الواتساب',
      message: `تم إرسال تقرير ${reportType} إلى ${phoneNumber}`,
      type: 'general',
      priority: 'medium',
      metadata: {
        reportType,
        phoneNumber,
        messageId: result.sid
      }
    });

    res.json({
      success: true,
      message: 'تم إرسال التقرير عبر الواتساب بنجاح',
      data: {
        messageId: result.sid,
        phoneNumber,
        reportType
      }
    });
  } catch (error) {
    console.error('Send report via WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال التقرير عبر الواتساب'
    });
  }
});

// @desc    Send report via Email
// @route   POST /api/reports/send/email
// @access  Private (HR, Admin)
router.post('/send/email', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { email, subject, message, reportType, reportData } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني والموضوع والرسالة مطلوبة'
      });
    }

    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Format email content
    const htmlContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>${subject}</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          ${message}
        </div>
        ${reportData ? `
          <div style="margin-top: 20px;">
            <h3>تفاصيل التقرير:</h3>
            <pre style="background-color: #e9ecef; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${JSON.stringify(reportData, null, 2)}</pre>
          </div>
        ` : ''}
        <hr style="margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px;">
          تم إرسال هذا التقرير من نظام إدارة شؤون الموظفين - Zewail Academy
        </p>
      </div>
    `;

    const result = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: subject,
      html: htmlContent
    });

    // Create notification record
    await Notification.createNotification({
      recipient: req.user._id,
      title: 'تم إرسال التقرير عبر الإيميل',
      message: `تم إرسال تقرير ${reportType} إلى ${email}`,
      type: 'general',
      priority: 'medium',
      metadata: {
        reportType,
        email,
        messageId: result.messageId
      }
    });

    res.json({
      success: true,
      message: 'تم إرسال التقرير عبر الإيميل بنجاح',
      data: {
        messageId: result.messageId,
        email,
        reportType
      }
    });
  } catch (error) {
    console.error('Send report via email error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال التقرير عبر الإيميل'
    });
  }
});

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get current month date range
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);

    // Get current day date range
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Employee statistics
    const totalEmployees = await User.countDocuments({ employmentStatus: 'active' });
    const newHiresThisMonth = await User.countDocuments({
      hireDate: { $gte: startOfMonth, $lte: endOfMonth },
      employmentStatus: 'active'
    });

    // Attendance statistics for today
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay }
    });
    
    const todayPresent = await Attendance.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['present', 'late'] }
    });

    const todayAbsent = await Attendance.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay },
      status: 'absent'
    });

    // Leave statistics for current month
    const pendingLeaves = await Leave.countDocuments({
      status: 'pending'
    });

    const approvedLeavesThisMonth = await Leave.countDocuments({
      status: 'approved',
      startDate: { $gte: startOfMonth },
      endDate: { $lte: endOfMonth }
    });

    // Payroll statistics for current month
    const pendingPayrolls = await Payroll.countDocuments({
      year: currentYear,
      month: currentMonth,
      paymentStatus: 'pending'
    });

    const paidPayrolls = await Payroll.countDocuments({
      year: currentYear,
      month: currentMonth,
      paymentStatus: 'paid'
    });

    // Department statistics
    const departments = await Department.find({ isActive: true })
      .populate('employees', '_id')
      .select('name nameEn employeeCount');

    // Recent activities
    const recentLeaves = await Leave.find({ status: 'pending' })
      .populate('employee', 'firstName lastName employeeId')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentNotifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    const dashboardData = {
      overview: {
        totalEmployees,
        newHiresThisMonth,
        todayAttendance,
        todayPresent,
        todayAbsent,
        pendingLeaves,
        approvedLeavesThisMonth,
        pendingPayrolls,
        paidPayrolls
      },
      departments,
      recentLeaves,
      recentNotifications
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Get dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;