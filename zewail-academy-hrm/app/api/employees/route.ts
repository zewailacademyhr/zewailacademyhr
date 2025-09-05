import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';
import Department from '@/lib/models/Department';
import { hashPassword } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    const query: any = {};

    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { 'personalInfo.nationalId': { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query)
      .populate('user', 'email profile')
      .populate('department', 'name nameEn')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Employee.countDocuments(query);

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الموظفين' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      employeeId,
      department,
      position,
      positionEn,
      basicSalary,
      nationalId,
      address,
      emergencyContact,
      hireDate,
    } = await request.json();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return NextResponse.json(
        { error: 'رقم الموظف مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // Check if national ID already exists
    const existingNationalId = await Employee.findOne({ 'personalInfo.nationalId': nationalId });
    if (existingNationalId) {
      return NextResponse.json(
        { error: 'الرقم القومي مستخدم بالفعل' },
        { status: 400 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = new User({
      email,
      password: hashedPassword,
      role: 'employee',
      profile: {
        firstName,
        lastName,
        phone,
      },
    });

    await user.save();

    // Create employee
    const employee = new Employee({
      user: user._id,
      employeeId,
      department,
      position,
      positionEn,
      basicSalary,
      personalInfo: {
        nationalId,
        address,
        emergencyContact,
      },
      hireDate: new Date(hireDate),
    });

    await employee.save();

    // Populate the response
    const populatedEmployee = await Employee.findById(employee._id)
      .populate('user', 'email profile')
      .populate('department', 'name nameEn');

    return NextResponse.json({
      message: 'تم إضافة الموظف بنجاح',
      employee: populatedEmployee,
    }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إضافة الموظف' },
      { status: 500 }
    );
  }
}