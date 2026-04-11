'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from './Button'

export default function VerifyButton({
  userId,
  isVerified,
}: {
  userId: string
  isVerified: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleVerify() {
    setLoading(true)
    await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isVerified: !isVerified }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      onClick={handleVerify}
      disabled={loading}
      variant={isVerified ? 'danger' : 'success'}
      size="sm"
    >
      {loading ? '...' : isVerified ? 'Unverify' : 'Verify'}
    </Button>
  )
}