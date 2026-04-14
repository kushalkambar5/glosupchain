'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { LocateFixed, MapPin, Navigation, Plus, Loader2 } from 'lucide-react'

// Fix for default marker icons in react-leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

// Map Click Handler Component
function MapClickHandler({ onMapClick, selecting }: { onMapClick: (lat: number, lng: number) => void, selecting: 'source' | 'destination' | null }) {
  useMapEvents({
    click(e) {
      if (selecting) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export default function RoadManagerRouteForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectingMode, setSelectingMode] = useState<'source' | 'destination' | null>(null)
  
  const [form, setForm] = useState({
    srcLat: '',
    srcLon: '',
    destLat: '',
    destLon: '',
    goodsAmount: '',
  })

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    if (selectingMode === 'source') {
      setForm(prev => ({ ...prev, srcLat: lat.toFixed(6), srcLon: lng.toFixed(6) }))
      setSelectingMode(null)
    } else if (selectingMode === 'destination') {
      setForm(prev => ({ ...prev, destLat: lat.toFixed(6), destLon: lng.toFixed(6) }))
      setSelectingMode(null)
    }
  }

  async function handleCreateRoute() {
    setLoading(true)
    setError('')
    setSuccess(false)

    // Basic required validation
    if (!form.srcLat || !form.srcLon || !form.destLat || !form.destLon || !form.goodsAmount) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    const srcLat = parseFloat(form.srcLat)
    const srcLon = parseFloat(form.srcLon)
    const destLat = parseFloat(form.destLat)
    const destLon = parseFloat(form.destLon)
    const goodsAmount = parseFloat(form.goodsAmount)

    // Number validation
    if (isNaN(srcLat) || isNaN(srcLon) || isNaN(destLat) || isNaN(destLon) || isNaN(goodsAmount)) {
      setError('Please enter valid numbers for coordinates and goods amount')
      setLoading(false)
      return
    }

    // Range/Logic validation
    if (goodsAmount <= 0) {
      setError('Goods amount must be greater than 0')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/manager/roads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srcLat,
          srcLon,
          destLat,
          destLon,
          goodsAmount,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create route in database')
        setLoading(false)
        return
      }

      // Attempt ML Assignment via proxy endpoint
      let mlSuccess = false
      try {
        const resk = await fetch('/api/ml/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routeId: data.route.id,
          }),
        })

        const data2 = await resk.json()
        if (resk.ok) mlSuccess = true
      } catch (mlErr) {
        console.error('ML Assignment Service Error:', mlErr)
      }

      setSuccess(true)
      setForm({
        srcLat: '',
        srcLon: '',
        destLat: '',
        destLon: '',
        goodsAmount: '',
      })
      
      setTimeout(() => {
        router.refresh()
      }, 2000)

    } catch (err) {
      setError('An unexpected error occurred. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Markers for Map
  const srcPos: [number, number] | null = (form.srcLat && form.srcLon) 
    ? [parseFloat(form.srcLat), parseFloat(form.srcLon)] : null
  const destPos: [number, number] | null = (form.destLat && form.destLon) 
    ? [parseFloat(form.destLat), parseFloat(form.destLon)] : null

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Form */}
        <div className="p-8 border-r border-gray-100 bg-linear-to-b from-white to-gray-50/30">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">New Delivery Route</h2>
              <p className="text-sm text-gray-500">Pick locations on map or enter manually</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl mb-6 font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm p-4 rounded-xl mb-6 font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" /> Route created successfully!
            </div>
          )}

          <div className="space-y-8">
            {/* Pickup Location */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs ring-1 ring-black/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Pickup Location</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectingMode(selectingMode === 'source' ? null : 'source')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectingMode === 'source'
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <LocateFixed className="w-3 h-3" />
                  {selectingMode === 'source' ? 'Picking on Map...' : 'Pick on Map'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.srcLat}
                    onChange={(e) => setForm({ ...form, srcLat: e.target.value })}
                    placeholder="40.7128"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.srcLon}
                    onChange={(e) => setForm({ ...form, srcLon: e.target.value })}
                    placeholder="-74.0060"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-xs ring-1 ring-black/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Delivery Location</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectingMode(selectingMode === 'destination' ? null : 'destination')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectingMode === 'destination'
                      ? 'bg-red-600 text-white ring-4 ring-red-100'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <LocateFixed className="w-3 h-3" />
                  {selectingMode === 'destination' ? 'Picking on Map...' : 'Pick on Map'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.destLat}
                    onChange={(e) => setForm({ ...form, destLat: e.target.value })}
                    placeholder="34.0522"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.destLon}
                    onChange={(e) => setForm({ ...form, destLon: e.target.value })}
                    placeholder="-118.2437"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Goods Amount */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Initial Goods Amount (units)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={form.goodsAmount}
                  onChange={(e) => setForm({ ...form, goodsAmount: e.target.value })}
                  placeholder="e.g., 500"
                  className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-bold placeholder:font-normal placeholder:text-gray-300"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreateRoute}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-gray-200 hover:shadow-xl hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Initialising System...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Initialise New Route
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="h-[400px] lg:h-auto min-h-[500px] relative">
          {selectingMode && (
            <div className="absolute top-6 left-6 right-6 z-[1000] bg-white/90 backdrop-blur-md border border-blue-100 p-4 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectingMode === 'source' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">
                    Click to set {selectingMode === 'source' ? 'Pickup' : 'Delivery'}
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">Click anywhere on the map to capture coordinates</p>
                </div>
              </div>
            </div>
          )}

          <div className="h-full w-full grayscale-[0.2] hover:grayscale-0 transition-all duration-700">
            <MapContainer
              center={[20.5937, 78.9629]} // India center as default
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                noWrap={true}
                bounds={[[-90, -180], [90, 180]]}
              />
              <MapClickHandler onMapClick={handleMapClick} selecting={selectingMode} />
              
              {srcPos && (
                <Marker position={srcPos}>
                  <Popup className="font-bold text-blue-600">Pickup Location</Popup>
                </Marker>
              )}
              {destPos && (
                <Marker position={destPos}>
                  <Popup className="font-bold text-red-600">Delivery Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000]">
            <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-gray-700">Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-gray-700">Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Route Intelligence &bull; AI Powered Optimization
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          System v4.2.1
        </p>
      </div>
    </div>
  )
}

