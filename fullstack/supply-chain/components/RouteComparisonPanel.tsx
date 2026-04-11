'use client'

import { useState } from 'react'

interface RouteData {
  nodes: Array<{ lat: number; lon: number }>
  distance_m: number
  duration_min: number | null
  route_rank: number
  winner_reason: string
  selection_reason: string
  reason: string
  factors: {
    traffic: string
    weather: string
    news: string[]
  }
}

interface RouteComparisonPanelProps {
  routes: RouteData[]
  visibleRoutes: number[]
  onToggleRoute: (rank: number) => void
}

const routeColors = ['#22c55e', '#fb923c', '#ef4444'] // green, orange, red
const routeNames = ['Route #1 (Winner)', 'Route #2', 'Route #3']

export default function RouteComparisonPanel({
  routes,
  visibleRoutes,
  onToggleRoute,
}: RouteComparisonPanelProps) {
  if (!routes || routes.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Comparison</h3>

      <div className="space-y-4">
        {routes.map((route, idx) => {
          const routeRank = route.route_rank
          const color = routeColors[routeRank - 1] || '#gray'
          const name = routeNames[routeRank - 1] || `Route #${routeRank}`
          const isVisible = visibleRoutes.includes(routeRank)

          return (
            <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Route Header with Color Indicator */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  ></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{name}</h4>
                    {routeRank === 1 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ⭐ Selected
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onToggleRoute(routeRank)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    isVisible
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isVisible ? '👁️ Visible' : '🚫 Hidden'}
                </button>
              </div>

              {/* Route Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {route.duration_min ? route.duration_min.toFixed(1) : 'N/A'} min
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-600">Distance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {(route.distance_m / 1000).toFixed(2)} km
                  </p>
                </div>
              </div>

              {/* Route Factors */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Conditions:</p>
                <div className="flex flex-wrap gap-2">
                  {route.factors?.traffic && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      🚗 {route.factors.traffic}
                    </span>
                  )}
                  {route.factors?.weather && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                      🌤️ {route.factors.weather}
                    </span>
                  )}
                  {route.factors?.news && route.factors.news.length > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                      📰 {route.factors.news[0] || 'News alert'}
                    </span>
                  )}
                </div>
              </div>

              {/* Selection Reason */}
              {route.selection_reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs font-semibold text-yellow-900 mb-1">Why this route:</p>
                  <p className="text-sm text-yellow-800">{route.selection_reason}</p>
                </div>
              )}

              {/* Winner Reason */}
              {routeRank === 1 && route.winner_reason && (
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                  <p className="text-xs font-semibold text-green-900 mb-1">Winner reason:</p>
                  <p className="text-sm text-green-800">{route.winner_reason}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-3">Color Legend:</p>
        <div className="space-y-2">
          {routeColors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
              <span className="text-sm text-gray-700">{routeNames[idx]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
