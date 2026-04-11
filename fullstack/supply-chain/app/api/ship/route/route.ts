import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { ships } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!session || user?.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { shipId } = await req.json()

  if (!shipId) {
    return NextResponse.json({ error: 'shipId is required' }, { status: 400 })
  }

  // Fetch the ship from database
  const shipResult = await db
    .select()
    .from(ships)
    .where(eq(ships.id, shipId))

  if (!shipResult || shipResult.length === 0) {
    return NextResponse.json({ error: 'Ship not found' }, { status: 404 })
  }

  const ship = shipResult[0]

  // TODO: Call ML backend to process ship ID and get lat/long + route comparison
  // For now, return the ship data that's already stored
  // Expected response from ML backend should include:
  // - originalRoute: { waypoints[], distance_km, duration_hrs }
  // - bestRoute: { waypoints[], distance_km, duration_hrs }
  // - reasons: [{ type, severity, description, affected_waypoint }]
  // - affectedZones: [{ name, lat, lng, radius_km }]

  return NextResponse.json({
    shipId: ship.id,
    origin: ship.origin,
    destination: ship.destination,
    originalRoute: ship.originalRoute,
    changedRoute: ship.bestRoute,
    reasons: ship.reasons,
    weatherData: ship.weatherData,
    newsData: ship.newsData,
    refreshedAt: ship.refreshedAt,
  })
}
