'use client'

import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState } from 'react'
import { Map as MapIcon, Ship, MapPin, AlertTriangle, Wind, Newspaper, Check, Navigation, Info, Bot } from 'lucide-react'

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface ShipReroute {
  id: number
  shipId: number
  bestRoute: Array<[number, number]>
  affectedByNews: any
  affectedByWeather: any
  suggestion: string
}

interface WeatherRoutesMapProps {
  reroutes: ShipReroute[]
}

function interpolateRoute(points: Array<[number, number]>, steps: number = 10): Array<[number, number]> {
  const result: Array<[number, number]> = []

  for (let i = 0; i < points.length - 1; i++) {
    const [fromLat, fromLon] = points[i]
    const [toLat, toLon] = points[i + 1]

    for (let t = 0; t <= steps; t++) {
      const ratio = t / steps

      // midpoint slightly offset to create natural curve
      const midLat = (fromLat + toLat) / 2 + (toLon - fromLon) * 0.05
      const midLon = (fromLon + toLon) / 2 - (toLat - fromLat) * 0.05

      // quadratic bezier curve formula
      const lat =
        (1 - ratio) * (1 - ratio) * fromLat +
        2 * (1 - ratio) * ratio * midLat +
        ratio * ratio * toLat

      const lon =
        (1 - ratio) * (1 - ratio) * fromLon +
        2 * (1 - ratio) * ratio * midLon +
        ratio * ratio * toLon

      result.push([lat, lon])
    }
  }

  return result
}

export default function WeatherRoutesMap({ reroutes }: WeatherRoutesMapProps) {
  const [selectedRoute, setSelectedRoute] = useState<ShipReroute | null>(null)

  // Filter out invalid reroutes and validate bestRoute data
  const validReroutes = reroutes.filter(
    r => r && r.bestRoute && Array.isArray(r.bestRoute) && r.bestRoute.length > 0
  )

  if (!validReroutes || validReroutes.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md p-6 text-center">
        <p className="text-gray-500">No valid reroutes available to display on map</p>
      </div>
    )
  }

  // Calculate bounds from all valid routes
  const allPoints = validReroutes.flatMap(r => {
    return Array.isArray(r.bestRoute) ? r.bestRoute : []
  }).filter(p => p && Array.isArray(p) && p.length >= 2)
  
  if (allPoints.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md p-6 text-center">
        <p className="text-gray-500">No valid route coordinates found</p>
      </div>
    )
  }

  const lats = allPoints.map(p => p[0])
  const lons = allPoints.map(p => p[1])
  
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md relative z-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-gray-800 text-lg font-bold flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-blue-600" /> Optimal Reroutes Due to Weather
        </h2>
        <p className="text-gray-500 text-sm">Best routes suggested by AI based on weather impacts</p>
      </div>

      {/* Map Container */}
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={4}
        minZoom={2}
        maxZoom={18}
        style={{ height: '600px', width: '100%' }}
        maxBounds={[[-85, -180], [85, 180]]}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          noWrap={true}
        />

        {/* Render each reroute */}
        {validReroutes.map((reroute, idx) => {
          // Validate bestRoute array
          if (!reroute.bestRoute || !Array.isArray(reroute.bestRoute) || reroute.bestRoute.length < 2) {
            return null
          }

          const color = colors[idx % colors.length]
          const smoothRoute = interpolateRoute(reroute.bestRoute, 15)
          const routePositions = smoothRoute.map(p => [p[0], p[1]] as [number, number])
          
          const startPoint = reroute.bestRoute[0]
          const endPoint = reroute.bestRoute[reroute.bestRoute.length - 1]

          // Validate points
          if (!startPoint || !endPoint || !Array.isArray(startPoint) || !Array.isArray(endPoint)) {
            return null
          }

          const startLat = startPoint[0]
          const startLon = startPoint[1]
          const endLat = endPoint[0]
          const endLon = endPoint[1]

          // Validate coordinates are valid numbers
          if (
            typeof startLat !== 'number' || typeof startLon !== 'number' ||
            typeof endLat !== 'number' || typeof endLon !== 'number' ||
            isNaN(startLat) || isNaN(startLon) || isNaN(endLat) || isNaN(endLon)
          ) {
            return null
          }

          return (
            <div key={reroute.id}>
              {/* Invisible clickable overlay - larger hit area */}
              <Polyline
                positions={routePositions}
                color="transparent"
                weight={15}
                opacity={0}
                smoothFactor={5}
                eventHandlers={{
                  click: () => setSelectedRoute(reroute)
                }}
                className="cursor-pointer"
              />

              {/* Route Line */}
              <Polyline
                positions={routePositions}
                color={color}
                weight={5}
                opacity={0.8}
                smoothFactor={5}
                eventHandlers={{
                  click: () => setSelectedRoute(reroute)
                }}
                className="cursor-pointer hover:opacity-100"
              />

              {/* Start Point Marker */}
              <Marker position={[startLat, startLon]}>
                <Popup>
                  <div className="text-sm font-semibold">
                    <p className="flex items-center gap-1.5"><Ship className="w-4 h-4 text-gray-500" /> Ship {reroute.shipId}</p>
                    <p className="text-xs text-gray-600 mt-1">Route Start</p>
                    <p className="text-xs mt-1">{startLat.toFixed(2)}°, {startLon.toFixed(2)}°</p>
                  </div>
                </Popup>
              </Marker>

              {/* End Point Marker */}
              <Marker position={[endLat, endLon]}>
                <Popup>
                  <div className="text-sm font-semibold">
                    <p className="flex items-center gap-1.5"><Ship className="w-4 h-4 text-gray-500" /> Ship {reroute.shipId}</p>
                    <p className="text-xs text-gray-600 mt-1">Route End</p>
                    <p className="text-xs mt-1">{endLat.toFixed(2)}°, {endLon.toFixed(2)}°</p>
                  </div>
                </Popup>
              </Marker>

              {/* Weather Impact Zone - visual indicator */}
              {reroute.affectedByWeather?.severity && (
                <Circle
                  center={[centerLat, centerLon]}
                  radius={Math.max(50000, reroute.affectedByWeather.severity * 20000)}
                  pathOptions={{ 
                    color: color, 
                    fill: true, 
                    fillColor: color,
                    fillOpacity: 0.05,
                    weight: 1,
                    dashArray: '5, 5'
                  }}
                />
              )}
            </div>
          )
        })}

      </MapContainer>

      {/* Route Details Modal */}
      {selectedRoute && (
        <div 
          className="fixed inset-0 flex items-center justify-end z-[9999] p-4 pointer-events-auto"
          onClick={() => setSelectedRoute(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full md:w-[45%] max-w-lg h-[70vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white flex justify-between items-center border-b border-blue-700 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Ship className="w-5 h-5 text-blue-600" /> Ship {selectedRoute.shipId}</h2>
                <p className="text-blue-100 text-sm mt-1">AI-Generated Reroute Information</p>
              </div>
              <button
                onClick={() => setSelectedRoute(null)}
                className="text-white hover:bg-blue-700 p-2 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              
              {/* AI Summary Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Bot className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 mb-2 text-sm">AI Recommendation</h3>
                    <p className="text-gray-700 leading-relaxed text-xs">
                      {selectedRoute.suggestion || 'No AI recommendation available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Route Information Grid */}
              <div className="grid grid-cols-1 gap-3">
                
                {/* Route Coordinates */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-2 text-xs flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" /> Route Points
                  </h4>
                  <div className="space-y-1 text-xs">
                    {selectedRoute.bestRoute && selectedRoute.bestRoute.length > 0 && (
                      <>
                        <div>
                          <p className="text-gray-600">Start:</p>
                          <p className="font-mono text-gray-800 text-[10px]">
                            {selectedRoute.bestRoute[0][0].toFixed(4)}°, {selectedRoute.bestRoute[0][1].toFixed(4)}°
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">End:</p>
                          <p className="font-mono text-gray-800 text-[10px]">
                            {selectedRoute.bestRoute[selectedRoute.bestRoute.length - 1][0].toFixed(4)}°, {selectedRoute.bestRoute[selectedRoute.bestRoute.length - 1][1].toFixed(4)}°
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Waypoints: <span className="font-bold">{selectedRoute.bestRoute.length}</span></p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Impact Factors */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-2 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Impacts
                  </h4>
                  <div className="space-y-2 text-xs">
                    {selectedRoute.affectedByWeather ? (
                      <div className="p-2 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-[10px] font-bold text-orange-700 mb-1 flex items-center gap-1"><Wind className="w-3 h-3" /> WEATHER</p>
                        <p className="text-[10px] text-orange-600 line-clamp-2">
                          {typeof selectedRoute.affectedByWeather === 'string' 
                            ? selectedRoute.affectedByWeather 
                            : JSON.stringify(selectedRoute.affectedByWeather).substring(0, 80)}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> No weather impact</div>
                    )}
                    {selectedRoute.affectedByNews ? (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-[10px] font-bold text-blue-700 mb-1 flex items-center gap-1"><Newspaper className="w-3 h-3" /> NEWS</p>
                        <p className="text-[10px] text-blue-600 line-clamp-2">
                          {typeof selectedRoute.affectedByNews === 'string' 
                            ? selectedRoute.affectedByNews 
                            : JSON.stringify(selectedRoute.affectedByNews).substring(0, 80)}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500 flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> No news impact</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Waypoints List */}
              {selectedRoute.bestRoute && selectedRoute.bestRoute.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-2 text-xs flex items-center gap-1"><Navigation className="w-3 h-3 text-gray-500" /> Waypoints</h4>
                  <div className="max-h-24 overflow-y-auto">
                    <div className="space-y-1">
                      {selectedRoute.bestRoute.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-1 p-1 bg-white rounded border border-gray-200 text-[10px]">
                          <span className="font-bold text-gray-600 w-5">{idx + 1}</span>
                          <code className="text-gray-700 flex-1 text-[9px]">
                            {point[0].toFixed(4)}°, {point[1].toFixed(4)}°
                          </code>
                          {idx === 0 && <span className="px-1 py-0.5 bg-green-100 text-green-700 rounded text-[8px] font-bold">S</span>}
                          {idx === selectedRoute.bestRoute.length - 1 && <span className="px-1 py-0.5 bg-red-100 text-red-700 rounded text-[8px] font-bold">E</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="font-bold text-gray-800 mb-2 text-xs flex items-center gap-1"><Info className="w-3 h-3 text-gray-500" /> Info</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600 text-[10px]">Ship ID</p>
                    <p className="font-bold text-gray-800">{selectedRoute.shipId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-[10px]">Route ID</p>
                    <p className="font-bold text-gray-800">{selectedRoute.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Details Below Map */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Route Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {validReroutes.map((reroute, idx) => {
            const color = colors[idx % colors.length]
            return (
              <div key={reroute.id} className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div
                    className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: color }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">Ship {reroute.shipId}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {reroute.suggestion || 'No suggestion provided'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {reroute.affectedByWeather && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                          <Wind className="w-3 h-3" /> Weather
                        </span>
                      )}
                      {reroute.affectedByNews && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          <Newspaper className="w-3 h-3" /> News
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
