'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AssignmentDetailMap from '@/components/AssignmentDetailMap'

interface AssignmentDetailClientProps {
  assignment: any
  driverName: string
  routeDetails: {
    srcLat: number
    srcLon: number
    destLat: number
    destLon: number
    goodsAmount: number
  }
}

export default function AssignmentDetailClient({
  assignment,
  driverName,
  routeDetails,
}: AssignmentDetailClientProps) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickupPlace, setPickupPlace] = useState<string | null>(null)
  const [deliveryPlace, setDeliveryPlace] = useState<string | null>(null)
  const [loadingPlaces, setLoadingPlaces] = useState(true)

  // Fetch place names using reverse geocoding
  useEffect(() => {
    const fetchPlaceNames = async () => {
      try {
        setLoadingPlaces(true)
        const [pickupRes, deliveryRes] = await Promise.all([
          fetch(
            `/api/geocode?lat=${routeDetails.srcLat}&lon=${routeDetails.srcLon}`
          ),
          fetch(
            `/api/geocode?lat=${routeDetails.destLat}&lon=${routeDetails.destLon}`
          ),
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

    fetchPlaceNames()
  }, [routeDetails.srcLat, routeDetails.srcLon, routeDetails.destLat, routeDetails.destLon])

  const handleCompleteAssignment = async () => {
    setIsCompleting(true)
    setError(null)

    try {
      const response = await fetch('/api/assignment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to complete assignment')
      }

      // Redirect back to manager dashboard after successful completion
      router.push('/manager/road')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsCompleting(false)
    }
  }

  const reasons = assignment.bestRoute?.reasons || {}
  const routePoints = assignment.bestRoute?.route || []

  // Parse the actual route structure - find the leg with nodes
  let parsedRoutePoints: any[] = []
  let parsedReasons: any = {}

  if (assignment.bestRoute && typeof assignment.bestRoute === 'object') {
    // Check for legs structure (leg_1_driver_to_source, leg_2_source_to_dest, etc.)
    const legs = Object.keys(assignment.bestRoute).filter(key => key.startsWith('leg_'))
    if (legs.length > 0) {
      // Combine all legs with nodes
      for (const legKey of legs) {
        const leg = assignment.bestRoute[legKey]
        if (leg?.nodes && Array.isArray(leg.nodes) && leg.nodes.length > 0) {
          parsedRoutePoints.push(...leg.nodes)
          // Store reasons from the first leg that has content
          if (!parsedReasons.reason && leg.reason) {
            parsedReasons = {
              reason: leg.reason,
              factors: leg.factors || {},
              distance_km: leg.distance_m ? (leg.distance_m / 1000).toFixed(2) : 'N/A',
              duration_min: leg.duration_min ? leg.duration_min.toFixed(1) : 'N/A',
              winner_reason: leg.winner_reason || '',
            }
          }
        }
      }
    } else if (assignment.bestRoute.nodes && Array.isArray(assignment.bestRoute.nodes)) {
      // Direct nodes array
      parsedRoutePoints = assignment.bestRoute.nodes
      parsedReasons = {
        reason: assignment.bestRoute.reason || '',
        factors: assignment.bestRoute.factors || {},
        distance_km: assignment.bestRoute.distance_m ? (assignment.bestRoute.distance_m / 1000).toFixed(2) : 'N/A',
        duration_min: assignment.bestRoute.duration_min ? assignment.bestRoute.duration_min.toFixed(1) : 'N/A',
        winner_reason: assignment.bestRoute.winner_reason || '',
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Assignment Details</h1>
          <p className="text-gray-600 mt-2">Optimized route information and delivery details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Optimized Route</h2>
              </div>
              <AssignmentDetailMap bestRoute={parsedRoutePoints} reasons={parsedReasons} />
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Driver</p>
                  <p className="text-lg font-semibold text-gray-900">{driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity Assigned</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {Math.round(assignment.assignedQuantity)} units
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <p
                    className={`text-lg font-semibold ${
                      assignment.workDone ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {assignment.workDone ? 'Completed' : 'In Progress'}
                  </p>
                </div>
                {assignment.completedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Completed At</p>
                    <p className="text-gray-900">
                      {new Date(assignment.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Route Details Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Pickup Location</p>
                  {loadingPlaces ? (
                    <p className="text-gray-500 text-sm italic">Loading location...</p>
                  ) : (
                    <>
                      <p className="text-gray-900 font-semibold">{pickupPlace || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs">
                        {routeDetails.srcLat.toFixed(2)}, {routeDetails.srcLon.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Location</p>
                  {loadingPlaces ? (
                    <p className="text-gray-500 text-sm italic">Loading location...</p>
                  ) : (
                    <>
                      <p className="text-gray-900 font-semibold">{deliveryPlace || 'Unknown'}</p>
                      <p className="text-gray-500 text-xs">
                        {routeDetails.destLat.toFixed(2)}, {routeDetails.destLon.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Goods</p>
                  <p className="text-gray-900 font-semibold">
                    {Math.round(routeDetails.goodsAmount)} units
                  </p>
                </div>
                {parsedReasons.distance_km && (
                  <div>
                    <p className="text-sm text-gray-600">Route Distance</p>
                    <p className="text-gray-900 font-semibold">{parsedReasons.distance_km} km</p>
                  </div>
                )}
                {parsedReasons.duration_min && (
                  <div>
                    <p className="text-sm text-gray-600">Estimated Duration</p>
                    <p className="text-gray-900 font-semibold">{parsedReasons.duration_min} minutes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Button */}
            {!assignment.workDone && (
              <div className="bg-white rounded-lg shadow-md p-6">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                <button
                  onClick={handleCompleteAssignment}
                  disabled={isCompleting}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                >
                  {isCompleting ? 'Completing...' : 'Mark as Complete'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reasons Section */}
        {parsedReasons && Object.keys(parsedReasons).length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Route Optimization Details</h2>
            
            <div className="space-y-6">
              {/* Main Reason */}
              {parsedReasons.reason && (
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-900 mb-2">Route Optimization Reason</h3>
                  <p className="text-gray-700">{parsedReasons.reason}</p>
                </div>
              )}

              {/* Factors Grid */}
              {parsedReasons.factors && Object.keys(parsedReasons.factors).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Impact Factors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(parsedReasons.factors).map(([key, value]: [string, any]) => (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {typeof value === 'number' ? value.toFixed(3) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Winner Reason */}
              {parsedReasons.winner_reason && (
                <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
                  <h3 className="font-semibold text-gray-900 mb-2">Why This Route Was Selected</h3>
                  <p className="text-gray-700 text-sm">{parsedReasons.winner_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
