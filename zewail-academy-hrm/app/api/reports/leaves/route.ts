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
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

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

    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .populate('approvedBy', 'profile')
      .sort({ createdAt: -1 });

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Get leaves report error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب تقرير الإجازات' },
      { status: 500 }
    );
  }
}