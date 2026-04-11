import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { drivers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!session || user?.role !== 'driver') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lat, lon } = await req.json()

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // Check if driver record exists
  const existingDriver = await db
    .select()
    .from(drivers)
    .where(eq(drivers.userId, user.id))

  if (existingDriver.length === 0) {
    return NextResponse.json({ error: 'Driver record not found' }, { status: 404 })
  }

  await db
    .update(drivers)
    .set({ lat, lon, updatedAt: new Date().toISOString() })
    .where(eq(drivers.userId, user.id))

  return NextResponse.json({ message: 'Location updated successfully' })
}
