'use client'

import { useState } from 'react'
import PaginationControls from './PaginationControls'

interface WeatherResult {
  id: number
  weatherId: number | null
  aiSummary: string
  consequence: string
  radiusKm: number
  severity: number
  confidence: number
  createdAt: string
  locationName?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface WeatherResultsDisplayProps {
  weather: WeatherResult[]
  selectedId?: number | null
  onSelect?: (id: number | null) => void
}

const ITEMS_PER_PAGE = 6

// severity is out of 5
function getSeverityConfig(severity: number) {
  if (severity >= 5) return { color: '#dc2626', label: 'Critical', tailwind: 'bg-red-100 text-red-700' }
  if (severity >= 4) return { color: '#ea580c', label: 'High',     tailwind: 'bg-orange-100 text-orange-700' }
  if (severity >= 3) return { color: '#f59e0b', label: 'Medium',   tailwind: 'bg-yellow-100 text-yellow-700' }
  if (severity >= 2) return { color: '#84cc16', label: 'Low',      tailwind: 'bg-lime-100 text-lime-700' }
  return               { color: '#10b981', label: 'Minimal',  tailwind: 'bg-emerald-100 text-emerald-700' }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WeatherResultsDisplay({ weather, selectedId, onSelect }: WeatherResultsDisplayProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [internalExpandedId, setInternalExpandedId] = useState<number | null>(null)

  const expandedId = selectedId !== undefined ? selectedId : internalExpandedId

  // Sort by severity (highest first), then by date (newest first)
  const sortedWeather = [...weather].sort((a, b) => {
    if (a.severity !== b.severity) {
      return b.severity - a.severity
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Pagination
  const totalPages = Math.ceil(sortedWeather.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const currentWeather = sortedWeather.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const toggleExpand = (id: number) => {
    const newId = expandedId === id ? null : id
    if (onSelect) onSelect(newId)
    else setInternalExpandedId(newId)
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Weather Alerts</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, sortedWeather.length)} of {sortedWeather.length} alerts
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Page <span className="font-bold text-gray-800">{currentPage}</span> / {totalPages}
        </p>
      </div>

      {/* Grid of alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {currentWeather.map(item => {
          const { color, label, tailwind } = getSeverityConfig(item.severity)
          const isExpanded = expandedId === item.id
          const confidencePct = Math.round(item.confidence * 100)

          return (
            <div
              key={item.id}
              onClick={() => toggleExpand(item.id)}
              className={`p-4 rounded-xl border-2 bg-white cursor-pointer transition-all duration-200 ${
                isExpanded
                  ? 'shadow-lg border-gray-300 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Badge + severity score */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${tailwind}`}>
                  {label}
                </span>
                <span className="text-sm font-black" style={{ color }}>
                  {item.severity}/5
                </span>
              </div>

              {/* AI Summary */}
              <p className="text-xs font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">
                {item.aiSummary}
              </p>

              {/* Stats row */}
              <p className={`text-xs font-bold mb-1 flex items-center gap-1 transition-colors ${
                isExpanded ? 'text-blue-600' : 'text-gray-800'
              }`}>
                📍 <span className={isExpanded ? 'underline underline-offset-2' : ''}>
                  {item.locationName || 'Unknown Location'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Coverage: {item.radiusKm.toFixed(0)} km radius · {confidencePct}% confidence
              </p>

              {/* Expandable consequence section */}
              <div className="pt-3 border-t border-gray-200">
                <button
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 hover:text-gray-900 transition"
                >
                  <span>Impact & Consequence</span>
                  <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {isExpanded && (
                  <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.consequence}
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-[10px] text-gray-400">
                  ID: {item.id} · Weather: {item.weatherId || 'N/A'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center py-4 border-t border-gray-200">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
}
