import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/index'
import { shipReroutes, news, weather } from '@/db/schema'
import ShipReroutesMapClient from '@/components/ShipReroutesMapClient'
import { gt, inArray, sql } from 'drizzle-orm'

export default async function ShipReroutesPage() {
  const session = await getServerSession(authOptions)

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const twoDaysAgoISO = twoDaysAgo.toISOString()

  // Fetch all ship reroutes from last 2 days
  const reroutes = await db.select()
    .from(shipReroutes)
    .where(gt(shipReroutes.createdAt, twoDaysAgoISO))

  // Collect all unique news and weather IDs
  const allNewsIds = new Set<bigint>()
  const allWeatherIds = new Set<number>()
  
  reroutes.forEach((reroute) => {
    if (Array.isArray(reroute.affectedByNews)) {
      reroute.affectedByNews.forEach((id: number | bigint) => {
        allNewsIds.add(typeof id === 'bigint' ? id : BigInt(id))
      })
    }
    if (Array.isArray(reroute.affectedByWeather)) {
      reroute.affectedByWeather.forEach((id: number) => allWeatherIds.add(id))
    }
  })

  // Fetch news and weather data
  let newsData: any[] = []
  let weatherData: any[] = []

  if (allNewsIds.size > 0) {
    newsData = await db.select()
      .from(news)
      .where(sql`${news.id} IN (${sql.join(Array.from(allNewsIds).map((id) => sql`${id}`), sql`, `)})`)
  }

  if (allWeatherIds.size > 0) {
    weatherData = await db.select()
      .from(weather)
      .where(inArray(weather.id, Array.from(allWeatherIds)))
  }

  // Enhance reroutes with actual news and weather details
  const mergedReroutes = reroutes.map((reroute) => ({
    ...reroute,
    newsDetails: Array.isArray(reroute.affectedByNews)
      ? reroute.affectedByNews.map((id: number | bigint) => {
          const numId = typeof id === 'bigint' ? Number(id) : id
          return newsData.find((n) => Number(n.id) === numId)
        })
      : [],
    weatherDetails: Array.isArray(reroute.affectedByWeather)
      ? reroute.affectedByWeather.map((id: number) => weatherData.find((w) => w.id === id))
      : [],
  }))

  // Group reroutes by shipId
  type ShipReroute = typeof mergedReroutes[number]
  const groupedReroutes = mergedReroutes.reduce<Record<number, ShipReroute[]>>((acc, reroute) => {
    if (!acc[reroute.shipId]) {
      acc[reroute.shipId] = []
    }
    acc[reroute.shipId].push(reroute)
    return acc
  }, {})

  // Get unique ship IDs from reroutes
  const uniqueShipIds = Object.keys(groupedReroutes).map(Number)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Ship Operations</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-2">
                Ship Reroutes & Optimization
              </h1>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                AI-optimized routes for ships based on weather and news impacts. View reroute details and map visualization.
              </p>
            </div>
            <div className="w-full md:w-auto flex flex-col md:items-end justify-center shrink-0 bg-blue-50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none mt-4 md:mt-0">
              <div className="flex items-center gap-4">
                <span className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900">{reroutes.length}</span>
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-blue-600">Active Reroute{reroutes.length !== 1 ? 's' : ''}</span>
                  <span className="text-xs md:text-sm font-medium text-gray-500">Tracking in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 gap-8">
          {/* Map */}
          <div>
            {reroutes.length > 0 ? (
              <ShipReroutesMapClient reroutes={mergedReroutes as any} />
            ) : (
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md p-12 text-center">
                <p className="text-gray-500 text-lg">No ship reroutes available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      
    </main>
  )
}
