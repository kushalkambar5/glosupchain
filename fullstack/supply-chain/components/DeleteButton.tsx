'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from './Button'

export default function DeleteButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setLoading(true)
    await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    router.refresh()
    setLoading(false)
    setConfirm(false)
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={loading}
      variant={confirm ? 'danger' : 'danger'}
      size="sm"
      className={confirm ? 'bg-red-600 hover:bg-red-700' : ''}
    >
      {loading ? '...' : confirm ? 'Confirm Delete' : 'Delete'}
    </Button>
  )
}
