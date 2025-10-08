'use client'

import Script from 'next/script'

export default function MobileDebugger() {
  return (
    <Script
      src="//cdn.jsdelivr.net/npm/eruda"
      strategy="beforeInteractive"
      onLoad={() => {
        if (typeof window !== 'undefined' && (window as any).eruda) {
          (window as any).eruda.init();
        }
      }}
    />
  )
}
