document.addEventListener('DOMContentLoaded', function() {
    // بيانات الموظفين
    let employees = JSON.parse(localStorage.getItem('employees')) || [
        { id: 1, name: 'أحمد محمد', department: 'تكنولوجيا المعلومات', shift: 'صباحي' },
        { id: 2, name: 'سارة أحمد', department: 'الموارد البشرية', shift: 'مسائي' },
        { id: 3, name: 'محمد علي', department: 'المحاسبة', shift: 'صباحي' }
    ];

    // ساعات العمل
    const shifts = {
        'صباحي': { start: '08:00', end: '16:00' },
        'مسائي': { start: '16:00', end: '00:00' }
    };

    // تحديث قائمة الموظفين في النموذج
    function updateEmployeesList() {
        const employeeSelect = document.getElementById('employeeSelect');
        employeeSelect.innerHTML = '<option value="">اختر الموظف...</option>';
        employees.forEach(emp => {
            employeeSelect.innerHTML += `<option value="${emp.id}">${emp.name} - ${emp.department}</option>`;
        });
    }

    // تحديث جدول الموظفين
    function updateEmployeesTable() {
        const tbody = document.querySelector('#employeesTable tbody');
        tbody.innerHTML = '';
        employees.forEach(emp => {
            tbody.innerHTML += `
                <tr>
                    <td>${emp.id}</td>
                    <td>${emp.name}</td>
                    <td>${emp.department}</td>
                    <td>${emp.shift}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editEmployee(${emp.id})">تعديل</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">حذف</button>
                    </td>
                </tr>`;
        });
    }

    // إضافة موظف جديد
    window.addEmployee = function() {
        const name = document.getElementById('newEmployeeName').value;
        const department = document.getElementById('newEmployeeDepartment').value;
        const shift = document.getElementById('newEmployeeShift').value;

        if (!name || !department || !shift) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const newEmployee = {
            id: employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1,
            name,
            department,
            shift
        };

        employees.push(newEmployee);
        localStorage.setItem('employees', JSON.stringify(employees));
        updateEmployeesList();
        updateEmployeesTable();
        document.getElementById('addEmployeeForm').reset();
        $('#addEmployeeModal').modal('hide');
    };

    // تعديل موظف
    window.editEmployee = function(id) {
        const employee = employees.find(e => e.id === id);
        if (employee) {
            document.getElementById('editEmployeeId').value = employee.id;
            document.getElementById('editEmployeeName').value = employee.name;
            document.getElementById('editEmployeeDepartment').value = employee.department;
            document.getElementById('editEmployeeShift').value = employee.shift;
            $('#editEmployeeModal').modal('show');
        }
    };

    // حفظ تعديلات الموظف
    window.saveEmployeeEdit = function() {
        const id = parseInt(document.getElementById('editEmployeeId').value);
        const name = document.getElementById('editEmployeeName').value;
        const department = document.getElementById('editEmployeeDepartment').value;
        const shift = document.getElementById('editEmployeeShift').value;

        if (!name || !department || !shift) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const index = employees.findIndex(e => e.id === id);
        if (index !== -1) {
            employees[index] = { id, name, department, shift };
            localStorage.setItem('employees', JSON.stringify(employees));
            updateEmployeesList();
            updateEmployeesTable();
            $('#editEmployeeModal').modal('hide');
        }
    };

    // حذف موظف
    window.deleteEmployee = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
            employees = employees.filter(e => e.id !== id);
            localStorage.setItem('employees', JSON.stringify(employees));
            updateEmployeesList();
            updateEmployeesTable();
        }
    };

    // حساب التأخير والوقت الإضافي
    function calculateTimes(checkIn, checkOut, shift) {
        const shiftTimes = shifts[shift];
        const checkInTime = new Date(`2000-01-01 ${checkIn}`);
        const checkOutTime = new Date(`2000-01-01 ${checkOut}`);
        const shiftStartTime = new Date(`2000-01-01 ${shiftTimes.start}`);
        const shiftEndTime = new Date(`2000-01-01 ${shiftTimes.end}`);

        let late = 0;
        let overtime = 0;

        if (checkInTime > shiftStartTime) {
            late = Math.round((checkInTime - shiftStartTime) / (1000 * 60));
        }

        if (checkOutTime > shiftEndTime) {
            overtime = Math.round((checkOutTime - shiftEndTime) / (1000 * 60));
        }

        return { late, overtime };
    }

    // تسجيل الحضور
    document.getElementById('attendanceForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const employeeId = document.getElementById('employeeSelect').value;
        const date = document.getElementById('date').value;
        const checkIn = document.getElementById('checkIn').value;
        const checkOut = document.getElementById('checkOut').value;

        if (!employeeId || !date || !checkIn || !checkOut) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        const employee = employees.find(e => e.id === parseInt(employeeId));
        const { late, overtime } = calculateTimes(checkIn, checkOut, employee.shift);

        const attendance = {
            employeeId: parseInt(employeeId),
            employeeName: employee.name,
            department: employee.department,
            date,
            checkIn,
            checkOut,
            late,
            overtime
        };

        // حفظ بيانات الحضور
        let attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
        attendanceRecords.push(attendance);
        localStorage.setItem('attendance', JSON.stringify(attendanceRecords));

        // تحديث التقرير
        updateDailyReport();
        this.reset();
        alert('تم تسجيل الحضور بنجاح');
    });

    // تحديث التقرير اليومي
    function updateDailyReport() {
        const attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
        const tbody = document.querySelector('#dailyReportTable tbody');
        tbody.innerHTML = '';

        attendanceRecords.forEach(record => {
            tbody.innerHTML += `
                <tr>
                    <td>${record.employeeName}</td>
                    <td>${record.department}</td>
                    <td>${record.date}</td>
                    <td>${record.checkIn}</td>
                    <td>${record.checkOut}</td>
                    <td>${record.late} دقيقة</td>
                    <td>${record.overtime} دقيقة</td>
                </tr>`;
        });
    }

    // إنشاء التقرير الشهري
    window.generateMonthlyReport = function() {
        const month = document.getElementById('monthSelect').value;
        const attendanceRecords = JSON.parse(localStorage.getItem('attendance')) || [];
        const monthlyRecords = attendanceRecords.filter(record => record.date.startsWith(month));

        const summaryByEmployee = {};
        monthlyRecords.forEach(record => {
            if (!summaryByEmployee[record.employeeId]) {
                summaryByEmployee[record.employeeId] = {
                    name: record.employeeName,
                    department: record.department,
                    totalDays: 0,
                    totalLate: 0,
                    totalOvertime: 0
                };
            }
            summaryByEmployee[record.employeeId].totalDays++;
            summaryByEmployee[record.employeeId].totalLate += record.late;
            summaryByEmployee[record.employeeId].totalOvertime += record.overtime;
        });

        const tbody = document.querySelector('#monthlyReportTable tbody');
        tbody.innerHTML = '';

        Object.values(summaryByEmployee).forEach(summary => {
            tbody.innerHTML += `
                <tr>
                    <td>${summary.name}</td>
                    <td>${summary.department}</td>
                    <td>${summary.totalDays}</td>
                    <td>${summary.totalLate} دقيقة</td>
                    <td>${summary.totalOvertime} دقيقة</td>
                </tr>`;
        });
    };

    // طباعة التقرير
    window.printReport = function() {
        window.print();
    };

    // تهيئة التطبيق
    updateEmployeesList();
    updateEmployeesTable();
    updateDailyReport();

    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
});