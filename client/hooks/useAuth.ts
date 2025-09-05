import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authAPI } from '@/lib/api'
import { toast } from 'react-toastify'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'admin' | 'hr' | 'employee'
  employeeId?: string
  department?: {
    id: string
    name: string
    nameEn?: string
    color?: string
  }
  position?: string
  salary?: number
  employmentStatus: 'active' | 'inactive' | 'terminated' | 'on_leave'
  avatar?: string
  isActive: boolean
  language: 'ar' | 'en'
  lastLogin?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => void
  updateProfile: (data: any) => Promise<void>
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<void>
  permissions: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const queryClient = useQueryClient()

  // Get current user
  const { data: userData, isLoading: userLoading } = useQuery(
    'currentUser',
    async () => {
      const token = localStorage.getItem('token')
      if (!token) return null
      
      const response = await authAPI.getCurrentUser()
      return response.data.data.user
    },
    {
      enabled: !!localStorage.getItem('token'),
      retry: false,
      onError: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  )

  // Get user permissions
  const { data: permissionsData } = useQuery(
    'permissions',
    async () => {
      const response = await authAPI.getPermissions()
      return response.data.data.permissions
    },
    {
      enabled: !!user,
      retry: false
    }
  )

  useEffect(() => {
    if (userData) {
      setUser(userData)
    }
  }, [userData])

  useEffect(() => {
    if (permissionsData) {
      setPermissions(permissionsData)
    }
  }, [permissionsData])

  // Login mutation
  const loginMutation = useMutation(
    async (credentials: { email: string; password: string }) => {
      const response = await authAPI.login(credentials)
      const { token, user: userData } = response.data.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return { token, user: userData }
    },
    {
      onSuccess: (data) => {
        setUser(data.user)
        queryClient.invalidateQueries('currentUser')
        toast.success('تم تسجيل الدخول بنجاح')
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'خطأ في تسجيل الدخول'
        toast.error(message)
      }
    }
  )

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data: any) => {
      const response = await authAPI.updateProfile(data)
      return response.data.data.user
    },
    {
      onSuccess: (userData) => {
        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        queryClient.invalidateQueries('currentUser')
        toast.success('تم تحديث الملف الشخصي بنجاح')
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'خطأ في تحديث الملف الشخصي'
        toast.error(message)
      }
    }
  )

  // Change password mutation
  const changePasswordMutation = useMutation(
    async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const response = await authAPI.changePassword(data)
      return response.data
    },
    {
      onSuccess: () => {
        toast.success('تم تغيير كلمة المرور بنجاح')
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || 'خطأ في تغيير كلمة المرور'
        toast.error(message)
      }
    }
  )

  const login = async (credentials: { email: string; password: string }) => {
    await loginMutation.mutateAsync(credentials)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setPermissions([])
    queryClient.clear()
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const updateProfile = async (data: any) => {
    await updateProfileMutation.mutateAsync(data)
  }

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    await changePasswordMutation.mutateAsync(data)
  }

  const value = {
    user,
    isLoading: userLoading || loginMutation.isLoading,
    login,
    logout,
    updateProfile,
    changePassword,
    permissions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}