import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Employee from '@/lib/models/Employee';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const employee = await Employee.findById(params.id)
      .populate('user', 'email profile')
      .populate('department', 'name nameEn');

    if (!employee) {
      return NextResponse.json(
        { error: 'الموظف غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الموظف' },
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

    const {
      firstName,
      lastName,
      phone,
      department,
      position,
      positionEn,
      basicSalary,
      status,
      nationalId,
      address,
      emergencyContact,
      endDate,
    } = await request.json();

    const employee = await Employee.findById(params.id);
    if (!employee) {
      return NextResponse.json(
        { error: 'الموظف غير موجود' },
        { status: 404 }
      );
    }

    // Update employee data
    employee.department = department;
    employee.position = position;
    employee.positionEn = positionEn;
    employee.basicSalary = basicSalary;
    employee.status = status;
    employee.personalInfo.nationalId = nationalId;
    employee.personalInfo.address = address;
    employee.personalInfo.emergencyContact = emergencyContact;
    if (endDate) {
      employee.endDate = new Date(endDate);
    }

    await employee.save();

    // Update user profile
    await User.findByIdAndUpdate(employee.user, {
      profile: {
        firstName,
        lastName,
        phone,
        avatar: employee.user.profile?.avatar || '',
      },
    });

    const updatedEmployee = await Employee.findById(params.id)
      .populate('user', 'email profile')
      .populate('department', 'name nameEn');

    return NextResponse.json({
      message: 'تم تحديث بيانات الموظف بنجاح',
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث بيانات الموظف' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const employee = await Employee.findById(params.id);
    if (!employee) {
      return NextResponse.json(
        { error: 'الموظف غير موجود' },
        { status: 404 }
      );
    }

    // Soft delete - change status to terminated
    employee.status = 'terminated';
    employee.endDate = new Date();
    await employee.save();

    return NextResponse.json({
      message: 'تم إنهاء خدمة الموظف بنجاح',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف الموظف' },
      { status: 500 }
    );
  }
}