'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Check } from 'lucide-react'
import Button from './Button'

export default function WorkDoneButton({
  assignmentId,
  workDone,
  destLat,
  destLon,
}: {
  assignmentId: string
  workDone: boolean
  destLat?: number
  destLon?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(workDone)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function handleToggle() {
    if (!done && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setLoading(true)
    await fetch('/api/driver/workdone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId, workDone: !done }),
    })
    setDone(!done)
    setShowConfirmation(false)
    setLoading(false)
    router.refresh()
  }

  if (showConfirmation) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 font-medium">
          Confirm completion? Your location will be updated to the delivery destination:
        </p>
        {(destLat !== undefined && destLon !== undefined) && (
          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" /> {destLat.toFixed(4)}, {destLon.toFixed(4)}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            onClick={handleToggle}
            disabled={loading}
            variant="success"
            className="flex items-center gap-1.5"
          >
            {loading ? 'Confirming...' : <><Check className="w-4 h-4" /> Confirm Completion</>}
          </Button>
          <Button
            onClick={() => setShowConfirmation(false)}
            disabled={loading}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading}
      variant={done ? 'success' : 'default'}
      className="flex items-center gap-1.5 justify-center"
    >
      {loading ? '...' : done ? <><Check className="w-4 h-4" /> Work Done</> : 'Mark Delivery as Complete'}
    </Button>
  )
}