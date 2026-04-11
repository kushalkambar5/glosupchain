'use client'

import dynamic from 'next/dynamic'

const WeatherRoutesMap = dynamic(
  () => import('@/components/WeatherRoutesMap'),
  { ssr: false }
)

interface ShipReroute {
  id: number
  shipId: number
  bestRoute: Array<[number, number]>
  affectedByNews: any
  affectedByWeather: any
  suggestion: string
}

interface WeatherRoutesMapClientProps {
  reroutes: ShipReroute[]
}

export default function WeatherRoutesMapClient({ reroutes }: WeatherRoutesMapClientProps) {
  return <WeatherRoutesMap reroutes={reroutes} />
}
