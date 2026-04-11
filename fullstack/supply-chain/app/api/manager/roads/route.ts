import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { routes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Get session and user
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session || !user?.id || user?.role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { srcLat, srcLon, destLat, destLon, goodsAmount } = body

    if (typeof srcLat !== 'number' || typeof srcLon !== 'number' || 
        typeof destLat !== 'number' || typeof destLon !== 'number' || 
        typeof goodsAmount !== 'number') {
      return NextResponse.json({ error: 'Invalid input: all coordinates and amounts must be numbers' }, { status: 400 })
    }

    if (goodsAmount <= 0) {
      return NextResponse.json({ error: 'Invalid input: goods amount must be greater than 0' }, { status: 400 })
    }

    const result = await db
      .insert(routes)
      .values({
        managerId: user.id,
        srcLat,
        srcLon,
        destLat,
        destLon,
        goodsAmount,
      })
      .returning()

    return NextResponse.json({ message: 'Route created', route: result[0] })
  } catch (error) {
    console.error('[Route API] Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    })
    
    return NextResponse.json(
      {
        error: 'Failed to create route',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (user?.role !== 'manager') {
      return NextResponse.json({ error: 'Only managers can view routes' }, { status: 403 })
    }

    // Get all routes created by this manager
    const managerRoutes = await db
      .select()
      .from(routes)
      .where(eq(routes.managerId, user.id))

    return NextResponse.json({
      routes: managerRoutes,
    })
  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch routes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

