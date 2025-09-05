# 🚀 دليل البدء السريع - Zewail Academy HRM

## البدء السريع في 5 دقائق

### 1. المتطلبات الأساسية
- Node.js 18+ 
- MongoDB 6+
- Git

### 2. التثبيت والتشغيل

```bash
# استنساخ المشروع
git clone <repository-url>
cd zewail-academy-hrm

# تشغيل سكريبت البدء السريع
./start.sh
```

### 3. الوصول للنظام

**الواجهة الأمامية:** http://localhost:3000  
**API الخادم:** http://localhost:5000

### 4. بيانات الدخول الافتراضية

**مدير النظام:**
- البريد الإلكتروني: `admin@zewail.academy`
- كلمة المرور: `admin123`

### 5. الميزات الرئيسية

✅ **نظام مصادقة آمن** - تسجيل دخول/خروج مع صلاحيات متقدمة  
✅ **إدارة الموظفين** - إضافة، تعديل، حذف مع رفع الملفات  
✅ **الحضور والانصراف** - تسجيل تلقائي مع إحصائيات  
✅ **إدارة الإجازات** - طلب وموافقة مع رصيد شهري  
✅ **نظام الرواتب** - حساب تلقائي مع تصدير PDF/Excel  
✅ **التقارير** - تقارير شاملة مع إرسال واتساب/إيميل  
✅ **الإشعارات** - تنبيهات فورية عبر قنوات متعددة  
✅ **دعم عربي كامل** - واجهة RTL مع تخصيص محلي  

### 6. الأدوار المتاحة

**Admin (المدير)**
- إدارة كاملة للنظام
- إضافة/تعديل/حذف الموظفين والأقسام
- الموافقة على جميع الطلبات
- الوصول لجميع التقارير

**HR (الموارد البشرية)**
- إدارة الموظفين
- الموافقة على الإجازات
- إنشاء كشوف الرواتب
- إرسال الإشعارات

**Employee (الموظف)**
- عرض ملفه الشخصي
- تسجيل الحضور/الانصراف
- طلب إجازات
- عرض كشوف الرواتب

### 7. إعداد متغيرات البيئة

**الخادم (`server/.env`):**
```env
MONGODB_URI=mongodb://localhost:27017/zewail_academy_hrm
JWT_SECRET=your_super_secret_jwt_key_here
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

**العميل (`client/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 8. تشغيل باستخدام Docker

```bash
# تشغيل جميع الخدمات
docker-compose up -d

# عرض الحالة
docker-compose ps

# إيقاف الخدمات
docker-compose down
```

### 9. نصائح للتطوير

- استخدم `npm run dev` لتشغيل وضع التطوير
- استخدم `npm run build` لبناء الإنتاج
- تحقق من ملفات السجلات في `server/logs/`
- استخدم MongoDB Compass لمراقبة قاعدة البيانات

### 10. استكشاف الأخطاء

**مشكلة في الاتصال بقاعدة البيانات:**
```bash
# تحقق من حالة MongoDB
sudo systemctl status mongod

# تشغيل MongoDB يدوياً
mongod --fork --logpath /tmp/mongod.log
```

**مشكلة في المنافذ:**
```bash
# تحقق من المنافذ المستخدمة
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000
```

**مشكلة في التبعيات:**
```bash
# حذف node_modules وإعادة التثبيت
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
rm -rf server/node_modules server/package-lock.json
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 11. الأمان والإنتاج

- غير كلمة مرور المدير الافتراضية
- استخدم HTTPS في الإنتاج
- فعّل جدار الحماية
- احتفظ بنسخ احتياطية منتظمة
- راجع سجلات النظام بانتظام

### 12. الدعم والمساعدة

- راجع ملف README.md للتفاصيل الكاملة
- تحقق من Issues في GitHub
- تواصل مع فريق التطوير

---

**🎉 تهانينا! نظام Zewail Academy HRM جاهز للاستخدام**