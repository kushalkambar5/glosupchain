import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db/index'
import { shipReroutes } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Only allow manager_ship role
  if (!session || user?.role !== 'manager_ship') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const shipId = searchParams.get('shipId')

  try {
    if (shipId) {
      // Search for specific ship reroute by shipId
      const reroute = await db
        .select()
        .from(shipReroutes)
        .where(eq(shipReroutes.shipId, parseInt(shipId)))
        .limit(1)

      if (!reroute.length) {
        return NextResponse.json(
          { error: 'Ship reroute not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        reroute: reroute[0],
      })
    } else {
      // Fetch all ship reroutes for this user
      const allReroutes = await db
        .select()
        .from(shipReroutes)
        .where(eq(shipReroutes.userId, user.id))

      return NextResponse.json({
        reroutes: allReroutes,
      })
    }
  } catch (error) {
    console.error('Error fetching ship reroutes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ship reroutes' },
      { status: 500 }
    )
  }
}
