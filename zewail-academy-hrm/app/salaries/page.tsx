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
  Plus,
  Eye,
  Edit,
  Download,
  Search,
  Filter
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

interface SalaryRecord {
  _id: string;
  employee: {
    _id: string;
    employeeId: string;
    user: {
      _id: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    department: {
      _id: string;
      name: string;
    };
    position: string;
  };
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
  paidAt?: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  department: {
    _id: string;
    name: string;
  };
  position: string;
}

export default function SalariesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [calculateForm, setCalculateForm] = useState({
    employeeId: '',
    month: '',
    year: '',
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const router = useRouter();

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
      fetchSalaries();
      if (user.role !== 'employee') {
        fetchEmployees();
      }
    }
  }, [user, currentPage, selectedEmployee, selectedMonth, selectedYear, selectedStatus]);

  const fetchSalaries = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(selectedEmployee && { employeeId: selectedEmployee }),
        ...(selectedMonth && { month: selectedMonth }),
        ...(selectedYear && { year: selectedYear }),
        ...(selectedStatus && { status: selectedStatus }),
      });

      const response = await fetch(`/api/salaries?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSalaries(data.salaries);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleCalculateSalary = async () => {
    if (!calculateForm.employeeId || !calculateForm.month || !calculateForm.year) {
      alert('جميع الحقول مطلوبة');
      return;
    }

    setIsCalculating(true);

    try {
      const response = await fetch('/api/salaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calculateForm),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCalculateModal(false);
        setCalculateForm({ employeeId: '', month: '', year: '' });
        fetchSalaries();
      } else {
        alert(data.error || 'حدث خطأ في حساب الراتب');
      }
    } catch (error) {
      console.error('Error calculating salary:', error);
      alert('حدث خطأ في حساب الراتب');
    } finally {
      setIsCalculating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-gray">مسودة</span>;
      case 'approved':
        return <span className="badge badge-info">معتمد</span>;
      case 'paid':
        return <span className="badge badge-success">مدفوع</span>;
      default:
        return <span className="badge badge-gray">غير محدد</span>;
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
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
    { name: 'الإجازات', href: '/leaves', icon: Calendar, current: false },
    { name: 'الرواتب', href: '/salaries', icon: DollarSign, current: true },
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
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">إدارة الرواتب</h1>
                {user.role !== 'employee' && (
                  <button
                    onClick={() => setShowCalculateModal(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    حساب راتب جديد
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Filters */}
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {user.role !== 'employee' && (
                    <div>
                      <label className="form-label">الموظف</label>
                      <select
                        className="form-input"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                      >
                        <option value="">جميع الموظفين</option>
                        {employees.map((employee) => (
                          <option key={employee._id} value={employee._id}>
                            {employee.user.profile.firstName} {employee.user.profile.lastName} - {employee.employeeId}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="form-label">الشهر</label>
                    <select
                      className="form-input"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                      <option value="">جميع الأشهر</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {getMonthName(month)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">السنة</label>
                    <select
                      className="form-input"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="">جميع السنوات</option>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">الحالة</label>
                    <select
                      className="form-input"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="draft">مسودة</option>
                      <option value="approved">معتمد</option>
                      <option value="paid">مدفوع</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedEmployee('');
                        setSelectedMonth('');
                        setSelectedYear('');
                        setSelectedStatus('');
                        setCurrentPage(1);
                      }}
                      className="btn-secondary w-full"
                    >
                      <Filter className="h-4 w-4 ml-2" />
                      إعادة تعيين
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Salaries Table */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>الشهر</th>
                      <th>الراتب الأساسي</th>
                      <th>إجمالي البدلات</th>
                      <th>إجمالي الخصومات</th>
                      <th>صافي الراتب</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map((salary) => (
                      <tr key={salary._id}>
                        <td>
                          <div>
                            <p className="font-medium">
                              {salary.employee.user.profile.firstName} {salary.employee.user.profile.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{salary.employee.employeeId}</p>
                          </div>
                        </td>
                        <td>
                          {getMonthName(salary.month)} {salary.year}
                        </td>
                        <td>{salary.basicSalary.toLocaleString()} ج.م</td>
                        <td>
                          {(Object.values(salary.allowances).reduce((sum, val) => sum + val, 0)).toLocaleString()} ج.م
                        </td>
                        <td>
                          {(Object.values(salary.deductions).reduce((sum, val) => sum + val, 0)).toLocaleString()} ج.م
                        </td>
                        <td className="font-medium text-green-600">
                          {salary.netSalary.toLocaleString()} ج.م
                        </td>
                        <td>{getStatusBadge(salary.status)}</td>
                        <td>
                          <div className="flex space-x-2 space-x-reverse">
                            <Link
                              href={`/salaries/${salary._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            
                            {user.role !== 'employee' && (
                              <Link
                                href={`/salaries/${salary._id}/edit`}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}

                            <button
                              onClick={() => {
                                // TODO: Implement PDF download
                                alert('سيتم إضافة ميزة التصدير قريباً');
                              }}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {salaries.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد كشوف رواتب</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex space-x-2 space-x-reverse">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    التالي
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Calculate Salary Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCalculateModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      حساب راتب جديد
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        اختر الموظف والشهر والسنة لحساب الراتب
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="form-label">الموظف *</label>
                    <select
                      className="form-input"
                      value={calculateForm.employeeId}
                      onChange={(e) => setCalculateForm({ ...calculateForm, employeeId: e.target.value })}
                    >
                      <option value="">اختر الموظف</option>
                      {employees.map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.user.profile.firstName} {employee.user.profile.lastName} - {employee.employeeId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">الشهر *</label>
                      <select
                        className="form-input"
                        value={calculateForm.month}
                        onChange={(e) => setCalculateForm({ ...calculateForm, month: e.target.value })}
                      >
                        <option value="">اختر الشهر</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <option key={month} value={month}>
                            {getMonthName(month)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">السنة *</label>
                      <select
                        className="form-input"
                        value={calculateForm.year}
                        onChange={(e) => setCalculateForm({ ...calculateForm, year: e.target.value })}
                      >
                        <option value="">اختر السنة</option>
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCalculateSalary}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'جاري الحساب...' : 'حساب الراتب'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowCalculateModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}