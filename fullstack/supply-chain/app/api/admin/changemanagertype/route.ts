import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'This feature has been removed' },
    { status: 404 }
  )
}
