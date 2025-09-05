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

interface Department {
  _id: string;
  name: string;
  nameEn: string;
}

export default function AddEmployeePage() {
  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    // User data
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    
    // Employee data
    employeeId: '',
    department: '',
    position: '',
    positionEn: '',
    basicSalary: '',
    nationalId: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    hireDate: '',
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
      fetchDepartments();
    }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          employeeId: formData.employeeId,
          department: formData.department,
          position: formData.position,
          positionEn: formData.positionEn,
          basicSalary: parseFloat(formData.basicSalary),
          nationalId: formData.nationalId,
          address: formData.address,
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            relationship: formData.emergencyContactRelationship,
          },
          hireDate: formData.hireDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/employees');
      } else {
        setError(data.error || 'حدث خطأ في إضافة الموظف');
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
    { name: 'الموظفين', href: '/employees', icon: Users, current: true },
    { name: 'الحضور والانصراف', href: '/attendance', icon: Clock, current: false },
    { name: 'الإجازات', href: '/leaves', icon: Calendar, current: false },
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
                  href="/employees"
                  className="text-gray-500 hover:text-gray-700 ml-4"
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">إضافة موظف جديد</h1>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">البيانات الشخصية</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">الاسم الأول *</label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        className="form-input"
                        value={formData.firstName}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">الاسم الأخير *</label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        className="form-input"
                        value={formData.lastName}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="form-input"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">رقم الهاتف *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        className="form-input"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">كلمة المرور *</label>
                      <input
                        type="password"
                        name="password"
                        required
                        className="form-input"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">تأكيد كلمة المرور *</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        className="form-input"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Information */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">البيانات الوظيفية</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">رقم الموظف *</label>
                      <input
                        type="text"
                        name="employeeId"
                        required
                        className="form-input"
                        value={formData.employeeId}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">القسم *</label>
                      <select
                        name="department"
                        required
                        className="form-input"
                        value={formData.department}
                        onChange={handleChange}
                      >
                        <option value="">اختر القسم</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">المنصب (عربي) *</label>
                      <input
                        type="text"
                        name="position"
                        required
                        className="form-input"
                        value={formData.position}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">المنصب (إنجليزي) *</label>
                      <input
                        type="text"
                        name="positionEn"
                        required
                        className="form-input"
                        value={formData.positionEn}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">الراتب الأساسي (ج.م) *</label>
                      <input
                        type="number"
                        name="basicSalary"
                        required
                        min="0"
                        step="0.01"
                        className="form-input"
                        value={formData.basicSalary}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">تاريخ التعيين *</label>
                      <input
                        type="date"
                        name="hireDate"
                        required
                        className="form-input"
                        value={formData.hireDate}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">التفاصيل الشخصية</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">الرقم القومي *</label>
                      <input
                        type="text"
                        name="nationalId"
                        required
                        className="form-input"
                        value={formData.nationalId}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">العنوان *</label>
                      <input
                        type="text"
                        name="address"
                        required
                        className="form-input"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">جهة الاتصال في حالات الطوارئ</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="form-label">الاسم *</label>
                      <input
                        type="text"
                        name="emergencyContactName"
                        required
                        className="form-input"
                        value={formData.emergencyContactName}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">رقم الهاتف *</label>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        required
                        className="form-input"
                        value={formData.emergencyContactPhone}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">العلاقة *</label>
                      <input
                        type="text"
                        name="emergencyContactRelationship"
                        required
                        className="form-input"
                        value={formData.emergencyContactRelationship}
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
                  href="/employees"
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
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 ml-2" />
                      حفظ الموظف
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}