import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/index'
import { assignments, users, routes, drivers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import ManagerPanelClient from '@/components/ManagerPanelClient'

export default async function RoadManagerPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Get all routes created by this manager
  const managerRoutes = await db
    .select()
    .from(routes)
    .where(eq(routes.managerId, user.id))

  // Get all assignments for these routes
  const routeIds = managerRoutes.map((r) => r.id)
  const allAssignmentsForRoutes = await db
    .select()
    .from(assignments)
    .where(({ routeId }) => routeIds.includes(routeId as any) as any)

  // Build map of route -> assignments
  const routeAssignmentsMap = new Map<string, any[]>()
  managerRoutes.forEach((route) => {
    routeAssignmentsMap.set(route.id, [])
  })
  allAssignmentsForRoutes.forEach((assignment) => {
    const assignmentsList = routeAssignmentsMap.get(assignment.routeId)
    if (assignmentsList) {
      assignmentsList.push(assignment)
    }
  })

  // Categorize routes
  const pendingRoutes = managerRoutes.filter((r) => {
    const routeAssignments = routeAssignmentsMap.get(r.id) || []
    return routeAssignments.length === 0
  })

  const assignedRoutes = managerRoutes.filter((r) => {
    const routeAssignments = routeAssignmentsMap.get(r.id) || []
    return routeAssignments.length > 0
  })

  // Get detailed information for assigned routes AND build allAssignments list
  const assignedRoutesWithDetails = await Promise.all(
    assignedRoutes.map(async (route) => {
      const routeAssignments = routeAssignmentsMap.get(route.id) || []

      // Fetch details for all assignments
      const assignmentDetails = await Promise.all(
        routeAssignments.map(async (assignment) => {
          const driverUserResult = await db
            .select()
            .from(users)
            .where(eq(users.id, assignment.driverId))
          const driverUser = driverUserResult[0] || null

          const driverProfileResult = await db
            .select()
            .from(drivers)
            .where(eq(drivers.userId, assignment.driverId))
          const driverProfile = driverProfileResult[0] || null

          return {
            assignment,
            driverUser,
            driverProfile,
          }
        })
      )

      return {
        route,
        assignments: assignmentDetails,
      }
    })
  )

  const activeRoutes = assignedRoutesWithDetails.filter(
    (item) => item.assignments && item.assignments.some((a: any) => !a.assignment.workDone)
  )
  const completedRoutes = assignedRoutesWithDetails.filter(
    (item) => item.assignments && item.assignments.every((a: any) => a.assignment.workDone)
  )

  // Build all assignments list for the table
  const allAssignments = assignedRoutesWithDetails.flatMap((item) =>
    item.assignments.map((assignment) => ({
      ...assignment,
      route: item.route,
    }))
  )

  // Get unique drivers
  const uniqueDrivers = Array.from(
    new Map(
      allAssignments.map((a) => [a.driverUser?.id, a])
    ).values()
  )

  return (
    <ManagerPanelClient
      managerRoutes={managerRoutes}
      pendingRoutes={pendingRoutes}
      activeRoutes={activeRoutes}
      completedRoutes={completedRoutes}
      allAssignments={allAssignments}
      uniqueDrivers={uniqueDrivers}
    />
  )
}
