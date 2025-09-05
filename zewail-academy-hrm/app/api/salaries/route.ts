import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Salary from '@/lib/models/Salary';
import Employee from '@/lib/models/Employee';
import Attendance from '@/lib/models/Attendance';
import Leave from '@/lib/models/Leave';
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
      .populate('employee', 'employeeId user department position basicSalary')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ year: -1, month: -1 });

    const total = await Salary.countDocuments(query);

    return NextResponse.json({
      salaries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الرواتب' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getCurrentUser(request);
    if (!user || !['admin', 'hr'].includes(user.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const { employeeId, month, year } = await request.json();

    if (!employeeId || !month || !year) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      );
    }

    // Check if salary already exists
    const existingSalary = await Salary.findOne({
      employee: employeeId,
      month: parseInt(month),
      year: parseInt(year),
    });

    if (existingSalary) {
      return NextResponse.json(
        { error: 'تم حساب الراتب لهذا الشهر مسبقاً' },
        { status: 400 }
      );
    }

    // Get employee data
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: 'الموظف غير موجود' },
        { status: 404 }
      );
    }

    // Calculate working days in the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const workingDays = endDate.getDate(); // Assuming all days are working days

    // Get attendance data for the month
    const attendance = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    const presentDays = attendance.filter(att => att.status === 'present' || att.status === 'late').length;
    const absentDays = workingDays - presentDays;
    const lateDays = attendance.filter(att => att.status === 'late').length;
    const overtimeHours = attendance.reduce((sum, att) => sum + (att.overtimeHours || 0), 0);

    // Get leave data for the month
    const leaves = await Leave.find({
      employee: employeeId,
      status: 'approved',
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });

    const leaveDays = leaves.reduce((sum, leave) => {
      const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
      const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
      const days = Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Calculate salary components
    const basicSalary = employee.basicSalary;
    const dailyRate = basicSalary / workingDays;
    
    // Allowances (can be configured per employee or globally)
    const allowances = {
      housing: basicSalary * 0.1, // 10% housing allowance
      transportation: 500, // Fixed transportation allowance
      medical: basicSalary * 0.05, // 5% medical allowance
      other: 0,
    };

    // Deductions
    const deductions = {
      latePenalty: lateDays * dailyRate * 0.1, // 10% penalty for each late day
      leaveDeduction: leaveDays * dailyRate,
      tax: basicSalary * 0.14, // 14% tax
      insurance: basicSalary * 0.11, // 11% insurance
      other: 0,
    };

    // Bonuses
    const bonuses = {
      performance: 0, // Can be added manually
      overtime: overtimeHours * (dailyRate / 8) * 1.5, // 1.5x rate for overtime
      other: 0,
    };

    // Calculate totals
    const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + val, 0);
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
    const totalBonuses = Object.values(bonuses).reduce((sum, val) => sum + val, 0);
    
    const grossSalary = basicSalary + totalAllowances + totalBonuses;
    const netSalary = grossSalary - totalDeductions;

    // Create salary record
    const salary = new Salary({
      employee: employeeId,
      month: parseInt(month),
      year: parseInt(year),
      basicSalary,
      allowances,
      deductions,
      bonuses,
      grossSalary,
      netSalary,
      workingDays,
      presentDays,
      absentDays,
      lateDays,
      overtimeHours,
    });

    await salary.save();

    const populatedSalary = await Salary.findById(salary._id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name');

    return NextResponse.json({
      message: 'تم حساب الراتب بنجاح',
      salary: populatedSalary,
    }, { status: 201 });
  } catch (error) {
    console.error('Calculate salary error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حساب الراتب' },
      { status: 500 }
    );
  }
}