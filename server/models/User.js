const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'الاسم الأول مطلوب'],
    trim: true,
    maxlength: [50, 'الاسم الأول لا يمكن أن يزيد عن 50 حرف']
  },
  lastName: {
    type: String,
    required: [true, 'الاسم الأخير مطلوب'],
    trim: true,
    maxlength: [50, 'الاسم الأخير لا يمكن أن يزيد عن 50 حرف']
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'بريد إلكتروني غير صحيح']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب'],
    match: [/^(\+20|0)?1[0-9]{9}$/, 'رقم هاتف مصري غير صحيح']
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['admin', 'hr', 'employee'],
    default: 'employee',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'المنصب لا يمكن أن يزيد عن 100 حرف']
  },
  
  // Employee Specific Fields
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  salary: {
    type: Number,
    min: [0, 'الراتب لا يمكن أن يكون سالب']
  },
  employmentStatus: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on_leave'],
    default: 'active'
  },
  
  // Contact Information
  address: {
    street: String,
    city: String,
    governorate: String,
    postalCode: String
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // System Fields
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  
  // Preferences
  language: {
    type: String,
    enum: ['ar', 'en'],
    default: 'ar'
  },
  timezone: {
    type: String,
    default: 'Africa/Cairo'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual fields
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ employmentStatus: 1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Password not set');
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static methods
userSchema.statics.generateEmployeeId = async function() {
  const count = await this.countDocuments();
  return `EMP${String(count + 1).padStart(4, '0')}`;
};

// Middleware to auto-generate employee ID for employees
userSchema.pre('save', async function(next) {
  if (this.role === 'employee' && !this.employeeId && this.isNew) {
    try {
      this.employeeId = await this.constructor.generateEmployeeId();
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('User', userSchema);