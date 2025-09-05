const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صحيحة',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('firstName')
    .notEmpty()
    .withMessage('الاسم الأول مطلوب')
    .isLength({ min: 2, max: 50 })
    .withMessage('الاسم الأول يجب أن يكون بين 2 و 50 حرف'),
  
  body('lastName')
    .notEmpty()
    .withMessage('الاسم الأخير مطلوب')
    .isLength({ min: 2, max: 50 })
    .withMessage('الاسم الأخير يجب أن يكون بين 2 و 50 حرف'),
  
  body('email')
    .isEmail()
    .withMessage('بريد إلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('phone')
    .matches(/^(\+20|0)?1[0-9]{9}$/)
    .withMessage('رقم هاتف مصري غير صحيح'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('كلمة المرور يجب أن تحتوي على حرف صغير وحرف كبير ورقم'),
  
  body('role')
    .optional()
    .isIn(['admin', 'hr', 'employee'])
    .withMessage('دور المستخدم غير صحيح'),
  
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('الراتب يجب أن يكون رقم موجب'),
  
  body('employmentStatus')
    .optional()
    .isIn(['active', 'inactive', 'terminated', 'on_leave'])
    .withMessage('حالة التوظيف غير صحيحة'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('بريد إلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة'),
  
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('كلمة المرور الحالية مطلوبة'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('كلمة المرور الجديدة يجب أن تحتوي على حرف صغير وحرف كبير ورقم'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('تأكيد كلمة المرور غير متطابق');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Department validation rules
const validateDepartment = [
  body('name')
    .notEmpty()
    .withMessage('اسم القسم مطلوب')
    .isLength({ min: 2, max: 100 })
    .withMessage('اسم القسم يجب أن يكون بين 2 و 100 حرف'),
  
  body('nameEn')
    .optional()
    .isLength({ max: 100 })
    .withMessage('اسم القسم بالإنجليزية لا يمكن أن يزيد عن 100 حرف'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('وصف القسم لا يمكن أن يزيد عن 500 حرف'),
  
  body('manager')
    .optional()
    .isMongoId()
    .withMessage('معرف المدير غير صحيح'),
  
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('الميزانية يجب أن تكون رقم موجب'),
  
  body('currency')
    .optional()
    .isIn(['EGP', 'USD', 'EUR'])
    .withMessage('العملة غير مدعومة'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('حالة التفعيل يجب أن تكون true أو false'),
  
  handleValidationErrors
];

// Attendance validation rules
const validateAttendance = [
  body('employee')
    .isMongoId()
    .withMessage('معرف الموظف غير صحيح'),
  
  body('date')
    .isISO8601()
    .withMessage('تاريخ غير صحيح')
    .custom((value) => {
      const date = new Date(value);
      if (date > new Date()) {
        throw new Error('لا يمكن تسجيل حضور في تاريخ مستقبلي');
      }
      return true;
    }),
  
  body('checkIn.time')
    .optional()
    .isISO8601()
    .withMessage('وقت الحضور غير صحيح'),
  
  body('checkOut.time')
    .optional()
    .isISO8601()
    .withMessage('وقت الانصراف غير صحيح'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('الملاحظات لا يمكن أن تزيد عن 500 حرف'),
  
  handleValidationErrors
];

// Leave validation rules
const validateLeave = [
  body('employee')
    .isMongoId()
    .withMessage('معرف الموظف غير صحيح'),
  
  body('type')
    .isIn(['annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', 'study'])
    .withMessage('نوع الإجازة غير صحيح'),
  
  body('startDate')
    .isISO8601()
    .withMessage('تاريخ بداية الإجازة غير صحيح')
    .custom((value) => {
      const date = new Date(value);
      if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
        throw new Error('لا يمكن طلب إجازة في تاريخ ماضي');
      }
      return true;
    }),
  
  body('endDate')
    .isISO8601()
    .withMessage('تاريخ نهاية الإجازة غير صحيح')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('تاريخ نهاية الإجازة يجب أن يكون بعد تاريخ البداية');
      }
      return true;
    }),
  
  body('reason')
    .notEmpty()
    .withMessage('سبب الإجازة مطلوب')
    .isLength({ min: 10, max: 500 })
    .withMessage('سبب الإجازة يجب أن يكون بين 10 و 500 حرف'),
  
  body('emergencyContact.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('اسم جهة الاتصال في حالات الطوارئ يجب أن يكون بين 2 و 100 حرف'),
  
  body('emergencyContact.phone')
    .optional()
    .matches(/^(\+20|0)?1[0-9]{9}$/)
    .withMessage('رقم هاتف جهة الاتصال في حالات الطوارئ غير صحيح'),
  
  body('handoverTo')
    .optional()
    .isMongoId()
    .withMessage('معرف الموظف المسؤول عن التسليم غير صحيح'),
  
  body('handoverNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('ملاحظات التسليم لا يمكن أن تزيد عن 1000 حرف'),
  
  handleValidationErrors
];

// Payroll validation rules
const validatePayroll = [
  body('employee')
    .isMongoId()
    .withMessage('معرف الموظف غير صحيح'),
  
  body('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('السنة يجب أن تكون بين 2020 و 2030'),
  
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('الشهر يجب أن يكون بين 1 و 12'),
  
  body('basicSalary')
    .isFloat({ min: 0 })
    .withMessage('الراتب الأساسي يجب أن يكون رقم موجب'),
  
  body('allowances.housing')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('بدل السكن يجب أن يكون رقم موجب'),
  
  body('allowances.transportation')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('بدل المواصلات يجب أن يكون رقم موجب'),
  
  body('allowances.medical')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('بدل العلاج يجب أن يكون رقم موجب'),
  
  body('allowances.food')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('بدل الطعام يجب أن يكون رقم موجب'),
  
  body('deductions.lateArrival')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('خصم التأخير يجب أن يكون رقم موجب'),
  
  body('deductions.earlyDeparture')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('خصم الانصراف المبكر يجب أن يكون رقم موجب'),
  
  body('deductions.absence')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('خصم الغياب يجب أن يكون رقم موجب'),
  
  body('deductions.tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('الضريبة يجب أن تكون رقم موجب'),
  
  body('deductions.insurance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('التأمين يجب أن يكون رقم موجب'),
  
  body('bonuses.performance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مكافأة الأداء يجب أن تكون رقم موجب'),
  
  body('bonuses.overtime')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مكافأة العمل الإضافي يجب أن تكون رقم موجب'),
  
  body('currency')
    .optional()
    .isIn(['EGP', 'USD', 'EUR'])
    .withMessage('العملة غير مدعومة'),
  
  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'cash', 'check'])
    .withMessage('طريقة الدفع غير مدعومة'),
  
  handleValidationErrors
];

// File upload validation rules
const validateFileUpload = [
  body('category')
    .isIn(['contract', 'certificate', 'id_card', 'photo', 'medical_certificate', 'leave_document', 'attendance_proof', 'payroll_document', 'other'])
    .withMessage('فئة الملف غير مدعومة'),
  
  body('relatedEntity.type')
    .isIn(['employee', 'leave', 'attendance', 'payroll', 'department'])
    .withMessage('نوع الكيان المرتبط غير مدعوم'),
  
  body('relatedEntity.id')
    .isMongoId()
    .withMessage('معرف الكيان المرتبط غير صحيح'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('وصف الملف لا يمكن أن يزيد عن 500 حرف'),
  
  body('accessLevel')
    .optional()
    .isIn(['public', 'employee', 'hr', 'admin'])
    .withMessage('مستوى الوصول غير مدعوم'),
  
  handleValidationErrors
];

// Notification validation rules
const validateNotification = [
  body('recipient')
    .isMongoId()
    .withMessage('معرف المستقبل غير صحيح'),
  
  body('title')
    .notEmpty()
    .withMessage('عنوان الإشعار مطلوب')
    .isLength({ min: 5, max: 200 })
    .withMessage('عنوان الإشعار يجب أن يكون بين 5 و 200 حرف'),
  
  body('message')
    .notEmpty()
    .withMessage('محتوى الإشعار مطلوب')
    .isLength({ min: 10, max: 1000 })
    .withMessage('محتوى الإشعار يجب أن يكون بين 10 و 1000 حرف'),
  
  body('type')
    .isIn(['leave_approved', 'leave_rejected', 'leave_request', 'attendance_late', 'attendance_absent', 'payroll_generated', 'payroll_approved', 'department_update', 'profile_update', 'system_announcement', 'reminder', 'general'])
    .withMessage('نوع الإشعار غير مدعوم'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('أولوية الإشعار غير مدعومة'),
  
  body('channels.email')
    .optional()
    .isBoolean()
    .withMessage('إرسال الإيميل يجب أن يكون true أو false'),
  
  body('channels.whatsapp')
    .optional()
    .isBoolean()
    .withMessage('إرسال الواتساب يجب أن يكون true أو false'),
  
  body('channels.sms')
    .optional()
    .isBoolean()
    .withMessage('إرسال الرسائل النصية يجب أن يكون true أو false'),
  
  handleValidationErrors
];

// Parameter validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`معرف ${paramName} غير صحيح`),
  
  handleValidationErrors
];

// Query validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('رقم الصفحة يجب أن يكون رقم صحيح موجب'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('عدد العناصر في الصفحة يجب أن يكون بين 1 و 100'),
  
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('تاريخ البداية غير صحيح'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('تاريخ النهاية غير صحيح')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateLogin,
  validatePasswordChange,
  validateDepartment,
  validateAttendance,
  validateLeave,
  validatePayroll,
  validateFileUpload,
  validateNotification,
  validateObjectId,
  validatePagination,
  validateDateRange
};