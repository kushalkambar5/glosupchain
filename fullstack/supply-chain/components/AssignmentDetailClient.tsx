'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AssignmentDetailMap from '@/components/AssignmentDetailMap'
import RouteComparisonPanel from '@/components/RouteComparisonPanel'

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

interface ParsedRoute {
  nodes: Array<{ lat: number; lon: number }>
  distance_m: number
  duration_min: number | null
  route_rank: number
  winner_reason: string
  selection_reason: string
  reason: string
  factors: {
    traffic: string
    weather: string
    news: string[]
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
  const [visibleRoutes, setVisibleRoutes] = useState<number[]>([1, 2, 3])

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

      router.push('/manager/road')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsCompleting(false)
    }
  }

  // Parse multi-route structure
  const parsedRoutes: ParsedRoute[] = []
  let leg1Points: Array<{ lat: number; lon: number }> = []

  if (assignment.bestRoute && typeof assignment.bestRoute === 'object') {
    // Parse Leg 1: Driver to Source
    if (assignment.bestRoute.leg_1_driver_to_source && Array.isArray(assignment.bestRoute.leg_1_driver_to_source)) {
      const leg1Data = assignment.bestRoute.leg_1_driver_to_source[0]
      if (leg1Data?.nodes) {
        leg1Points = leg1Data.nodes
      }
    }

    // Parse Leg 2: Source to Destination (all 3 routes)
    if (assignment.bestRoute.leg_2_source_to_dest && Array.isArray(assignment.bestRoute.leg_2_source_to_dest)) {
      for (const route of assignment.bestRoute.leg_2_source_to_dest) {
        if (route.nodes && Array.isArray(route.nodes)) {
          parsedRoutes.push({
            nodes: route.nodes,
            distance_m: route.distance_m || 0,
            duration_min: route.duration_min || null,
            route_rank: route.route_rank || 1,
            winner_reason: route.winner_reason || '',
            selection_reason: route.selection_reason || '',
            reason: route.reason || '',
            factors: route.factors || {
              traffic: 'unknown',
              weather: 'unknown',
              news: [],
            },
          })
        }
      }
    }
  }

  const toggleRouteVisibility = (rank: number) => {
    setVisibleRoutes((prev) =>
      prev.includes(rank) ? prev.filter((r) => r !== rank) : [...prev, rank]
    )
  }

  const selectedRoute = parsedRoutes.find((r) => r.route_rank === 1) || parsedRoutes[0]

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
                <h2 className="text-2xl font-bold text-gray-900">Route Comparison Map</h2>
                <p className="text-sm text-gray-600 mt-1">All 3 routes with different colors. Toggle visibility below.</p>
              </div>
              <AssignmentDetailMap
                allRoutes={parsedRoutes}
                leg1={leg1Points}
                visibleRoutes={visibleRoutes}
              />
            </div>

            {/* Route Comparison Panel */}
            {parsedRoutes.length > 0 && (
              <RouteComparisonPanel
                routes={parsedRoutes}
                visibleRoutes={visibleRoutes}
                onToggleRoute={toggleRouteVisibility}
              />
            )}
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
                {selectedRoute && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Selected Route Distance</p>
                      <p className="text-gray-900 font-semibold">{(selectedRoute.distance_m / 1000).toFixed(2)} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimated Duration</p>
                      <p className="text-gray-900 font-semibold">
                        {selectedRoute.duration_min ? selectedRoute.duration_min.toFixed(1) : 'N/A'} minutes
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Route Conditions Summary */}
              {selectedRoute && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Current Conditions:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.factors?.traffic && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        🚗 {selectedRoute.factors.traffic}
                      </span>
                    )}
                    {selectedRoute.factors?.weather && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                        🌤️ {selectedRoute.factors.weather}
                      </span>
                    )}
                    {selectedRoute.factors?.news && selectedRoute.factors.news.length > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                        📰 News alert
                      </span>
                    )}
                  </div>
                </div>
              )}
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

        {/* Selected Route Details */}
        {selectedRoute && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Selected Route Details (Route #1)</h2>

            <div className="space-y-6">
              {/* Selection Reason */}
              {selectedRoute.selection_reason && (
                <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
                  <h3 className="font-semibold text-green-900 mb-2">Why This Route Was Selected</h3>
                  <p className="text-green-800">{selectedRoute.selection_reason}</p>
                </div>
              )}

              {/* Winner Reason */}
              {selectedRoute.winner_reason && (
                <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <h3 className="font-semibold text-blue-900 mb-2">Winner Reason</h3>
                  <p className="text-blue-800">{selectedRoute.winner_reason}</p>
                </div>
              )}

              {/* Conditions Grid */}
              {selectedRoute.factors && Object.keys(selectedRoute.factors).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Road & Weather Conditions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-600 font-semibold">🚗 Traffic</p>
                      <p className="text-gray-900 font-medium mt-1">{selectedRoute.factors.traffic}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-600 font-semibold">🌤️ Weather</p>
                      <p className="text-gray-900 font-medium mt-1">{selectedRoute.factors.weather}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-sm text-amber-600 font-semibold">📰 News Alerts</p>
                      <p className="text-gray-900 font-medium mt-1">
                        {selectedRoute.factors.news?.length > 0
                          ? selectedRoute.factors.news.join(', ')
                          : 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
