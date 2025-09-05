'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import Header from './Header'
import { useQuery } from 'react-query'
import { notificationsAPI } from '@/lib/api'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery(
    'unreadNotificationsCount',
    () => notificationsAPI.getUnreadCount(),
    {
      select: (response) => response.data.data.count,
      refetchInterval: 30 * 1000, // Refetch every 30 seconds
    }
  )

  if (!user) {
    return null
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        user={user}
        unreadNotificationsCount={unreadCount || 0}
      />

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <Header 
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          unreadNotificationsCount={unreadCount || 0}
        />

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}