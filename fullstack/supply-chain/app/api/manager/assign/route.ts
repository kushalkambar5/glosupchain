import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/db/index'
import { assignments, roads } from '@/db/schema'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!session || user?.role !== 'manager') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { driverId, pickupLat, pickupLng, deliveryLat, deliveryLng } = await req.json()

  if (!driverId || pickupLat === undefined || pickupLng === undefined || deliveryLat === undefined || deliveryLng === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create a new road entry with pickup/delivery coordinates
  const roadId = randomUUID()
  
  await db.insert(roads).values({
    id: roadId,
    userId: user.id,
    origin: {
      name: 'Pickup Location',
      lat: pickupLat,
      lng: pickupLng,
    },
    destination: {
      name: 'Delivery Location',
      lat: deliveryLat,
      lng: deliveryLng,
    },
    status: 'pending',
    // TODO: Call ML backend to calculate optimal route and store in originalRoute/bestRoute
    // For now, these will be set by ML service after creation
  })

  // Create assignment linking manager -> driver -> road
  await db.insert(assignments).values({
    managerId: user.id,
    driverId,
    routeType: 'roads',
    routeId: roadId,
    workDone: false,
  })

  return NextResponse.json({ message: 'Assigned successfully', roadId })
}