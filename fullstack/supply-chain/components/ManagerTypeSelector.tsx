'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerTypeSelector({
  userId,
  currentManagerType,
}: {
  userId: string
  currentManagerType: string | null
}) {
  const router = useRouter()
  const [managerType, setManagerType] = useState(currentManagerType || '')
  const [loading, setLoading] = useState(false)

  async function handleChange(newManagerType: string) {
    if (!newManagerType) return
    
    setLoading(true)
    setManagerType(newManagerType)
    try {
      await fetch('/api/admin/changemanagertype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, managerType: newManagerType }),
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to update manager type:', error)
    }
    setLoading(false)
  }

  return (
    <select
      value={managerType}
      onChange={e => handleChange(e.target.value)}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-400 bg-white"
    >
      <option value="">Not Set</option>
      <option value="ship">Ship Manager</option>
      <option value="road">Road Manager</option>
    </select>
  )
}
