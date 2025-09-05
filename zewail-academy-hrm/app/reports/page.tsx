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
  Download,
  FileText,
  Table,
  Search,
  Filter
} from 'lucide-react';
import { generatePDF, generateExcel, generateAttendanceReport, generateLeaveReport, generateSalaryReport } from '@/lib/reports';

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

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    if (!selectedReport) {
      alert('يرجى اختيار نوع التقرير');
      return;
    }

    setIsGenerating(true);

    try {
      let response;
      const params = new URLSearchParams();

      if (selectedEmployee) {
        params.append('employeeId', selectedEmployee);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      if (selectedYear) {
        params.append('year', selectedYear);
      }

      switch (selectedReport) {
        case 'attendance':
          response = await fetch(`/api/reports/attendance?${params}`);
          break;
        case 'leaves':
          response = await fetch(`/api/reports/leaves?${params}`);
          break;
        case 'salaries':
          response = await fetch(`/api/reports/salaries?${params}`);
          break;
        default:
          throw new Error('نوع التقرير غير صحيح');
      }

      if (!response.ok) {
        throw new Error('فشل في جلب بيانات التقرير');
      }

      const data = await response.json();
      
      let reportData;
      switch (selectedReport) {
        case 'attendance':
          reportData = generateAttendanceReport(data.attendance);
          break;
        case 'leaves':
          reportData = generateLeaveReport(data.leaves);
          break;
        case 'salaries':
          reportData = generateSalaryReport(data.salaries);
          break;
        default:
          throw new Error('نوع التقرير غير صحيح');
      }

      const filename = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'pdf') {
        generatePDF(reportData, `${filename}.pdf`);
      } else {
        generateExcel(reportData, `${filename}.xlsx`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('حدث خطأ في إنشاء التقرير');
    } finally {
      setIsGenerating(false);
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
    { name: 'الإجازات', href: '/leaves', icon: Calendar, current: false },
    { name: 'الرواتب', href: '/salaries', icon: DollarSign, current: false },
    { name: 'الأقسام', href: '/departments', icon: Building2, current: false },
    { name: 'التقارير', href: '/reports', icon: BarChart3, current: true },
  ];

  const reportTypes = [
    {
      id: 'attendance',
      name: 'تقرير الحضور والانصراف',
      description: 'تقرير شامل لحضور وانصراف الموظفين',
      icon: Clock,
      color: 'blue',
    },
    {
      id: 'leaves',
      name: 'تقرير الإجازات',
      description: 'تقرير طلبات الإجازات وحالاتها',
      icon: Calendar,
      color: 'green',
    },
    {
      id: 'salaries',
      name: 'تقرير الرواتب',
      description: 'تقرير الرواتب والبدلات والخصومات',
      icon: DollarSign,
      color: 'yellow',
    },
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
              <h1 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h1>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Report Types */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {reportTypes.map((report) => (
                <div
                  key={report.id}
                  className={`card cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedReport === report.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedReport(report.id)}
                >
                  <div className="card-body text-center">
                    <report.icon className={`h-12 w-12 mx-auto mb-4 text-${report.color}-600`} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {report.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {report.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Report Filters */}
            {selectedReport && (
              <div className="card mb-6">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">إعدادات التقرير</h2>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                    {(selectedReport === 'attendance' || selectedReport === 'leaves') && (
                      <>
                        <div>
                          <label className="form-label">من تاريخ</label>
                          <input
                            type="date"
                            className="form-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="form-label">إلى تاريخ</label>
                          <input
                            type="date"
                            className="form-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {selectedReport === 'salaries' && (
                      <>
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
                            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-6 flex justify-center space-x-4 space-x-reverse">
                    <button
                      onClick={() => handleGenerateReport('pdf')}
                      disabled={isGenerating}
                      className="btn-primary flex items-center"
                    >
                      {isGenerating ? (
                        <>
                          <div className="spinner ml-2"></div>
                          جاري الإنشاء...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 ml-2" />
                          تصدير PDF
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleGenerateReport('excel')}
                      disabled={isGenerating}
                      className="btn-secondary flex items-center"
                    >
                      {isGenerating ? (
                        <>
                          <div className="spinner ml-2"></div>
                          جاري الإنشاء...
                        </>
                      ) : (
                        <>
                          <Table className="h-4 w-4 ml-2" />
                          تصدير Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card">
                <div className="card-body text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">45</p>
                  <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body text-center">
                  <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">38</p>
                  <p className="text-sm text-gray-500">الحضور اليوم</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body text-center">
                  <Calendar className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">12</p>
                  <p className="text-sm text-gray-500">طلبات الإجازة المعلقة</p>
                </div>
              </div>

              <div className="card">
                <div className="card-body text-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">125,000</p>
                  <p className="text-sm text-gray-500">إجمالي الرواتب (ج.م)</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function getMonthName(month: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[month - 1];
}