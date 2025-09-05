import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/lib/models/Attendance';
import Employee from '@/lib/models/Employee';
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

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

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1, checkIn: -1 });

    const total = await Attendance.countDocuments(query);

    return NextResponse.json({
      attendance,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الحضور' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const { action, notes } = await request.json();

    if (!action || !['check-in', 'check-out'].includes(action)) {
      return NextResponse.json(
        { error: 'نوع العملية غير صحيح' },
        { status: 400 }
      );
    }

    // Find employee
    const employee = await Employee.findOne({ user: user._id });
    if (!employee) {
      return NextResponse.json(
        { error: 'لم يتم العثور على بيانات الموظف' },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
    });

    if (action === 'check-in') {
      if (attendance) {
        return NextResponse.json(
          { error: 'تم تسجيل الحضور بالفعل اليوم' },
          { status: 400 }
        );
      }

      const checkInTime = new Date();
      const expectedCheckIn = new Date();
      expectedCheckIn.setHours(9, 0, 0, 0); // 9:00 AM

      const lateMinutes = Math.max(0, Math.floor((checkInTime.getTime() - expectedCheckIn.getTime()) / (1000 * 60)));
      const status = lateMinutes > 0 ? 'late' : 'present';

      attendance = new Attendance({
        employee: employee._id,
        date: today,
        checkIn: checkInTime,
        status,
        lateMinutes,
        notes,
      });

      await attendance.save();
    } else if (action === 'check-out') {
      if (!attendance) {
        return NextResponse.json(
          { error: 'يجب تسجيل الحضور أولاً' },
          { status: 400 }
        );
      }

      if (attendance.checkOut) {
        return NextResponse.json(
          { error: 'تم تسجيل الانصراف بالفعل اليوم' },
          { status: 400 }
        );
      }

      const checkOutTime = new Date();
      const expectedCheckOut = new Date();
      expectedCheckOut.setHours(17, 0, 0, 0); // 5:00 PM

      const earlyLeaveMinutes = Math.max(0, Math.floor((expectedCheckOut.getTime() - checkOutTime.getTime()) / (1000 * 60)));
      
      // Calculate working hours
      const workingHours = (checkOutTime.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, workingHours - 8); // 8 hours standard

      attendance.checkOut = checkOutTime;
      attendance.workingHours = workingHours;
      attendance.overtimeHours = overtimeHours;
      attendance.earlyLeaveMinutes = earlyLeaveMinutes;

      if (earlyLeaveMinutes > 0) {
        attendance.status = 'half-day';
      }

      await attendance.save();
    }

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name');

    return NextResponse.json({
      message: action === 'check-in' ? 'تم تسجيل الحضور بنجاح' : 'تم تسجيل الانصراف بنجاح',
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error('Attendance action error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تسجيل الحضور/الانصراف' },
      { status: 500 }
    );
  }
}