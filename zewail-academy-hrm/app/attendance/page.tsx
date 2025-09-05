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
  CheckCircle,
  XCircle,
  AlertCircle,
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

interface AttendanceRecord {
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
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent' | 'half-day';
  workingHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  notes?: string;
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

export default function AttendancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
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
      fetchAttendance();
      if (user.role !== 'employee') {
        fetchEmployees();
      }
      fetchTodayAttendance();
    }
  }, [user, currentPage, selectedEmployee, selectedDate]);

  const fetchAttendance = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(selectedEmployee && { employeeId: selectedEmployee }),
        ...(selectedDate && { date: selectedDate }),
      });

      const response = await fetch(`/api/attendance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAttendance(data.attendance);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
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

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/attendance?date=${today}`);
      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data.attendance[0] || null);
      }
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check-in' }),
      });

      if (response.ok) {
        fetchTodayAttendance();
        fetchAttendance();
      } else {
        const data = await response.json();
        alert(data.error || 'حدث خطأ في تسجيل الحضور');
      }
    } catch (error) {
      console.error('Error checking in:', error);
      alert('حدث خطأ في تسجيل الحضور');
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'check-out' }),
      });

      if (response.ok) {
        fetchTodayAttendance();
        fetchAttendance();
      } else {
        const data = await response.json();
        alert(data.error || 'حدث خطأ في تسجيل الانصراف');
      }
    } catch (error) {
      console.error('Error checking out:', error);
      alert('حدث خطأ في تسجيل الانصراف');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'late':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'half-day':
        return <Clock className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'حاضر';
      case 'late':
        return 'متأخر';
      case 'absent':
        return 'غائب';
      case 'half-day':
        return 'نصف يوم';
      default:
        return 'غير محدد';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
    { name: 'الحضور والانصراف', href: '/attendance', icon: Clock, current: true },
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
              <h1 className="text-2xl font-bold text-gray-900">الحضور والانصراف</h1>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Today's Attendance for Employees */}
            {user.role === 'employee' && (
              <div className="card mb-6">
                <div className="card-header">
                  <h2 className="text-lg font-medium text-gray-900">حضور اليوم</h2>
                </div>
                <div className="card-body">
                  {todayAttendance ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">وقت الحضور</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatTime(todayAttendance.checkIn)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">وقت الانصراف</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {todayAttendance.checkOut ? formatTime(todayAttendance.checkOut) : 'لم ينصرف بعد'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">ساعات العمل</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {todayAttendance.workingHours.toFixed(1)} ساعة
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">الحالة</p>
                        <div className="flex items-center justify-center">
                          {getStatusIcon(todayAttendance.status)}
                          <span className="mr-2 text-sm font-medium">
                            {getStatusText(todayAttendance.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">لم يتم تسجيل الحضور اليوم</p>
                      <button
                        onClick={handleCheckIn}
                        className="btn-primary"
                      >
                        تسجيل الحضور
                      </button>
                    </div>
                  )}

                  {todayAttendance && !todayAttendance.checkOut && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={handleCheckOut}
                        className="btn-secondary"
                      >
                        تسجيل الانصراف
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <label className="form-label">التاريخ</label>
                    <input
                      type="date"
                      className="form-input"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedEmployee('');
                        setSelectedDate('');
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

            {/* Attendance Table */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>القسم</th>
                      <th>التاريخ</th>
                      <th>وقت الحضور</th>
                      <th>وقت الانصراف</th>
                      <th>ساعات العمل</th>
                      <th>الحالة</th>
                      <th>التأخير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record._id}>
                        <td>
                          <div>
                            <p className="font-medium">
                              {record.employee.user.profile.firstName} {record.employee.user.profile.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{record.employee.employeeId}</p>
                          </div>
                        </td>
                        <td>{record.employee.department.name}</td>
                        <td>{formatDate(record.date)}</td>
                        <td>{formatTime(record.checkIn)}</td>
                        <td>{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                        <td>{record.workingHours.toFixed(1)} ساعة</td>
                        <td>
                          <div className="flex items-center">
                            {getStatusIcon(record.status)}
                            <span className="mr-2 text-sm">
                              {getStatusText(record.status)}
                            </span>
                          </div>
                        </td>
                        <td>
                          {record.lateMinutes > 0 && (
                            <span className="text-red-600">
                              {record.lateMinutes} دقيقة
                            </span>
                          )}
                          {record.earlyLeaveMinutes > 0 && (
                            <span className="text-orange-600">
                              انصراف مبكر {record.earlyLeaveMinutes} دقيقة
                            </span>
                          )}
                          {record.lateMinutes === 0 && record.earlyLeaveMinutes === 0 && (
                            <span className="text-green-600">في الوقت</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {attendance.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد سجلات حضور</p>
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
    </div>
  );
}