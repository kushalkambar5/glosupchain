'use client'

import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

interface RoutePoint {
  lat: number
  lon: number
}

interface RouteData {
  nodes: RoutePoint[]
  route_rank: number
}

interface AssignmentDetailMapProps {
  allRoutes?: RouteData[]
  bestRoute?: RoutePoint[] | null
  leg1?: RoutePoint[] | null
  visibleRoutes?: number[]
  reasons?: any
}

const routeColors = ['#22c55e', '#fb923c', '#ef4444'] // green, orange, red

// Custom marker icons
const createCustomIcon = (iconColor: string, label: string) => {
  return L.icon({
    iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(iconColor)}'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12c0 7 10 11 10 11s10-4 10-11c0-5.52-4.48-10-10-10zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z'/%3E%3C/svg%3E`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'custom-marker',
  })
}

export default function AssignmentDetailMap({
  allRoutes,
  bestRoute,
  leg1,
  visibleRoutes = [1, 2, 3],
  reasons,
}: AssignmentDetailMapProps) {
  // Handle new multi-route structure
  if (allRoutes && allRoutes.length > 0) {
    // Combine all visible routes to calculate map bounds
    const allVisiblePoints: RoutePoint[] = []
    const routesToDisplay: Array<{ data: RouteData; color: string }> = []

    for (const route of allRoutes) {
      if (visibleRoutes.includes(route.route_rank) && route.nodes?.length > 0) {
        allVisiblePoints.push(...route.nodes)
        const colorIdx = Math.min(route.route_rank - 1, routeColors.length - 1)
        routesToDisplay.push({
          data: route,
          color: routeColors[colorIdx],
        })
      }
    }

    if (allVisiblePoints.length === 0) {
      return (
        <div
          className="bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center"
          style={{ height: '500px' }}
        >
          <p className="text-gray-500">No route data available</p>
        </div>
      )
    }

    // Calculate center based on all points
    const lats = allVisiblePoints.map((p) => p.lat)
    const lons = allVisiblePoints.map((p) => p.lon)
    const center: [number, number] = [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lons) + Math.max(...lons)) / 2,
    ]

    return (
      <div className="rounded-lg relative z-0 overflow-hidden">
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: '500px', width: '100%' }}
          className="rounded-lg"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Leg 1 - Driver to Source */}
          {leg1 && leg1.length > 0 && (
            <>
              <Polyline
                positions={leg1.map((p) => [p.lat, p.lon])}
                color="#6366f1"
                weight={5}
                opacity={0.8}
                dashArray="8 6"
              />
              <Marker position={[leg1[0].lat, leg1[0].lon]} icon={createCustomIcon('%233b82f6', 'Driver')}>
                <Popup>
                  <div className="text-sm font-semibold">
                    <p>🚗 Driver Location</p>
                  </div>
                </Popup>
              </Marker>
              <Marker position={[leg1[leg1.length - 1].lat, leg1[leg1.length - 1].lon]} icon={createCustomIcon('%2310b981', 'Source')}>
                <Popup>
                  <div className="text-sm font-semibold">
                    <p>📍 Source/Pickup Location</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Leg 2 - All Route Options */}
          {routesToDisplay.map((route, idx) => (
            <Polyline
              key={idx}
              positions={route.data.nodes.map((p) => [p.lat, p.lon])}
              color={route.color}
              weight={6}
              opacity={0.9}
              dashArray={route.data.route_rank === 1 ? 'none' : '10 6'}
            />
          ))}

          {/* Destination markers - one for each route */}
          {routesToDisplay.map((route, idx) => (
            route.data.nodes?.length > 0 && (
              <Marker
                key={`dest-${idx}`}
                position={[
                  route.data.nodes[route.data.nodes.length - 1].lat,
                  route.data.nodes[route.data.nodes.length - 1].lon,
                ]}
                icon={createCustomIcon(route.color.substring(1), `Route #${route.data.route_rank}`)}
              >
                <Popup>
                  <div className="text-sm font-semibold">
                    <p>🏁 Destination - Route #{route.data.route_rank}</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="flex gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6366f1' }}></div>
            <span className="text-xs text-gray-700">Leg 1: Driver → Source</span>
          </div>
          {routeColors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs text-gray-700">
                Route #{idx + 1} {idx === 0 ? '(Winner)' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback to old single-route display
  if (!bestRoute || bestRoute.length === 0) {
    return (
      <div
        className="bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center"
        style={{ height: '500px' }}
      >
        <p className="text-gray-500">No route data available</p>
      </div>
    )
  }

  const startPoint = bestRoute[0]
  const endPoint = bestRoute[bestRoute.length - 1]
  const center: [number, number] = [
    (startPoint.lat + endPoint.lat) / 2,
    (startPoint.lon + endPoint.lon) / 2,
  ]

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: '500px', width: '100%' }}
      className="rounded-lg relative z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Start Point */}
      <Marker position={[startPoint.lat, startPoint.lon]}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Start</p>
            <p>
              {startPoint.lat.toFixed(2)}, {startPoint.lon.toFixed(2)}
            </p>
          </div>
        </Popup>
      </Marker>

      {/* End Point */}
      <Marker position={[endPoint.lat, endPoint.lon]}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">End</p>
            <p>
              {endPoint.lat.toFixed(2)}, {endPoint.lon.toFixed(2)}
            </p>
          </div>
        </Popup>
      </Marker>

      {/* Route Line */}
      <Polyline
        positions={bestRoute.map((p) => [p.lat, p.lon])}
        color="blue"
        weight={3}
        opacity={0.7}
      />
    </MapContainer>
  )
}
