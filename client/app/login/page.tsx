'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

export default function LoginPage() {
  const { user, login, isLoading } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginForm>()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const onSubmit = async (data: LoginForm) => {
    try {
      await login({
        email: data.email,
        password: data.password
      })
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('password', {
          type: 'manual',
          message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">Z</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 font-arabic">
            Zewail Academy
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-arabic">
            نظام إدارة شؤون الموظفين
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Input
                label="البريد الإلكتروني"
                type="email"
                autoComplete="email"
                placeholder="أدخل بريدك الإلكتروني"
                error={errors.email?.message}
                {...register('email', {
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'بريد إلكتروني غير صحيح'
                  }
                })}
              />
            </div>

            <div>
              <Input
                label="كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="أدخل كلمة المرور"
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                }
                {...register('password', {
                  required: 'كلمة المرور مطلوبة',
                  minLength: {
                    value: 6,
                    message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                  }
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  {...register('rememberMe')}
                />
                <label htmlFor="remember-me" className="mr-2 block text-sm text-gray-900 font-arabic">
                  تذكرني
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500 font-arabic"
                >
                  نسيت كلمة المرور؟
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                loadingText="جاري تسجيل الدخول..."
                className="py-3"
              >
                تسجيل الدخول
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-600 font-arabic">
            © 2024 Zewail Academy. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </div>
  )
}