import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import './App.css'
import {
  CalendarDays,
  Sun,
  Moon,
  CloudSun,
  Music,
  Pause,
  Play,
} from 'lucide-react'

// --- Progressive image loader (Phase 1: uses preloaded images) ---
function ProgressiveImg({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        loading="eager"
        decoding="async"
      />
    </div>
  )
}

// --- Helpers ---
function getGreeting(hour: number): string {
  if (hour < 6) return 'おやすみなさい'
  if (hour < 12) return 'おはようございます'
  if (hour < 18) return 'こんにちは'
  return 'こんばんは'
}

function getTimeIcon(hour: number) {
  if (hour >= 6 && hour < 10) return <CloudSun className="w-5 h-5 text-amber-400" />
  if (hour >= 10 && hour < 17) return <Sun className="w-5 h-5 text-yellow-400" />
  return <Moon className="w-5 h-5 text-indigo-300" />
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// Phase 1: Lazy load overlays (not needed on first paint)
const BtcPayOverlay = lazy(() => import('./BtcPayOverlay'))
const WorldClockGlobe = lazy(() => import('./WorldClockGlobe'))

// --- Timezone helpers ---
function getTimeInTz(tz: string): string {
  try {
    return new Date().toLocaleTimeString('ja-JP', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--'
  }
}

function getGreetingForTz(tz: string): string {
  try {
    const h = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }))
    if (h < 6) return 'おやすみなさい'
    if (h < 12) return 'おはようございます'
    if (h < 18) return 'こんにちは'
    return 'こんばんは'
  } catch {
    return ''
  }
}

function getTimeIconForTz(tz: string) {
  try {
    const h = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false }))
    if (h >= 6 && h < 10) return <CloudSun className="w-5 h-5 text-amber-400" />
    if (h >= 10 && h < 17) return <Sun className="w-5 h-5 text-yellow-400" />
    return <Moon className="w-5 h-5 text-indigo-300" />
  } catch {
    return <Moon className="w-5 h-5 text-indigo-300" />
  }
}

function getDateInTz(tz: string): { month: number; day: number; weekday: string } {
  try {
    const d = new Date()
    const m = parseInt(d.toLocaleDateString('en-US', { timeZone: tz, month: 'numeric' }))
    const dy = parseInt(d.toLocaleDateString('en-US', { timeZone: tz, day: 'numeric' }))
    const wd = d.toLocaleDateString('ja-JP', { timeZone: tz, weekday: 'short' })
    return { month: m, day: dy, weekday: wd }
  } catch {
    return { month: 0, day: 0, weekday: '' }
  }
}

interface SelectedCityInfo {
  name: string
  nameJa: string
  tz: string
}

function App() {
  const [now, setNow] = useState(new Date())
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // World Clock state
  const [showGlobe, setShowGlobe] = useState(false)
  const [selectedCity, setSelectedCity] = useState<SelectedCityInfo | null>(() => {
    const saved = localStorage.getItem('worldclock-city')
    if (saved) {
      try { return JSON.parse(saved) } catch { return null }
    }
    return null
  })

  // BitcoinPay zoom state
  const [btcZoom, setBtcZoom] = useState<'closed' | 'zooming-in' | 'open' | 'zooming-out'>('closed')
  const [btcRect, setBtcRect] = useState<DOMRect | null>(null)
  const btcBlockRef = useRef<HTMLDivElement>(null)

  // Phase 3: Only start preloading iframe after idle
  const [shouldPreloadIframe, setShouldPreloadIframe] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Phase 3: Defer iframe preload until after initial paint + idle time
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => {
        setShouldPreloadIframe(true)
      })
      return () => window.cancelIdleCallback(id)
    } else {
      const t = setTimeout(() => setShouldPreloadIframe(true), 2000)
      return () => clearTimeout(t)
    }
  }, [])

  // Register Service Worker (Phase 3)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently - not critical
      })
    }
  }, [])

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const openBtcPay = useCallback(() => {
    if (!btcBlockRef.current) return
    const rect = btcBlockRef.current.getBoundingClientRect()
    setBtcRect(rect)
    setBtcZoom('zooming-in')
    setTimeout(() => setBtcZoom('open'), 500)
  }, [])

  const closeBtcPay = useCallback(() => {
    if (!btcBlockRef.current) return
    const rect = btcBlockRef.current.getBoundingClientRect()
    setBtcRect(rect)
    setBtcZoom('zooming-out')
    setTimeout(() => setBtcZoom('closed'), 500)
  }, [])

  // Handle city selection from globe
  const handleSelectCity = useCallback((city: SelectedCityInfo) => {
    setSelectedCity(city)
    localStorage.setItem('worldclock-city', JSON.stringify(city))
  }, [])

  // Clock display logic - use selected city timezone or local
  const hour = selectedCity ? parseInt(new Date().toLocaleTimeString('en-US', { timeZone: selectedCity.tz, hour: 'numeric', hour12: false })) : now.getHours()
  const timeStr = selectedCity ? getTimeInTz(selectedCity.tz) : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const dateInfo = selectedCity ? getDateInTz(selectedCity.tz) : { month: now.getMonth() + 1, day: now.getDate(), weekday: WEEKDAYS[now.getDay()] }
  const greeting = selectedCity ? getGreetingForTz(selectedCity.tz) : getGreeting(now.getHours())
  const timeIcon = selectedCity ? getTimeIconForTz(selectedCity.tz) : getTimeIcon(now.getHours())
  // suppress unused var
  void hour

  return (
    <div className="min-h-screen bg-gray-100 select-none">
      <div className="h-6" />

      {/* Grid layout */}
      <div className="px-3 grid grid-cols-2 gap-3 pb-10">

        {/* Clock - compact, top-left (1x1) - tap to open world clock */}
        <div
          onClick={() => setShowGlobe(true)}
          className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 shadow-lg flex flex-col justify-between aspect-square cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2">
            {timeIcon}
            <span className="text-white/70 text-xs font-medium">{greeting}</span>
          </div>
          <div>
            <span className="text-white text-4xl font-extralight tracking-tight leading-none block">
              {timeStr}
            </span>
            {selectedCity && (
              <p className="text-white/50 text-[10px] mt-1">{selectedCity.nameJa}</p>
            )}
            <div className="flex items-center gap-1 mt-1 text-white/60">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-xs">{dateInfo.month}/{dateInfo.day}（{dateInfo.weekday}）</span>
            </div>
          </div>
        </div>

        {/* STAS SWAP block (1x1) */}
        <a
          href="https://molt4x.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col aspect-square active:scale-95 transition-transform"
        >
          <div className="flex-1 overflow-hidden">
            <ProgressiveImg
              src="/images/stas-swap.webp?v=3"
              alt="STAS SWAP"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-gray-800">STAS SWAP</p>
            <p className="text-xs text-gray-400">stas.exchange</p>
          </div>
        </a>

        {/* A World Without Fee - banner (2x1 wide) */}
        <a
          href="#"
          className="col-span-2 rounded-2xl bg-white shadow-md overflow-hidden active:scale-[0.98] transition-transform"
        >
          <div className="h-44 overflow-hidden">
            <ProgressiveImg
              src="/images/bv2.webp"
              alt="A World Without Fee"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-gray-800">A World Without Fee</p>
            <p className="text-xs text-gray-400">Prosperity and Freedom</p>
          </div>
        </a>

        {/* BitcoinPay block (1x1) - tap to zoom */}
        <div
          ref={btcBlockRef}
          onClick={openBtcPay}
          className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col aspect-square active:scale-95 transition-transform cursor-pointer"
        >
          <div className="flex-1 overflow-hidden">
            <ProgressiveImg
              src="/images/btcpay.webp?v=3"
              alt="BitcoinPay"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="p-3">
            <p className="text-sm font-bold text-gray-800">BitcoinPay</p>
            <p className="text-xs text-gray-400">コーポレートページ</p>
          </div>
        </div>

        {/* Audio player block (1x1) */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg p-4 flex flex-col justify-between aspect-square">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-xs font-medium">Music</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <button
                onClick={toggleAudio}
                className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-rose-500" />
                ) : (
                  <Play className="w-6 h-6 text-rose-500 ml-0.5" />
                )}
              </button>
            </div>
            <div className={`flex gap-0.5 ${isPlaying ? 'animate-pulse' : ''}`}>
              {[3, 5, 2, 6, 4, 3, 5].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-white/50"
                  style={{ height: `${h * 3}px` }}
                />
              ))}
            </div>
          </div>
          <audio
            ref={audioRef}
            src="/images/audio.mp3"
            preload="none"
            onEnded={() => setIsPlaying(false)}
          />
        </div>

      </div>

      {/* Phase 3: Deferred iframe preload - only after idle */}
      {shouldPreloadIframe && (
        <iframe
          src="https://btcpay.jp"
          title="BitcoinPay Preload"
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            border: 'none',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* BitcoinPay zoom overlay - lazy loaded (Phase 1: code splitting) */}
      {btcZoom !== 'closed' && (
        <Suspense fallback={null}>
          <BtcPayOverlay
            btcZoom={btcZoom}
            btcRect={btcRect}
            closeBtcPay={closeBtcPay}
          />
        </Suspense>
      )}

      {/* World Clock Globe overlay */}
      {showGlobe && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <div className="text-white/50 text-sm">Loading...</div>
          </div>
        }>
          <WorldClockGlobe
            onClose={() => setShowGlobe(false)}
            onSelectCity={handleSelectCity}
            selectedTz={selectedCity?.tz || null}
          />
        </Suspense>
      )}
    </div>
  )
}

export default App
