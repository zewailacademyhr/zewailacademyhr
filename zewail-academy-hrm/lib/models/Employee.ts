import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  _id: string;
  user: mongoose.Types.ObjectId;
  employeeId: string;
  department: mongoose.Types.ObjectId;
  position: string;
  positionEn: string;
  basicSalary: number;
  status: 'active' | 'inactive' | 'terminated';
  hireDate: Date;
  endDate?: Date;
  personalInfo: {
    nationalId: string;
    address: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  documents: {
    contract: string;
    certificate: string;
    idCard: string;
  };
  leaveBalance: {
    annual: number;
    sick: number;
    emergency: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  department: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  position: {
    type: String,
    required: true,
    trim: true,
  },
  positionEn: {
    type: String,
    required: true,
    trim: true,
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active',
  },
  hireDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  personalInfo: {
    nationalId: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      relationship: {
        type: String,
        required: true,
      },
    },
  },
  documents: {
    contract: {
      type: String,
      default: '',
    },
    certificate: {
      type: String,
      default: '',
    },
    idCard: {
      type: String,
      default: '',
    },
  },
  leaveBalance: {
    annual: {
      type: Number,
      default: 24, // 2 days per month * 12 months
    },
    sick: {
      type: Number,
      default: 12,
    },
    emergency: {
      type: Number,
      default: 6,
    },
  },
}, {
  timestamps: true,
});

export default mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);