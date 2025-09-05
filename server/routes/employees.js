const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Department = require('../models/Department');
const FileUpload = require('../models/FileUpload');
const Notification = require('../models/Notification');
const { protect, authorize, authorizeEmployeeAccess } = require('../middleware/auth');
const { validateUser, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/employees';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (HR, Admin)
router.get('/', protect, authorize('hr', 'admin'), validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      department,
      role,
      employmentStatus,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (department) {
      filter.department = department;
    }
    
    if (role) {
      filter.role = role;
    }
    
    if (employmentStatus) {
      filter.employmentStatus = employmentStatus;
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const employees = await User.find(filter)
      .populate('department', 'name nameEn color')
      .select('-password')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
router.get('/:id', protect, authorizeEmployeeAccess, validateObjectId('id'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .populate('department', 'name nameEn color manager')
      .select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    res.json({
      success: true,
      data: { employee }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Create new employee
// @route   POST /api/employees
// @access  Private (HR, Admin)
router.post('/', protect, authorize('hr', 'admin'), validateUser, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      department,
      position,
      salary,
      employmentStatus,
      address,
      emergencyContact
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'المستخدم موجود بالفعل'
      });
    }

    // Check if department exists (if provided)
    if (department) {
      const dept = await Department.findById(department);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'القسم غير موجود'
        });
      }
    }

    // Create employee
    const employee = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role || 'employee',
      department,
      position,
      salary,
      employmentStatus: employmentStatus || 'active',
      address,
      emergencyContact
    });

    // Populate department
    await employee.populate('department', 'name nameEn color');

    // Send welcome notification
    await Notification.createNotification({
      recipient: employee._id,
      sender: req.user._id,
      title: 'مرحباً بك في Zewail Academy',
      message: `مرحباً ${employee.firstName}، تم إنشاء حسابك بنجاح في نظام إدارة شؤون الموظفين.`,
      type: 'general',
      priority: 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الموظف بنجاح',
      data: { employee }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (HR, Admin)
router.put('/:id', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      department,
      position,
      salary,
      employmentStatus,
      address,
      emergencyContact,
      isActive
    } = req.body;

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== employee.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل'
        });
      }
    }

    // Check if department exists (if being changed)
    if (department && department !== employee.department?.toString()) {
      const dept = await Department.findById(department);
      if (!dept) {
        return res.status(400).json({
          success: false,
          message: 'القسم غير موجود'
        });
      }
    }

    // Update employee
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (salary !== undefined) updateData.salary = salary;
    if (employmentStatus !== undefined) updateData.employmentStatus = employmentStatus;
    if (address !== undefined) updateData.address = address;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedEmployee = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('department', 'name nameEn color').select('-password');

    // Send notification about profile update
    await Notification.createNotification({
      recipient: updatedEmployee._id,
      sender: req.user._id,
      title: 'تم تحديث ملفك الشخصي',
      message: 'تم تحديث بعض البيانات في ملفك الشخصي من قبل الموارد البشرية.',
      type: 'profile_update',
      priority: 'medium'
    });

    res.json({
      success: true,
      message: 'تم تحديث الموظف بنجاح',
      data: { employee: updatedEmployee }
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    // Soft delete - mark as inactive instead of hard delete
    employee.isActive = false;
    employee.employmentStatus = 'terminated';
    await employee.save();

    res.json({
      success: true,
      message: 'تم حذف الموظف بنجاح'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Upload employee document
// @route   POST /api/employees/:id/documents
// @access  Private
router.post('/:id/documents', protect, upload.single('document'), async (req, res) => {
  try {
    const { category, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'الملف مطلوب'
      });
    }

    // Check if employee exists
    const employee = await User.findById(req.params.id);
    if (!employee) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user._id.toString() !== employee._id.toString()) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'غير مخول لرفع ملفات لهذا الموظف'
      });
    }

    // Create file upload record
    const fileUpload = await FileUpload.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileExtension: path.extname(req.file.originalname),
      uploadedBy: req.user._id,
      relatedEntity: {
        type: 'employee',
        id: employee._id
      },
      category: category || 'other',
      description,
      accessLevel: req.user.role === 'admin' || req.user.role === 'hr' ? 'hr' : 'employee'
    });

    res.status(201).json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      data: { fileUpload }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    
    // Delete uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee documents
// @route   GET /api/employees/:id/documents
// @access  Private
router.get('/:id/documents', protect, async (req, res) => {
  try {
    // Check if employee exists
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && req.user._id.toString() !== employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لعرض ملفات هذا الموظف'
      });
    }

    const documents = await FileUpload.getFilesByEntity('employee', employee._id);

    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    console.error('Get employee documents error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employee statistics
// @route   GET /api/employees/:id/stats
// @access  Private
router.get('/:id/stats', protect, authorizeEmployeeAccess, validateObjectId('id'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'الموظف غير موجود'
      });
    }

    const Attendance = require('../models/Attendance');
    const Leave = require('../models/Leave');
    const Payroll = require('../models/Payroll');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get current month attendance stats
    const attendanceStats = await Attendance.getAttendanceStats(
      employee._id,
      new Date(currentYear, currentMonth - 1, 1),
      new Date(currentYear, currentMonth, 0)
    );

    // Get leave balance
    const leaveBalance = await Leave.getLeaveBalance(employee._id, currentYear);

    // Get recent payrolls
    const recentPayrolls = await Payroll.find({
      employee: employee._id
    })
    .sort({ year: -1, month: -1 })
    .limit(6);

    // Get recent leaves
    const recentLeaves = await Leave.find({
      employee: employee._id
    })
    .sort({ startDate: -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        attendanceStats,
        leaveBalance,
        recentPayrolls,
        recentLeaves,
        employeeInfo: {
          id: employee._id,
          name: employee.fullName,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position,
          hireDate: employee.hireDate,
          employmentStatus: employee.employmentStatus
        }
      }
    });
  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get employees by department
// @route   GET /api/employees/department/:departmentId
// @access  Private (HR, Admin)
router.get('/department/:departmentId', protect, authorize('hr', 'admin'), validateObjectId('departmentId'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { employmentStatus = 'active' } = req.query;

    const employees = await User.find({
      department: departmentId,
      employmentStatus
    })
    .populate('department', 'name nameEn color')
    .select('-password')
    .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: { employees }
    });
  } catch (error) {
    console.error('Get employees by department error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Bulk update employees
// @route   PUT /api/employees/bulk-update
// @access  Private (Admin only)
router.put('/bulk-update', protect, authorize('admin'), async (req, res) => {
  try {
    const { employeeIds, updateData } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرفات الموظفين مطلوبة'
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات التحديث مطلوبة'
      });
    }

    const result = await User.updateMany(
      { _id: { $in: employeeIds } },
      updateData,
      { runValidators: true }
    );

    res.json({
      success: true,
      message: `تم تحديث ${result.modifiedCount} موظف بنجاح`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Bulk update employees error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;