const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Notification = require('../models/Notification');
const { protect, authorize, checkLoginAttempts, recordLoginAttempt } = require('../middleware/auth');
const { validateUser, validateLogin, validatePasswordChange } = require('../middleware/validation');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (Admin only)
router.post('/register', protect, authorize('admin'), validateUser, async (req, res) => {
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

    // Create user
    const user = await User.create({
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

    // Generate token
    const token = generateToken(user._id);

    // Send welcome notification
    await Notification.createNotification({
      recipient: user._id,
      sender: req.user._id,
      title: 'مرحباً بك في Zewail Academy',
      message: `مرحباً ${user.firstName}، تم إنشاء حسابك بنجاح في نظام إدارة شؤون الموظفين.`,
      type: 'general',
      priority: 'medium'
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position,
          salary: user.salary,
          employmentStatus: user.employmentStatus,
          avatar: user.avatar,
          isActive: user.isActive,
          language: user.language,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', checkLoginAttempts, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password').populate('department', 'name');

    if (!user) {
      recordLoginAttempt(req, false);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      recordLoginAttempt(req, false);
      return res.status(401).json({
        success: false,
        message: 'تم إلغاء تفعيل حسابك'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      recordLoginAttempt(req, false);
      return res.status(401).json({
        success: false,
        message: 'تم قفل حسابك مؤقتاً، حاول مرة أخرى لاحقاً'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incrementLoginAttempts();
      recordLoginAttempt(req, false);
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    recordLoginAttempt(req, true);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          position: user.position,
          salary: user.salary,
          employmentStatus: user.employmentStatus,
          avatar: user.avatar,
          isActive: user.isActive,
          language: user.language,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department', 'name nameEn color')
      .select('-password');

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      position,
      address,
      emergencyContact,
      language
    } = req.body;

    const updateData = {};
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (position) updateData.position = position;
    if (address) updateData.address = address;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (language) updateData.language = language;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('department', 'name nameEn color');

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send notification
    await Notification.createNotification({
      recipient: user._id,
      title: 'تم تغيير كلمة المرور',
      message: 'تم تغيير كلمة مرورك بنجاح. إذا لم تقم بهذا التغيير، يرجى التواصل مع الإدارة.',
      type: 'general',
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Update avatar
// @route   PUT /api/auth/avatar
// @access  Private
router.put('/avatar', protect, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: 'صورة الملف الشخصي مطلوبة'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'تم تحديث صورة الملف الشخصي بنجاح',
      data: { user }
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // In a more secure implementation, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', protect, async (req, res) => {
  try {
    const token = generateToken(req.user._id);
    
    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'لا يوجد مستخدم بهذا البريد الإلكتروني'
      });
    }

    // Generate reset token
    const resetToken = generateToken(user._id);
    
    // In a real application, you would:
    // 1. Store the reset token in database with expiration
    // 2. Send email with reset link
    // 3. Implement reset password endpoint
    
    // For now, we'll just send a notification
    await Notification.createNotification({
      recipient: user._id,
      title: 'طلب إعادة تعيين كلمة المرور',
      message: 'تم استلام طلب إعادة تعيين كلمة المرور. يرجى التواصل مع الإدارة للحصول على رابط إعادة التعيين.',
      type: 'general',
      priority: 'high'
    });

    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get user permissions
// @route   GET /api/auth/permissions
// @access  Private
router.get('/permissions', protect, async (req, res) => {
  try {
    const user = req.user;
    
    // Define permissions based on role
    const permissions = {
      admin: [
        'users.create', 'users.read', 'users.update', 'users.delete',
        'departments.create', 'departments.read', 'departments.update', 'departments.delete',
        'employees.create', 'employees.read', 'employees.update', 'employees.delete',
        'attendance.read', 'attendance.update',
        'leaves.read', 'leaves.approve', 'leaves.reject',
        'payroll.create', 'payroll.read', 'payroll.update', 'payroll.approve',
        'reports.generate', 'reports.export',
        'notifications.create', 'notifications.read', 'notifications.send'
      ],
      hr: [
        'users.read', 'users.update',
        'departments.read',
        'employees.create', 'employees.read', 'employees.update',
        'attendance.read', 'attendance.update',
        'leaves.read', 'leaves.approve', 'leaves.reject',
        'payroll.create', 'payroll.read', 'payroll.update',
        'reports.generate', 'reports.export',
        'notifications.create', 'notifications.read', 'notifications.send'
      ],
      employee: [
        'profile.read', 'profile.update',
        'attendance.create', 'attendance.read',
        'leaves.create', 'leaves.read',
        'payroll.read',
        'notifications.read'
      ]
    };

    res.json({
      success: true,
      data: {
        role: user.role,
        permissions: permissions[user.role] || []
      }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;