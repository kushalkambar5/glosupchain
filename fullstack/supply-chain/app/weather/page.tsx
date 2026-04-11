import { eq, gt } from 'drizzle-orm'
import { db } from '@/db/index'
import { weatherResults, weather } from '@/db/schema'
import WeatherDashboard from '@/components/WeatherDashboard'
import { Lightbulb, Sun } from 'lucide-react'

export default async function WeatherPage() {
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const twoDaysAgoISO = twoDaysAgo.toISOString()

  const weatherData = await db.select({
    id: weatherResults.id,
    weatherId: weatherResults.weatherId,
    aiSummary: weatherResults.aiSummary,
    consequence: weatherResults.consequence,
    radiusKm: weatherResults.radiusKm,
    severity: weatherResults.severity,
    confidence: weatherResults.confidence,
    createdAt: weatherResults.createdAt,
    locationName: weather.locationName,
    latitude: weather.latitude,
    longitude: weather.longitude
  })
  .from(weatherResults)
  .leftJoin(weather, eq(weatherResults.weatherId, weather.id))
  .where(gt(weatherResults.createdAt, twoDaysAgoISO))

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">

      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Weather Intelligence</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-2">
                Weather Alerts & Impact Analysis
              </h1>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                Real-time AI analysis of weather events and their impact on supply chain operations. Severity: 0–5
              </p>
            </div>
            <div className="w-full md:w-auto flex flex-col md:items-end justify-center shrink-0 bg-blue-50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none mt-4 md:mt-0">
              <div className="flex items-center gap-4">
                <span className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900">{weatherData.length}</span>
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-amber-600">Active Alert{weatherData.length !== 1 ? 's' : ''}</span>
                  <span className="text-xs md:text-sm font-medium text-gray-500">Detected in real-time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-7xl mx-auto px-6 py-10">

        {/* Legend with improved styling */}
        <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Severity Levels</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-md"></div>
                <span className="text-xs font-bold text-gray-700">Critical (5)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-orange-600 shadow-md"></div>
                <span className="text-xs font-bold text-gray-700">High (4)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md"></div>
                <span className="text-xs font-bold text-gray-700">Medium (3)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-lime-500 shadow-md"></div>
                <span className="text-xs font-bold text-gray-700">Low (2)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md"></div>
                <span className="text-xs font-bold text-gray-700">Minimal (0–1)</span>
              </div>
            </div>
          </div>
          <p className="text-xs flex items-center text-gray-500 mt-4 pt-4 border-t border-gray-200">
            <Lightbulb className="w-4 h-4 mr-2 text-amber-500" /> Review weather alerts to understand impact on shipments, routes, and port operations.
          </p>
        </div>

        {/* Weather alerts component */}
        {weatherData.length === 0 ? (
          <div className="text-center py-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 border-dashed">
            <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <Sun className="w-8 h-8" />
            </div>
            <p className="text-gray-600 text-lg font-semibold mb-1">No weather alerts detected</p>
            <p className="text-gray-400 text-sm">
              Weather conditions are favorable across all monitored regions
            </p>
          </div>
        ) : (
          <WeatherDashboard weather={weatherData} />
        )}
      </section>

      
    </main>
  )
}
