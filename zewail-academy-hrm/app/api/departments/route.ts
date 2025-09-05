import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Department from '@/lib/models/Department';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const departments = await Department.find({ isActive: true })
      .populate('manager', 'profile')
      .sort({ name: 1 });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في جلب بيانات الأقسام' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name, nameEn, description, descriptionEn, manager } = await request.json();

    if (!name || !nameEn) {
      return NextResponse.json(
        { error: 'اسم القسم مطلوب باللغتين العربية والإنجليزية' },
        { status: 400 }
      );
    }

    // Check if department already exists
    const existingDepartment = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { nameEn: { $regex: new RegExp(`^${nameEn}$`, 'i') } }
      ]
    });

    if (existingDepartment) {
      return NextResponse.json(
        { error: 'القسم موجود بالفعل' },
        { status: 400 }
      );
    }

    const department = new Department({
      name,
      nameEn,
      description,
      descriptionEn,
      manager: manager || null,
    });

    await department.save();

    const populatedDepartment = await Department.findById(department._id)
      .populate('manager', 'profile');

    return NextResponse.json({
      message: 'تم إضافة القسم بنجاح',
      department: populatedDepartment,
    }, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إضافة القسم' },
      { status: 500 }
    );
  }
}