'use client'

import dynamic from 'next/dynamic'

const AffectedZonesMap = dynamic(
  () => import('@/components/AffectedZonesMap'),
  { ssr: false }
)

interface Zone {
  id: number
  newsId: number | null
  weatherId: number | null
  aiSummary: string
  consequence: string
  centerLat: number
  centerLong: number
  radiusKm: number
  severity: number
  confidence: number
  createdAt: string
}

interface AffectedZonesMapClientProps {
  zones: Zone[]
}

export default function AffectedZonesMapClient({ zones }: AffectedZonesMapClientProps) {
  return <AffectedZonesMap zones={zones} />
}
