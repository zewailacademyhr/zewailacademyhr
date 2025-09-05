import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Salary from '@/lib/models/Salary';
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
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const query: any = {};

    // If user is employee, only show their salaries
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

    if (month) {
      query.month = parseInt(month);
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (status) {
      query.status = status;
    }

    const salaries = await Salary.find(query)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .sort({ year: -1, month: -1 });

    return NextResponse.json({ salaries });
  } catch (error) {
    console.error('Get salaries report error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب تقرير الرواتب' },
      { status: 500 }
    );
  }
}