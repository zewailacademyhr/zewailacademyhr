# Zewail Academy - نظام إدارة شؤون الموظفين

نظام متكامل لإدارة شؤون الموظفين (HRM/CRM) مصمم خصيصاً لأكاديمية زويل مع دعم كامل للغة العربية (RTL).

## المميزات الرئيسية

### 🔐 نظام المصادقة والصلاحيات
- تسجيل الدخول والخروج الآمن
- صلاحيات متدرجة (Admin, HR, Employee)
- حماية API endpoints
- إدارة الجلسات

### 👥 إدارة الموظفين
- إضافة وتعديل وحذف الموظفين
- رفع الملفات المطلوبة (عقد، شهادة، بطاقة)
- تحديد القسم والراتب الأساسي
- إدارة الحالة الوظيفية
- بيانات الطوارئ

### ⏰ الحضور والانصراف
- تسجيل الحضور والانصراف بالوقت والتاريخ
- حساب ساعات العمل والتأخير
- حساب ساعات العمل الإضافي
- تقارير الحضور التفصيلية

### 🏖️ الإجازات والغياب
- رصيد إجازات شهري (2 يوم لكل موظف)
- طلب إجازة مع نظام الموافقة
- أنواع إجازات متعددة (سنوية، مرضية، طارئة)
- خصم تلقائي من الرصيد

### 💰 الرواتب والحسابات
- حساب الراتب الشهري التلقائي
- خصم التأخير والإجازات
- إضافة حوافز وخصومات
- تصدير كشوف الرواتب PDF/Excel

### 📊 التقارير والإحصائيات
- تقارير يومية/شهرية للحضور والغياب
- تقارير الرواتب المفصلة
- إحصائيات شاملة
- تصدير PDF و Excel

### 📱 الإشعارات
- إرسال إيميلات تلقائية
- إشعارات واتساب
- إشعارات للموظفين عند:
  - قبول/رفض الإجازة
  - إصدار الراتب
  - تذكير بتسجيل الحضور

### 🏢 إدارة الأقسام
- إضافة وتعديل وحذف أقسام الشركة
- ربط الموظفين بالأقسام
- تحديد مدراء الأقسام

### 🌐 دعم متعدد اللغات
- واجهة عربية كاملة (RTL)
- إمكانية إضافة الإنجليزية لاحقاً
- تنسيق التاريخ والوقت بالعربية

## التقنيات المستخدمة

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling

### Backend
- **Next.js API Routes** - Serverless functions
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### External Services
- **Nodemailer** - Email sending
- **Twilio** - WhatsApp notifications
- **jsPDF** - PDF generation
- **XLSX** - Excel export

## التثبيت والتشغيل

### المتطلبات
- Node.js 18+ 
- MongoDB
- npm أو yarn

### خطوات التثبيت

1. **استنساخ المشروع**
```bash
git clone <repository-url>
cd zewail-academy-hrm
```

2. **تثبيت التبعيات**
```bash
npm install
```

3. **إعداد متغيرات البيئة**
```bash
cp .env.local.example .env.local
```

قم بتعديل ملف `.env.local`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/zewail-academy-hrm

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WhatsApp Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

4. **تشغيل قاعدة البيانات**
```bash
# تأكد من تشغيل MongoDB
mongod
```

5. **تشغيل المشروع**
```bash
npm run dev
```

6. **فتح المتصفح**
```
http://localhost:3000
```

## هيكل المشروع

```
zewail-academy-hrm/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication APIs
│   │   ├── employees/     # Employee management
│   │   ├── attendance/    # Attendance tracking
│   │   ├── leaves/        # Leave management
│   │   ├── salaries/      # Salary calculation
│   │   ├── departments/   # Department management
│   │   ├── reports/       # Report generation
│   │   └── notifications/ # Notification system
│   ├── dashboard/         # Dashboard page
│   ├── employees/         # Employee pages
│   ├── attendance/        # Attendance pages
│   ├── leaves/           # Leave pages
│   ├── salaries/         # Salary pages
│   ├── reports/          # Report pages
│   ├── notifications/    # Notification pages
│   ├── login/            # Login page
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── lib/                   # Utility libraries
│   ├── models/           # Database models
│   ├── auth.ts           # Authentication utilities
│   ├── mongodb.ts        # Database connection
│   ├── reports.ts        # Report generation
│   └── notifications.ts  # Notification system
├── public/               # Static assets
└── README.md            # Project documentation
```

## نماذج البيانات

### User (المستخدم)
- معلومات الدخول (email, password)
- الصلاحيات (role)
- البيانات الشخصية (firstName, lastName, phone)
- حالة الحساب (isActive)

### Employee (الموظف)
- ربط بالمستخدم
- رقم الموظف
- القسم والمنصب
- الراتب الأساسي
- البيانات الشخصية (الرقم القومي، العنوان)
- جهة الاتصال في الطوارئ
- رصيد الإجازات

### Department (القسم)
- اسم القسم (عربي وإنجليزي)
- وصف القسم
- مدير القسم
- حالة النشاط

### Attendance (الحضور)
- الموظف والتاريخ
- وقت الحضور والانصراف
- ساعات العمل
- حالة الحضور (حاضر، متأخر، غائب)
- دقائق التأخير

### Leave (الإجازة)
- الموظف ونوع الإجازة
- تاريخ البداية والنهاية
- عدد الأيام
- سبب الإجازة
- حالة الطلب (معلق، مقبول، مرفوض)

### Salary (الراتب)
- الموظف والشهر والسنة
- الراتب الأساسي
- البدلات (سكن، مواصلات، طبي)
- الخصومات (تأخير، إجازة، ضريبة، تأمين)
- الحوافز (أداء، عمل إضافي)
- صافي الراتب

## API Endpoints

### Authentication
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/me` - معلومات المستخدم الحالي

### Employees
- `GET /api/employees` - قائمة الموظفين
- `POST /api/employees` - إضافة موظف جديد
- `GET /api/employees/[id]` - تفاصيل موظف
- `PUT /api/employees/[id]` - تحديث موظف
- `DELETE /api/employees/[id]` - حذف موظف

### Attendance
- `GET /api/attendance` - سجلات الحضور
- `POST /api/attendance` - تسجيل حضور/انصراف

### Leaves
- `GET /api/leaves` - طلبات الإجازات
- `POST /api/leaves` - طلب إجازة جديد
- `PUT /api/leaves/[id]` - قبول/رفض طلب إجازة
- `DELETE /api/leaves/[id]` - إلغاء طلب إجازة

### Salaries
- `GET /api/salaries` - كشوف الرواتب
- `POST /api/salaries` - حساب راتب جديد
- `GET /api/salaries/[id]` - تفاصيل كشف الراتب
- `PUT /api/salaries/[id]` - تحديث كشف الراتب

### Reports
- `GET /api/reports/attendance` - تقرير الحضور
- `GET /api/reports/leaves` - تقرير الإجازات
- `GET /api/reports/salaries` - تقرير الرواتب

### Notifications
- `POST /api/notifications/send` - إرسال إشعار

## الأمان

- تشفير كلمات المرور باستخدام bcrypt
- حماية API endpoints بالصلاحيات
- JWT tokens للجلسات
- التحقق من صحة البيانات
- حماية من SQL injection
- HTTPS في الإنتاج

## الأداء

- Server-side rendering مع Next.js
- تحسين الصور التلقائي
- Code splitting
- Caching للبيانات
- Pagination للقوائم الطويلة
- Lazy loading للمكونات

## الاختبار

```bash
# تشغيل الاختبارات
npm run test

# تشغيل الاختبارات مع التغطية
npm run test:coverage

# اختبار E2E
npm run test:e2e
```

## النشر

### Vercel (مستحسن)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t zewail-academy-hrm .
docker run -p 3000:3000 zewail-academy-hrm
```

## المساهمة

1. Fork المشروع
2. إنشاء branch للميزة الجديدة
3. Commit التغييرات
4. Push إلى Branch
5. إنشاء Pull Request

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## الدعم

للحصول على الدعم أو الإبلاغ عن مشاكل:
- إنشاء Issue في GitHub
- التواصل عبر البريد الإلكتروني
- مراجعة الوثائق

## التحديثات المستقبلية

- [ ] تطبيق جوال (React Native)
- [ ] نظام إدارة المهام
- [ ] تقويم الأحداث
- [ ] نظام التقييمات
- [ ] تكامل مع أنظمة خارجية
- [ ] تحليلات متقدمة
- [ ] دعم لغات إضافية

---

**تم تطويره بواسطة فريق Zewail Academy** 🎓