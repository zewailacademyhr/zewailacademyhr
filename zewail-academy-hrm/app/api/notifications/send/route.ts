import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendNotification, NotificationData } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || !['admin', 'hr'].includes(user.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const { to, subject, message, type } = await request.json();

    if (!to || !message || !type) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    if (!['email', 'whatsapp'].includes(type)) {
      return NextResponse.json(
        { error: 'نوع الإشعار غير صحيح' },
        { status: 400 }
      );
    }

    const notificationData: NotificationData = {
      to,
      subject,
      message,
      type,
    };

    const success = await sendNotification(notificationData);

    if (success) {
      return NextResponse.json({
        message: 'تم إرسال الإشعار بنجاح',
      });
    } else {
      return NextResponse.json(
        { error: 'فشل في إرسال الإشعار' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إرسال الإشعار' },
      { status: 500 }
    );
  }
}