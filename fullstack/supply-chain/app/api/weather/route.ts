import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { weather } from '@/db/schema'
import { sql } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    // Filter to valid numbers only
    const validIds = ids.filter((id: any) => typeof id === 'number' && !isNaN(id))

    if (validIds.length === 0) {
      return NextResponse.json({ weather: [] })
    }

    const results = await db
      .select({
        id: weather.id,
        locationName: weather.locationName,
        country: weather.country,
        latitude: weather.latitude,
        longitude: weather.longitude,
        condition: weather.condition,
        temperatureC: weather.temperatureC,
        windKph: weather.windKph,
        humidity: weather.humidity,
        pressureMb: weather.pressureMb,
      })
      .from(weather)
      .where(
        sql`${weather.id} IN (${sql.join(validIds.map((id: number) => sql`${id}`), sql`, `)})`
      )

    return NextResponse.json({ weather: results })
  } catch (error) {
    console.error('Error fetching weather:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}
