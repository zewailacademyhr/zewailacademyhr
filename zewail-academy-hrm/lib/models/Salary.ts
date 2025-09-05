import mongoose, { Document, Schema } from 'mongoose';

export interface ISalary extends Document {
  _id: string;
  employee: mongoose.Types.ObjectId;
  month: number;
  year: number;
  basicSalary: number;
  allowances: {
    housing: number;
    transportation: number;
    medical: number;
    other: number;
  };
  deductions: {
    latePenalty: number;
    leaveDeduction: number;
    tax: number;
    insurance: number;
    other: number;
  };
  bonuses: {
    performance: number;
    overtime: number;
    other: number;
  };
  grossSalary: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  overtimeHours: number;
  status: 'draft' | 'approved' | 'paid';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SalarySchema = new Schema<ISalary>({
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  allowances: {
    housing: {
      type: Number,
      default: 0,
    },
    transportation: {
      type: Number,
      default: 0,
    },
    medical: {
      type: Number,
      default: 0,
    },
    other: {
      type: Number,
      default: 0,
    },
  },
  deductions: {
    latePenalty: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    insurance: {
      type: Number,
      default: 0,
    },
    other: {
      type: Number,
      default: 0,
    },
  },
  bonuses: {
    performance: {
      type: Number,
      default: 0,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    other: {
      type: Number,
      default: 0,
    },
  },
  grossSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  netSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  workingDays: {
    type: Number,
    required: true,
    min: 0,
  },
  presentDays: {
    type: Number,
    required: true,
    min: 0,
  },
  absentDays: {
    type: Number,
    required: true,
    min: 0,
  },
  lateDays: {
    type: Number,
    required: true,
    min: 0,
  },
  overtimeHours: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'approved', 'paid'],
    default: 'draft',
  },
  paidAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound index to ensure one salary record per employee per month/year
SalarySchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Salary || mongoose.model<ISalary>('Salary', SalarySchema);