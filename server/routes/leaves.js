const express = require('express');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize, authorizeEmployeeAccess } = require('../middleware/auth');
const { validateLeave, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all leaves
// @route   GET /api/leaves
// @access  Private (HR, Admin)
router.get('/', protect, authorize('hr', 'admin'), validatePagination, validateDateRange, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      employee,
      type,
      status,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

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

    // Build filter
    const filter = {
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    };

    if (employee) {
      filter.employee = employee;
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (department) {
      const employees = await User.find({ department, employmentStatus: 'active' }).select('_id');
      filter.employee = { $in: employees.map(emp => emp._id) };
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .populate('handoverTo', 'firstName lastName employeeId')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Leave.countDocuments(filter);

    res.json({
      success: true,
      data: {
        leaves,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee leaves
// @route   GET /api/leaves/employee/:employeeId
// @access  Private
router.get('/employee/:employeeId', protect, authorizeEmployeeAccess, validateObjectId('employeeId'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const leaves = await Leave.getEmployeeLeaves(employeeId, parseInt(year));

    res.json({
      success: true,
      data: { leaves }
    });
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get leave by ID
// @route   GET /api/leaves/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department position')
      .populate('approvedBy', 'firstName lastName')
      .populate('handoverTo', 'firstName lastName employeeId');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== leave.employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لعرض هذا الطلب'
      });
    }

    res.json({
      success: true,
      data: { leave }
    });
  } catch (error) {
    console.error('Get leave by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Create leave request
// @route   POST /api/leaves
// @access  Private
router.post('/', protect, validateLeave, async (req, res) => {
  try {
    const {
      type,
      startDate,
      endDate,
      reason,
      emergencyContact,
      handoverTo,
      handoverNotes
    } = req.body;

    // Check if employee has enough leave balance
    const leaveBalance = await Leave.getLeaveBalance(req.user._id);
    
    if (leaveBalance.remaining <= 0) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد رصيد إجازات متاح'
      });
    }

    // Calculate leave duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const requestedDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    if (requestedDays > leaveBalance.remaining) {
      return res.status(400).json({
        success: false,
        message: `الرصيد المتاح ${leaveBalance.remaining} أيام، والطلب ${requestedDays} أيام`
      });
    }

    // Check for overlapping leaves
    const overlappingLeaves = await Leave.find({
      employee: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });

    if (overlappingLeaves.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'يوجد إجازة متداخلة مع التواريخ المطلوبة'
      });
    }

    // Check if handover person exists (if provided)
    if (handoverTo) {
      const handoverEmployee = await User.findById(handoverTo);
      if (!handoverEmployee || !handoverEmployee.isActive) {
        return res.status(400).json({
          success: false,
          message: 'الموظف المسؤول عن التسليم غير موجود أو غير نشط'
        });
      }
    }

    // Create leave request
    const leave = new Leave({
      employee: req.user._id,
      type,
      startDate: start,
      endDate: end,
      reason,
      leaveBalanceBefore: leaveBalance.remaining,
      leaveBalanceAfter: leaveBalance.remaining - requestedDays,
      emergencyContact,
      handoverTo,
      handoverNotes
    });

    await leave.save();

    // Populate leave data
    await leave.populate([
      { path: 'employee', select: 'firstName lastName employeeId department position' },
      { path: 'handoverTo', select: 'firstName lastName employeeId' }
    ]);

    // Send notification to HR/Admin
    const hrUsers = await User.find({
      role: { $in: ['hr', 'admin'] },
      isActive: true
    });

    for (const hrUser of hrUsers) {
      await Notification.createNotification({
        recipient: hrUser._id,
        sender: req.user._id,
        title: 'طلب إجازة جديد',
        message: `${req.user.firstName} ${req.user.lastName} قدم طلب إجازة من ${start.toLocaleDateString('ar-EG')} إلى ${end.toLocaleDateString('ar-EG')}`,
        type: 'leave_request',
        priority: 'high',
        relatedEntity: {
          type: 'leave',
          id: leave._id
        },
        actions: [
          {
            label: 'عرض الطلب',
            action: 'view_leave',
            url: `/leaves/${leave._id}`,
            style: 'primary'
          }
        ]
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم تقديم طلب الإجازة بنجاح',
      data: { leave }
    });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update leave request
// @route   PUT /api/leaves/:id
// @access  Private
router.put('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      reason,
      emergencyContact,
      handoverTo,
      handoverNotes
    } = req.body;

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== leave.employee.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لتعديل هذا الطلب'
      });
    }

    // Only allow updates for pending leaves
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تعديل طلب إجازة غير معلق'
      });
    }

    // Update leave
    const updateData = {};
    
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (reason !== undefined) updateData.reason = reason;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (handoverTo !== undefined) updateData.handoverTo = handoverTo;
    if (handoverNotes !== undefined) updateData.handoverNotes = handoverNotes;

    const updatedLeave = await Leave.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'employee', select: 'firstName lastName employeeId department position' },
      { path: 'handoverTo', select: 'firstName lastName employeeId' }
    ]);

    res.json({
      success: true,
      message: 'تم تحديث طلب الإجازة بنجاح',
      data: { leave: updatedLeave }
    });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Approve leave request
// @route   PUT /api/leaves/:id/approve
// @access  Private (HR, Admin)
router.put('/:id/approve', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { comments = '' } = req.body;

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن الموافقة على طلب إجازة غير معلق'
      });
    }

    // Approve leave
    await leave.approve(req.user._id, comments);

    // Populate leave data
    await leave.populate([
      { path: 'employee', select: 'firstName lastName employeeId email phone' },
      { path: 'approvedBy', select: 'firstName lastName' }
    ]);

    // Send notification to employee
    await Notification.createNotification({
      recipient: leave.employee._id,
      sender: req.user._id,
      title: 'تم قبول طلب الإجازة',
      message: `تم قبول طلب إجازتك من ${leave.startDate.toLocaleDateString('ar-EG')} إلى ${leave.endDate.toLocaleDateString('ar-EG')}`,
      type: 'leave_approved',
      priority: 'medium',
      relatedEntity: {
        type: 'leave',
        id: leave._id
      }
    });

    res.json({
      success: true,
      message: 'تم قبول طلب الإجازة بنجاح',
      data: { leave }
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Reject leave request
// @route   PUT /api/leaves/:id/reject
// @access  Private (HR, Admin)
router.put('/:id/reject', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { reason = '' } = req.body;

    if (!reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'سبب الرفض مطلوب'
      });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن رفض طلب إجازة غير معلق'
      });
    }

    // Reject leave
    await leave.reject(req.user._id, reason);

    // Populate leave data
    await leave.populate([
      { path: 'employee', select: 'firstName lastName employeeId email phone' },
      { path: 'approvedBy', select: 'firstName lastName' }
    ]);

    // Send notification to employee
    await Notification.createNotification({
      recipient: leave.employee._id,
      sender: req.user._id,
      title: 'تم رفض طلب الإجازة',
      message: `تم رفض طلب إجازتك من ${leave.startDate.toLocaleDateString('ar-EG')} إلى ${leave.endDate.toLocaleDateString('ar-EG')}. السبب: ${reason}`,
      type: 'leave_rejected',
      priority: 'high',
      relatedEntity: {
        type: 'leave',
        id: leave._id
      }
    });

    res.json({
      success: true,
      message: 'تم رفض طلب الإجازة بنجاح',
      data: { leave }
    });
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Cancel leave request
// @route   PUT /api/leaves/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, validateObjectId('id'), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'طلب الإجازة غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== leave.employee.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لإلغاء هذا الطلب'
      });
    }

    if (leave.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'طلب الإجازة ملغي بالفعل'
      });
    }

    // Cancel leave
    await leave.cancel();

    res.json({
      success: true,
      message: 'تم إلغاء طلب الإجازة بنجاح'
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get pending leaves
// @route   GET /api/leaves/pending
// @access  Private (HR, Admin)
router.get('/pending', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const pendingLeaves = await Leave.getPendingLeaves();

    res.json({
      success: true,
      data: { leaves: pendingLeaves }
    });
  } catch (error) {
    console.error('Get pending leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get leave balance
// @route   GET /api/leaves/balance/:employeeId
// @access  Private
router.get('/balance/:employeeId', protect, authorizeEmployeeAccess, validateObjectId('employeeId'), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    const balance = await Leave.getLeaveBalance(employeeId, parseInt(year));
    const stats = await Leave.getLeaveStats(employeeId, parseInt(year));

    res.json({
      success: true,
      data: {
        balance,
        stats
      }
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department leaves
// @route   GET /api/leaves/department/:departmentId
// @access  Private (HR, Admin)
router.get('/department/:departmentId', protect, authorize('hr', 'admin'), validateObjectId('departmentId'), validateDateRange, async (req, res) => {
  try {
    const { departmentId } = req.params;
    
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

    const leaves = await Leave.getDepartmentLeaves(departmentId, startDate, endDate);

    res.json({
      success: true,
      data: { leaves }
    });
  } catch (error) {
    console.error('Get department leaves error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;