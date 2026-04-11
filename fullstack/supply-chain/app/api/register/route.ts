import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../db/index'
import { users, drivers } from '../../../db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { name, email, password, role, capacity } = await req.json()

  // Validate required fields
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate driver-specific fields
  if (role === 'driver' && !capacity) {
    return NextResponse.json({ error: 'Truck capacity is required for drivers' }, { status: 400 })
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))

  if (existing.length > 0) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  const userResult = await db
    .insert(users)
    .values({
      name,
      email,
      password: hashedPassword,
      role: role || 'driver',
      isVerified: false,
    })
    .returning()

  const userId = userResult[0].id

  // If driver, create driver profile
  if (role === 'driver') {
    const driverResult = await db
      .insert(drivers)
      .values({
        userId,
        lat: 0,
        lon: 0,
        capacity: parseFloat(capacity),
      })
      .returning()

    return NextResponse.json({
      message: 'Driver account created successfully',
      user: userResult[0],
      driver: driverResult[0],
    })
  }

  return NextResponse.json({
    message: 'User created successfully',
    user: userResult[0],
  })
}