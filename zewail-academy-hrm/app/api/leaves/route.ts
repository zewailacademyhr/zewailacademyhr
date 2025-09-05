import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';
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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: any = {};

    // If user is employee, only show their leaves
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

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query.startDate = { $gte: startDate, $lte: endDate };
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .populate('approvedBy', 'profile')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Leave.countDocuments(query);

    return NextResponse.json({
      leaves,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الإجازات' },
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

    const {
      type,
      startDate,
      endDate,
      reason,
    } = await request.json();

    if (!type || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
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

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance
    if (type === 'annual' && days > employee.leaveBalance.annual) {
      return NextResponse.json(
        { error: 'رصيد الإجازة السنوية غير كافي' },
        { status: 400 }
      );
    }

    if (type === 'sick' && days > employee.leaveBalance.sick) {
      return NextResponse.json(
        { error: 'رصيد الإجازة المرضية غير كافي' },
        { status: 400 }
      );
    }

    if (type === 'emergency' && days > employee.leaveBalance.emergency) {
      return NextResponse.json(
        { error: 'رصيد الإجازة الطارئة غير كافي' },
        { status: 400 }
      );
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employee: employee._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlappingLeave) {
      return NextResponse.json(
        { error: 'يوجد إجازة متداخلة في نفس الفترة' },
        { status: 400 }
      );
    }

    const leave = new Leave({
      employee: employee._id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason,
    });

    await leave.save();

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name');

    return NextResponse.json({
      message: 'تم تقديم طلب الإجازة بنجاح',
      leave: populatedLeave,
    }, { status: 201 });
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تقديم طلب الإجازة' },
      { status: 500 }
    );
  }
}