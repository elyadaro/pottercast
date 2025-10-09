import './globals.css'
import type { Metadata } from 'next'
import MobileDebugger from '@/components/MobileDebugger'

export const metadata: Metadata = {
  title: 'פוטרקאסט - ניחושים',
  description: 'מערכת ניחושים בזמן אמת',
}

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body>
        {children}
        <MobileDebugger />
      </body>
    </html>
  )
}
