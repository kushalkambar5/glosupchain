import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ShipManagerClient from '@/components/ShipManagerClient'

export default async function ShipManagerPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ship Manager</h1>
          <p className="text-gray-600 mt-2">
            Manage and optimize your shipping routes
          </p>
        </div>

        <ShipManagerClient />
      </div>
    </main>
  )
}
