import { useEffect, useState } from 'react'

type ZoomState = 'closed' | 'zooming-in' | 'open' | 'zooming-out'

interface BtcPayOverlayProps {
  btcZoom: ZoomState
  btcRect: DOMRect | null
  closeBtcPay: () => void
  src?: string
  overlayId?: string
  closePosition?: 'left' | 'right-exclude'
}

function BtcPayOverlay({ btcZoom, btcRect, closeBtcPay, src = 'https://btcpay.jp', overlayId = 'btc-overlay', closePosition = 'right-exclude' }: BtcPayOverlayProps) {
  const getOverlayStyle = (): React.CSSProperties => {
    if (!btcRect) return {}
    if (btcZoom === 'zooming-in') {
      return {
        position: 'fixed',
        top: btcRect.top,
        left: btcRect.left,
        width: btcRect.width,
        height: btcRect.height,
        borderRadius: '1rem',
        zIndex: 50,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        opacity: 1,
      }
    }
    if (btcZoom === 'open') {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        zIndex: 50,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        opacity: 1,
      }
    }
    if (btcZoom === 'zooming-out') {
      return {
        position: 'fixed',
        top: btcRect.top,
        left: btcRect.left,
        width: btcRect.width,
        height: btcRect.height,
        borderRadius: '1rem',
        zIndex: 50,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        opacity: 1,
      }
    }
    return { display: 'none' }
  }

  const [showBackBar, setShowBackBar] = useState(false)

  // Force expanded style after initial render for zooming-in
  useEffect(() => {
    if (btcZoom === 'zooming-in') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const overlay = document.getElementById(overlayId)
          if (overlay) {
            overlay.style.top = '0px'
            overlay.style.left = '0px'
            overlay.style.width = '100vw'
            overlay.style.height = '100vh'
            overlay.style.borderRadius = '0px'
          }
        })
      })
    }
  }, [btcZoom])

  // Show back bar when overlay opens, auto-hide after 3s
  useEffect(() => {
    if (btcZoom === 'open') {
      setShowBackBar(true)
      const timer = setTimeout(() => setShowBackBar(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setShowBackBar(false)
    }
  }, [btcZoom])

  return (
    <div id={overlayId} style={getOverlayStyle()} className="bg-white">
      {/* Invisible back button tap area (always active) */}
      <div
        onClick={closeBtcPay}
        style={{
          position: 'absolute',
          top: 0,
          left: closePosition === 'left' ? 0 : 0,
          width: closePosition === 'left' ? '60px' : 'calc(100% - 60px)',
          height: '64px',
          zIndex: 10,
          cursor: 'pointer',
          background: 'transparent',
        }}
      />
      {/* Semi-transparent back bar (auto fade-out after 3s) */}
      <div
        onClick={closeBtcPay}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '48px',
          zIndex: 9,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '16px',
          gap: '8px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
          opacity: showBackBar ? 1 : 0,
          transition: 'opacity 0.5s ease',
          pointerEvents: showBackBar ? 'auto' : 'none',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'white', fontSize: '14px', fontWeight: 500, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>← 戻る</span>
      </div>
      {/* Iframe of btcpay.jp - already cached by browser from preload */}
      <iframe
        src={src}
        title="Overlay"
        className="w-full h-full border-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default BtcPayOverlay
