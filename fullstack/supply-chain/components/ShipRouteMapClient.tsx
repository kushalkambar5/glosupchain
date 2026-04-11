'use client'

import dynamic from 'next/dynamic'

const ShipRouteMap = dynamic(
  () => import('@/components/ShipRouteMap'),
  { ssr: false }
)

interface RoutePoint {
  lat: number
  lng: number
}

interface ShipRouteMapClientProps {
  originalRoute: RoutePoint[]
  bestRoute: RoutePoint[]
  reasons: string[]
}

export default function ShipRouteMapClient({ originalRoute, bestRoute, reasons }: ShipRouteMapClientProps) {
  return <ShipRouteMap originalRoute={originalRoute} bestRoute={bestRoute} reasons={reasons} />
}
