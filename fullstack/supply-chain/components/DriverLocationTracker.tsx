'use client'

import { useGeolocation } from '@/lib/useGeolocation'

export default function DriverLocationTracker() {
  useGeolocation()
  return null
}
