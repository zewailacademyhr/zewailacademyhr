const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize, authorizeEmployeeAccess } = require('../middleware/auth');
const { validatePayroll, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @desc    Generate payroll for employee
// @route   POST /api/payroll/generate/:employeeId
// @access  Private (HR, Admin)
router.post('/generate/:employeeId', protect, authorize('hr', 'admin'), validateObjectId('employeeId'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'السنة والشهر مطلوبان'
      });
    }

    const payroll = await Payroll.generatePayroll(employeeId, parseInt(year), parseInt(month));

    // Send notification to employee
    await Notification.createNotification({
      recipient: employeeId,
      sender: req.user._id,
      title: 'تم إنشاء كشف الراتب',
      message: `تم إنشاء كشف راتبك لشهر ${payroll.payrollPeriod}`,
      type: 'payroll_generated',
      priority: 'high',
      relatedEntity: {
        type: 'payroll',
        id: payroll._id
      },
      actions: [
        {
          label: 'عرض كشف الراتب',
          action: 'view_payroll',
          url: `/payroll/${payroll._id}`,
          style: 'primary'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء كشف الراتب بنجاح',
      data: { payroll }
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في الخادم'
    });
  }
});

// @desc    Generate payrolls for all employees
// @route   POST /api/payroll/generate-all
// @access  Private (HR, Admin)
router.post('/generate-all', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { year, month, department } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'السنة والشهر مطلوبان'
      });
    }

    // Get employees
    let employeeFilter = { employmentStatus: 'active' };
    if (department) {
      employeeFilter.department = department;
    }

    const employees = await User.find(employeeFilter).select('_id firstName lastName employeeId');

    const results = {
      successful: [],
      failed: []
    };

    // Generate payroll for each employee
    for (const employee of employees) {
      try {
        const payroll = await Payroll.generatePayroll(employee._id, parseInt(year), parseInt(month));
        results.successful.push({
          employee: employee,
          payroll: payroll._id
        });
      } catch (error) {
        results.failed.push({
          employee: employee,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `تم إنشاء كشوف الرواتب: ${results.successful.length} نجح، ${results.failed.length} فشل`,
      data: { results }
    });
  } catch (error) {
    console.error('Generate all payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get all payrolls
// @route   GET /api/payroll
// @access  Private (HR, Admin)
router.get('/', protect, authorize('hr', 'admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      employee,
      year,
      month,
      department,
      paymentStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};

    if (employee) {
      filter.employee = employee;
    }

    if (year) {
      filter.year = parseInt(year);
    }

    if (month) {
      filter.month = parseInt(month);
    }

    if (department) {
      const employees = await User.find({ department, employmentStatus: 'active' }).select('_id');
      filter.employee = { $in: employees.map(emp => emp._id) };
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const payrolls = await Payroll.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Payroll.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payrolls,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee payroll history
// @route   GET /api/payroll/employee/:employeeId
// @access  Private
router.get('/employee/:employeeId', protect, authorizeEmployeeAccess, validateObjectId('employeeId'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const payrolls = await Payroll.getEmployeePayrollHistory(employeeId, year ? parseInt(year) : null);

    res.json({
      success: true,
      data: { payrolls }
    });
  } catch (error) {
    console.error('Get employee payroll history error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get payroll by ID
// @route   GET /api/payroll/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department position')
      .populate('approvedBy', 'firstName lastName');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'كشف الراتب غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== payroll.employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لعرض هذا الكشف'
      });
    }

    res.json({
      success: true,
      data: { payroll }
    });
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update payroll
// @route   PUT /api/payroll/:id
// @access  Private (HR, Admin)
router.put('/:id', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const {
      basicSalary,
      allowances,
      deductions,
      bonuses,
      notes,
      hrNotes,
      bankDetails
    } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'كشف الراتب غير موجود'
      });
    }

    if (payroll.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل كشف راتب مدفوع'
      });
    }

    // Update payroll
    const updateData = {};
    
    if (basicSalary !== undefined) updateData.basicSalary = basicSalary;
    if (allowances !== undefined) updateData.allowances = { ...payroll.allowances, ...allowances };
    if (deductions !== undefined) updateData.deductions = { ...payroll.deductions, ...deductions };
    if (bonuses !== undefined) updateData.bonuses = { ...payroll.bonuses, ...bonuses };
    if (notes !== undefined) updateData.notes = notes;
    if (hrNotes !== undefined) updateData.hrNotes = hrNotes;
    if (bankDetails !== undefined) updateData.bankDetails = { ...payroll.bankDetails, ...bankDetails };

    const updatedPayroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId department');

    res.json({
      success: true,
      message: 'تم تحديث كشف الراتب بنجاح',
      data: { payroll: updatedPayroll }
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Approve payroll
// @route   PUT /api/payroll/:id/approve
// @access  Private (HR, Admin)
router.put('/:id/approve', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'كشف الراتب غير موجود'
      });
    }

    if (payroll.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن اعتماد كشف راتب غير معلق'
      });
    }

    // Approve payroll
    await payroll.approve(req.user._id);

    // Populate payroll data
    await payroll.populate([
      { path: 'employee', select: 'firstName lastName employeeId email phone' },
      { path: 'approvedBy', select: 'firstName lastName' }
    ]);

    // Send notification to employee
    await Notification.createNotification({
      recipient: payroll.employee._id,
      sender: req.user._id,
      title: 'تم اعتماد كشف الراتب',
      message: `تم اعتماد كشف راتبك لشهر ${payroll.payrollPeriod}`,
      type: 'payroll_approved',
      priority: 'high',
      relatedEntity: {
        type: 'payroll',
        id: payroll._id
      },
      actions: [
        {
          label: 'عرض كشف الراتب',
          action: 'view_payroll',
          url: `/payroll/${payroll._id}`,
          style: 'primary'
        }
      ]
    });

    res.json({
      success: true,
      message: 'تم اعتماد كشف الراتب بنجاح',
      data: { payroll }
    });
  } catch (error) {
    console.error('Approve payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Mark payroll as paid
// @route   PUT /api/payroll/:id/mark-paid
// @access  Private (HR, Admin)
router.put('/:id/mark-paid', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { paymentDate, paymentMethod } = req.body;

    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'كشف الراتب غير موجود'
      });
    }

    if (payroll.paymentStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن صرف راتب غير معتمد'
      });
    }

    // Mark as paid
    await payroll.markAsPaid(paymentDate ? new Date(paymentDate) : null);

    // Update payment method if provided
    if (paymentMethod) {
      payroll.paymentMethod = paymentMethod;
      await payroll.save();
    }

    // Populate payroll data
    await payroll.populate([
      { path: 'employee', select: 'firstName lastName employeeId email phone' }
    ]);

    // Send notification to employee
    await Notification.createNotification({
      recipient: payroll.employee._id,
      sender: req.user._id,
      title: 'تم صرف الراتب',
      message: `تم صرف راتبك لشهر ${payroll.payrollPeriod} - المبلغ: ${payroll.netSalary} ${payroll.currency}`,
      type: 'payroll_paid',
      priority: 'high',
      relatedEntity: {
        type: 'payroll',
        id: payroll._id
      },
      actions: [
        {
          label: 'عرض كشف الراتب',
          action: 'view_payroll',
          url: `/payroll/${payroll._id}`,
          style: 'primary'
        }
      ]
    });

    res.json({
      success: true,
      message: 'تم صرف الراتب بنجاح',
      data: { payroll }
    });
  } catch (error) {
    console.error('Mark payroll as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department payrolls
// @route   GET /api/payroll/department/:departmentId
// @access  Private (HR, Admin)
router.get('/department/:departmentId', protect, authorize('hr', 'admin'), validateObjectId('departmentId'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'السنة والشهر مطلوبان'
      });
    }

    const payrolls = await Payroll.getDepartmentPayroll(departmentId, parseInt(year), parseInt(month));

    res.json({
      success: true,
      data: { payrolls }
    });
  } catch (error) {
    console.error('Get department payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get payroll statistics
// @route   GET /api/payroll/stats
// @access  Private (HR, Admin)
router.get('/stats', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { year, month, department } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'السنة والشهر مطلوبان'
      });
    }

    let stats;
    
    if (department) {
      // Get department-specific stats
      const payrolls = await Payroll.getDepartmentPayroll(department, parseInt(year), parseInt(month));
      
      stats = {
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
    } else {
      // Get overall stats
      stats = await Payroll.getPayrollStats(parseInt(year), parseInt(month));
    }

    res.json({
      success: true,
      data: {
        period: {
          year: parseInt(year),
          month: parseInt(month)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Export payroll to PDF
// @route   GET /api/payroll/:id/export/pdf
// @access  Private
router.get('/:id/export/pdf', protect, validateObjectId('id'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department position');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'كشف الراتب غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== payroll.employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لتصدير هذا الكشف'
      });
    }

    const filePath = await payroll.generatePDF();
    
    res.download(filePath, `payroll_${payroll.employee.employeeId}_${payroll.year}_${payroll.month}.pdf`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Export payroll PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير الملف'
    });
  }
});

// @desc    Export payrolls to Excel
// @route   GET /api/payroll/export/excel
// @access  Private (HR, Admin)
router.get('/export/excel', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { year, month, department } = req.query;

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

    const XLSX = require('xlsx');
    
    // Prepare data for Excel
    const excelData = payrolls.map(payroll => ({
      'اسم الموظف': payroll.employee.firstName + ' ' + payroll.employee.lastName,
      'رقم الموظف': payroll.employee.employeeId,
      'القسم': payroll.employee.department?.name || '',
      'الراتب الأساسي': payroll.basicSalary,
      'إجمالي البدلات': payroll.totalBonuses,
      'إجمالي الخصومات': payroll.totalDeductions,
      'صافي الراتب': payroll.netSalary,
      'العملة': payroll.currency,
      'حالة الدفع': payroll.paymentStatus,
      'تاريخ الاعتماد': payroll.approvedAt ? payroll.approvedAt.toLocaleDateString('ar-EG') : '',
      'تاريخ الدفع': payroll.paymentDate ? payroll.paymentDate.toLocaleDateString('ar-EG') : ''
    }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 20 }, // اسم الموظف
      { width: 15 }, // رقم الموظف
      { width: 20 }, // القسم
      { width: 15 }, // الراتب الأساسي
      { width: 15 }, // إجمالي البدلات
      { width: 15 }, // إجمالي الخصومات
      { width: 15 }, // صافي الراتب
      { width: 10 }, // العملة
      { width: 15 }, // حالة الدفع
      { width: 15 }, // تاريخ الاعتماد
      { width: 15 }  // تاريخ الدفع
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشوف الرواتب');

    // Generate Excel file
    const fileName = `payrolls_${year}_${month}${department ? `_dept_${department}` : ''}.xlsx`;
    const filePath = `uploads/exports/${fileName}`;
    
    // Ensure directory exists
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    XLSX.writeFile(workbook, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('Export payrolls Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تصدير الملف'
    });
  }
});

module.exports = router;