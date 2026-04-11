import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/index'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  if (!session || user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await req.json()

  await db.delete(users).where(eq(users.id, userId))

  return NextResponse.json({ message: 'User deleted successfully' })
}