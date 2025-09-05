const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validateNotification, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const {
      unreadOnly = false,
      type,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      limit,
      skip,
      unreadOnly: unreadOnly === 'true',
      type,
      priority
    };

    const notifications = await Notification.getUserNotifications(req.user._id, options);
    const total = await Notification.countDocuments({
      recipient: req.user._id,
      ...(unreadOnly === 'true' ? { isRead: false } : {}),
      ...(type ? { type } : {}),
      ...(priority ? { priority } : {})
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('sender', 'firstName lastName avatar')
      .populate('recipient', 'firstName lastName');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    // Check if user is the recipient
    if (req.user._id.toString() !== notification.recipient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لعرض هذا الإشعار'
      });
    }

    // Mark as read
    await notification.markAsRead();

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    console.error('Get notification by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private (HR, Admin)
router.post('/', protect, authorize('hr', 'admin'), validateNotification, async (req, res) => {
  try {
    const {
      recipient,
      title,
      message,
      type,
      priority,
      relatedEntity,
      channels,
      actions
    } = req.body;

    // Check if recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'المستقبل غير موجود'
      });
    }

    // Create notification
    const notification = await Notification.createNotification({
      recipient,
      sender: req.user._id,
      title,
      message,
      type,
      priority,
      relatedEntity,
      channels,
      actions
    });

    // Populate notification data
    await notification.populate([
      { path: 'recipient', select: 'firstName lastName email phone' },
      { path: 'sender', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإشعار بنجاح',
      data: { notification }
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
router.put('/mark-read', protect, async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'معرفات الإشعارات مطلوبة'
      });
    }

    const result = await Notification.markAsRead(notificationIds, req.user._id);

    res.json({
      success: true,
      message: 'تم تحديد الإشعارات كمقروءة بنجاح',
      data: {
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: 'تم تحديد جميع الإشعارات كمقروءة بنجاح',
      data: {
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Send notification via email
// @route   POST /api/notifications/:id/send-email
// @access  Private (HR, Admin)
router.post('/:id/send-email', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('recipient', 'firstName lastName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    const success = await notification.sendEmail();

    if (success) {
      res.json({
        success: true,
        message: 'تم إرسال الإشعار عبر الإيميل بنجاح'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في إرسال الإشعار عبر الإيميل'
      });
    }
  } catch (error) {
    console.error('Send notification email error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الإيميل'
    });
  }
});

// @desc    Send notification via WhatsApp
// @route   POST /api/notifications/:id/send-whatsapp
// @access  Private (HR, Admin)
router.post('/:id/send-whatsapp', protect, authorize('hr', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('recipient', 'firstName lastName phone');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    const success = await notification.sendWhatsApp();

    if (success) {
      res.json({
        success: true,
        message: 'تم إرسال الإشعار عبر الواتساب بنجاح'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في إرسال الإشعار عبر الواتساب'
      });
    }
  } catch (error) {
    console.error('Send notification WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إرسال الواتساب'
    });
  }
});

// @desc    Broadcast notification to all employees
// @route   POST /api/notifications/broadcast
// @access  Private (HR, Admin)
router.post('/broadcast', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'system_announcement',
      priority = 'medium',
      channels = {},
      department = null
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'العنوان والرسالة مطلوبان'
      });
    }

    // Get all active employees or department employees
    let employees;
    if (department) {
      employees = await User.find({
        department,
        employmentStatus: 'active',
        isActive: true
      });
    } else {
      employees = await User.find({
        employmentStatus: 'active',
        isActive: true
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Create notification for each employee
    for (const employee of employees) {
      try {
        const notification = await Notification.createNotification({
          recipient: employee._id,
          sender: req.user._id,
          title,
          message,
          type,
          priority,
          channels
        });

        results.successful.push({
          employee: {
            id: employee._id,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email
          },
          notification: notification._id
        });
      } catch (error) {
        results.failed.push({
          employee: {
            id: employee._id,
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email
          },
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `تم إرسال الإشعار إلى ${results.successful.length} موظف`,
      data: { results }
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, validateObjectId('id'), async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'hr' && 
        req.user._id.toString() !== notification.recipient.toString()) {
      return res.status(403).json({
        success: false,
        message: 'غير مخول لحذف هذا الإشعار'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private (HR, Admin)
router.get('/stats', protect, authorize('hr', 'admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: {
              $cond: ['$isRead', 1, 0]
            }
          },
          unreadNotifications: {
            $sum: {
              $cond: ['$isRead', 0, 1]
            }
          }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const priorityStats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: parseInt(period),
        overview: stats[0] || {
          totalNotifications: 0,
          readNotifications: 0,
          unreadNotifications: 0
        },
        typeStats,
        priorityStats
      }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

module.exports = router;