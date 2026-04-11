import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { drivers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { capacity, lat, lon } = await req.json()

    // Validate input
    if (
      (capacity !== undefined && (typeof capacity !== 'number' || capacity <= 0)) ||
      (lat !== undefined && (typeof lat !== 'number' || lat < -90 || lat > 90)) ||
      (lon !== undefined && (typeof lon !== 'number' || lon < -180 || lon > 180))
    ) {
      return NextResponse.json(
        { error: 'Invalid input values' },
        { status: 400 }
      )
    }

    // Get existing driver profile
    const existingResult = await db
      .select()
      .from(drivers)
      .where(eq(drivers.userId, user.id as any))

    if (!existingResult.length) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })
    }

    // Update driver profile
    const updateData: any = {}
    if (capacity !== undefined) updateData.capacity = capacity
    if (lat !== undefined) updateData.lat = lat
    if (lon !== undefined) updateData.lon = lon
    updateData.updatedAt = new Date().toISOString()

    const updated = await db
      .update(drivers)
      .set(updateData)
      .where(eq(drivers.userId, user.id as any))
      .returning()

    return NextResponse.json({
      message: 'Driver profile updated successfully',
      driver: updated[0],
    })
  } catch (error) {
    console.error('[Update Driver Profile Error]', error)
    return NextResponse.json(
      {
        error: 'Failed to update driver profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
