import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Salary from '@/lib/models/Salary';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const salary = await Salary.findById(params.id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name');

    if (!salary) {
      return NextResponse.json(
        { error: 'كشف الراتب غير موجود' },
        { status: 404 }
      );
    }

    // Check if user can view this salary
    if (user.role === 'employee') {
      const employee = await Employee.findOne({ user: user._id });
      if (!employee || salary.employee._id.toString() !== employee._id.toString()) {
        return NextResponse.json(
          { error: 'غير مصرح لك بعرض هذا الكشف' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ salary });
  } catch (error) {
    console.error('Get salary error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الراتب' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user || !['admin', 'hr'].includes(user.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const {
      allowances,
      deductions,
      bonuses,
      status,
    } = await request.json();

    const salary = await Salary.findById(params.id);
    if (!salary) {
      return NextResponse.json(
        { error: 'كشف الراتب غير موجود' },
        { status: 404 }
      );
    }

    // Update salary components
    if (allowances) {
      salary.allowances = { ...salary.allowances, ...allowances };
    }

    if (deductions) {
      salary.deductions = { ...salary.deductions, ...deductions };
    }

    if (bonuses) {
      salary.bonuses = { ...salary.bonuses, ...bonuses };
    }

    if (status) {
      salary.status = status;
      if (status === 'paid') {
        salary.paidAt = new Date();
      }
    }

    // Recalculate totals
    const totalAllowances = Object.values(salary.allowances).reduce((sum, val) => sum + val, 0);
    const totalDeductions = Object.values(salary.deductions).reduce((sum, val) => sum + val, 0);
    const totalBonuses = Object.values(salary.bonuses).reduce((sum, val) => sum + val, 0);
    
    salary.grossSalary = salary.basicSalary + totalAllowances + totalBonuses;
    salary.netSalary = salary.grossSalary - totalDeductions;

    await salary.save();

    const populatedSalary = await Salary.findById(salary._id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name');

    return NextResponse.json({
      message: 'تم تحديث كشف الراتب بنجاح',
      salary: populatedSalary,
    });
  } catch (error) {
    console.error('Update salary error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث كشف الراتب' },
      { status: 500 }
    );
  }
}