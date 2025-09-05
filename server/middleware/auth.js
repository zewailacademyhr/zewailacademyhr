const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مخول للوصول إلى هذا المورد'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      // Get user from token
      const user = await User.findById(decoded.id).select('+password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'المستخدم غير موجود'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'تم إلغاء تفعيل حسابك'
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        return res.status(401).json({
          success: false,
          message: 'تم قفل حسابك مؤقتاً، حاول مرة أخرى لاحقاً'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مخول للوصول إلى هذا المورد'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `دور المستخدم ${req.user.role} غير مخول للوصول إلى هذا المورد`
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin/hr
const authorizeResource = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مخول للوصول إلى هذا المورد'
      });
    }

    // Admin and HR can access all resources
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      return next();
    }

    // Employees can only access their own resources
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user._id.toString() !== resourceUserId?.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول للوصول إلى هذا المورد'
      });
    }

    next();
  };
};

// Rate limiting for login attempts
const loginAttempts = {};

const checkLoginAttempts = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const attempts = loginAttempts[ip] || { count: 0, lastAttempt: null };

  // Reset attempts after 15 minutes
  if (attempts.lastAttempt && Date.now() - attempts.lastAttempt > 15 * 60 * 1000) {
    delete loginAttempts[ip];
    return next();
  }

  // Block if more than 5 attempts in 15 minutes
  if (attempts.count >= 5) {
    return res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد الأقصى من محاولات تسجيل الدخول، حاول مرة أخرى بعد 15 دقيقة'
    });
  }

  req.loginAttempts = attempts;
  next();
};

const recordLoginAttempt = (req, success) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (!success) {
    loginAttempts[ip] = {
      count: (loginAttempts[ip]?.count || 0) + 1,
      lastAttempt: Date.now()
    };
  } else {
    delete loginAttempts[ip];
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        console.log('Optional auth token invalid:', error.message);
      }
    }

    next();
  } catch (error) {
    next();
  }
};

// Check if user can access specific department
const authorizeDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'غير مخول للوصول إلى هذا المورد'
    });
  }

  // Admin can access all departments
  if (req.user.role === 'admin') {
    return next();
  }

  // HR can access all departments
  if (req.user.role === 'hr') {
    return next();
  }

  // Employees can only access their own department
  const departmentId = req.params.departmentId || req.body.departmentId;
  
  if (req.user.department?.toString() !== departmentId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'غير مخول للوصول إلى هذا القسم'
    });
  }

  next();
};

// Check if user can access specific employee data
const authorizeEmployeeAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'غير مخول للوصول إلى هذا المورد'
    });
  }

  // Admin and HR can access all employees
  if (req.user.role === 'admin' || req.user.role === 'hr') {
    return next();
  }

  // Employees can only access their own data
  const employeeId = req.params.employeeId || req.params.id;
  
  if (req.user._id.toString() !== employeeId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'غير مخول للوصول إلى بيانات هذا الموظف'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  authorizeResource,
  checkLoginAttempts,
  recordLoginAttempt,
  optionalAuth,
  authorizeDepartment,
  authorizeEmployeeAccess
};