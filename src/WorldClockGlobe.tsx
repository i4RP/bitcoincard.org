import { useEffect, useRef, useCallback, useState } from 'react'
import * as THREE from 'three'

// --- City data with timezone offsets ---
interface City {
  name: string
  nameJa: string
  lat: number
  lng: number
  tz: string
  utcOffset: number // hours from UTC
}

const CITIES: City[] = [
  { name: 'Tokyo', nameJa: '東京', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo', utcOffset: 9 },
  { name: 'New York', nameJa: 'ニューヨーク', lat: 40.7128, lng: -74.006, tz: 'America/New_York', utcOffset: -5 },
  { name: 'London', nameJa: 'ロンドン', lat: 51.5074, lng: -0.1278, tz: 'Europe/London', utcOffset: 0 },
  { name: 'Sydney', nameJa: 'シドニー', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney', utcOffset: 11 },
  { name: 'Dubai', nameJa: 'ドバイ', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', utcOffset: 4 },
  { name: 'Singapore', nameJa: 'シンガポール', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore', utcOffset: 8 },
  { name: 'Los Angeles', nameJa: 'ロサンゼルス', lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles', utcOffset: -8 },
  { name: 'Paris', nameJa: 'パリ', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', utcOffset: 1 },
  { name: 'Hong Kong', nameJa: '香港', lat: 22.3193, lng: 114.1694, tz: 'Asia/Hong_Kong', utcOffset: 8 },
  { name: 'Sao Paulo', nameJa: 'サンパウロ', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo', utcOffset: -3 },
]

// --- Earth landmass data (simplified continent outlines as lat/lng polygons) ---
// We'll generate voxels by sampling a mathematical model of Earth's landmasses
function isLand(lat: number, lng: number): boolean {
  // Simplified continent detection using bounding boxes
  const regions = [
    // North America
    { latMin: 25, latMax: 70, lngMin: -170, lngMax: -50 },
    // Central America
    { latMin: 7, latMax: 25, lngMin: -120, lngMax: -60 },
    // South America
    { latMin: -56, latMax: 12, lngMin: -82, lngMax: -34 },
    // Europe
    { latMin: 36, latMax: 71, lngMin: -10, lngMax: 40 },
    // Africa
    { latMin: -35, latMax: 37, lngMin: -18, lngMax: 52 },
    // Middle East
    { latMin: 12, latMax: 42, lngMin: 25, lngMax: 63 },
    // Russia/Asia
    { latMin: 40, latMax: 75, lngMin: 40, lngMax: 180 },
    // India
    { latMin: 8, latMax: 35, lngMin: 68, lngMax: 97 },
    // Southeast Asia
    { latMin: -10, latMax: 28, lngMin: 95, lngMax: 145 },
    // China/Korea/Japan
    { latMin: 20, latMax: 55, lngMin: 73, lngMax: 145 },
    // Australia
    { latMin: -45, latMax: -10, lngMin: 110, lngMax: 155 },
    // Greenland
    { latMin: 60, latMax: 84, lngMin: -73, lngMax: -12 },
    // UK/Ireland
    { latMin: 50, latMax: 59, lngMin: -11, lngMax: 2 },
    // Scandinavia
    { latMin: 55, latMax: 71, lngMin: 4, lngMax: 31 },
    // Indonesia
    { latMin: -8, latMax: 6, lngMin: 95, lngMax: 141 },
    // New Zealand
    { latMin: -47, latMax: -34, lngMin: 166, lngMax: 179 },
    // Alaska extension
    { latMin: 54, latMax: 72, lngMin: -170, lngMax: -130 },
    // Madagascar
    { latMin: -26, latMax: -12, lngMin: 43, lngMax: 50 },
  ]

  for (const r of regions) {
    if (lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax) {
      return true
    }
  }
  return false
}

// Check if a location is near a major city (for brighter glow)
function getCityBrightness(lat: number, lng: number): number {
  const majorCities = [
    // Population centers with approximate brightness
    { lat: 35.68, lng: 139.69, r: 3 }, // Tokyo
    { lat: 40.71, lng: -74.01, r: 3 }, // New York
    { lat: 51.51, lng: -0.13, r: 2.5 }, // London
    { lat: 48.86, lng: 2.35, r: 2 }, // Paris
    { lat: -33.87, lng: 151.21, r: 2 }, // Sydney
    { lat: 22.32, lng: 114.17, r: 2.5 }, // Hong Kong
    { lat: 1.35, lng: 103.82, r: 2 }, // Singapore
    { lat: 25.2, lng: 55.27, r: 2 }, // Dubai
    { lat: 34.05, lng: -118.24, r: 2.5 }, // LA
    { lat: -23.55, lng: -46.63, r: 2.5 }, // Sao Paulo
    { lat: 55.76, lng: 37.62, r: 2 }, // Moscow
    { lat: 39.9, lng: 116.4, r: 3 }, // Beijing
    { lat: 31.23, lng: 121.47, r: 3 }, // Shanghai
    { lat: 19.08, lng: 72.88, r: 3 }, // Mumbai
    { lat: 28.61, lng: 77.23, r: 2.5 }, // Delhi
    { lat: -1.29, lng: 36.82, r: 1.5 }, // Nairobi
    { lat: 30.04, lng: 31.24, r: 2 }, // Cairo
    { lat: 37.57, lng: 126.98, r: 2.5 }, // Seoul
    { lat: 13.76, lng: 100.5, r: 2 }, // Bangkok
    { lat: 41.01, lng: 28.98, r: 2 }, // Istanbul
  ]
  let maxBright = 0
  for (const c of majorCities) {
    const dlat = lat - c.lat
    const dlng = lng - c.lng
    const dist = Math.sqrt(dlat * dlat + dlng * dlng)
    if (dist < c.r * 3) {
      const bright = Math.max(0, 1 - dist / (c.r * 3))
      maxBright = Math.max(maxBright, bright)
    }
  }
  return maxBright
}

// Convert lat/lng to 3D position on sphere
function latLngToPos(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}

// Calculate sun direction based on current UTC time
function getSunDirection(): THREE.Vector3 {
  const now = new Date()
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60
  // Sun is roughly over the longitude where it's solar noon
  // Solar noon longitude = -(utcHours - 12) * 15
  const sunLng = -(utcHours - 12) * 15
  // Sun declination varies by season, simplified to ~0 for equinox
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const declination = 23.44 * Math.sin(((dayOfYear - 81) / 365) * 2 * Math.PI)
  return latLngToPos(declination, sunLng, 1).normalize()
}

// Get time string for a timezone
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

function getDateInTz(tz: string): string {
  try {
    return new Date().toLocaleDateString('ja-JP', {
      timeZone: tz,
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    })
  } catch {
    return ''
  }
}

interface WorldClockGlobeProps {
  onClose: () => void
  onSelectCity: (city: { name: string; nameJa: string; tz: string }) => void
  selectedTz: string | null
}

export default function WorldClockGlobe({ onClose, onSelectCity, selectedTz }: WorldClockGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const globeGroupRef = useRef<THREE.Group | null>(null)
  const cityMarkersRef = useRef<THREE.Mesh[]>([])
  const cityLabelsRef = useRef<THREE.Sprite[]>([])
  const raycasterRef = useRef(new THREE.Raycaster())
  const mouseRef = useRef(new THREE.Vector2())
  const animFrameRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const prevMouseRef = useRef({ x: 0, y: 0 })
  const rotationVelRef = useRef({ x: 0, y: 0 })
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  const [hoveredCity, setHoveredCity] = useState<City | null>(null)
  const [selectedCity, setSelectedCity] = useState<City | null>(
    selectedTz ? CITIES.find(c => c.tz === selectedTz) || null : null
  )
  const [timeNow, setTimeNow] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Suppress unused var warning - timeNow is used to trigger re-renders for clock display
  void timeNow

  const handleCitySelect = useCallback((city: City) => {
    setSelectedCity(city)
    onSelectCity({ name: city.name, nameJa: city.nameJa, tz: city.tz })
  }, [onSelectCity])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000008)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.z = 4.5
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Globe group (for rotation)
    const globeGroup = new THREE.Group()
    // Tilt earth ~23.4 degrees like real Earth
    globeGroup.rotation.x = 0.1
    scene.add(globeGroup)
    globeGroupRef.current = globeGroup

    // --- Create stars ---
    const starGeometry = new THREE.BufferGeometry()
    const starCount = 2000
    const starPositions = new Float32Array(starCount * 3)
    const starSizes = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 50 + Math.random() * 50
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPositions[i * 3 + 2] = r * Math.cos(phi)
      starSizes[i] = Math.random() * 2 + 0.5
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1))
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    // --- Generate voxel Earth ---
    const GLOBE_RADIUS = 1.6
    const CUBE_SIZE = 0.038
    const RESOLUTION = 80 // samples per 180 degrees latitude

    const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)

    // Collect land positions
    const landPositions: { pos: THREE.Vector3; lat: number; lng: number; normal: THREE.Vector3; cityBright: number }[] = []

    for (let latIdx = 0; latIdx <= RESOLUTION; latIdx++) {
      const lat = 90 - (latIdx / RESOLUTION) * 180
      const phi = (90 - lat) * (Math.PI / 180)
      const circumference = Math.sin(phi) * RESOLUTION * 2
      const lngSteps = Math.max(1, Math.round(circumference))

      for (let lngIdx = 0; lngIdx < lngSteps; lngIdx++) {
        const lng = (lngIdx / lngSteps) * 360 - 180
        if (isLand(lat, lng)) {
          const pos = latLngToPos(lat, lng, GLOBE_RADIUS)
          const normal = pos.clone().normalize()
          const cityBright = getCityBrightness(lat, lng)
          landPositions.push({ pos, lat, lng, normal, cityBright })
        }
      }
    }

    // Create instanced mesh for land cubes
    const landCount = landPositions.length

    // Custom shader material for day/night effect
    const cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x44aa88,
      metalness: 0.3,
      roughness: 0.7,
      emissive: 0x000000,
      emissiveIntensity: 0,
    })

    const landMesh = new THREE.InstancedMesh(cubeGeo, cubeMaterial, landCount)
    const dummy = new THREE.Object3D()
    const landColors = new Float32Array(landCount * 3)

    landPositions.forEach((item, i) => {
      dummy.position.copy(item.pos)
      dummy.lookAt(item.pos.clone().multiplyScalar(2))
      dummy.scale.setScalar(1 + Math.random() * 0.15)
      dummy.updateMatrix()
      landMesh.setMatrixAt(i, dummy.matrix)

      // Base color: green-blue for land
      landColors[i * 3] = 0.2 + Math.random() * 0.1
      landColors[i * 3 + 1] = 0.55 + Math.random() * 0.15
      landColors[i * 3 + 2] = 0.35 + Math.random() * 0.1
    })

    landMesh.instanceMatrix.needsUpdate = true
    const colorAttr = new THREE.InstancedBufferAttribute(landColors, 3)
    landMesh.instanceColor = colorAttr
    globeGroup.add(landMesh)

    // --- Ocean grid (subtle dots) ---
    const oceanGeo = new THREE.BufferGeometry()
    const oceanPositions: number[] = []
    const OCEAN_RES = 50
    for (let latIdx = 0; latIdx <= OCEAN_RES; latIdx++) {
      const lat = 90 - (latIdx / OCEAN_RES) * 180
      const phi = (90 - lat) * (Math.PI / 180)
      const circ = Math.sin(phi) * OCEAN_RES * 2
      const lngSteps = Math.max(1, Math.round(circ))
      for (let lngIdx = 0; lngIdx < lngSteps; lngIdx++) {
        const lng = (lngIdx / lngSteps) * 360 - 180
        if (!isLand(lat, lng)) {
          const pos = latLngToPos(lat, lng, GLOBE_RADIUS - 0.01)
          oceanPositions.push(pos.x, pos.y, pos.z)
        }
      }
    }
    oceanGeo.setAttribute('position', new THREE.Float32BufferAttribute(oceanPositions, 3))
    const oceanMat = new THREE.PointsMaterial({
      color: 0x1a3a5c,
      size: 0.015,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    })
    const oceanPoints = new THREE.Points(oceanGeo, oceanMat)
    globeGroup.add(oceanPoints)

    // --- City markers ---
    const markerGeo = new THREE.SphereGeometry(0.04, 8, 8)
    const markers: THREE.Mesh[] = []
    const labels: THREE.Sprite[] = []

    CITIES.forEach((city) => {
      const pos = latLngToPos(city.lat, city.lng, GLOBE_RADIUS + 0.05)
      const markerMat = new THREE.MeshBasicMaterial({
        color: 0xff6644,
        transparent: true,
        opacity: 0.9,
      })
      const marker = new THREE.Mesh(markerGeo, markerMat)
      marker.position.copy(pos)
      marker.userData = { city }
      globeGroup.add(marker)
      markers.push(marker)

      // Glow ring around marker
      const ringGeo = new THREE.RingGeometry(0.05, 0.07, 16)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff6644,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(pos)
      ring.lookAt(pos.clone().multiplyScalar(2))
      globeGroup.add(ring)

      // City name label (sprite)
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, 256, 64)
      ctx.font = 'bold 28px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(city.nameJa, 128, 40)

      const texture = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
      })
      const sprite = new THREE.Sprite(spriteMat)
      const labelPos = latLngToPos(city.lat, city.lng, GLOBE_RADIUS + 0.2)
      sprite.position.copy(labelPos)
      sprite.scale.set(0.5, 0.125, 1)
      globeGroup.add(sprite)
      labels.push(sprite)
    })

    cityMarkersRef.current = markers
    cityLabelsRef.current = labels

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5)
    scene.add(ambientLight)

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8)
    scene.add(sunLight)

    // Subtle rim light
    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.3)
    rimLight.position.set(0, 0, -5)
    scene.add(rimLight)

    // --- Atmosphere glow ---
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.08, 32, 32)
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat)
    globeGroup.add(atmosphere)

    // --- Animation loop ---
    const tempColor = new THREE.Color()
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)

      // Auto-rotate (slow)
      if (!isDraggingRef.current) {
        globeGroup.rotation.y += 0.001
        // Apply momentum
        globeGroup.rotation.y += rotationVelRef.current.x
        globeGroup.rotation.x += rotationVelRef.current.y
        rotationVelRef.current.x *= 0.96
        rotationVelRef.current.y *= 0.96
      }

      // Update sun position
      const sunDir = getSunDirection()
      sunLight.position.copy(sunDir.clone().multiplyScalar(10))

      // Update land cube colors based on sun direction
      const worldMatrix = new THREE.Matrix4()
      const pos = new THREE.Vector3()
      const normalDir = new THREE.Vector3()

      for (let i = 0; i < landCount; i++) {
        landMesh.getMatrixAt(i, worldMatrix)
        pos.setFromMatrixPosition(worldMatrix)

        // Apply globe rotation to get world position
        normalDir.copy(pos).applyMatrix4(globeGroup.matrixWorld).normalize()
        const sunDot = normalDir.dot(sunDir)

        const item = landPositions[i]
        const isDaytime = sunDot > -0.1

        if (isDaytime) {
          // Daytime: bright green-blue
          const brightness = Math.max(0.3, 0.5 + sunDot * 0.5)
          tempColor.setRGB(
            0.15 * brightness + 0.1,
            0.5 * brightness + 0.2,
            0.3 * brightness + 0.15
          )
        } else {
          // Nighttime: dark with city lights
          const cityGlow = item.cityBright
          if (cityGlow > 0.1) {
            // City lights: warm orange/yellow glow
            const glow = cityGlow * 0.8
            tempColor.setRGB(
              0.9 * glow + 0.02,
              0.7 * glow + 0.02,
              0.3 * glow + 0.03
            )
          } else {
            // Dark land
            tempColor.setRGB(0.03, 0.06, 0.08)
          }
        }

        if (landMesh.instanceColor) {
          landMesh.instanceColor.setXYZ(i, tempColor.r, tempColor.g, tempColor.b)
        }
      }
      if (landMesh.instanceColor) {
        landMesh.instanceColor.needsUpdate = true
      }

      // Pulse city markers
      const time = Date.now() * 0.003
      markers.forEach((marker) => {
        const scale = 1 + Math.sin(time) * 0.2
        marker.scale.setScalar(scale)
      })

      renderer.render(scene, camera)
    }

    animate()

    // --- Handle resize ---
    const handleResize = () => {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      scene.clear()
    }
  }, [])

  // --- Touch/Mouse interaction ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = true
    const clientX = e.clientX
    const clientY = e.clientY
    prevMouseRef.current = { x: clientX, y: clientY }
    touchStartRef.current = { x: clientX, y: clientY, time: Date.now() }
    rotationVelRef.current = { x: 0, y: 0 }
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current || !globeGroupRef.current) return
    const dx = e.clientX - prevMouseRef.current.x
    const dy = e.clientY - prevMouseRef.current.y
    globeGroupRef.current.rotation.y += dx * 0.005
    globeGroupRef.current.rotation.x += dy * 0.005
    // Clamp X rotation
    globeGroupRef.current.rotation.x = Math.max(-1.2, Math.min(1.2, globeGroupRef.current.rotation.x))
    prevMouseRef.current = { x: e.clientX, y: e.clientY }
    rotationVelRef.current = { x: dx * 0.002, y: dy * 0.002 }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - touchStartRef.current.x
    const dy = e.clientY - touchStartRef.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const elapsed = Date.now() - touchStartRef.current.time

    isDraggingRef.current = false

    // If it was a tap (not a drag), check for city marker hit
    if (dist < 10 && elapsed < 300) {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
      const intersects = raycasterRef.current.intersectObjects(cityMarkersRef.current)

      if (intersects.length > 0) {
        const city = intersects[0].object.userData.city as City
        handleCitySelect(city)
      }
    }
  }, [handleCitySelect])

  // Handle hover for city detection
  const handlePointerMoveHover = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) return
    if (!containerRef.current || !cameraRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)
    const intersects = raycasterRef.current.intersectObjects(cityMarkersRef.current)

    if (intersects.length > 0) {
      const city = intersects[0].object.userData.city as City
      setHoveredCity(city)
    } else {
      setHoveredCity(null)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Three.js canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          handlePointerMove(e)
          handlePointerMoveHover(e)
        }}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none' }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 active:scale-90 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Title */}
      <div className="absolute top-12 left-4">
        <h2 className="text-white/90 text-lg font-light tracking-wider">World Clock</h2>
        <p className="text-white/40 text-xs mt-0.5">都市をタップして時刻を表示</p>
      </div>

      {/* Hovered city tooltip */}
      {hoveredCity && !selectedCity && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 text-center">
            <p className="text-white/90 text-sm font-medium">{hoveredCity.nameJa}</p>
            <p className="text-white/60 text-xs">{getTimeInTz(hoveredCity.tz)}</p>
          </div>
        </div>
      )}

      {/* Selected city panel */}
      {selectedCity && (
        <div className="absolute bottom-0 left-0 right-0 pb-10 px-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white text-xl font-light">{selectedCity.nameJa}</h3>
                <p className="text-white/50 text-xs">{selectedCity.name}</p>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="text-white/40 text-xs px-2 py-1 rounded bg-white/5"
              >
                閉じる
              </button>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-white text-5xl font-extralight tracking-tight">
                {getTimeInTz(selectedCity.tz)}
              </span>
              <span className="text-white/40 text-sm pb-2">
                {getDateInTz(selectedCity.tz)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* City list (bottom scroll) */}
      {!selectedCity && (
        <div className="absolute bottom-0 left-0 right-0 pb-8">
          <div className="flex gap-2 px-4 overflow-x-auto pb-2 scrollbar-hide">
            {CITIES.map((city) => (
              <button
                key={city.tz}
                onClick={() => handleCitySelect(city)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-left transition-all ${
                  selectedTz === city.tz
                    ? 'bg-white/20 border border-white/30'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <p className="text-white/90 text-sm font-medium whitespace-nowrap">{city.nameJa}</p>
                <p className="text-white/50 text-xs font-light mt-0.5">{getTimeInTz(city.tz)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
