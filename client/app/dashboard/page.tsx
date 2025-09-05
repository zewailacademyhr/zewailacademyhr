'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from 'react-query'
import { reportsAPI } from '@/lib/api'
import Layout from '@/components/layout/Layout'
import DashboardCard from '@/components/dashboard/DashboardCard'
import RecentActivities from '@/components/dashboard/RecentActivities'
import AttendanceChart from '@/components/dashboard/AttendanceChart'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    () => reportsAPI.getDashboardStats(),
    {
      select: (response) => response.data.data,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    }
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || statsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    )
  }

  if (!user) {
    return null
  }

  const stats = dashboardData?.overview || {}
  const departments = dashboardData?.departments || []
  const recentLeaves = dashboardData?.recentLeaves || []
  const recentNotifications = dashboardData?.recentNotifications || []

  const cards = [
    {
      title: 'إجمالي الموظفين',
      value: stats.totalEmployees || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      color: 'blue',
      change: stats.newHiresThisMonth || 0,
      changeLabel: 'موظف جديد هذا الشهر'
    },
    {
      title: 'الحضور اليوم',
      value: stats.todayPresent || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'green',
      change: stats.todayAbsent || 0,
      changeLabel: 'غياب اليوم'
    },
    {
      title: 'طلبات الإجازة المعلقة',
      value: stats.pendingLeaves || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'yellow',
      change: stats.approvedLeavesThisMonth || 0,
      changeLabel: 'إجازة معتمدة هذا الشهر'
    },
    {
      title: 'كشوف الرواتب المعلقة',
      value: stats.pendingPayrolls || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'purple',
      change: stats.paidPayrolls || 0,
      changeLabel: 'راتب مدفوع هذا الشهر'
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-arabic">
            مرحباً، {user.firstName} {user.lastName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-arabic">
            إليك نظرة عامة على نظام إدارة شؤون الموظفين
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, index) => (
            <DashboardCard key={index} {...card} />
          ))}
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-arabic">
              إحصائيات الحضور
            </h3>
            <AttendanceChart />
          </div>

          {/* Department Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-arabic">
              إحصائيات الأقسام
            </h3>
            <div className="space-y-4">
              {departments.slice(0, 5).map((dept: any) => (
                <div key={dept._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: dept.color || '#3B82F6' }}
                    />
                    <span className="text-sm font-medium text-gray-900 font-arabic">
                      {dept.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dept.employeeCount || 0} موظف
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivities
            title="طلبات الإجازة الأخيرة"
            items={recentLeaves}
            type="leaves"
          />
          <RecentActivities
            title="الإشعارات الأخيرة"
            items={recentNotifications}
            type="notifications"
          />
        </div>
      </div>
    </Layout>
  )
}