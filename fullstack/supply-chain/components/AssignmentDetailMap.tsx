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

interface AssignmentDetailMapProps {
  bestRoute: RoutePoint[] | null
  reasons: any
}

export default function AssignmentDetailMap({ bestRoute, reasons }: AssignmentDetailMapProps) {
  if (!bestRoute || bestRoute.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center flex items-center justify-center" style={{ height: '500px' }}>
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
    <MapContainer center={center} zoom={10} style={{ height: '500px', width: '100%' }} className="rounded-lg relative z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      
      {/* Start Point */}
      <Marker position={[startPoint.lat, startPoint.lon]}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">Start</p>
            <p>{startPoint.lat.toFixed(2)}, {startPoint.lon.toFixed(2)}</p>
          </div>
        </Popup>
      </Marker>

      {/* End Point */}
      <Marker position={[endPoint.lat, endPoint.lon]}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">End</p>
            <p>{endPoint.lat.toFixed(2)}, {endPoint.lon.toFixed(2)}</p>
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
