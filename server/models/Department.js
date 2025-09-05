const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'اسم القسم مطلوب'],
    trim: true,
    unique: true,
    maxlength: [100, 'اسم القسم لا يمكن أن يزيد عن 100 حرف']
  },
  nameEn: {
    type: String,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'الوصف لا يمكن أن يزيد عن 500 حرف']
  },
  descriptionEn: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Department hierarchy
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Manager information
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Budget and resources
  budget: {
    type: Number,
    min: [0, 'الميزانية لا يمكن أن تكون سالبة'],
    default: 0
  },
  currency: {
    type: String,
    default: 'EGP',
    enum: ['EGP', 'USD', 'EUR']
  },
  
  // Contact information
  location: {
    building: String,
    floor: String,
    room: String
  },
  phone: String,
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'بريد إلكتروني غير صحيح']
  },
  
  // Status and settings
  isActive: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#3B82F6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'لون غير صحيح']
  },
  
  // Statistics (calculated fields)
  employeeCount: {
    type: Number,
    default: 0,
    min: 0
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
departmentSchema.virtual('employees', {
  ref: 'User',
  localField: '_id',
  foreignField: 'department',
  justOne: false
});

departmentSchema.virtual('subDepartments', {
  ref: 'Department',
  localField: '_id',
  foreignField: 'parentDepartment',
  justOne: false
});

departmentSchema.virtual('fullPath').get(function() {
  if (this.parentDepartment) {
    return `${this.parentDepartment.fullPath} > ${this.name}`;
  }
  return this.name;
});

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ parentDepartment: 1 });
departmentSchema.index({ manager: 1 });
departmentSchema.index({ isActive: 1 });

// Pre-save middleware
departmentSchema.pre('save', async function(next) {
  // Calculate level based on parent department
  if (this.parentDepartment) {
    const parent = await this.constructor.findById(this.parentDepartment);
    if (parent) {
      this.level = parent.level + 1;
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

// Post-save middleware to update employee count
departmentSchema.post('save', async function(doc) {
  if (doc.isModified('isActive')) {
    const User = mongoose.model('User');
    const employeeCount = await User.countDocuments({ 
      department: doc._id, 
      employmentStatus: 'active' 
    });
    await this.constructor.findByIdAndUpdate(doc._id, { employeeCount });
  }
});

// Static methods
departmentSchema.statics.getHierarchy = async function() {
  const departments = await this.find({ isActive: true })
    .populate('manager', 'firstName lastName employeeId')
    .populate('parentDepartment', 'name')
    .sort({ level: 1, name: 1 });
  
  return this.buildHierarchy(departments);
};

departmentSchema.statics.buildHierarchy = function(departments, parentId = null) {
  return departments
    .filter(dept => {
      if (parentId === null) return !dept.parentDepartment;
      return dept.parentDepartment && dept.parentDepartment._id.toString() === parentId.toString();
    })
    .map(dept => ({
      ...dept.toObject(),
      children: this.buildHierarchy(departments, dept._id)
    }));
};

departmentSchema.statics.getDepartmentsWithStats = async function() {
  const User = mongoose.model('User');
  
  const departments = await this.find({ isActive: true })
    .populate('manager', 'firstName lastName employeeId')
    .lean();
  
  const departmentsWithStats = await Promise.all(
    departments.map(async (dept) => {
      const employeeCount = await User.countDocuments({ 
        department: dept._id, 
        employmentStatus: 'active' 
      });
      
      return {
        ...dept,
        employeeCount
      };
    })
  );
  
  return departmentsWithStats;
};

// Instance methods
departmentSchema.methods.updateEmployeeCount = async function() {
  const User = mongoose.model('User');
  const employeeCount = await User.countDocuments({ 
    department: this._id, 
    employmentStatus: 'active' 
  });
  
  this.employeeCount = employeeCount;
  await this.save();
  return employeeCount;
};

departmentSchema.methods.getSubDepartments = async function() {
  return await this.constructor.find({ 
    parentDepartment: this._id, 
    isActive: true 
  });
};

module.exports = mongoose.model('Department', departmentSchema);