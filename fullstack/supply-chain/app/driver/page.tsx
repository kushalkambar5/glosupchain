import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/index'
import { assignments, routes, users, drivers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import DriverLocationTracker from '@/components/DriverLocationTracker'
import DriverAssignmentCard from '@/components/DriverAssignmentCard'
import DriverProfileUpdate from '@/components/DriverProfileUpdate'

export default async function DriverPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Get driver profile
  const driverProfile = await db
    .select()
    .from(drivers)
    .where(eq(drivers.userId, user.id))

  // Get all ROAD assignments for this driver
  const myAssignments = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.driverId, user.id),
        eq(assignments.routeType, 'roads')
      )
    )

  // Get route details and manager info for each assignment
  const assignmentsWithDetails = await Promise.all(
    myAssignments.map(async (a) => {
      const routeResult = await db
        .select()
        .from(routes)
        .where(eq(routes.id, a.routeId as any))
      const route = routeResult[0] || null

      const managerResult = await db
        .select()
        .from(users)
        .where(eq(users.id, a.managerId!))
      const manager = managerResult[0] || null

      return { ...a, route, manager }
    })
  )

  const currentDriver = driverProfile[0]

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-amber-100 p-6">
      <DriverLocationTracker />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Road Driver Dashboard</h1>
        <p className="text-gray-600 mb-8">
          View your assigned delivery tasks and mark them as complete.
        </p>

        {/* Current Location Card and Profile */}
        {currentDriver && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Location Card */}
            <div className="flex flex-col justify-center p-2 mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-1">Your Current Location</h2>
                <p className="text-xs font-medium text-gray-500 mb-6">
                  Last updated: {currentDriver.updatedAt ? new Date(currentDriver.updatedAt).toLocaleString() : 'N/A'}
                </p>
                <div className="flex gap-12">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Latitude</p>
                    <p className="text-4xl font-black tracking-tighter text-gray-900">{currentDriver.lat.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Longitude</p>
                    <p className="text-4xl font-black tracking-tighter text-gray-900">{currentDriver.lon.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Update Card */}
            <DriverProfileUpdate
              currentCapacity={currentDriver.capacity}
              currentLat={currentDriver.lat}
              currentLon={currentDriver.lon}
            />
          </div>
        )}

        {assignmentsWithDetails.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">No assignments yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignmentsWithDetails.map((item) => (
              <DriverAssignmentCard
                key={item.id}
                assignment={item}
                route={item.route}
                manager={item.manager}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}