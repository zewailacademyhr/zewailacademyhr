import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ReportData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: {
    label: string;
    value: string | number;
  }[];
}

export function generatePDF(data: ReportData, filename: string = 'report.pdf') {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  // Add title
  doc.setFontSize(16);
  doc.text(data.title, 14, 22);
  
  // Add company header
  doc.setFontSize(12);
  doc.text('Zewail Academy - أكاديمية زويل', 14, 35);
  doc.text('نظام إدارة شؤون الموظفين', 14, 42);
  
  // Add date
  const currentDate = new Date().toLocaleDateString('ar-EG');
  doc.text(`تاريخ التقرير: ${currentDate}`, 14, 49);
  
  // Generate table
  doc.autoTable({
    startY: 60,
    head: [data.headers],
    body: data.rows,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Light gray
    },
    margin: { top: 60 },
  });

  // Add summary if provided
  if (data.summary && data.summary.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text('ملخص التقرير:', 14, finalY);
    
    data.summary.forEach((item, index) => {
      doc.text(`${item.label}: ${item.value}`, 14, finalY + 10 + (index * 7));
    });
  }

  // Save the PDF
  doc.save(filename);
}

export function generateExcel(data: ReportData, filename: string = 'report.xlsx') {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = [
    [data.title],
    ['Zewail Academy - أكاديمية زويل'],
    ['نظام إدارة شؤون الموظفين'],
    [`تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`],
    [''], // Empty row
    data.headers,
    ...data.rows,
  ];

  // Add summary if provided
  if (data.summary && data.summary.length > 0) {
    excelData.push(['']); // Empty row
    excelData.push(['ملخص التقرير:']);
    data.summary.forEach(item => {
      excelData.push([`${item.label}: ${item.value}`]);
    });
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  
  // Set column widths
  const colWidths = data.headers.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
  
  // Save the file
  XLSX.writeFile(wb, filename);
}

export function generateAttendanceReport(attendance: any[]): ReportData {
  const headers = [
    'اسم الموظف',
    'رقم الموظف',
    'القسم',
    'التاريخ',
    'وقت الحضور',
    'وقت الانصراف',
    'ساعات العمل',
    'الحالة',
    'التأخير (دقيقة)',
  ];

  const rows = attendance.map(record => [
    `${record.employee.user.profile.firstName} ${record.employee.user.profile.lastName}`,
    record.employee.employeeId,
    record.employee.department.name,
    new Date(record.date).toLocaleDateString('ar-EG'),
    record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG') : '-',
    record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG') : '-',
    `${record.workingHours.toFixed(1)} ساعة`,
    getStatusText(record.status),
    record.lateMinutes || 0,
  ]);

  const summary = [
    { label: 'إجمالي السجلات', value: attendance.length },
    { label: 'إجمالي ساعات العمل', value: attendance.reduce((sum, record) => sum + record.workingHours, 0).toFixed(1) + ' ساعة' },
    { label: 'متوسط ساعات العمل اليومية', value: (attendance.reduce((sum, record) => sum + record.workingHours, 0) / attendance.length).toFixed(1) + ' ساعة' },
  ];

  return {
    title: 'تقرير الحضور والانصراف',
    headers,
    rows,
    summary,
  };
}

export function generateLeaveReport(leaves: any[]): ReportData {
  const headers = [
    'اسم الموظف',
    'رقم الموظف',
    'القسم',
    'نوع الإجازة',
    'من تاريخ',
    'إلى تاريخ',
    'عدد الأيام',
    'السبب',
    'الحالة',
    'تاريخ الطلب',
  ];

  const rows = leaves.map(leave => [
    `${leave.employee.user.profile.firstName} ${leave.employee.user.profile.lastName}`,
    leave.employee.employeeId,
    leave.employee.department.name,
    getLeaveTypeText(leave.type),
    new Date(leave.startDate).toLocaleDateString('ar-EG'),
    new Date(leave.endDate).toLocaleDateString('ar-EG'),
    `${leave.days} يوم`,
    leave.reason,
    getLeaveStatusText(leave.status),
    new Date(leave.createdAt).toLocaleDateString('ar-EG'),
  ]);

  const summary = [
    { label: 'إجمالي الطلبات', value: leaves.length },
    { label: 'الطلبات المعلقة', value: leaves.filter(l => l.status === 'pending').length },
    { label: 'الطلبات المقبولة', value: leaves.filter(l => l.status === 'approved').length },
    { label: 'الطلبات المرفوضة', value: leaves.filter(l => l.status === 'rejected').length },
    { label: 'إجمالي أيام الإجازة', value: leaves.reduce((sum, leave) => sum + leave.days, 0) + ' يوم' },
  ];

  return {
    title: 'تقرير الإجازات',
    headers,
    rows,
    summary,
  };
}

export function generateSalaryReport(salaries: any[]): ReportData {
  const headers = [
    'اسم الموظف',
    'رقم الموظف',
    'القسم',
    'الشهر',
    'الراتب الأساسي',
    'إجمالي البدلات',
    'إجمالي الخصومات',
    'صافي الراتب',
    'الحالة',
  ];

  const rows = salaries.map(salary => [
    `${salary.employee.user.profile.firstName} ${salary.employee.user.profile.lastName}`,
    salary.employee.employeeId,
    salary.employee.department.name,
    `${getMonthName(salary.month)} ${salary.year}`,
    `${salary.basicSalary.toLocaleString()} ج.م`,
    `${Object.values(salary.allowances).reduce((sum: number, val: number) => sum + val, 0).toLocaleString()} ج.م`,
    `${Object.values(salary.deductions).reduce((sum: number, val: number) => sum + val, 0).toLocaleString()} ج.م`,
    `${salary.netSalary.toLocaleString()} ج.م`,
    getSalaryStatusText(salary.status),
  ]);

  const totalBasicSalary = salaries.reduce((sum, salary) => sum + salary.basicSalary, 0);
  const totalNetSalary = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);
  const totalAllowances = salaries.reduce((sum, salary) => 
    sum + Object.values(salary.allowances).reduce((s: number, val: number) => s + val, 0), 0);
  const totalDeductions = salaries.reduce((sum, salary) => 
    sum + Object.values(salary.deductions).reduce((s: number, val: number) => s + val, 0), 0);

  const summary = [
    { label: 'إجمالي كشوف الرواتب', value: salaries.length },
    { label: 'إجمالي الرواتب الأساسية', value: `${totalBasicSalary.toLocaleString()} ج.م` },
    { label: 'إجمالي البدلات', value: `${totalAllowances.toLocaleString()} ج.م` },
    { label: 'إجمالي الخصومات', value: `${totalDeductions.toLocaleString()} ج.م` },
    { label: 'إجمالي صافي الرواتب', value: `${totalNetSalary.toLocaleString()} ج.م` },
  ];

  return {
    title: 'تقرير الرواتب',
    headers,
    rows,
    summary,
  };
}

// Helper functions
function getStatusText(status: string): string {
  switch (status) {
    case 'present': return 'حاضر';
    case 'late': return 'متأخر';
    case 'absent': return 'غائب';
    case 'half-day': return 'نصف يوم';
    default: return 'غير محدد';
  }
}

function getLeaveTypeText(type: string): string {
  switch (type) {
    case 'annual': return 'سنوية';
    case 'sick': return 'مرضية';
    case 'emergency': return 'طارئة';
    case 'unpaid': return 'بدون راتب';
    default: return 'غير محدد';
  }
}

function getLeaveStatusText(status: string): string {
  switch (status) {
    case 'approved': return 'مقبول';
    case 'rejected': return 'مرفوض';
    case 'pending': return 'معلق';
    case 'cancelled': return 'ملغي';
    default: return 'غير محدد';
  }
}

function getSalaryStatusText(status: string): string {
  switch (status) {
    case 'draft': return 'مسودة';
    case 'approved': return 'معتمد';
    case 'paid': return 'مدفوع';
    default: return 'غير محدد';
  }
}

function getMonthName(month: number): string {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[month - 1];
}