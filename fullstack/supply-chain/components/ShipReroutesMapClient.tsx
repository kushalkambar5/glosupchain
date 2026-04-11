'use client'

import dynamic from 'next/dynamic'

const ShipReroutesMap = dynamic(
  () => import('@/components/ShipReroutesMap'),
  { ssr: false }
)

interface ShipReroute {
  id: number
  shipId: number
  bestRoute: Array<[number, number]>
  affectedByNews: any
  affectedByWeather: any
  suggestion: string
  createdAt: string
}

interface ShipReroutesMapClientProps {
  reroutes: ShipReroute[]
}

export default function ShipReroutesMapClient({ reroutes }: ShipReroutesMapClientProps) {
  return <ShipReroutesMap reroutes={reroutes} />
}
