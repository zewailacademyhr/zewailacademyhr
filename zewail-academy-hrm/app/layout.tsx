import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'arabic'] });

export const metadata: Metadata = {
  title: 'Zewail Academy - إدارة شؤون الموظفين',
  description: 'نظام إدارة شؤون الموظفين المتكامل لأكاديمية زويل',
  keywords: 'HRM, CRM, إدارة الموظفين, أكاديمية زويل, رواتب, حضور, إجازات',
  authors: [{ name: 'Zewail Academy' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className={`${inter.className} bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}