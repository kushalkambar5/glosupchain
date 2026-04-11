'use client'

import dynamic from 'next/dynamic'

interface WeatherResultWithLocation {
  id: number
  weatherId: number | null
  aiSummary: string
  consequence: string
  radiusKm: number
  severity: number
  confidence: number
  createdAt: string
  locationName: string | null
  latitude: number | null
  longitude: number | null
}

interface WeatherAlertsMapClientProps {
  weather: WeatherResultWithLocation[]
}

const WeatherAlertsMap = dynamic<WeatherAlertsMapClientProps>(
  () => import('@/components/WeatherAlertsMap'),
  { ssr: false }
)

export default function WeatherAlertsMapClient({ weather }: WeatherAlertsMapClientProps) {
  return <WeatherAlertsMap weather={weather} />
}
