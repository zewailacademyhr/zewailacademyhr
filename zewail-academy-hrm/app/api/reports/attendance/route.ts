import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'json';

    const query: any = {};

    // If user is employee, only show their attendance
    if (user.role === 'employee') {
      const employee = await Employee.findOne({ user: user._id });
      if (!employee) {
        return NextResponse.json(
          { error: 'لم يتم العثور على بيانات الموظف' },
          { status: 404 }
        );
      }
      query.employee = employee._id;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .sort({ date: -1 });

    if (format === 'json') {
      return NextResponse.json({ attendance });
    }

    // For PDF/Excel export, we'll return the data and let the client handle the export
    return NextResponse.json({ 
      attendance,
      exportData: {
        title: 'تقرير الحضور والانصراف',
        headers: [
          'اسم الموظف',
          'رقم الموظف',
          'القسم',
          'التاريخ',
          'وقت الحضور',
          'وقت الانصراف',
          'ساعات العمل',
          'الحالة',
          'التأخير (دقيقة)',
        ],
        rows: attendance.map(record => [
          `${record.employee.user.profile.firstName} ${record.employee.user.profile.lastName}`,
          record.employee.employeeId,
          record.employee.department.name,
          new Date(record.date).toLocaleDateString('ar-EG'),
          record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG') : '-',
          record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG') : '-',
          `${record.workingHours.toFixed(1)} ساعة`,
          getStatusText(record.status),
          record.lateMinutes || 0,
        ]),
        summary: [
          { label: 'إجمالي السجلات', value: attendance.length },
          { label: 'إجمالي ساعات العمل', value: attendance.reduce((sum, record) => sum + record.workingHours, 0).toFixed(1) + ' ساعة' },
          { label: 'متوسط ساعات العمل اليومية', value: attendance.length > 0 ? (attendance.reduce((sum, record) => sum + record.workingHours, 0) / attendance.length).toFixed(1) + ' ساعة' : '0 ساعة' },
        ],
      },
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب تقرير الحضور' },
      { status: 500 }
    );
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'present': return 'حاضر';
    case 'late': return 'متأخر';
    case 'absent': return 'غائب';
    case 'half-day': return 'نصف يوم';
    default: return 'غير محدد';
  }
}