import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/lib/models/Leave';
import Employee from '@/lib/models/Employee';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
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

    const { action, rejectionReason } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'نوع العملية غير صحيح' },
        { status: 400 }
      );
    }

    const leave = await Leave.findById(params.id)
      .populate('employee', 'leaveBalance');
    
    if (!leave) {
      return NextResponse.json(
        { error: 'طلب الإجازة غير موجود' },
        { status: 404 }
      );
    }

    if (leave.status !== 'pending') {
      return NextResponse.json(
        { error: 'تم التعامل مع هذا الطلب مسبقاً' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Update leave status
      leave.status = 'approved';
      leave.approvedBy = user._id;
      leave.approvedAt = new Date();

      // Update employee leave balance
      const employee = await Employee.findById(leave.employee._id);
      if (employee) {
        if (leave.type === 'annual') {
          employee.leaveBalance.annual -= leave.days;
        } else if (leave.type === 'sick') {
          employee.leaveBalance.sick -= leave.days;
        } else if (leave.type === 'emergency') {
          employee.leaveBalance.emergency -= leave.days;
        }
        await employee.save();
      }

      await leave.save();
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'سبب الرفض مطلوب' },
          { status: 400 }
        );
      }

      leave.status = 'rejected';
      leave.approvedBy = user._id;
      leave.approvedAt = new Date();
      leave.rejectionReason = rejectionReason;

      await leave.save();
    }

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'employeeId user department position')
      .populate('employee.user', 'profile')
      .populate('employee.department', 'name')
      .populate('approvedBy', 'profile');

    return NextResponse.json({
      message: action === 'approve' ? 'تم قبول طلب الإجازة' : 'تم رفض طلب الإجازة',
      leave: populatedLeave,
    });
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تحديث طلب الإجازة' },
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

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالوصول' },
        { status: 401 }
      );
    }

    const leave = await Leave.findById(params.id);
    if (!leave) {
      return NextResponse.json(
        { error: 'طلب الإجازة غير موجود' },
        { status: 404 }
      );
    }

    // Check if user can cancel this leave
    if (user.role === 'employee') {
      const employee = await Employee.findOne({ user: user._id });
      if (!employee || leave.employee.toString() !== employee._id.toString()) {
        return NextResponse.json(
          { error: 'غير مصرح لك بإلغاء هذا الطلب' },
          { status: 403 }
        );
      }
    }

    if (leave.status !== 'pending') {
      return NextResponse.json(
        { error: 'لا يمكن إلغاء طلب تم التعامل معه مسبقاً' },
        { status: 400 }
      );
    }

    leave.status = 'cancelled';
    await leave.save();

    return NextResponse.json({
      message: 'تم إلغاء طلب الإجازة',
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في إلغاء طلب الإجازة' },
      { status: 500 }
    );
  }
}