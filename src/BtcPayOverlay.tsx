import { useEffect } from 'react'

type ZoomState = 'closed' | 'zooming-in' | 'open' | 'zooming-out'

interface BtcPayOverlayProps {
  btcZoom: ZoomState
  btcRect: DOMRect | null
  closeBtcPay: () => void
}

function BtcPayOverlay({ btcZoom, btcRect, closeBtcPay }: BtcPayOverlayProps) {
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

  // Force expanded style after initial render for zooming-in
  useEffect(() => {
    if (btcZoom === 'zooming-in') {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const overlay = document.getElementById('btc-overlay')
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

  return (
    <div id="btc-overlay" style={getOverlayStyle()} className="bg-white">
      {/* Invisible back button area - covers hamburger menu and acts as close */}
      <div
        onClick={closeBtcPay}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60px',
          height: '64px',
          zIndex: 10,
          cursor: 'pointer',
          background: 'transparent',
        }}
      />
      {/* Iframe of btcpay.jp - already cached by browser from preload */}
      <iframe
        src="https://btcpay.jp"
        title="BitcoinPay"
        className="w-full h-full border-0"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default BtcPayOverlay
