'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Calendar, DollarSign, BarChart3, Shield } from 'lucide-react';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 ml-3" />
              <h1 className="text-2xl font-bold text-gray-900">Zewail Academy</h1>
            </div>
            <div className="flex space-x-4 space-x-reverse">
              <Link
                href="/login"
                className="btn-primary"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            نظام إدارة شؤون الموظفين
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            نظام متكامل لإدارة الموظفين، الحضور، الإجازات، الرواتب والتقارير
            مع دعم كامل للغة العربية
          </p>
          <div className="flex justify-center space-x-4 space-x-reverse">
            <Link
              href="/login"
              className="btn-primary text-lg px-8 py-3"
            >
              ابدأ الآن
            </Link>
            <Link
              href="#features"
              className="btn-secondary text-lg px-8 py-3"
            >
              تعرف على المميزات
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            المميزات الرئيسية
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6 text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                إدارة الموظفين
              </h3>
              <p className="text-gray-600">
                إضافة وتعديل بيانات الموظفين مع رفع الملفات المطلوبة
              </p>
            </div>

            <div className="card p-6 text-center">
              <Calendar className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                الحضور والانصراف
              </h3>
              <p className="text-gray-600">
                تسجيل الحضور والانصراف مع حساب ساعات العمل والتأخير
              </p>
            </div>

            <div className="card p-6 text-center">
              <DollarSign className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                إدارة الرواتب
              </h3>
              <p className="text-gray-600">
                حساب الرواتب الشهرية مع الخصومات والحوافز
              </p>
            </div>

            <div className="card p-6 text-center">
              <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                التقارير والإحصائيات
              </h3>
              <p className="text-gray-600">
                تقارير مفصلة للحضور والغياب والرواتب مع إمكانية التصدير
              </p>
            </div>

            <div className="card p-6 text-center">
              <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                نظام الصلاحيات
              </h3>
              <p className="text-gray-600">
                صلاحيات متدرجة للمدير وموظف الموارد البشرية والموظفين
              </p>
            </div>

            <div className="card p-6 text-center">
              <Building2 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                إدارة الأقسام
              </h3>
              <p className="text-gray-600">
                تنظيم الموظفين في أقسام مختلفة مع تحديد المدراء
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-blue-400 ml-2" />
              <span className="text-lg font-semibold">Zewail Academy</span>
            </div>
            <p className="text-gray-400">
              © 2024 Zewail Academy. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}