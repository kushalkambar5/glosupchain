'use client'

import { useState } from 'react'

interface ShipReroute {
  id: number
  userId: string
  shipId: number
  affectedByNews: any
  affectedByWeather: any
  suggestion: string
  bestRoute: any
  createdAt: string
}

interface ShipManagerFormProps {
  onRerouteSelect: (reroute: ShipReroute) => void
}

export default function ShipManagerForm({ onRerouteSelect }: ShipManagerFormProps) {
  const [searchInput, setSearchInput] = useState<string>('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string>('')
  const [lastSearchedId, setLastSearchedId] = useState<string>('')

  async function handleSearchById() {
    if (!searchInput.trim()) {
      setError('Please enter a Ship ID')
      return
    }

    try {
      setSearching(true)
      setError('')

      const response = await fetch(`/api/manager/ships?shipId=${searchInput}`)

      if (response.status === 404) {
        setError(`Ship ID "${searchInput}" not found`)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch ship reroute')
      }

      const data = await response.json()
      
      if (data.reroute) {
        onRerouteSelect(data.reroute)
        setLastSearchedId(searchInput)
        // Save to localStorage
        localStorage.setItem('selectedShipId', searchInput)
        localStorage.setItem('selectedReroute', JSON.stringify(data.reroute))
      }
    } catch (err) {
      console.error('Error searching ship reroute:', err)
      setError('Failed to search ship reroute')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Ship by ID
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearchById()
            }
          }}
          placeholder="Enter Ship ID..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm"
        />
        <button
          onClick={handleSearchById}
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {lastSearchedId && !error && (
        <p className="text-sm text-green-600 mt-2">
          Ship ID {lastSearchedId} loaded
        </p>
      )}
    </div>
  )
}
