'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleSelector({
  userId,
  currentRole,
}: {
  userId: string
  currentRole: string
}) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)

  async function handleChange(newRole: string) {
    setLoading(true)
    setRole(newRole)
    await fetch('/api/admin/changerole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <select
      value={role}
      onChange={e => handleChange(e.target.value)}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
    >
      <option value="driver">Driver</option>
      <option value="manager">Manager</option>
      <option value="manager_ship">Manager Ship</option>
      <option value="admin">Admin</option>
    </select>
  )
}