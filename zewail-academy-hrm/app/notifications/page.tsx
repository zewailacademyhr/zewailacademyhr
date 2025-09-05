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
  Send,
  Mail,
  MessageCircle,
  Plus,
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

interface Employee {
  _id: string;
  employeeId: string;
  user: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  department: {
    _id: string;
    name: string;
  };
  position: string;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [notificationType, setNotificationType] = useState<'email' | 'whatsapp'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const handleSendNotification = async () => {
    if (selectedEmployees.length === 0) {
      setError('يرجى اختيار موظف واحد على الأقل');
      return;
    }

    if (!message.trim()) {
      setError('يرجى كتابة رسالة الإشعار');
      return;
    }

    setIsSending(true);
    setError('');
    setSuccess('');

    try {
      const selectedEmployeeData = employees.filter(emp => 
        selectedEmployees.includes(emp._id)
      );

      const promises = selectedEmployeeData.map(async (employee) => {
        const contact = notificationType === 'email' 
          ? employee.user.email 
          : employee.user.profile.phone;

        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: contact,
            subject: subject || undefined,
            message: message,
            type: notificationType,
          }),
        });

        return response.ok;
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;

      if (successCount === selectedEmployeeData.length) {
        setSuccess(`تم إرسال الإشعار بنجاح إلى ${successCount} موظف`);
        setShowSendModal(false);
        setSelectedEmployees([]);
        setSubject('');
        setMessage('');
      } else {
        setError(`تم إرسال الإشعار إلى ${successCount} من ${selectedEmployeeData.length} موظف`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      setError('حدث خطأ في إرسال الإشعارات');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp._id));
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
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
    { name: 'التقارير', href: '/reports', icon: BarChart3, current: false },
    { name: 'الإشعارات', href: '/notifications', icon: MessageCircle, current: true },
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
                <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
                <button
                  onClick={() => setShowSendModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إرسال إشعار جديد
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="card-body text-center">
                  <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    إرسال إيميل
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    إرسال إشعارات عبر البريد الإلكتروني
                  </p>
                  <button
                    onClick={() => {
                      setNotificationType('email');
                      setShowSendModal(true);
                    }}
                    className="btn-primary w-full"
                  >
                    إرسال إيميل
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-body text-center">
                  <MessageCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    إرسال واتساب
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    إرسال إشعارات عبر تطبيق واتساب
                  </p>
                  <button
                    onClick={() => {
                      setNotificationType('whatsapp');
                      setShowSendModal(true);
                    }}
                    className="btn-success w-full"
                  >
                    إرسال واتساب
                  </button>
                </div>
              </div>

              <div className="card">
                <div className="card-body text-center">
                  <Send className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    إرسال جماعي
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    إرسال إشعارات لجميع الموظفين
                  </p>
                  <button
                    onClick={() => {
                      setSelectedEmployees(employees.map(emp => emp._id));
                      setShowSendModal(true);
                    }}
                    className="btn-secondary w-full"
                  >
                    إرسال للجميع
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-medium text-gray-900">الإشعارات الأخيرة</h2>
              </div>
              <div className="card-body">
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد إشعارات مرسلة مؤخراً</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Send Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSendModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Send className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      إرسال إشعار جديد
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        اختر الموظفين واكتب رسالة الإشعار
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Notification Type */}
                  <div>
                    <label className="form-label">نوع الإشعار</label>
                    <div className="flex space-x-4 space-x-reverse">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationType"
                          value="email"
                          checked={notificationType === 'email'}
                          onChange={(e) => setNotificationType(e.target.value as 'email' | 'whatsapp')}
                          className="ml-2"
                        />
                        <Mail className="h-4 w-4 ml-1" />
                        إيميل
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="notificationType"
                          value="whatsapp"
                          checked={notificationType === 'whatsapp'}
                          onChange={(e) => setNotificationType(e.target.value as 'email' | 'whatsapp')}
                          className="ml-2"
                        />
                        <MessageCircle className="h-4 w-4 ml-1" />
                        واتساب
                      </label>
                    </div>
                  </div>

                  {/* Subject (for email) */}
                  {notificationType === 'email' && (
                    <div>
                      <label className="form-label">الموضوع</label>
                      <input
                        type="text"
                        className="form-input"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="موضوع الإشعار..."
                      />
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="form-label">الرسالة *</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="اكتب رسالة الإشعار هنا..."
                    />
                  </div>

                  {/* Employee Selection */}
                  <div>
                    <label className="form-label">الموظفين</label>
                    <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                      <div className="mb-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.length === employees.length}
                            onChange={handleSelectAll}
                            className="ml-2"
                          />
                          <span className="font-medium">اختيار الكل</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        {employees.map((employee) => (
                          <label key={employee._id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employee._id)}
                              onChange={() => handleSelectEmployee(employee._id)}
                              className="ml-2"
                            />
                            <span className="text-sm">
                              {employee.user.profile.firstName} {employee.user.profile.lastName} - {employee.employeeId}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleSendNotification}
                  disabled={isSending}
                >
                  {isSending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowSendModal(false)}
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