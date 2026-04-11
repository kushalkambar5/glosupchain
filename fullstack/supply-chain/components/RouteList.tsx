'use client'
import { Ship, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Route {
  id: string
  origin: { name: string }
  destination: { name: string }
  type: 'ships' | 'roads'
  reasons: any[]
}

interface RouteListProps {
  ships: Route[]
  roads: Route[]
  selectedId: string | null
  onSelect: (route: Route) => void
}

export default function RouteList({
  ships,
  roads,
  selectedId,
  onSelect,
}: RouteListProps) {
  return (
    <div className="h-full overflow-y-auto">

      {/* Ships section */}
      <div className="mb-4">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5" /> Ships
          </h3>
        </div>
        {ships.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No ship routes yet</p>
        ) : (
          ships.map(route => (
            <button
              key={route.id}
              onClick={() => onSelect(route)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition ${
                selectedId === route.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
            >
              <p className="text-sm font-medium text-gray-800">
                {route.origin?.name} → {route.destination?.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {route.reasons?.length > 0 ? (
                  <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Route changed</span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> On track</span>
                )}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Roads section */}
      <div>
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Roads
          </h3>
        </div>
        {roads.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No road routes yet</p>
        ) : (
          roads.map(route => (
            <button
              key={route.id}
              onClick={() => onSelect(route)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-orange-50 transition ${
                selectedId === route.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''
              }`}
            >
              <p className="text-sm font-medium text-gray-800">
                {route.origin?.name} → {route.destination?.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {route.reasons?.length > 0 ? (
                  <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Route changed</span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> On track</span>
                )}
              </p>
            </button>
          ))
        )}
      </div>

    </div>
  )
}