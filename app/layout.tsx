import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'

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
        <Script
          src="//cdn.jsdelivr.net/npm/eruda"
          strategy="beforeInteractive"
          onLoad={() => {
            if (typeof window !== 'undefined' && (window as any).eruda) {
              (window as any).eruda.init();
            }
          }}
        />
      </body>
    </html>
  )
}
