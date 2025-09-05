const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'الموظف مطلوب']
  },
  
  // Leave details
  type: {
    type: String,
    enum: ['annual', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', 'study'],
    required: [true, 'نوع الإجازة مطلوب']
  },
  
  startDate: {
    type: Date,
    required: [true, 'تاريخ بداية الإجازة مطلوب']
  },
  endDate: {
    type: Date,
    required: [true, 'تاريخ نهاية الإجازة مطلوب']
  },
  
  // Duration calculation
  totalDays: {
    type: Number,
    required: true,
    min: [0.5, 'عدد الأيام يجب أن يكون نصف يوم على الأقل']
  },
  workingDays: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Reason and description
  reason: {
    type: String,
    required: [true, 'سبب الإجازة مطلوب'],
    maxlength: [500, 'سبب الإجازة لا يمكن أن يزيد عن 500 حرف']
  },
  
  // Supporting documents
  documents: [{
    fileName: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status and approval workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  
  // Approval chain
  approvals: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    level: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    approvedAt: {
      type: Date,
      default: null
    }
  }],
  
  // Final approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'سبب الرفض لا يمكن أن يزيد عن 500 حرف']
  },
  
  // Leave balance tracking
  leaveBalanceBefore: {
    type: Number,
    default: 0
  },
  leaveBalanceAfter: {
    type: Number,
    default: 0
  },
  
  // Emergency contact during leave
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Handover information
  handoverTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  handoverNotes: {
    type: String,
    maxlength: [1000, 'ملاحظات التسليم لا يمكن أن تزيد عن 1000 حرف']
  },
  
  // System fields
  isActive: {
    type: Boolean,
    default: true
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
leaveSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

leaveSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

leaveSchema.virtual('isRejected').get(function() {
  return this.status === 'rejected';
});

leaveSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
  }
  return 0;
});

// Indexes
leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ type: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ approvedBy: 1 });

// Pre-save middleware
leaveSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total days if not provided
  if (this.startDate && this.endDate && !this.totalDays) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    this.totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }
  
  // Calculate working days (excluding weekends)
  if (this.startDate && this.endDate) {
    this.workingDays = this.calculateWorkingDays(this.startDate, this.endDate);
  }
  
  next();
});

// Static methods
leaveSchema.statics.getLeaveBalance = async function(employeeId, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  // Get all approved leaves for the year
  const approvedLeaves = await this.find({
    employee: employeeId,
    status: 'approved',
    startDate: { $gte: startOfYear },
    endDate: { $lte: endOfYear }
  });
  
  // Calculate total used days
  const totalUsedDays = approvedLeaves.reduce((sum, leave) => sum + leave.workingDays, 0);
  
  // Default monthly leave days (2 days per month as per requirements)
  const monthlyLeaveDays = 2;
  const totalAvailableDays = monthlyLeaveDays * 12;
  
  return {
    totalAvailable: totalAvailableDays,
    totalUsed: totalUsedDays,
    remaining: totalAvailableDays - totalUsedDays,
    year: year
  };
};

leaveSchema.statics.getEmployeeLeaves = async function(employeeId, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  return await this.find({
    employee: employeeId,
    startDate: { $gte: startOfYear },
    endDate: { $lte: endOfYear }
  })
  .populate('employee', 'firstName lastName employeeId')
  .populate('approvedBy', 'firstName lastName')
  .sort({ startDate: -1 });
};

leaveSchema.statics.getPendingLeaves = async function() {
  return await this.find({
    status: 'pending',
    isActive: true
  })
  .populate('employee', 'firstName lastName employeeId department position')
  .populate('approvals.approver', 'firstName lastName')
  .sort({ createdAt: -1 });
};

leaveSchema.statics.getDepartmentLeaves = async function(departmentId, startDate, endDate) {
  const User = mongoose.model('User');
  
  const employees = await User.find({
    department: departmentId,
    employmentStatus: 'active'
  });
  
  const employeeIds = employees.map(emp => emp._id);
  
  return await this.find({
    employee: { $in: employeeIds },
    startDate: { $gte: startDate },
    endDate: { $lte: endDate }
  })
  .populate('employee', 'firstName lastName employeeId')
  .sort({ startDate: -1 });
};

leaveSchema.statics.getLeaveStats = async function(employeeId, year = new Date().getFullYear()) {
  const balance = await this.getLeaveBalance(employeeId, year);
  const leaves = await this.getEmployeeLeaves(employeeId, year);
  
  const stats = {
    balance: balance,
    totalLeaves: leaves.length,
    approvedLeaves: leaves.filter(leave => leave.status === 'approved').length,
    pendingLeaves: leaves.filter(leave => leave.status === 'pending').length,
    rejectedLeaves: leaves.filter(leave => leave.status === 'rejected').length,
    leavesByType: {}
  };
  
  // Group leaves by type
  leaves.forEach(leave => {
    if (!stats.leavesByType[leave.type]) {
      stats.leavesByType[leave.type] = {
        count: 0,
        totalDays: 0
      };
    }
    stats.leavesByType[leave.type].count++;
    stats.leavesByType[leave.type].totalDays += leave.workingDays;
  });
  
  return stats;
};

// Instance methods
leaveSchema.methods.calculateWorkingDays = function(startDate, endDate) {
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

leaveSchema.methods.approve = async function(approvedBy, comments = '') {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  
  // Update approval in the approvals array
  const pendingApproval = this.approvals.find(approval => approval.status === 'pending');
  if (pendingApproval) {
    pendingApproval.status = 'approved';
    pendingApproval.comments = comments;
    pendingApproval.approvedAt = new Date();
  }
  
  // Update leave balance
  const LeaveBalance = mongoose.model('LeaveBalance');
  await LeaveBalance.updateBalance(this.employee, -this.workingDays);
  
  await this.save();
  return this;
};

leaveSchema.methods.reject = async function(rejectedBy, reason = '') {
  this.status = 'rejected';
  this.rejectionReason = reason;
  
  // Update approval in the approvals array
  const pendingApproval = this.approvals.find(approval => approval.status === 'pending');
  if (pendingApproval) {
    pendingApproval.status = 'rejected';
    pendingApproval.comments = reason;
    pendingApproval.approvedAt = new Date();
  }
  
  await this.save();
  return this;
};

leaveSchema.methods.cancel = async function() {
  if (this.status === 'approved') {
    // Restore leave balance
    const LeaveBalance = mongoose.model('LeaveBalance');
    await LeaveBalance.updateBalance(this.employee, this.workingDays);
  }
  
  this.status = 'cancelled';
  await this.save();
  return this;
};

module.exports = mongoose.model('Leave', leaveSchema);