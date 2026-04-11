import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db/index'
import { assignments, users, routes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import AssignmentDetailClient from '@/components/AssignmentDetailClient'

export default async function DriverAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  try {
    const { assignmentId } = await params
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    // Get the assignment
    const assignmentResult = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId as any))

    if (!assignmentResult.length) {
      redirect('/driver')
    }

    const assignment = assignmentResult[0]

    // Check if the assignment belongs to this driver
    if (user.id !== assignment.driverId) {
      redirect('/driver')
    }

    // Get driver information
    const driverUserResult = await db
      .select()
      .from(users)
      .where(eq(users.id, assignment.driverId))

    const driverUser = driverUserResult[0] || { name: 'Unknown' }

    // Get route details
    const routeResult = await db
      .select()
      .from(routes)
      .where(eq(routes.id, assignment.routeId as any))

    if (!routeResult.length) {
      redirect('/driver')
    }

    const route = routeResult[0]

    return (
      <AssignmentDetailClient
        assignment={assignment}
        driverName={driverUser.name}
        routeDetails={{
          srcLat: route.srcLat,
          srcLon: route.srcLon,
          destLat: route.destLat,
          destLon: route.destLon,
          goodsAmount: route.goodsAmount,
        }}
      />
    )
  } catch (error) {
    console.error('[Driver Assignment Detail Error]', error)
    redirect('/driver')
  }
  
}
