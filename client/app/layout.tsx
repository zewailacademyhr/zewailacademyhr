import type { Metadata } from 'next'
import { Inter, Noto_Sans_Arabic } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const notoSansArabic = Noto_Sans_Arabic({ 
  subsets: ['arabic'],
  variable: '--font-noto-sans-arabic',
})

export const metadata: Metadata = {
  title: 'Zewail Academy - نظام إدارة شؤون الموظفين',
  description: 'نظام شامل لإدارة شؤون الموظفين والحضور والانصراف والإجازات والرواتب',
  keywords: ['HRM', 'CRM', 'إدارة الموظفين', 'الحضور والانصراف', 'الرواتب'],
  authors: [{ name: 'Zewail Academy' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${notoSansArabic.variable}`}>
      <body className="font-arabic bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}