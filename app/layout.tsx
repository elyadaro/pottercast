import './globals.css'
import type { Metadata } from 'next'
import MobileDebugger from '@/components/MobileDebugger'

export const metadata: Metadata = {
  title: 'פוטרקאסט - ניחושים',
  description: 'מערכת ניחושים בזמן אמת',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <MobileDebugger />
      </body>
    </html>
  )
}
