import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Email configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// WhatsApp configuration
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface NotificationData {
  to: string;
  subject?: string;
  message: string;
  type: 'email' | 'whatsapp';
}

export async function sendEmail(data: NotificationData): Promise<boolean> {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: data.to,
      subject: data.subject || 'إشعار من Zewail Academy',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Zewail Academy</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">نظام إدارة شؤون الموظفين</p>
          </div>
          <div style="padding: 30px; background-color: #f8fafc;">
            <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0;">
                ${data.message}
              </p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">© 2024 Zewail Academy. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

export async function sendWhatsApp(data: NotificationData): Promise<boolean> {
  try {
    const message = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${data.to}`,
      body: `🏢 *Zewail Academy*\n\n${data.message}\n\n_نظام إدارة شؤون الموظفين_`,
    });

    return message.sid ? true : false;
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return false;
  }
}

export async function sendNotification(data: NotificationData): Promise<boolean> {
  try {
    if (data.type === 'email') {
      return await sendEmail(data);
    } else if (data.type === 'whatsapp') {
      return await sendWhatsApp(data);
    }
    return false;
  } catch (error) {
    console.error('Notification sending error:', error);
    return false;
  }
}

// Predefined notification templates
export const notificationTemplates = {
  leaveApproved: (employeeName: string, leaveType: string, startDate: string, endDate: string) => ({
    subject: 'تم قبول طلب الإجازة',
    message: `مرحباً ${employeeName}،\n\nتم قبول طلب إجازتك ${leaveType} من ${startDate} إلى ${endDate}.\n\nنتمنى لك إجازة سعيدة!`,
  }),

  leaveRejected: (employeeName: string, leaveType: string, reason: string) => ({
    subject: 'تم رفض طلب الإجازة',
    message: `مرحباً ${employeeName}،\n\nتم رفض طلب إجازتك ${leaveType}.\n\nالسبب: ${reason}\n\nيرجى التواصل مع الإدارة لمزيد من التفاصيل.`,
  }),

  salaryGenerated: (employeeName: string, month: string, year: string, netSalary: number) => ({
    subject: 'تم إصدار كشف الراتب',
    message: `مرحباً ${employeeName}،\n\nتم إصدار كشف راتبك لشهر ${month} ${year}.\n\nصافي الراتب: ${netSalary.toLocaleString()} ج.م\n\nيمكنك مراجعة التفاصيل من خلال النظام.`,
  }),

  attendanceReminder: (employeeName: string) => ({
    subject: 'تذكير بتسجيل الحضور',
    message: `مرحباً ${employeeName}،\n\nيرجى تسجيل حضورك اليوم من خلال النظام.\n\nشكراً لالتزامك.`,
  }),

  passwordReset: (employeeName: string, resetLink: string) => ({
    subject: 'إعادة تعيين كلمة المرور',
    message: `مرحباً ${employeeName}،\n\nتم طلب إعادة تعيين كلمة المرور لحسابك.\n\nاضغط على الرابط التالي لإعادة تعيين كلمة المرور:\n${resetLink}\n\nإذا لم تطلب هذا الرابط، يرجى تجاهل هذه الرسالة.`,
  }),

  newEmployee: (employeeName: string, employeeId: string, department: string) => ({
    subject: 'مرحباً بك في Zewail Academy',
    message: `مرحباً ${employeeName}،\n\nأهلاً وسهلاً بك في Zewail Academy!\n\nرقم الموظف: ${employeeId}\nالقسم: ${department}\n\nيمكنك الآن تسجيل الدخول إلى النظام باستخدام بياناتك.`,
  }),
};

// Utility functions for sending specific notifications
export async function notifyLeaveStatusChange(
  employeeEmail: string,
  employeePhone: string,
  status: 'approved' | 'rejected',
  leaveData: any
) {
  const template = status === 'approved' 
    ? notificationTemplates.leaveApproved(
        leaveData.employeeName,
        leaveData.type,
        leaveData.startDate,
        leaveData.endDate
      )
    : notificationTemplates.leaveRejected(
        leaveData.employeeName,
        leaveData.type,
        leaveData.reason
      );

  // Send email
  await sendNotification({
    to: employeeEmail,
    subject: template.subject,
    message: template.message,
    type: 'email',
  });

  // Send WhatsApp if phone number is available
  if (employeePhone) {
    await sendNotification({
      to: employeePhone,
      message: template.message,
      type: 'whatsapp',
    });
  }
}

export async function notifySalaryGenerated(
  employeeEmail: string,
  employeePhone: string,
  salaryData: any
) {
  const template = notificationTemplates.salaryGenerated(
    salaryData.employeeName,
    salaryData.month,
    salaryData.year,
    salaryData.netSalary
  );

  // Send email
  await sendNotification({
    to: employeeEmail,
    subject: template.subject,
    message: template.message,
    type: 'email',
  });

  // Send WhatsApp if phone number is available
  if (employeePhone) {
    await sendNotification({
      to: employeePhone,
      message: template.message,
      type: 'whatsapp',
    });
  }
}

export async function notifyNewEmployee(
  employeeEmail: string,
  employeePhone: string,
  employeeData: any
) {
  const template = notificationTemplates.newEmployee(
    employeeData.name,
    employeeData.employeeId,
    employeeData.department
  );

  // Send email
  await sendNotification({
    to: employeeEmail,
    subject: template.subject,
    message: template.message,
    type: 'email',
  });

  // Send WhatsApp if phone number is available
  if (employeePhone) {
    await sendNotification({
      to: employeePhone,
      message: template.message,
      type: 'whatsapp',
    });
  }
}