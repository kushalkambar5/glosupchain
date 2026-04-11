'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import WeatherResultsDisplay from './WeatherResultsDisplay'

// Avoid SSR for leaflet
const WeatherAlertsMap = dynamic(
  () => import('./WeatherAlertsMap'),
  { ssr: false }
)

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

interface WeatherDashboardProps {
  weather: WeatherResultWithLocation[]
}

export default function WeatherDashboard({ weather }: WeatherDashboardProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <>
      <WeatherAlertsMap weather={weather} selectedId={selectedId} onSelect={setSelectedId} />
      <WeatherResultsDisplay weather={weather} selectedId={selectedId} onSelect={setSelectedId} />
    </>
  )
}
