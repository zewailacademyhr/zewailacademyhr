# Zewail Academy - نظام إدارة شؤون الموظفين

نظام شامل ومتكامل لإدارة شؤون الموظفين (HRM/CRM) مطور خصيصاً لـ Zewail Academy مع دعم كامل للغة العربية والتصميم المتجاوب.

## 🌟 المميزات الرئيسية

### 🔐 نظام المصادقة والصلاحيات
- تسجيل الدخول والخروج الآمن
- نظام صلاحيات متقدم (Admin, HR, Employee)
- حماية المسارات والموارد
- إدارة الجلسات والرموز المميزة

### 👥 إدارة الموظفين
- إضافة وتعديل وحذف الموظفين
- إدارة البيانات الشخصية والوظيفية
- رفع وإدارة الملفات (عقود، شهادات، بطاقات)
- ربط الموظفين بالأقسام
- إحصائيات مفصلة لكل موظف

### 🏢 إدارة الأقسام
- إنشاء وإدارة أقسام الشركة
- هيكل هرمي للأقسام
- تعيين مدراء الأقسام
- إحصائيات الموظفين لكل قسم
- إدارة الميزانيات والموارد

### ⏰ نظام الحضور والانصراف
- تسجيل الحضور والانصراف بالوقت والتاريخ
- حساب ساعات العمل والتأخير
- رفع صور إثبات الحضور
- إحصائيات مفصلة للحضور
- تقارير الحضور الشهرية والسنوية

### 🏖️ إدارة الإجازات والغياب
- رصيد إجازات شهري (2 يوم لكل موظف)
- طلب إجازة مع نظام الموافقة
- أنواع إجازات متعددة (سنوية، مرضية، طوارئ، إلخ)
- تتبع رصيد الإجازات
- إشعارات الموافقة والرفض

### 💰 نظام الرواتب
- حساب الراتب الشهري التلقائي
- خصم التأخير والإجازات غير المدفوعة
- إضافة حوافز وخصومات
- تصدير كشوف الرواتب PDF/Excel
- تتبع حالة الدفع

### 📊 نظام التقارير
- تقارير يومية وشهرية للحضور والغياب
- تقارير الرواتب والإجازات
- إرسال التقارير عبر:
  - **الواتساب** (باستخدام Twilio API)
  - **الإيميل** (SMTP)
- تصدير التقارير بصيغ متعددة

### 🔔 نظام الإشعارات
- إشعارات فورية للموظفين
- تنبيهات الموافقة على الإجازات
- إشعارات إصدار الرواتب
- إرسال إشعارات عبر الواتساب والإيميل
- لوحة إشعارات تفاعلية

### 🌐 الدعم متعدد اللغات
- اللغة العربية (افتراضية) مع دعم RTL
- خيار التحويل للإنجليزية
- واجهة مستخدم محلية بالكامل

### 📱 التصميم المتجاوب
- تصميم متجاوب لجميع الأجهزة
- واجهة مستخدم حديثة باستخدام TailwindCSS
- تجربة مستخدم محسنة
- دعم الوضع المظلم

## 🛠️ التقنيات المستخدمة

### Frontend
- **Next.js 14** - إطار عمل React
- **TypeScript** - لغة البرمجة
- **TailwindCSS** - تصميم الواجهة
- **React Query** - إدارة الحالة والبيانات
- **React Hook Form** - إدارة النماذج
- **Framer Motion** - الرسوم المتحركة

### Backend
- **Node.js** - بيئة التشغيل
- **Express.js** - إطار عمل الخادم
- **MongoDB** - قاعدة البيانات
- **Mongoose** - ODM لـ MongoDB
- **JWT** - المصادقة
- **bcryptjs** - تشفير كلمات المرور

### خدمات خارجية
- **Twilio** - إرسال رسائل الواتساب
- **Nodemailer** - إرسال الإيميلات
- **Multer** - رفع الملفات
- **PDFKit** - إنشاء ملفات PDF
- **XLSX** - إنشاء ملفات Excel

## 📋 متطلبات النظام

- Node.js 18+ 
- MongoDB 6+
- npm أو yarn

## 🚀 التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone <repository-url>
cd zewail-academy-hrm
```

### 2. تثبيت التبعيات
```bash
# تثبيت تبعيات المشروع الرئيسي
npm install

# تثبيت تبعيات العميل
cd client && npm install

# تثبيت تبعيات الخادم
cd ../server && npm install
```

### 3. إعداد متغيرات البيئة

#### الخادم (`server/.env`)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/zewail_academy_hrm

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# WhatsApp API (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Currency
DEFAULT_CURRENCY=EGP
DEFAULT_CURRENCY_SYMBOL=ج.م

# Leave Balance
DEFAULT_MONTHLY_LEAVE_DAYS=2
```

#### العميل (`client/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. تشغيل قاعدة البيانات
```bash
# تشغيل MongoDB محلياً
mongod
```

### 5. تشغيل المشروع
```bash
# من المجلد الجذر - تشغيل العميل والخادم معاً
npm run dev

# أو تشغيل كل منهما منفصل
npm run client  # العميل على المنفذ 3000
npm run server  # الخادم على المنفذ 5000
```

## 📁 هيكل المشروع

```
zewail-academy-hrm/
├── client/                 # تطبيق Next.js (Frontend)
│   ├── app/               # صفحات التطبيق
│   ├── components/        # مكونات React
│   ├── hooks/            # React Hooks مخصصة
│   ├── lib/              # مكتبات مساعدة
│   └── styles/           # ملفات CSS
├── server/               # تطبيق Express.js (Backend)
│   ├── models/           # نماذج MongoDB
│   ├── routes/           # مسارات API
│   ├── middleware/       # وسائط Express
│   └── uploads/          # ملفات مرفوعة
├── package.json          # تبعيات المشروع الرئيسي
└── README.md            # هذا الملف
```

## 🔧 API Endpoints

### المصادقة
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `GET /api/auth/me` - الحصول على المستخدم الحالي
- `PUT /api/auth/profile` - تحديث الملف الشخصي

### الموظفين
- `GET /api/employees` - قائمة الموظفين
- `POST /api/employees` - إضافة موظف جديد
- `GET /api/employees/:id` - بيانات موظف
- `PUT /api/employees/:id` - تحديث موظف

### الأقسام
- `GET /api/departments` - قائمة الأقسام
- `POST /api/departments` - إضافة قسم جديد
- `GET /api/departments/:id` - بيانات قسم

### الحضور والانصراف
- `POST /api/attendance/checkin` - تسجيل الحضور
- `POST /api/attendance/checkout` - تسجيل الانصراف
- `GET /api/attendance` - سجلات الحضور

### الإجازات
- `GET /api/leaves` - قائمة الإجازات
- `POST /api/leaves` - طلب إجازة جديد
- `PUT /api/leaves/:id/approve` - الموافقة على إجازة
- `PUT /api/leaves/:id/reject` - رفض إجازة

### الرواتب
- `GET /api/payroll` - قائمة كشوف الرواتب
- `POST /api/payroll/generate/:employeeId` - إنشاء كشف راتب
- `GET /api/payroll/:id/export/pdf` - تصدير PDF

### التقارير
- `GET /api/reports/attendance` - تقرير الحضور
- `GET /api/reports/leaves` - تقرير الإجازات
- `GET /api/reports/payroll` - تقرير الرواتب

### الإشعارات
- `GET /api/notifications` - قائمة الإشعارات
- `POST /api/notifications` - إنشاء إشعار
- `PUT /api/notifications/mark-read` - تحديد كمقروء

## 👥 أدوار المستخدمين

### Admin (المدير)
- إدارة كاملة للنظام
- إضافة وتعديل وحذف الموظفين
- إدارة الأقسام والميزانيات
- الموافقة على جميع الطلبات
- الوصول لجميع التقارير

### HR (الموارد البشرية)
- إدارة الموظفين
- الموافقة على الإجازات
- إنشاء وإدارة كشوف الرواتب
- الوصول للتقارير
- إرسال الإشعارات

### Employee (الموظف)
- عرض ملفه الشخصي
- تسجيل الحضور والانصراف
- طلب إجازات
- عرض كشوف الرواتب
- استقبال الإشعارات

## 🔒 الأمان

- تشفير كلمات المرور باستخدام bcrypt
- حماية JWT tokens
- التحقق من الصلاحيات على مستوى API
- حماية من CSRF attacks
- التحقق من صحة البيانات المدخلة
- Rate limiting للحماية من الهجمات

## 📊 قاعدة البيانات

### المجموعات الرئيسية
- **Users** - بيانات الموظفين والمستخدمين
- **Departments** - بيانات الأقسام
- **Attendance** - سجلات الحضور والانصراف
- **Leaves** - طلبات الإجازات
- **Payroll** - كشوف الرواتب
- **Notifications** - الإشعارات
- **FileUploads** - الملفات المرفوعة

## 🚀 النشر

### تطوير
```bash
npm run dev
```

### إنتاج
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up -d
```

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء فرع للميزة الجديدة
3. Commit التغييرات
4. Push للفرع
5. فتح Pull Request

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

للحصول على الدعم أو الإبلاغ عن مشاكل:
- إنشاء Issue في GitHub
- التواصل عبر البريد الإلكتروني

## 🎯 الميزات المستقبلية

- [ ] تطبيق جوال (React Native)
- [ ] نظام التوقيع الإلكتروني
- [ ] تكامل مع أنظمة المحاسبة
- [ ] نظام إدارة المشاريع
- [ ] تحليلات متقدمة وذكاء اصطناعي
- [ ] نظام إدارة التدريب والتطوير

---

**تم تطوير هذا المشروع بـ ❤️ لـ Zewail Academy**