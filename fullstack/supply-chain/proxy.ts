import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  // Role-based panel mapping
  const rolePanelMap: { [key: string]: string } = {
    manager: '/manager/road',
    manager_ship: '/manager/ship',
    driver: '/driver',
    admin: '/admin',
  }

  // If user is logged in and accessing home page, redirect to their panel
  if (token && pathname === '/') {
    const userRole = token.role as string
    const panelUrl = rolePanelMap[userRole]

    if (panelUrl) {
      return NextResponse.redirect(new URL(panelUrl, request.url))
    }
  }

  // Role-based route protection
  const roleRouteMap: { [key: string]: string[] } = {
    manager: ['/manager/road'],
    manager_ship: ['/manager/ship'],
    driver: ['/driver', '/driver/assignment'],
    admin: ['/admin'],
  }

  const userRole = token?.role as string
  const allowedRoutes = roleRouteMap[userRole] || []

  // Check if current route requires a specific role
  const isProtectedRoute = Object.values(roleRouteMap).flat().some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check if user's role has access to this route
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route))

    if (!hasAccess) {
      // Redirect to home if role doesn't match route
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}
 

export const config = {
  matcher: [
    '/',
    '/manager/road/:path*',
    '/manager/ship/:path*',
    '/driver/:path*',
    '/driver/assignment/:path*',
    '/admin/:path*'
  ],
};
