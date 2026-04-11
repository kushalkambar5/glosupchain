'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DriverAssignmentCardProps {
  assignment: any
  route: any
  manager: any
}

export default function DriverAssignmentCard({
  assignment,
  route,
  manager,
}: DriverAssignmentCardProps) {
  const [pickupPlace, setPickupPlace] = useState<string | null>(null)
  const [deliveryPlace, setDeliveryPlace] = useState<string | null>(null)
  const [loadingPlaces, setLoadingPlaces] = useState(true)

  useEffect(() => {
    const fetchPlaceNames = async () => {
      try {
        setLoadingPlaces(true)
        const [pickupRes, deliveryRes] = await Promise.all([
          fetch(`/api/geocode?lat=${route.srcLat}&lon=${route.srcLon}`),
          fetch(`/api/geocode?lat=${route.destLat}&lon=${route.destLon}`),
        ])

        if (pickupRes.ok) {
          const pickupData = await pickupRes.json()
          setPickupPlace(pickupData.placeName)
        }

        if (deliveryRes.ok) {
          const deliveryData = await deliveryRes.json()
          setDeliveryPlace(deliveryData.placeName)
        }
      } catch (err) {
        console.error('Failed to fetch place names:', err)
      } finally {
        setLoadingPlaces(false)
      }
    }

    if (route) {
      fetchPlaceNames()
    }
  }, [route])

  if (!route) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {loadingPlaces ? 'Loading...' : `${pickupPlace || 'Pickup'} → ${deliveryPlace || 'Delivery'}`}
            </h2>
            <p className="text-gray-600">
              Manager: <span className="font-medium">{manager?.name || 'N/A'}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                assignment.workDone
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {assignment.workDone ? 'Completed' : 'In Progress'}
            </span>
            <Link
              href={`/driver/assignment/${assignment.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
            >
              View Details →
            </Link>
          </div>
        </div>

        {/* Coordinates Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Pickup Location</p>
            {loadingPlaces ? (
              <p className="text-gray-500 text-sm italic">Loading...</p>
            ) : (
              <>
                <p className="text-gray-900 font-semibold">{pickupPlace || 'Unknown'}</p>
                <p className="text-gray-500 text-xs">
                  {route.srcLat?.toFixed(2)}, {route.srcLon?.toFixed(2)}
                </p>
              </>
            )}
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 font-medium">Delivery Location</p>
            {loadingPlaces ? (
              <p className="text-gray-500 text-sm italic">Loading...</p>
            ) : (
              <>
                <p className="text-gray-900 font-semibold">{deliveryPlace || 'Unknown'}</p>
                <p className="text-gray-500 text-xs">
                  {route.destLat?.toFixed(2)}, {route.destLon?.toFixed(2)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Route Info */}
        {assignment.bestRoute && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-900">
              <strong>Goods Amount:</strong> {Math.round(route.goodsAmount || 0)} units |
              <strong className="ml-3">Quantity Assigned:</strong> {Math.round(assignment.assignedQuantity || 0)} units
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Assigned: {assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : 'N/A'}{' '}
          {assignment.completedAt &&
            `| Completed: ${new Date(assignment.completedAt).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  )
}
