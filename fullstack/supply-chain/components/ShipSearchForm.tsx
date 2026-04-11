'use client'

import { useState } from 'react'
import ShipRouteMapClient from '@/components/ShipRouteMapClient'
import InfoCards from '@/components/InfoCards'

export default function ShipSearchForm() {
  const [shipId, setShipId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shipData, setShipData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/ship/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipId }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to fetch ship details')
        setShipData(null)
        return
      }

      const data = await response.json()
      setShipData(data)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setShipData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="shipId" className="block text-sm font-medium text-gray-700 mb-2">
            Ship ID
          </label>
          <input
            id="shipId"
            type="text"
            placeholder="Enter ship ID"
            value={shipId}
            onChange={(e) => setShipId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Searching...' : 'Search Ship'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {shipData && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Origin</h3>
              <p className="text-gray-600">
                {shipData.origin?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                {shipData.origin?.lat?.toFixed(4)}, {shipData.origin?.lng?.toFixed(4)}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Destination</h3>
              <p className="text-gray-600">
                {shipData.destination?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                {shipData.destination?.lat?.toFixed(4)}, {shipData.destination?.lng?.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Route Information */}
          {shipData.originalRoute && shipData.bestRoute && (
            <ShipRouteMapClient
              originalRoute={shipData.originalRoute?.waypoints || []}
              bestRoute={shipData.bestRoute?.waypoints || []}
              reasons={shipData.reasons?.map((r: any) => r.description) || []}
            />
          )}

          {/* Affected Zones and Reasons */}
          {shipData.reasons && shipData.reasons.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-3">Route Change Reasons</h3>
              <ul className="space-y-2">
                {shipData.reasons.map((reason: any, idx: number) => (
                  <li key={idx} className="text-sm text-yellow-800">
                    <strong>{reason.type}</strong> - {reason.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {shipData.weatherData && (
            <InfoCards 
              weatherData={shipData.weatherData} 
              newsData={shipData.newsData}
              reasons={shipData.reasons || []}
              originalRoute={shipData.originalRoute || {}}
              bestRoute={shipData.bestRoute || {}}
            />
          )}
        </div>
      )}
    </>
  )
}
