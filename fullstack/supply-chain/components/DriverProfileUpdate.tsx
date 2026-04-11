'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DriverProfileUpdateProps {
  currentCapacity: number
  currentLat: number
  currentLon: number
  onUpdate?: () => void
}

export default function DriverProfileUpdate({
  currentCapacity,
  currentLat,
  currentLon,
  onUpdate,
}: DriverProfileUpdateProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    capacity: currentCapacity,
    lat: currentLat,
    lon: currentLon,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'lat' || name === 'lon' 
        ? parseFloat(value) 
        : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/driver/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
        if (onUpdate) onUpdate()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Profile</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
          >
            Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">Profile updated successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck Capacity (units)
            </label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              name="lat"
              value={formData.lat}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="-90"
              max="90"
              step="0.0001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              name="lon"
              value={formData.lon}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="-180"
              max="180"
              step="0.0001"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  capacity: currentCapacity,
                  lat: currentLat,
                  lon: currentLon,
                })
                setError(null)
              }}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Truck Capacity</p>
            <p className="text-lg font-semibold text-gray-900">{Math.round(currentCapacity)} units</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Location</p>
            <p className="text-gray-900 font-semibold">
              {currentLat.toFixed(2)}, {currentLon.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
