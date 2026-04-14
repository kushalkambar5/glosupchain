'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import Button from './Button'
import { MessageSquare } from 'lucide-react'

export default function Navbar() {
  const { data: session } = useSession()
  const user = session?.user as any
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navContainerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const [indicatorReady, setIndicatorReady] = useState(false)

  const isManagerPanel = pathname?.includes('/manager')
  const isDriverPanel = pathname?.includes('/driver')
  const isAdminPanel = pathname?.includes('/admin')

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Measure active nav link position for sliding indicator
  const updateIndicator = useCallback(() => {
    if (!navContainerRef.current) return
    const activeLink = navContainerRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (activeLink) {
      const containerRect = navContainerRef.current.getBoundingClientRect()
      const linkRect = activeLink.getBoundingClientRect()
      setIndicatorStyle({
        left: linkRect.left - containerRect.left,
        width: linkRect.width,
      })
      // Enable transitions after first paint so it doesn't animate on initial load
      requestAnimationFrame(() => setIndicatorReady(true))
    } else {
      setIndicatorStyle(null)
    }
  }, [pathname])

  useEffect(() => {
    setIndicatorReady(false)
    updateIndicator()
  }, [pathname, updateIndicator])

  useEffect(() => {
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  const navLinkClass = (isActive: boolean) =>
    `text-sm font-medium transition-colors duration-200 poppins-medium py-1 ${
      isActive
        ? 'text-emerald-600'
        : 'text-gray-600 hover:text-gray-900'
    }`

  const mobileNavLinkClass = (isActive: boolean) =>
    `block w-full px-4 py-3 text-sm font-medium rounded-lg transition poppins-medium ${
      isActive
        ? 'text-emerald-600 bg-emerald-50'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`

  const getRoleDisplay = () => {
    const roleMap: { [key: string]: string } = {
      manager: 'Manager',
      manager_ship: 'Ship Manager',
      driver: 'Driver',
      admin: 'Admin'
    }
    return roleMap[user?.role] || user?.role
  }

  return (
    <nav className="w-full border-b border-gray-200/60 bg-white sticky top-0 z-50">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">

        {/* Left - Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img src="/logo_processed.png" alt="SupplyChain Logo" className="h-8 w-8 object-contain rounded-md group-hover:shadow-md transition" />
          <span className="text-lg font-bold text-gray-900 hidden sm:inline tracking-tight poppins-bold">SupplyChain</span>
        </Link>

        {/* Middle - Nav Links (Desktop only) */}
        <div className="hidden lg:flex items-center gap-12 flex-1 ml-16 relative" ref={navContainerRef}>
          {!session ? (
            <Link href="/" className={navLinkClass(pathname === '/')}>
              Home
            </Link>
          ) : (
            <>
              {user?.role === 'manager' && user?.isVerified && (
                <Link href="/manager/road" className={navLinkClass(isManagerPanel)} data-active={isManagerPanel}>
                  My Panel
                </Link>
              )}
              {user?.role === 'manager_ship' && user?.isVerified && (
                <Link href="/manager/ship" className={navLinkClass(isManagerPanel)} data-active={isManagerPanel}>
                  My Panel
                </Link>
              )}
              {user?.role === 'driver' && user?.isVerified && (
                <Link href="/driver" className={navLinkClass(isDriverPanel)} data-active={isDriverPanel}>
                  My Panel
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/admin" className={navLinkClass(isAdminPanel)} data-active={isAdminPanel}>
                  My Panel
                </Link>
              )}
            </>
          )}

          

          <Link href="/ship-reroutes" className={navLinkClass(pathname?.includes('/ship-reroutes'))} data-active={pathname?.includes('/ship-reroutes')}>
            Ship Reroutes
          </Link>

          <Link href="/road-reroutes" className={navLinkClass(pathname?.includes('/road-reroutes'))} data-active={pathname?.includes('/road-reroutes')}>
            Road Reroutes
          </Link>

          <Link href="/zones" className={navLinkClass(pathname?.includes('/zones'))} data-active={pathname?.includes('/zones')}>
            Zones
          </Link>

          <Link href="/weather" className={navLinkClass(pathname?.includes('/weather'))} data-active={pathname?.includes('/weather')}>
            Weather
          </Link>

          {/* Sliding active indicator */}
          {indicatorStyle && (
            <span
              className="absolute bottom-0 h-[2.5px] rounded-full bg-emerald-500"
              style={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: indicatorReady ? 'left 0.35s cubic-bezier(0.4, 0, 0.2, 1), width 0.35s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            />
          )}
        </div>

        {/* Right - Auth + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-chatbot'))}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm group"
            title="AI Assistant"
          >
            <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {!session ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="md" className="hidden sm:inline-flex">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="default" size="md" className="hidden lg:inline-flex">
                  Start Free
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              {/* User Dropdown Button (Desktop only) */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="hidden lg:flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 focus:outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-base font-bold poppins-bold shadow-inner border-[1.5px] border-white ring-2 ring-emerald-50 hover:ring-emerald-100 transition-all">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start pr-2 pl-1">
                  <p className="text-sm font-semibold text-gray-900 truncate poppins-semibold tracking-tight">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-gray-500 poppins-medium uppercase tracking-wide mt-[1px]">{getRoleDisplay()}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 ml-2 transition-transform duration-300 ${dropdownOpen ? '-rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Desktop Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold poppins-bold">
                        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate poppins-semibold">
                          {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-600 truncate poppins-regular">
                          {user?.email}
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded poppins-semibold">
                        {getRoleDisplay()}
                      </span>
                    </div>
                  </div>

                  <ul className="px-2 py-2 text-sm text-gray-700 font-medium poppins-medium">
                    <li>
                      <button
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center w-full p-2 rounded-lg hover:bg-gray-100 transition gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Account Settings
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center w-full p-2 rounded-lg hover:bg-gray-100 transition gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Help Center
                      </button>
                    </li>
                  </ul>

                  <div className="border-t border-gray-200"></div>

                  <ul className="px-2 py-2">
                    <li>
                      <button
                        onClick={() => { setDropdownOpen(false); signOut() }}
                        className="flex items-center w-full p-2 text-red-600 rounded-lg hover:bg-red-50 transition gap-2 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Hamburger Button (Mobile / Tablet only — hidden on lg+) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition focus:outline-none relative"
            aria-label="Toggle mobile menu"
          >
            <svg 
              className={`w-5 h-5 text-gray-700 absolute transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg 
              className={`w-5 h-5 text-gray-700 absolute transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown ── */}
      <div 
        className={`lg:hidden bg-white overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[800px] opacity-100 border-t border-gray-200 shadow-md' : 'max-h-0 opacity-0 border-t-0 shadow-none'
        }`}
      >
        <div className={`max-w-7xl mx-auto px-4 py-3 space-y-1 transition-all duration-300 ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-4'}`}>
            <button
              onClick={() => { setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('toggle-chatbot')) }}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition gap-2 poppins-medium"
            >
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </button>

            {/* Nav links */}
            {!session ? (
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname === '/')}>
                Home
              </Link>
            ) : (
              <>
                {user?.role === 'manager' && user?.isVerified && (
                  <Link href="/manager/road" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(isManagerPanel)}>
                    My Panel
                  </Link>
                )}
                {user?.role === 'manager_ship' && user?.isVerified && (
                  <Link href="/manager/ship" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(isManagerPanel)}>
                    My Panel
                  </Link>
                )}
                {user?.role === 'driver' && user?.isVerified && (
                  <Link href="/driver" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(isDriverPanel)}>
                    My Panel
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(isAdminPanel)}>
                    My Panel
                  </Link>
                )}
              </>
            )}

            {session && (user?.isVerified || user?.role === 'admin') && (
              <Link href="/roads" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname?.includes('/roads'))}>
                Routes
              </Link>
            )}

            <Link href="/zones" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname?.includes('/zones'))}>
              Zones
            </Link>

            <Link href="/weather" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname?.includes('/weather'))}>
              Weather
            </Link>

            <Link href="/ship-reroutes" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname?.includes('/ship-reroutes'))}>
              Ship Reroutes
            </Link>

            <Link href="/road-reroutes" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass(pathname?.includes('/road-reroutes'))}>
              Road Reroutes
            </Link>

            {/* Logged-in user info + sign out */}
            {session && (
              <>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold poppins-bold shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate poppins-semibold">
                        {user?.name || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-gray-500 poppins-regular">{getRoleDisplay()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); signOut() }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition gap-2 poppins-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}

            {/* Sign In / Register (not logged in) */}
            {!session && (
              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition poppins-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition text-center poppins-medium"
                >
                  Start Free
                </Link>
              </div>
            )}
          </div>
        </div>
    </nav>
  )
}