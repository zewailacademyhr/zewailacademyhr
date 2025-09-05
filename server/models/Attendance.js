const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'الموظف مطلوب']
  },
  
  // Date and time information
  date: {
    type: Date,
    required: [true, 'التاريخ مطلوب'],
    default: Date.now
  },
  
  // Check-in information
  checkIn: {
    time: {
      type: Date,
      default: null
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    device: {
      userAgent: String,
      ip: String
    },
    photo: String, // Photo proof for check-in
    notes: String
  },
  
  // Check-out information
  checkOut: {
    time: {
      type: Date,
      default: null
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    device: {
      userAgent: String,
      ip: String
    },
    photo: String, // Photo proof for check-out
    notes: String
  },
  
  // Work hours calculation
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Late and early departure
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  earlyDeparture: {
    type: Boolean,
    default: false
  },
  earlyDepartureMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'on_leave'],
    default: 'absent'
  },
  
  // Approval workflow
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  
  // Manual adjustments
  manualAdjustment: {
    type: {
      type: String,
      enum: ['add_hours', 'deduct_hours', 'mark_present', 'mark_absent'],
      default: null
    },
    hours: {
      type: Number,
      default: 0
    },
    reason: String,
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    adjustedAt: {
      type: Date,
      default: null
    }
  },
  
  // Notes and comments
  notes: {
    type: String,
    maxlength: [500, 'الملاحظات لا يمكن أن تزيد عن 500 حرف']
  },
  hrNotes: {
    type: String,
    maxlength: [500, 'ملاحظات الموارد البشرية لا يمكن أن تزيد عن 500 حرف']
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
attendanceSchema.virtual('isPresent').get(function() {
  return this.status === 'present' || this.status === 'late';
});

attendanceSchema.virtual('isAbsent').get(function() {
  return this.status === 'absent';
});

attendanceSchema.virtual('workDuration').get(function() {
  if (!this.checkIn.time || !this.checkOut.time) {
    return 0;
  }
  return (this.checkOut.time - this.checkIn.time) / (1000 * 60 * 60); // in hours
});

// Indexes
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employee: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isApproved: 1 });

// Pre-save middleware
attendanceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total hours if both check-in and check-out times exist
  if (this.checkIn.time && this.checkOut.time) {
    const checkInTime = new Date(this.checkIn.time);
    const checkOutTime = new Date(this.checkOut.time);
    
    if (checkOutTime > checkInTime) {
      const workDuration = (checkOutTime - checkInTime) / (1000 * 60 * 60); // in hours
      this.totalHours = Math.round(workDuration * 100) / 100; // round to 2 decimal places
      
      // Calculate overtime (assuming 8 hours is standard work day)
      const standardHours = 8;
      this.overtimeHours = Math.max(0, this.totalHours - standardHours);
    }
  }
  
  // Determine status based on check-in/out times
  if (this.checkIn.time && this.checkOut.time) {
    this.status = 'present';
  } else if (this.checkIn.time && !this.checkOut.time) {
    this.status = 'present'; // Employee checked in but not out yet
  } else {
    this.status = 'absent';
  }
  
  next();
});

// Static methods
attendanceSchema.statics.getAttendanceByDateRange = async function(employeeId, startDate, endDate) {
  return await this.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('employee', 'firstName lastName employeeId').sort({ date: -1 });
};

attendanceSchema.statics.getMonthlyAttendance = async function(employeeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await this.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

attendanceSchema.statics.getDepartmentAttendance = async function(departmentId, date) {
  const User = mongoose.model('User');
  
  const employees = await User.find({
    department: departmentId,
    employmentStatus: 'active'
  });
  
  const employeeIds = employees.map(emp => emp._id);
  
  return await this.find({
    employee: { $in: employeeIds },
    date: {
      $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  }).populate('employee', 'firstName lastName employeeId department');
};

attendanceSchema.statics.getAttendanceStats = async function(employeeId, startDate, endDate) {
  const attendances = await this.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  });
  
  const stats = {
    totalDays: attendances.length,
    presentDays: attendances.filter(att => att.status === 'present' || att.status === 'late').length,
    absentDays: attendances.filter(att => att.status === 'absent').length,
    lateDays: attendances.filter(att => att.isLate).length,
    totalHours: attendances.reduce((sum, att) => sum + att.totalHours, 0),
    totalOvertimeHours: attendances.reduce((sum, att) => sum + att.overtimeHours, 0),
    totalLateMinutes: attendances.reduce((sum, att) => sum + att.lateMinutes, 0),
    averageHoursPerDay: 0
  };
  
  if (stats.presentDays > 0) {
    stats.averageHoursPerDay = Math.round((stats.totalHours / stats.presentDays) * 100) / 100;
  }
  
  return stats;
};

// Instance methods
attendanceSchema.methods.checkIn = async function(checkInData) {
  this.checkIn = {
    ...checkInData,
    time: new Date()
  };
  
  // Check if late (assuming work starts at 9 AM)
  const workStartTime = new Date();
  workStartTime.setHours(9, 0, 0, 0);
  
  if (this.checkIn.time > workStartTime) {
    this.isLate = true;
    this.lateMinutes = Math.round((this.checkIn.time - workStartTime) / (1000 * 60));
    this.status = 'late';
  } else {
    this.status = 'present';
  }
  
  await this.save();
  return this;
};

attendanceSchema.methods.checkOut = async function(checkOutData) {
  this.checkOut = {
    ...checkOutData,
    time: new Date()
  };
  
  // Check if early departure (assuming work ends at 5 PM)
  const workEndTime = new Date();
  workEndTime.setHours(17, 0, 0, 0);
  
  if (this.checkOut.time < workEndTime) {
    this.earlyDeparture = true;
    this.earlyDepartureMinutes = Math.round((workEndTime - this.checkOut.time) / (1000 * 60));
  }
  
  await this.save();
  return this;
};

attendanceSchema.methods.approve = async function(approvedBy) {
  this.isApproved = true;
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  
  await this.save();
  return this;
};

module.exports = mongoose.model('Attendance', attendanceSchema);