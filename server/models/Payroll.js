const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'الموظف مطلوب']
  },
  
  // Payroll period
  year: {
    type: Number,
    required: [true, 'السنة مطلوبة'],
    min: [2020, 'السنة يجب أن تكون 2020 أو بعدها']
  },
  month: {
    type: Number,
    required: [true, 'الشهر مطلوب'],
    min: [1, 'الشهر يجب أن يكون بين 1 و 12'],
    max: [12, 'الشهر يجب أن يكون بين 1 و 12']
  },
  
  // Basic salary information
  basicSalary: {
    type: Number,
    required: [true, 'الراتب الأساسي مطلوب'],
    min: [0, 'الراتب الأساسي لا يمكن أن يكون سالب']
  },
  
  // Allowances
  allowances: {
    housing: {
      type: Number,
      default: 0,
      min: 0
    },
    transportation: {
      type: Number,
      default: 0,
      min: 0
    },
    medical: {
      type: Number,
      default: 0,
      min: 0
    },
    food: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Deductions
  deductions: {
    lateArrival: {
      type: Number,
      default: 0,
      min: 0
    },
    earlyDeparture: {
      type: Number,
      default: 0,
      min: 0
    },
    absence: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    insurance: {
      type: Number,
      default: 0,
      min: 0
    },
    loan: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Bonuses and incentives
  bonuses: {
    performance: {
      type: Number,
      default: 0,
      min: 0
    },
    overtime: {
      type: Number,
      default: 0,
      min: 0
    },
    attendance: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Calculations
  grossSalary: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  totalBonuses: {
    type: Number,
    default: 0,
    min: 0
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Attendance summary
  attendanceSummary: {
    totalWorkingDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    },
    overtimeHours: {
      type: Number,
      default: 0
    },
    totalHours: {
      type: Number,
      default: 0
    }
  },
  
  // Leave summary
  leaveSummary: {
    totalLeaveDays: {
      type: Number,
      default: 0
    },
    paidLeaveDays: {
      type: Number,
      default: 0
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0
    }
  },
  
  // Payment information
  paymentStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'check'],
    default: 'bank_transfer'
  },
  
  // Bank information
  bankDetails: {
    bankName: String,
    accountNumber: String,
    iban: String
  },
  
  // Approval workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  
  // Currency
  currency: {
    type: String,
    default: 'EGP',
    enum: ['EGP', 'USD', 'EUR']
  },
  
  // Notes and comments
  notes: {
    type: String,
    maxlength: [1000, 'الملاحظات لا يمكن أن تزيد عن 1000 حرف']
  },
  hrNotes: {
    type: String,
    maxlength: [1000, 'ملاحظات الموارد البشرية لا يمكن أن تزيد عن 1000 حرف']
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
payrollSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'paid';
});

payrollSchema.virtual('isPending').get(function() {
  return this.paymentStatus === 'pending';
});

payrollSchema.virtual('isApproved').get(function() {
  return this.paymentStatus === 'approved';
});

payrollSchema.virtual('payrollPeriod').get(function() {
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return `${monthNames[this.month - 1]} ${this.year}`;
});

// Indexes
payrollSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
payrollSchema.index({ year: 1, month: 1 });
payrollSchema.index({ paymentStatus: 1 });
payrollSchema.index({ approvedBy: 1 });

// Pre-save middleware
payrollSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate totals
  const allowancesTotal = Object.values(this.allowances).reduce((sum, val) => sum + val, 0);
  const deductionsTotal = Object.values(this.deductions).reduce((sum, val) => sum + val, 0);
  const bonusesTotal = Object.values(this.bonuses).reduce((sum, val) => sum + val, 0);
  
  this.grossSalary = this.basicSalary + allowancesTotal;
  this.totalDeductions = deductionsTotal;
  this.totalBonuses = bonusesTotal;
  this.netSalary = this.grossSalary + this.totalBonuses - this.totalDeductions;
  
  // Ensure net salary is not negative
  if (this.netSalary < 0) {
    this.netSalary = 0;
  }
  
  next();
});

// Static methods
payrollSchema.statics.generatePayroll = async function(employeeId, year, month) {
  const User = mongoose.model('User');
  const Attendance = mongoose.model('Attendance');
  const Leave = mongoose.model('Leave');
  
  // Get employee details
  const employee = await User.findById(employeeId);
  if (!employee) {
    throw new Error('الموظف غير موجود');
  }
  
  // Check if payroll already exists
  const existingPayroll = await this.findOne({
    employee: employeeId,
    year: year,
    month: month
  });
  
  if (existingPayroll) {
    throw new Error('تم إنشاء كشف الراتب لهذا الشهر بالفعل');
  }
  
  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  // Get attendance data
  const attendanceData = await Attendance.getAttendanceStats(employeeId, startDate, endDate);
  
  // Get leave data
  const leaveData = await Leave.find({
    employee: employeeId,
    status: 'approved',
    startDate: { $gte: startDate },
    endDate: { $lte: endDate }
  });
  
  // Calculate leave days
  const totalLeaveDays = leaveData.reduce((sum, leave) => sum + leave.workingDays, 0);
  const paidLeaveDays = leaveData.filter(leave => leave.type !== 'unpaid').reduce((sum, leave) => sum + leave.workingDays, 0);
  const unpaidLeaveDays = leaveData.filter(leave => leave.type === 'unpaid').reduce((sum, leave) => sum + leave.workingDays, 0);
  
  // Calculate working days in the month
  const totalWorkingDays = this.getWorkingDaysInMonth(year, month);
  
  // Calculate deductions for late arrivals and early departures
  const dailySalary = employee.salary / totalWorkingDays;
  const lateArrivalDeduction = attendanceData.lateDays * (dailySalary * 0.1); // 10% deduction for each late day
  const absenceDeduction = attendanceData.absentDays * dailySalary;
  const unpaidLeaveDeduction = unpaidLeaveDays * dailySalary;
  
  // Calculate overtime bonus
  const overtimeBonus = attendanceData.totalOvertimeHours * (dailySalary / 8) * 1.5; // 1.5x rate for overtime
  
  // Create payroll record
  const payroll = new this({
    employee: employeeId,
    year: year,
    month: month,
    basicSalary: employee.salary,
    allowances: {
      housing: 0, // Can be customized based on employee level
      transportation: 500, // Default transportation allowance
      medical: 200, // Default medical allowance
      food: 300, // Default food allowance
    },
    deductions: {
      lateArrival: lateArrivalDeduction,
      absence: absenceDeduction,
      unpaidLeave: unpaidLeaveDeduction,
      tax: employee.salary * 0.1, // 10% tax (can be customized)
      insurance: employee.salary * 0.05, // 5% insurance (can be customized)
    },
    bonuses: {
      overtime: overtimeBonus,
      attendance: attendanceData.presentDays === totalWorkingDays ? 200 : 0, // Perfect attendance bonus
    },
    attendanceSummary: {
      totalWorkingDays: totalWorkingDays,
      presentDays: attendanceData.presentDays,
      absentDays: attendanceData.absentDays,
      lateDays: attendanceData.lateDays,
      overtimeHours: attendanceData.totalOvertimeHours,
      totalHours: attendanceData.totalHours
    },
    leaveSummary: {
      totalLeaveDays: totalLeaveDays,
      paidLeaveDays: paidLeaveDays,
      unpaidLeaveDays: unpaidLeaveDays
    },
    bankDetails: employee.bankDetails || {}
  });
  
  return await payroll.save();
};

payrollSchema.statics.getWorkingDaysInMonth = function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  let workingDays = 0;
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
};

payrollSchema.statics.getEmployeePayrollHistory = async function(employeeId, year = null) {
  const query = { employee: employeeId };
  if (year) {
    query.year = year;
  }
  
  return await this.find(query)
    .populate('employee', 'firstName lastName employeeId')
    .populate('approvedBy', 'firstName lastName')
    .sort({ year: -1, month: -1 });
};

payrollSchema.statics.getDepartmentPayroll = async function(departmentId, year, month) {
  const User = mongoose.model('User');
  
  const employees = await User.find({
    department: departmentId,
    employmentStatus: 'active'
  });
  
  const employeeIds = employees.map(emp => emp._id);
  
  return await this.find({
    employee: { $in: employeeIds },
    year: year,
    month: month
  })
  .populate('employee', 'firstName lastName employeeId department')
  .sort({ 'employee.firstName': 1 });
};

payrollSchema.statics.getPayrollStats = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const payrolls = await this.find({
    year: year,
    month: month,
    paymentStatus: { $in: ['approved', 'paid'] }
  });
  
  const stats = {
    totalEmployees: payrolls.length,
    totalGrossSalary: payrolls.reduce((sum, payroll) => sum + payroll.grossSalary, 0),
    totalDeductions: payrolls.reduce((sum, payroll) => sum + payroll.totalDeductions, 0),
    totalBonuses: payrolls.reduce((sum, payroll) => sum + payroll.totalBonuses, 0),
    totalNetSalary: payrolls.reduce((sum, payroll) => sum + payroll.netSalary, 0),
    averageSalary: 0,
    payrollsByStatus: {
      pending: await this.countDocuments({ year, month, paymentStatus: 'pending' }),
      approved: await this.countDocuments({ year, month, paymentStatus: 'approved' }),
      paid: await this.countDocuments({ year, month, paymentStatus: 'paid' }),
      cancelled: await this.countDocuments({ year, month, paymentStatus: 'cancelled' })
    }
  };
  
  if (stats.totalEmployees > 0) {
    stats.averageSalary = stats.totalNetSalary / stats.totalEmployees;
  }
  
  return stats;
};

// Instance methods
payrollSchema.methods.approve = async function(approvedBy) {
  this.paymentStatus = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  
  await this.save();
  return this;
};

payrollSchema.methods.markAsPaid = async function(paymentDate = null) {
  this.paymentStatus = 'paid';
  this.paymentDate = paymentDate || new Date();
  
  await this.save();
  return this;
};

payrollSchema.methods.generatePDF = async function() {
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  
  const doc = new PDFDocument({ margin: 50 });
  
  // Set up the PDF content
  doc.fontSize(20).text('كشف راتب الموظف', { align: 'center' });
  doc.fontSize(16).text(`الشهر: ${this.payrollPeriod}`, { align: 'center' });
  doc.fontSize(14).text(`الموظف: ${this.employee.firstName} ${this.employee.lastName}`, { align: 'right' });
  
  // Add payroll details
  doc.fontSize(12);
  doc.text(`الراتب الأساسي: ${this.basicSalary} ${this.currency}`, { align: 'right' });
  doc.text(`إجمالي المكافآت: ${this.totalBonuses} ${this.currency}`, { align: 'right' });
  doc.text(`إجمالي الخصومات: ${this.totalDeductions} ${this.currency}`, { align: 'right' });
  doc.text(`صافي الراتب: ${this.netSalary} ${this.currency}`, { align: 'right' });
  
  // Save the PDF
  const fileName = `payroll_${this.employee.employeeId}_${this.year}_${this.month}.pdf`;
  const filePath = path.join(__dirname, '../uploads/payrolls', fileName);
  
  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  doc.pipe(fs.createWriteStream(filePath));
  doc.end();
  
  return filePath;
};

module.exports = mongoose.model('Payroll', payrollSchema);