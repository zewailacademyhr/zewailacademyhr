'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2,
  Users,
  Calendar,
  DollarSign,
  BarChart3,
  Clock,
  LogOut,
  Menu,
  X,
  Save,
  ArrowRight
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    avatar?: string;
  };
  isActive: boolean;
}

interface Employee {
  _id: string;
  leaveBalance: {
    annual: number;
    sick: number;
    emergency: number;
  };
}

export default function RequestLeavePage() {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        const currentEmployee = data.employees.find((emp: any) => emp.user._id === user?.id);
        if (currentEmployee) {
          setEmployee(currentEmployee);
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return days;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.type || !formData.startDate || !formData.endDate || !formData.reason) {
      setError('جميع الحقول مطلوبة');
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    if (!employee) {
      setError('لم يتم العثور على بيانات الموظف');
      return;
    }

    // Check leave balance
    if (formData.type === 'annual' && days > employee.leaveBalance.annual) {
      setError(`رصيد الإجازة السنوية غير كافي. المتاح: ${employee.leaveBalance.annual} يوم`);
      return;
    }

    if (formData.type === 'sick' && days > employee.leaveBalance.sick) {
      setError(`رصيد الإجازة المرضية غير كافي. المتاح: ${employee.leaveBalance.sick} يوم`);
      return;
    }

    if (formData.type === 'emergency' && days > employee.leaveBalance.emergency) {
      setError(`رصيد الإجازة الطارئة غير كافي. المتاح: ${employee.leaveBalance.emergency} يوم`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/leaves');
      } else {
        setError(data.error || 'حدث خطأ في تقديم طلب الإجازة');
      }
    } catch (error) {
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: BarChart3, current: false },
    { name: 'الموظفين', href: '/employees', icon: Users, current: false },
    { name: 'الحضور والانصراف', href: '/attendance', icon: Clock, current: false },
    { name: 'الإجازات', href: '/leaves', icon: Calendar, current: true },
    { name: 'الرواتب', href: '/salaries', icon: DollarSign, current: false },
    { name: 'الأقسام', href: '/departments', icon: Building2, current: false },
    { name: 'التقارير', href: '/reports', icon: BarChart3, current: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Building2 className="h-8 w-8 text-blue-600 ml-2" />
              <h1 className="text-xl font-bold text-gray-900">Zewail Academy</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    item.current
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-l border-gray-200">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <Building2 className="h-8 w-8 text-blue-600 ml-2" />
                <h1 className="text-xl font-bold text-gray-900">Zewail Academy</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      item.current
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="mr-3 h-6 w-6" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">
                    {user.profile.firstName} {user.profile.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mr-3 p-2 text-gray-400 hover:text-gray-600"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center">
                <Link
                  href="/leaves"
                  className="text-gray-500 hover:text-gray-700 ml-4"
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">طلب إجازة جديد</h1>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Leave Balance */}
              <div className="lg:col-span-1">
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-medium text-gray-900">رصيد الإجازات</h2>
                  </div>
                  <div className="card-body">
                    {employee ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">الإجازة السنوية</span>
                          <span className="font-medium text-blue-600">{employee.leaveBalance.annual} يوم</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">الإجازة المرضية</span>
                          <span className="font-medium text-green-600">{employee.leaveBalance.sick} يوم</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">الإجازة الطارئة</span>
                          <span className="font-medium text-orange-600">{employee.leaveBalance.emergency} يوم</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">جاري تحميل البيانات...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Leave Request Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-lg font-medium text-gray-900">بيانات طلب الإجازة</h2>
                    </div>
                    <div className="card-body">
                      <div className="space-y-6">
                        <div>
                          <label className="form-label">نوع الإجازة *</label>
                          <select
                            name="type"
                            required
                            className="form-input"
                            value={formData.type}
                            onChange={handleChange}
                          >
                            <option value="">اختر نوع الإجازة</option>
                            <option value="annual">إجازة سنوية</option>
                            <option value="sick">إجازة مرضية</option>
                            <option value="emergency">إجازة طارئة</option>
                            <option value="unpaid">إجازة بدون راتب</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="form-label">من تاريخ *</label>
                            <input
                              type="date"
                              name="startDate"
                              required
                              className="form-input"
                              value={formData.startDate}
                              onChange={handleChange}
                            />
                          </div>

                          <div>
                            <label className="form-label">إلى تاريخ *</label>
                            <input
                              type="date"
                              name="endDate"
                              required
                              className="form-input"
                              value={formData.endDate}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {formData.startDate && formData.endDate && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <p className="text-sm text-blue-800">
                              <span className="font-medium">عدد الأيام المطلوبة:</span> {calculateDays()} يوم
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="form-label">سبب الإجازة *</label>
                          <textarea
                            name="reason"
                            required
                            rows={4}
                            className="form-input"
                            placeholder="أدخل سبب طلب الإجازة..."
                            value={formData.reason}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 space-x-reverse">
                    <Link
                      href="/leaves"
                      className="btn-secondary"
                    >
                      إلغاء
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="spinner ml-2"></div>
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 ml-2" />
                          تقديم الطلب
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}