const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'المستقبل مطلوب']
  },
  
  // Sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Notification content
  title: {
    type: String,
    required: [true, 'عنوان الإشعار مطلوب'],
    maxlength: [200, 'عنوان الإشعار لا يمكن أن يزيد عن 200 حرف']
  },
  message: {
    type: String,
    required: [true, 'محتوى الإشعار مطلوب'],
    maxlength: [1000, 'محتوى الإشعار لا يمكن أن يزيد عن 1000 حرف']
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'leave_approved', 'leave_rejected', 'leave_request',
      'attendance_late', 'attendance_absent',
      'payroll_generated', 'payroll_approved',
      'department_update', 'profile_update',
      'system_announcement', 'reminder',
      'general'
    ],
    required: [true, 'نوع الإشعار مطلوب']
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Related entity (optional)
  relatedEntity: {
    type: {
      type: String,
      enum: ['leave', 'attendance', 'payroll', 'employee', 'department'],
      default: null
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  // Delivery channels
  channels: {
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      error: String
    },
    sms: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      error: String
    },
    whatsapp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      error: String
    },
    push: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      error: String
    }
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Action buttons (for interactive notifications)
  actions: [{
    label: String,
    action: String,
    url: String,
    style: {
      type: String,
      enum: ['primary', 'secondary', 'success', 'danger'],
      default: 'primary'
    }
  }],
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static methods
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  return await notification.save();
};

notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    unreadOnly = false,
    type = null,
    priority = null
  } = options;
  
  const query = { recipient: userId };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  return await this.find(query)
    .populate('sender', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { recipient: userId, isRead: false },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false
  });
};

notificationSchema.statics.sendLeaveNotification = async function(leave, action) {
  const Leave = mongoose.model('Leave');
  const User = mongoose.model('User');
  
  const employee = await User.findById(leave.employee);
  if (!employee) return;
  
  let title, message, type, priority = 'medium';
  
  switch (action) {
    case 'request':
      title = 'طلب إجازة جديد';
      message = `تم تقديم طلب إجازة من ${employee.firstName} ${employee.lastName}`;
      type = 'leave_request';
      priority = 'high';
      break;
    case 'approved':
      title = 'تم قبول طلب الإجازة';
      message = `تم قبول طلب إجازتك من ${leave.startDate.toLocaleDateString('ar-EG')} إلى ${leave.endDate.toLocaleDateString('ar-EG')}`;
      type = 'leave_approved';
      priority = 'medium';
      break;
    case 'rejected':
      title = 'تم رفض طلب الإجازة';
      message = `تم رفض طلب إجازتك من ${leave.startDate.toLocaleDateString('ar-EG')} إلى ${leave.endDate.toLocaleDateString('ar-EG')}`;
      type = 'leave_rejected';
      priority = 'high';
      break;
  }
  
  const notification = await this.createNotification({
    recipient: leave.employee,
    sender: leave.approvedBy,
    title,
    message,
    type,
    priority,
    relatedEntity: {
      type: 'leave',
      id: leave._id
    },
    actions: action === 'approved' ? [] : [
      {
        label: 'عرض التفاصيل',
        action: 'view_leave',
        url: `/leaves/${leave._id}`,
        style: 'primary'
      }
    ]
  });
  
  return notification;
};

notificationSchema.statics.sendPayrollNotification = async function(payroll, action) {
  const Payroll = mongoose.model('Payroll');
  const User = mongoose.model('User');
  
  const employee = await User.findById(payroll.employee);
  if (!employee) return;
  
  let title, message, type, priority = 'medium';
  
  switch (action) {
    case 'generated':
      title = 'تم إنشاء كشف الراتب';
      message = `تم إنشاء كشف راتبك لشهر ${payroll.payrollPeriod}`;
      type = 'payroll_generated';
      priority = 'high';
      break;
    case 'approved':
      title = 'تم اعتماد كشف الراتب';
      message = `تم اعتماد كشف راتبك لشهر ${payroll.payrollPeriod}`;
      type = 'payroll_approved';
      priority = 'high';
      break;
    case 'paid':
      title = 'تم صرف الراتب';
      message = `تم صرف راتبك لشهر ${payroll.payrollPeriod} - المبلغ: ${payroll.netSalary} ${payroll.currency}`;
      type = 'payroll_paid';
      priority = 'high';
      break;
  }
  
  const notification = await this.createNotification({
    recipient: payroll.employee,
    sender: payroll.approvedBy,
    title,
    message,
    type,
    priority,
    relatedEntity: {
      type: 'payroll',
      id: payroll._id
    },
    actions: [
      {
        label: 'عرض كشف الراتب',
        action: 'view_payroll',
        url: `/payroll/${payroll._id}`,
        style: 'primary'
      }
    ]
  });
  
  return notification;
};

notificationSchema.statics.sendAttendanceNotification = async function(attendance, action) {
  const Attendance = mongoose.model('Attendance');
  const User = mongoose.model('User');
  
  const employee = await User.findById(attendance.employee);
  if (!employee) return;
  
  let title, message, type, priority = 'medium';
  
  switch (action) {
    case 'late':
      title = 'تأخير في الحضور';
      message = `تأخرت في الحضور اليوم بمقدار ${attendance.lateMinutes} دقيقة`;
      type = 'attendance_late';
      priority = 'medium';
      break;
    case 'absent':
      title = 'غياب غير مبرر';
      message = 'لم يتم تسجيل حضورك اليوم';
      type = 'attendance_absent';
      priority = 'high';
      break;
  }
  
  const notification = await this.createNotification({
    recipient: attendance.employee,
    title,
    message,
    type,
    priority,
    relatedEntity: {
      type: 'attendance',
      id: attendance._id
    },
    actions: [
      {
        label: 'عرض سجل الحضور',
        action: 'view_attendance',
        url: `/attendance/${attendance._id}`,
        style: 'primary'
      }
    ]
  });
  
  return notification;
};

// Instance methods
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

notificationSchema.methods.sendEmail = async function() {
  const nodemailer = require('nodemailer');
  
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: this.recipient.email,
      subject: this.title,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>${this.title}</h2>
          <p>${this.message}</p>
          ${this.actions.length > 0 ? `
            <div style="margin-top: 20px;">
              ${this.actions.map(action => `
                <a href="${process.env.CLIENT_URL}${action.url}" 
                   style="background-color: #3B82F6; color: white; padding: 10px 20px; 
                          text-decoration: none; border-radius: 5px; margin: 5px;">
                  ${action.label}
                </a>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
    });
    
    this.channels.email.sent = true;
    this.channels.email.sentAt = new Date();
    await this.save();
    
    return true;
  } catch (error) {
    this.channels.email.error = error.message;
    await this.save();
    return false;
  }
};

notificationSchema.methods.sendWhatsApp = async function() {
  const twilio = require('twilio');
  
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    await client.messages.create({
      body: `${this.title}\n\n${this.message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: this.recipient.phone
    });
    
    this.channels.whatsapp.sent = true;
    this.channels.whatsapp.sentAt = new Date();
    await this.save();
    
    return true;
  } catch (error) {
    this.channels.whatsapp.error = error.message;
    await this.save();
    return false;
  }
};

module.exports = mongoose.model('Notification', notificationSchema);