const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validateDepartment, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      isActive = 'true',
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const departments = await Department.find(filter)
      .populate('manager', 'firstName lastName employeeId')
      .populate('parentDepartment', 'name nameEn')
      .sort(sort)
      .limit(limit)
      .skip(skip);

    const total = await Department.countDocuments(filter);

    res.json({
      success: true,
      data: {
        departments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department by ID
// @route   GET /api/departments/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('manager', 'firstName lastName employeeId email phone')
      .populate('parentDepartment', 'name nameEn manager')
      .populate('employees', 'firstName lastName employeeId position employmentStatus');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود'
      });
    }

    res.json({
      success: true,
      data: { department }
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (HR, Admin)
router.post('/', protect, authorize('hr', 'admin'), validateDepartment, async (req, res) => {
  try {
    const {
      name,
      nameEn,
      description,
      descriptionEn,
      parentDepartment,
      manager,
      budget,
      currency,
      location,
      phone,
      email,
      color
    } = req.body;

    // Check if department name already exists
    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({
        success: false,
        message: 'اسم القسم موجود بالفعل'
      });
    }

    // Check if parent department exists (if provided)
    if (parentDepartment) {
      const parentDept = await Department.findById(parentDepartment);
      if (!parentDept) {
        return res.status(400).json({
          success: false,
          message: 'القسم الأب غير موجود'
        });
      }
    }

    // Check if manager exists and is active (if provided)
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser || !managerUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'المدير غير موجود أو غير نشط'
        });
      }
    }

    // Create department
    const department = await Department.create({
      name,
      nameEn,
      description,
      descriptionEn,
      parentDepartment,
      manager,
      budget,
      currency: currency || 'EGP',
      location,
      phone,
      email,
      color: color || '#3B82F6'
    });

    // Populate the created department
    await department.populate([
      { path: 'manager', select: 'firstName lastName employeeId' },
      { path: 'parentDepartment', select: 'name nameEn' }
    ]);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء القسم بنجاح',
      data: { department }
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (HR, Admin)
router.put('/:id', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const {
      name,
      nameEn,
      description,
      descriptionEn,
      parentDepartment,
      manager,
      budget,
      currency,
      location,
      phone,
      email,
      color,
      isActive
    } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود'
      });
    }

    // Check if name is being changed and if it's already taken
    if (name && name !== department.name) {
      const existingDepartment = await Department.findOne({ name });
      if (existingDepartment) {
        return res.status(400).json({
          success: false,
          message: 'اسم القسم مستخدم بالفعل'
        });
      }
    }

    // Check if parent department exists (if being changed)
    if (parentDepartment && parentDepartment !== department.parentDepartment?.toString()) {
      if (parentDepartment === department._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن أن يكون القسم والداً لنفسه'
        });
      }

      const parentDept = await Department.findById(parentDepartment);
      if (!parentDept) {
        return res.status(400).json({
          success: false,
          message: 'القسم الأب غير موجود'
        });
      }
    }

    // Check if manager exists and is active (if being changed)
    if (manager && manager !== department.manager?.toString()) {
      const managerUser = await User.findById(manager);
      if (!managerUser || !managerUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'المدير غير موجود أو غير نشط'
        });
      }
    }

    // Update department
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (parentDepartment !== undefined) updateData.parentDepartment = parentDepartment;
    if (manager !== undefined) updateData.manager = manager;
    if (budget !== undefined) updateData.budget = budget;
    if (currency !== undefined) updateData.currency = currency;
    if (location !== undefined) updateData.location = location;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedDepartment = await Department.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'manager', select: 'firstName lastName employeeId' },
      { path: 'parentDepartment', select: 'name nameEn' }
    ]);

    // Update employee count
    await updatedDepartment.updateEmployeeCount();

    res.json({
      success: true,
      message: 'تم تحديث القسم بنجاح',
      data: { department: updatedDepartment }
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود'
      });
    }

    // Check if department has employees
    const employeeCount = await User.countDocuments({
      department: department._id,
      employmentStatus: 'active'
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف القسم لأنه يحتوي على ${employeeCount} موظف نشط`
      });
    }

    // Check if department has sub-departments
    const subDepartments = await Department.countDocuments({
      parentDepartment: department._id,
      isActive: true
    });

    if (subDepartments > 0) {
      return res.status(400).json({
        success: false,
        message: `لا يمكن حذف القسم لأنه يحتوي على ${subDepartments} أقسام فرعية`
      });
    }

    // Soft delete - mark as inactive
    department.isActive = false;
    await department.save();

    res.json({
      success: true,
      message: 'تم حذف القسم بنجاح'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department hierarchy
// @route   GET /api/departments/hierarchy
// @access  Private
router.get('/hierarchy', protect, async (req, res) => {
  try {
    const hierarchy = await Department.getHierarchy();

    res.json({
      success: true,
      data: { hierarchy }
    });
  } catch (error) {
    console.error('Get department hierarchy error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get departments with statistics
// @route   GET /api/departments/with-stats
// @access  Private (HR, Admin)
router.get('/with-stats', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const departmentsWithStats = await Department.getDepartmentsWithStats();

    res.json({
      success: true,
      data: { departments: departmentsWithStats }
    });
  } catch (error) {
    console.error('Get departments with stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department employees
// @route   GET /api/departments/:id/employees
// @access  Private
router.get('/:id/employees', protect, validateObjectId('id'), async (req, res) => {
  try {
    const { employmentStatus = 'active' } = req.query;

    const employees = await User.find({
      department: req.params.id,
      employmentStatus
    })
    .populate('department', 'name nameEn')
    .select('-password')
    .sort({ firstName: 1, lastName: 1 });

    res.json({
      success: true,
      data: { employees }
    });
  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update department manager
// @route   PUT /api/departments/:id/manager
// @access  Private (HR, Admin)
router.put('/:id/manager', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { managerId } = req.body;

    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير مطلوب'
      });
    }

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود'
      });
    }

    const manager = await User.findById(managerId);
    if (!manager || !manager.isActive) {
      return res.status(400).json({
        success: false,
        message: 'المدير غير موجود أو غير نشط'
      });
    }

    // Update department manager
    department.manager = managerId;
    await department.save();

    // Populate the updated department
    await department.populate('manager', 'firstName lastName employeeId');

    res.json({
      success: true,
      message: 'تم تحديث مدير القسم بنجاح',
      data: { department }
    });
  } catch (error) {
    console.error('Update department manager error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get department statistics
// @route   GET /api/departments/:id/stats
// @access  Private
router.get('/:id/stats', protect, validateObjectId('id'), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'القسم غير موجود'
      });
    }

    // Get employee count by status
    const employeeStats = await User.aggregate([
      {
        $match: { department: department._id }
      },
      {
        $group: {
          _id: '$employmentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get employee count by role
    const roleStats = await User.aggregate([
      {
        $match: { department: department._id, employmentStatus: 'active' }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get average salary
    const salaryStats = await User.aggregate([
      {
        $match: { department: department._id, employmentStatus: 'active', salary: { $exists: true } }
      },
      {
        $group: {
          _id: null,
          averageSalary: { $avg: '$salary' },
          minSalary: { $min: '$salary' },
          maxSalary: { $max: '$salary' },
          totalSalary: { $sum: '$salary' }
        }
      }
    ]);

    // Get recent hires (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentHires = await User.countDocuments({
      department: department._id,
      hireDate: { $gte: sixMonthsAgo }
    });

    res.json({
      success: true,
      data: {
        department: {
          id: department._id,
          name: department.name,
          nameEn: department.nameEn,
          employeeCount: department.employeeCount,
          budget: department.budget,
          currency: department.currency
        },
        employeeStats,
        roleStats,
        salaryStats: salaryStats[0] || {
          averageSalary: 0,
          minSalary: 0,
          maxSalary: 0,
          totalSalary: 0
        },
        recentHires
      }
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Move employees between departments
// @route   PUT /api/departments/:id/move-employees
// @access  Private (Admin only)
router.put('/:id/move-employees', protect, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { employeeIds, targetDepartmentId } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرفات الموظفين مطلوبة'
      });
    }

    if (!targetDepartmentId) {
      return res.status(400).json({
        success: false,
        message: 'معرف القسم الهدف مطلوب'
      });
    }

    // Check if target department exists
    const targetDepartment = await Department.findById(targetDepartmentId);
    if (!targetDepartment || !targetDepartment.isActive) {
      return res.status(400).json({
        success: false,
        message: 'القسم الهدف غير موجود أو غير نشط'
      });
    }

    // Move employees
    const result = await User.updateMany(
      { _id: { $in: employeeIds } },
      { department: targetDepartmentId }
    );

    // Update employee counts for both departments
    await Department.findByIdAndUpdate(req.params.id).updateEmployeeCount();
    await targetDepartment.updateEmployeeCount();

    res.json({
      success: true,
      message: `تم نقل ${result.modifiedCount} موظف بنجاح`,
      data: {
        moved: result.modifiedCount,
        targetDepartment: {
          id: targetDepartment._id,
          name: targetDepartment.name
        }
      }
    });
  } catch (error) {
    console.error('Move employees error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;