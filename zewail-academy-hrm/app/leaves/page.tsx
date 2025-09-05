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
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
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

interface LeaveRecord {
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
  type: 'annual' | 'sick' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  approvedAt?: string;
  rejectionReason?: string;
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
  leaveBalance: {
    annual: number;
    sick: number;
    emergency: number;
  };
}

export default function LeavesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
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
      fetchLeaves();
      if (user.role !== 'employee') {
        fetchEmployees();
      }
    }
  }, [user, currentPage, selectedEmployee, selectedStatus, selectedType]);

  const fetchLeaves = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(selectedEmployee && { employeeId: selectedEmployee }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedType && { type: selectedType }),
      });

      const response = await fetch(`/api/leaves?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeaves(data.leaves);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
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

  const handleApproval = async () => {
    if (!selectedLeave) return;

    try {
      const response = await fetch(`/api/leaves/${selectedLeave._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalAction,
          ...(approvalAction === 'reject' && { rejectionReason }),
        }),
      });

      if (response.ok) {
        setShowApprovalModal(false);
        setSelectedLeave(null);
        setRejectionReason('');
        fetchLeaves();
      } else {
        const data = await response.json();
        alert(data.error || 'حدث خطأ في معالجة الطلب');
      }
    } catch (error) {
      console.error('Error handling approval:', error);
      alert('حدث خطأ في معالجة الطلب');
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
      return;
    }

    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLeaves();
      } else {
        const data = await response.json();
        alert(data.error || 'حدث خطأ في إلغاء الطلب');
      }
    } catch (error) {
      console.error('Error cancelling leave:', error);
      alert('حدث خطأ في إلغاء الطلب');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'مقبول';
      case 'rejected':
        return 'مرفوض';
      case 'pending':
        return 'معلق';
      case 'cancelled':
        return 'ملغي';
      default:
        return 'غير محدد';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'annual':
        return 'سنوية';
      case 'sick':
        return 'مرضية';
      case 'emergency':
        return 'طارئة';
      case 'unpaid':
        return 'بدون راتب';
      default:
        return 'غير محدد';
    }
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
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">إدارة الإجازات</h1>
                <Link
                  href="/leaves/request"
                  className="btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  طلب إجازة جديد
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Filters */}
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <label className="form-label">الحالة</label>
                    <select
                      className="form-input"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="">جميع الحالات</option>
                      <option value="pending">معلق</option>
                      <option value="approved">مقبول</option>
                      <option value="rejected">مرفوض</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">نوع الإجازة</label>
                    <select
                      className="form-input"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                    >
                      <option value="">جميع الأنواع</option>
                      <option value="annual">سنوية</option>
                      <option value="sick">مرضية</option>
                      <option value="emergency">طارئة</option>
                      <option value="unpaid">بدون راتب</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedEmployee('');
                        setSelectedStatus('');
                        setSelectedType('');
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

            {/* Leaves Table */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>نوع الإجازة</th>
                      <th>من تاريخ</th>
                      <th>إلى تاريخ</th>
                      <th>عدد الأيام</th>
                      <th>السبب</th>
                      <th>الحالة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div>
                            <p className="font-medium">
                              {leave.employee.user.profile.firstName} {leave.employee.user.profile.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{leave.employee.employeeId}</p>
                          </div>
                        </td>
                        <td>{getTypeText(leave.type)}</td>
                        <td>{formatDate(leave.startDate)}</td>
                        <td>{formatDate(leave.endDate)}</td>
                        <td>{leave.days} يوم</td>
                        <td className="max-w-xs truncate">{leave.reason}</td>
                        <td>
                          <div className="flex items-center">
                            {getStatusIcon(leave.status)}
                            <span className="mr-2 text-sm">
                              {getStatusText(leave.status)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="flex space-x-2 space-x-reverse">
                            <Link
                              href={`/leaves/${leave._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            
                            {user.role !== 'employee' && leave.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedLeave(leave);
                                    setApprovalAction('approve');
                                    setShowApprovalModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedLeave(leave);
                                    setApprovalAction('reject');
                                    setShowApprovalModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {leave.status === 'pending' && (
                              <button
                                onClick={() => handleCancel(leave._id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leaves.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد طلبات إجازة</p>
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

      {/* Approval Modal */}
      {showApprovalModal && selectedLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowApprovalModal(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    {approvalAction === 'approve' ? (
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {approvalAction === 'approve' ? 'قبول طلب الإجازة' : 'رفض طلب الإجازة'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {approvalAction === 'approve' 
                          ? 'هل أنت متأكد من قبول هذا الطلب؟'
                          : 'هل أنت متأكد من رفض هذا الطلب؟'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {approvalAction === 'reject' && (
                  <div className="mt-4">
                    <label className="form-label">سبب الرفض</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="أدخل سبب الرفض..."
                    />
                  </div>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleApproval}
                >
                  {approvalAction === 'approve' ? 'قبول' : 'رفض'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowApprovalModal(false)}
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