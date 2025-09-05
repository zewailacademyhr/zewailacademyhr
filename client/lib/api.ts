import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: any) =>
    api.post('/auth/register', userData),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: any) =>
    api.put('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    api.put('/auth/change-password', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  refreshToken: () =>
    api.post('/auth/refresh'),
  
  getPermissions: () =>
    api.get('/auth/permissions'),
}

// Employees API
export const employeesAPI = {
  getEmployees: (params?: any) =>
    api.get('/employees', { params }),
  
  getEmployee: (id: string) =>
    api.get(`/employees/${id}`),
  
  createEmployee: (data: any) =>
    api.post('/employees', data),
  
  updateEmployee: (id: string, data: any) =>
    api.put(`/employees/${id}`, data),
  
  deleteEmployee: (id: string) =>
    api.delete(`/employees/${id}`),
  
  uploadDocument: (id: string, formData: FormData) =>
    api.post(`/employees/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  getEmployeeDocuments: (id: string) =>
    api.get(`/employees/${id}/documents`),
  
  getEmployeeStats: (id: string) =>
    api.get(`/employees/${id}/stats`),
  
  getEmployeesByDepartment: (departmentId: string) =>
    api.get(`/employees/department/${departmentId}`),
  
  bulkUpdateEmployees: (data: any) =>
    api.put('/employees/bulk-update', data),
}

// Departments API
export const departmentsAPI = {
  getDepartments: (params?: any) =>
    api.get('/departments', { params }),
  
  getDepartment: (id: string) =>
    api.get(`/departments/${id}`),
  
  createDepartment: (data: any) =>
    api.post('/departments', data),
  
  updateDepartment: (id: string, data: any) =>
    api.put(`/departments/${id}`, data),
  
  deleteDepartment: (id: string) =>
    api.delete(`/departments/${id}`),
  
  getHierarchy: () =>
    api.get('/departments/hierarchy'),
  
  getWithStats: () =>
    api.get('/departments/with-stats'),
  
  getDepartmentEmployees: (id: string) =>
    api.get(`/departments/${id}/employees`),
  
  updateManager: (id: string, managerId: string) =>
    api.put(`/departments/${id}/manager`, { managerId }),
  
  getDepartmentStats: (id: string) =>
    api.get(`/departments/${id}/stats`),
  
  moveEmployees: (id: string, data: any) =>
    api.put(`/departments/${id}/move-employees`, data),
}

// Attendance API
export const attendanceAPI = {
  checkIn: (data: any) =>
    api.post('/attendance/checkin', data),
  
  checkOut: (data: any) =>
    api.post('/attendance/checkout', data),
  
  getStatus: () =>
    api.get('/attendance/status'),
  
  getAttendance: (params?: any) =>
    api.get('/attendance', { params }),
  
  getEmployeeAttendance: (employeeId: string, params?: any) =>
    api.get(`/attendance/employee/${employeeId}`, { params }),
  
  getAttendanceById: (id: string) =>
    api.get(`/attendance/${id}`),
  
  updateAttendance: (id: string, data: any) =>
    api.put(`/attendance/${id}`, data),
  
  approveAttendance: (id: string) =>
    api.put(`/attendance/${id}/approve`),
  
  getDepartmentAttendance: (departmentId: string, params?: any) =>
    api.get(`/attendance/department/${departmentId}`, { params }),
  
  getAttendanceSummary: (params?: any) =>
    api.get('/attendance/summary', { params }),
}

// Leaves API
export const leavesAPI = {
  getLeaves: (params?: any) =>
    api.get('/leaves', { params }),
  
  getEmployeeLeaves: (employeeId: string, params?: any) =>
    api.get(`/leaves/employee/${employeeId}`, { params }),
  
  getLeave: (id: string) =>
    api.get(`/leaves/${id}`),
  
  createLeave: (data: any) =>
    api.post('/leaves', data),
  
  updateLeave: (id: string, data: any) =>
    api.put(`/leaves/${id}`, data),
  
  approveLeave: (id: string, comments?: string) =>
    api.put(`/leaves/${id}/approve`, { comments }),
  
  rejectLeave: (id: string, reason: string) =>
    api.put(`/leaves/${id}/reject`, { reason }),
  
  cancelLeave: (id: string) =>
    api.put(`/leaves/${id}/cancel`),
  
  getPendingLeaves: () =>
    api.get('/leaves/pending'),
  
  getLeaveBalance: (employeeId: string, params?: any) =>
    api.get(`/leaves/balance/${employeeId}`, { params }),
  
  getDepartmentLeaves: (departmentId: string, params?: any) =>
    api.get(`/leaves/department/${departmentId}`, { params }),
}

// Payroll API
export const payrollAPI = {
  generatePayroll: (employeeId: string, data: any) =>
    api.post(`/payroll/generate/${employeeId}`, data),
  
  generateAllPayrolls: (data: any) =>
    api.post('/payroll/generate-all', data),
  
  getPayrolls: (params?: any) =>
    api.get('/payroll', { params }),
  
  getEmployeePayrolls: (employeeId: string, params?: any) =>
    api.get(`/payroll/employee/${employeeId}`, { params }),
  
  getPayroll: (id: string) =>
    api.get(`/payroll/${id}`),
  
  updatePayroll: (id: string, data: any) =>
    api.put(`/payroll/${id}`, data),
  
  approvePayroll: (id: string) =>
    api.put(`/payroll/${id}/approve`),
  
  markAsPaid: (id: string, data?: any) =>
    api.put(`/payroll/${id}/mark-paid`, data),
  
  getDepartmentPayrolls: (departmentId: string, params?: any) =>
    api.get(`/payroll/department/${departmentId}`, { params }),
  
  getPayrollStats: (params?: any) =>
    api.get('/payroll/stats', { params }),
  
  exportToPDF: (id: string) =>
    api.get(`/payroll/${id}/export/pdf`, { responseType: 'blob' }),
  
  exportToExcel: (params?: any) =>
    api.get('/payroll/export/excel', { 
      params, 
      responseType: 'blob' 
    }),
}

// Reports API
export const reportsAPI = {
  getAttendanceReport: (params?: any) =>
    api.get('/reports/attendance', { params }),
  
  getLeaveReport: (params?: any) =>
    api.get('/reports/leaves', { params }),
  
  getPayrollReport: (params?: any) =>
    api.get('/reports/payroll', { params }),
  
  getEmployeeReport: (params?: any) =>
    api.get('/reports/employees', { params }),
  
  sendWhatsApp: (data: any) =>
    api.post('/reports/send/whatsapp', data),
  
  sendEmail: (data: any) =>
    api.post('/reports/send/email', data),
  
  getDashboardStats: () =>
    api.get('/reports/dashboard'),
}

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: any) =>
    api.get('/notifications', { params }),
  
  getNotification: (id: string) =>
    api.get(`/notifications/${id}`),
  
  createNotification: (data: any) =>
    api.post('/notifications', data),
  
  markAsRead: (notificationIds: string[]) =>
    api.put('/notifications/mark-read', { notificationIds }),
  
  markAllAsRead: () =>
    api.put('/notifications/mark-all-read'),
  
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  
  sendEmail: (id: string) =>
    api.post(`/notifications/${id}/send-email`),
  
  sendWhatsApp: (id: string) =>
    api.post(`/notifications/${id}/send-whatsapp`),
  
  broadcast: (data: any) =>
    api.post('/notifications/broadcast', data),
  
  deleteNotification: (id: string) =>
    api.delete(`/notifications/${id}`),
  
  getStats: (params?: any) =>
    api.get('/notifications/stats', { params }),
}

export default api