import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { routeId } = body

    if (!routeId) {
      return NextResponse.json({ error: 'Missing routeId' }, { status: 400 })
    }

    // Call the ML service from the backend (no HTTPS restriction here)
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://13.234.240.126:8000/api/v1/assign'
    
    console.log(`[ML Proxy] Calling ML service at ${mlServiceUrl} with route_id: ${routeId}`)
    
    const response = await fetch(mlServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: routeId }), // ML service expects route_id (snake_case)
    })

    const data = await response.json()

    console.log(`[ML Proxy] ML service response status: ${response.status}`, data)

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.detail || data.error || 'ML Assignment Service failed',
          details: data
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: data.success,
      message: data.message,
      route_id: data.route_id,
      goods_amount: data.goods_amount,
      total_drivers: data.total_drivers,
      total_capacity: data.total_capacity,
    })
  } catch (error) {
    console.error('[ML Proxy] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to reach ML Assignment Service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
