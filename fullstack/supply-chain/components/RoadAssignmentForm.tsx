'use client'

import { useState } from 'react'

interface RoadAssignmentFormProps {
  drivers: any[]
}

export default function RoadAssignmentForm({ drivers }: RoadAssignmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    pickupLat: '',
    pickupLng: '',
    deliveryLat: '',
    deliveryLng: '',
    driverId: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/manager/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: formData.driverId,
          pickupLat: parseFloat(formData.pickupLat),
          pickupLng: parseFloat(formData.pickupLng),
          deliveryLat: parseFloat(formData.deliveryLat),
          deliveryLng: parseFloat(formData.deliveryLng),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create assignment')
        return
      }

      setSuccess('Assignment created successfully!')
      setFormData({
        pickupLat: '',
        pickupLng: '',
        deliveryLat: '',
        deliveryLng: '',
        driverId: '',
      })

      // Reload page to show new assignment
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create Assignment</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pickup Coordinates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="pickupLat"
              placeholder="Latitude"
              value={formData.pickupLat}
              onChange={handleChange}
              step="0.0001"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="number"
              name="pickupLng"
              placeholder="Longitude"
              value={formData.pickupLng}
              onChange={handleChange}
              step="0.0001"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        </div>

        {/* Delivery Coordinates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="deliveryLat"
              placeholder="Latitude"
              value={formData.deliveryLat}
              onChange={handleChange}
              step="0.0001"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              required
            />
            <input
              type="number"
              name="deliveryLng"
              placeholder="Longitude"
              value={formData.deliveryLng}
              onChange={handleChange}
              step="0.0001"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        </div>

        {/* Driver Selection */}
        <div>
          <label htmlFor="driverId" className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Driver
          </label>
          <select
            id="driverId"
            name="driverId"
            value={formData.driverId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="">Select a driver...</option>
            {drivers.map((driver: any) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          {loading ? 'Creating...' : 'Create Assignment'}
        </button>
      </form>
    </div>
  )
}
