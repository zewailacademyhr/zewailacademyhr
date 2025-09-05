import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Department from '@/lib/models/Department';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const department = await Department.findById(params.id)
      .populate('manager', 'profile');

    if (!department) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ department });
  } catch (error) {
    console.error('Get department error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات القسم' },
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

    const { name, nameEn, description, descriptionEn, manager, isActive } = await request.json();

    const department = await Department.findById(params.id);
    if (!department) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      );
    }

    // Check if department name already exists (excluding current department)
    if (name && name !== department.name) {
      const existingDepartment = await Department.findOne({
        _id: { $ne: params.id },
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { nameEn: { $regex: new RegExp(`^${nameEn}$`, 'i') } }
        ]
      });

      if (existingDepartment) {
        return NextResponse.json(
          { error: 'اسم القسم مستخدم بالفعل' },
          { status: 400 }
        );
      }
    }

    // Update department
    if (name) department.name = name;
    if (nameEn) department.nameEn = nameEn;
    if (description !== undefined) department.description = description;
    if (descriptionEn !== undefined) department.descriptionEn = descriptionEn;
    if (manager !== undefined) department.manager = manager;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    const updatedDepartment = await Department.findById(department._id)
      .populate('manager', 'profile');

    return NextResponse.json({
      message: 'تم تحديث القسم بنجاح',
      department: updatedDepartment,
    });
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث القسم' },
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

    const department = await Department.findById(params.id);
    if (!department) {
      return NextResponse.json(
        { error: 'القسم غير موجود' },
        { status: 404 }
      );
    }

    // Check if department has employees
    const Employee = require('@/lib/models/Employee').default;
    const employeeCount = await Employee.countDocuments({ department: params.id });
    
    if (employeeCount > 0) {
      return NextResponse.json(
        { error: 'لا يمكن حذف القسم لوجود موظفين مرتبطين به' },
        { status: 400 }
      );
    }

    // Soft delete - change status to inactive
    department.isActive = false;
    await department.save();

    return NextResponse.json({
      message: 'تم حذف القسم بنجاح',
    });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في حذف القسم' },
      { status: 500 }
    );
  }
}