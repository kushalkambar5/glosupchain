'use client'

import dynamic from 'next/dynamic'

const RouteMap = dynamic(
  () => import('@/components/RouteMap'),
  { ssr: false }
)

interface RoutePoint {
  lat: number
  lng: number
}

interface RouteMapClientProps {
  originalRoute: RoutePoint[]
  bestRoute: RoutePoint[]
  reasons: string[]
}

export default function RouteMapClient({ originalRoute, bestRoute, reasons }: RouteMapClientProps) {
  return <RouteMap originalRoute={originalRoute} bestRoute={bestRoute} reasons={reasons} />
}
