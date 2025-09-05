const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, authorize, authorizeEmployeeAccess } = require('../middleware/auth');
const { validateAttendance, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');

const router = express.Router();

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Private
router.post('/checkin', protect, async (req, res) => {
  try {
    const { location, photo, notes } = req.body;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance && existingAttendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'تم تسجيل الحضور بالفعل اليوم'
      });
    }

    let attendance;
    
    if (existingAttendance) {
      // Update existing record
      await existingAttendance.checkIn({
        location,
        photo,
        notes,
        device: {
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection.remoteAddress
        }
      });
      attendance = existingAttendance;
    } else {
      // Create new attendance record
      attendance = new Attendance({
        employee: req.user._id,
        date: today,
        checkIn: {
          time: new Date(),
          location,
          photo,
          notes,
          device: {
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress
          }
        }
      });
      
      await attendance.save();
    }

    // Populate employee data
    await attendance.populate('employee', 'firstName lastName employeeId department');

    res.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح',
      data: { attendance }
    });
  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Check out
// @route   POST /api/attendance/checkout
// @access  Private
router.post('/checkout', protect, async (req, res) => {
  try {
    const { location, photo, notes } = req.body;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تسجيل الحضور اليوم'
      });
    }

    if (!attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تسجيل الحضور اليوم'
      });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: 'تم تسجيل الانصراف بالفعل اليوم'
      });
    }

    // Check out
    await attendance.checkOut({
      location,
      photo,
      notes,
      device: {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      }
    });

    // Populate employee data
    await attendance.populate('employee', 'firstName lastName employeeId department');

    res.json({
      success: true,
      message: 'تم تسجيل الانصراف بنجاح',
      data: { attendance }
    });
  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get current attendance status
// @route   GET /api/attendance/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    const status = {
      isCheckedIn: false,
      isCheckedOut: false,
      checkInTime: null,
      checkOutTime: null,
      totalHours: 0,
      isLate: false,
      lateMinutes: 0,
      earlyDeparture: false,
      earlyDepartureMinutes: 0,
      canCheckIn: true,
      canCheckOut: false
    };

    if (attendance) {
      status.isCheckedIn = !!attendance.checkIn.time;
      status.isCheckedOut = !!attendance.checkOut.time;
      status.checkInTime = attendance.checkIn.time;
      status.checkOutTime = attendance.checkOut.time;
      status.totalHours = attendance.totalHours;
      status.isLate = attendance.isLate;
      status.lateMinutes = attendance.lateMinutes;
      status.earlyDeparture = attendance.earlyDeparture;
      status.earlyDepartureMinutes = attendance.earlyDepartureMinutes;
      status.canCheckIn = !status.isCheckedIn;
      status.canCheckOut = status.isCheckedIn && !status.isCheckedOut;
    }

    res.json({
      success: true,
      data: { status }
    });
  } catch (error) {
    console.error('Get attendance status error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee attendance records
// @route   GET /api/attendance/employee/:employeeId
// @access  Private
router.get('/employee/:employeeId', protect, authorizeEmployeeAccess, validateObjectId('employeeId'), validatePagination, validateDateRange, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

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

    const attendances = await Attendance.find({
      employee: employeeId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('employee', 'firstName lastName employeeId department')
    .populate('approvedBy', 'firstName lastName')
    .sort({ date: -1 })
    .limit(limit)
    .skip(skip);

    const total = await Attendance.countDocuments({
      employee: employeeId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Get attendance statistics
    const stats = await Attendance.getAttendanceStats(employeeId, startDate, endDate);

    res.json({
      success: true,
      data: {
        attendances,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get all attendance records (HR/Admin)
// @route   GET /api/attendance
// @access  Private (HR, Admin)
router.get('/', protect, authorize('hr', 'admin'), validatePagination, validateDateRange, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      department,
      employee,
      status,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

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

    // Build filter
    const filter = {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    if (department) {
      const User = require('../models/User');
      const employees = await User.find({ department, employmentStatus: 'active' }).select('_id');
      filter.employee = { $in: employees.map(emp => emp._id) };
    }

    if (employee) {
      filter.employee = employee;
    }

    if (status) {
      filter.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const attendances = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: {
        attendances,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get attendance by ID
// @route   GET /api/attendance/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('approvedBy', 'firstName lastName');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'سجل الحضور غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== attendance.employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لعرض هذا السجل'
      });
    }

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    console.error('Get attendance by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private (HR, Admin)
router.put('/:id', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const {
      checkIn,
      checkOut,
      status,
      notes,
      hrNotes,
      manualAdjustment
    } = req.body;

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'سجل الحضور غير موجود'
      });
    }

    // Update attendance
    const updateData = {};
    
    if (checkIn) {
      updateData.checkIn = { ...attendance.checkIn, ...checkIn };
    }
    
    if (checkOut) {
      updateData.checkOut = { ...attendance.checkOut, ...checkOut };
    }
    
    if (status) {
      updateData.status = status;
    }
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    if (hrNotes !== undefined) {
      updateData.hrNotes = hrNotes;
    }
    
    if (manualAdjustment) {
      updateData.manualAdjustment = {
        ...manualAdjustment,
        adjustedBy: req.user._id,
        adjustedAt: new Date()
      };
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeId department');

    res.json({
      success: true,
      message: 'تم تحديث سجل الحضور بنجاح',
      data: { attendance: updatedAttendance }
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Approve attendance record
// @route   PUT /api/attendance/:id/approve
// @access  Private (HR, Admin)
router.put('/:id/approve', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'سجل الحضور غير موجود'
      });
    }

    await attendance.approve(req.user._id);

    // Send notification to employee
    await Notification.createNotification({
      recipient: attendance.employee,
      sender: req.user._id,
      title: 'تم اعتماد سجل الحضور',
      message: `تم اعتماد سجل حضورك بتاريخ ${attendance.date.toLocaleDateString('ar-EG')}`,
      type: 'attendance_approved',
      priority: 'medium'
    });

    res.json({
      success: true,
      message: 'تم اعتماد سجل الحضور بنجاح'
    });
  } catch (error) {
    console.error('Approve attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department attendance
// @route   GET /api/attendance/department/:departmentId
// @access  Private (HR, Admin)
router.get('/department/:departmentId', protect, authorize('hr', 'admin'), validateObjectId('departmentId'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    
    const attendances = await Attendance.getDepartmentAttendance(departmentId, targetDate);

    res.json({
      success: true,
      data: { attendances }
    });
  } catch (error) {
    console.error('Get department attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get attendance summary
// @route   GET /api/attendance/summary
// @access  Private (HR, Admin)
router.get('/summary', protect, authorize('hr', 'admin'), validateDateRange, async (req, res) => {
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

    const summary = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
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

    const stats = summary[0] || {
      totalRecords: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      totalHours: 0,
      totalOvertimeHours: 0,
      totalLateMinutes: 0
    };

    // Calculate attendance rate
    const attendanceRate = stats.totalRecords > 0 
      ? (stats.presentDays / stats.totalRecords) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        stats: {
          ...stats,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;