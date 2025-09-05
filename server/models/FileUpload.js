const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  // File information
  fileName: {
    type: String,
    required: [true, 'اسم الملف مطلوب']
  },
  originalName: {
    type: String,
    required: [true, 'الاسم الأصلي للملف مطلوب']
  },
  filePath: {
    type: String,
    required: [true, 'مسار الملف مطلوب']
  },
  fileSize: {
    type: Number,
    required: [true, 'حجم الملف مطلوب'],
    min: [0, 'حجم الملف لا يمكن أن يكون سالب']
  },
  mimeType: {
    type: String,
    required: [true, 'نوع الملف مطلوب']
  },
  fileExtension: {
    type: String,
    required: [true, 'امتداد الملف مطلوب']
  },
  
  // Upload information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المستخدم الذي رفع الملف مطلوب']
  },
  
  // Related entity
  relatedEntity: {
    type: {
      type: String,
      enum: ['employee', 'leave', 'attendance', 'payroll', 'department'],
      required: [true, 'نوع الكيان المرتبط مطلوب']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'معرف الكيان المرتبط مطلوب']
    }
  },
  
  // File category
  category: {
    type: String,
    enum: [
      'contract', 'certificate', 'id_card', 'photo',
      'medical_certificate', 'leave_document',
      'attendance_proof', 'payroll_document',
      'other'
    ],
    required: [true, 'فئة الملف مطلوبة']
  },
  
  // File description
  description: {
    type: String,
    maxlength: [500, 'وصف الملف لا يمكن أن يزيد عن 500 حرف']
  },
  
  // Security and access
  isPublic: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['public', 'employee', 'hr', 'admin'],
    default: 'employee'
  },
  
  // File status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  
  // Virus scan results
  virusScanStatus: {
    type: String,
    enum: ['pending', 'clean', 'infected', 'error'],
    default: 'pending'
  },
  virusScanDate: {
    type: Date,
    default: null
  },
  
  // Download tracking
  downloadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastDownloadedAt: {
    type: Date,
    default: null
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: null
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
fileUploadSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

fileUploadSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

fileUploadSchema.virtual('isImage').get(function() {
  return this.mimeType.startsWith('image/');
});

fileUploadSchema.virtual('isDocument').get(function() {
  return this.mimeType.includes('pdf') || 
         this.mimeType.includes('msword') || 
         this.mimeType.includes('spreadsheet') ||
         this.mimeType.includes('presentation');
});

// Indexes
fileUploadSchema.index({ uploadedBy: 1 });
fileUploadSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });
fileUploadSchema.index({ category: 1 });
fileUploadSchema.index({ status: 1 });
fileUploadSchema.index({ createdAt: -1 });
fileUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
fileUploadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Extract file extension from original name
  if (!this.fileExtension && this.originalName) {
    this.fileExtension = this.originalName.split('.').pop().toLowerCase();
  }
  
  next();
});

// Static methods
fileUploadSchema.statics.getFilesByEntity = async function(entityType, entityId) {
  return await this.find({
    'relatedEntity.type': entityType,
    'relatedEntity.id': entityId,
    status: 'active'
  })
  .populate('uploadedBy', 'firstName lastName')
  .sort({ createdAt: -1 });
};

fileUploadSchema.statics.getUserFiles = async function(userId, category = null) {
  const query = { uploadedBy: userId, status: 'active' };
  if (category) {
    query.category = category;
  }
  
  return await this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

fileUploadSchema.statics.getFilesByCategory = async function(category, options = {}) {
  const { limit = 50, skip = 0, entityType = null, entityId = null } = options;
  
  const query = { category, status: 'active' };
  
  if (entityType && entityId) {
    query['relatedEntity.type'] = entityType;
    query['relatedEntity.id'] = entityId;
  }
  
  return await this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

fileUploadSchema.statics.getStorageStats = async function() {
  const stats = await this.aggregate([
    {
      $match: { status: 'active' }
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' }
      }
    }
  ]);
  
  const categoryStats = await this.aggregate([
    {
      $match: { status: 'active' }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return {
    overview: stats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 },
    byCategory: categoryStats
  };
};

fileUploadSchema.statics.cleanupExpiredFiles = async function() {
  const expiredFiles = await this.find({
    expiresAt: { $lt: new Date() },
    status: 'active'
  });
  
  const fs = require('fs');
  const path = require('path');
  
  for (const file of expiredFiles) {
    try {
      // Delete physical file
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
      
      // Mark as deleted in database
      file.status = 'deleted';
      await file.save();
    } catch (error) {
      console.error(`Error deleting file ${file._id}:`, error);
    }
  }
  
  return expiredFiles.length;
};

// Instance methods
fileUploadSchema.methods.incrementDownloadCount = async function() {
  this.downloadCount += 1;
  this.lastDownloadedAt = new Date();
  await this.save();
  return this;
};

fileUploadSchema.methods.markAsVirusScanned = async function(status) {
  this.virusScanStatus = status;
  this.virusScanDate = new Date();
  await this.save();
  return this;
};

fileUploadSchema.methods.archive = async function() {
  this.status = 'archived';
  await this.save();
  return this;
};

fileUploadSchema.methods.delete = async function() {
  const fs = require('fs');
  
  try {
    // Delete physical file
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    
    // Mark as deleted in database
    this.status = 'deleted';
    await this.save();
    
    return true;
  } catch (error) {
    console.error(`Error deleting file ${this._id}:`, error);
    return false;
  }
};

fileUploadSchema.methods.getDownloadUrl = function() {
  return `/api/files/download/${this._id}`;
};

fileUploadSchema.methods.getPreviewUrl = function() {
  if (this.isImage) {
    return `/api/files/preview/${this._id}`;
  }
  return null;
};

// Validation for file types
fileUploadSchema.statics.getAllowedFileTypes = function(category) {
  const allowedTypes = {
    contract: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    certificate: ['application/pdf', 'image/jpeg', 'image/png'],
    id_card: ['image/jpeg', 'image/png'],
    photo: ['image/jpeg', 'image/png', 'image/gif'],
    medical_certificate: ['application/pdf', 'image/jpeg', 'image/png'],
    leave_document: ['application/pdf', 'image/jpeg', 'image/png'],
    attendance_proof: ['image/jpeg', 'image/png'],
    payroll_document: ['application/pdf'],
    other: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };
  
  return allowedTypes[category] || allowedTypes.other;
};

fileUploadSchema.statics.getMaxFileSize = function(category) {
  const maxSizes = {
    contract: 10 * 1024 * 1024, // 10MB
    certificate: 5 * 1024 * 1024, // 5MB
    id_card: 2 * 1024 * 1024, // 2MB
    photo: 5 * 1024 * 1024, // 5MB
    medical_certificate: 5 * 1024 * 1024, // 5MB
    leave_document: 5 * 1024 * 1024, // 5MB
    attendance_proof: 2 * 1024 * 1024, // 2MB
    payroll_document: 10 * 1024 * 1024, // 10MB
    other: 10 * 1024 * 1024 // 10MB
  };
  
  return maxSizes[category] || maxSizes.other;
};

module.exports = mongoose.model('FileUpload', fileUploadSchema);