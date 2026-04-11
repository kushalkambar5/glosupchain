import { db } from '@/db/index'
import { assignments, users } from '@/db/schema'
import { eq, gt } from 'drizzle-orm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RoadReroutesPage() {
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const twoDaysAgoISO = twoDaysAgo.toISOString()

  const allAssignments = await db
    .select({
      id: assignments.id,
      routeType: assignments.routeType,
      assignedQuantity: assignments.assignedQuantity,
      workDone: assignments.workDone,
      assignedAt: assignments.assignedAt,
      completedAt: assignments.completedAt,
      driverName: users.name,
    })
    .from(assignments)
    .leftJoin(users, eq(assignments.driverId, users.id))
    .where(gt(assignments.assignedAt, twoDaysAgoISO))

  // Sort by assignedAt descending (newest first)
  allAssignments.sort((a, b) => {
    const timeA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const timeB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
    return timeB - timeA;
  });

  const activeAssignments = allAssignments.filter(a => !a.workDone);
  const completedAssignments = allAssignments.filter(a => a.workDone);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-4">
            Road Reroutes
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            View all current and past assignments, tracking real-time delivery status and route optimizations.
          </p>
        </div>

        {/* Active Assignments */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <h2 className="text-2xl font-bold text-gray-900">Active Assignments</h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
              {activeAssignments.length}
            </span>
          </div>

          {activeAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeAssignments.map(assignment => (
                <Link href={`/manager/assignment/${assignment.id}`} key={assignment.id} className="block group">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">
                        Driver
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {assignment.driverName || 'Unknown Driver'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-medium">Quantity</div>
                        <div className="font-semibold text-gray-800">{assignment.assignedQuantity} units</div>
                      </div>
                      <div className="text-right text-xs text-gray-400 font-medium">
                        Assigned: {new Date(assignment.assignedAt || '').toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600 flex items-center gap-1 group-hover:text-blue-700 transition-colors w-full justify-center bg-blue-50/50 hover:bg-blue-100 py-2 rounded-lg">
                        View Details <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 p-8 text-center text-gray-500 font-medium">
              No active assignments right now.
            </div>
          )}
        </section>

        {/* Completed Assignments */}
        <section className="space-y-6 pt-8 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <h2 className="text-2xl font-bold text-gray-900">Completed Assignments</h2>
            <span className="bg-emerald-100 text-emerald-800 text-sm font-semibold px-3 py-1 rounded-full">
              {completedAssignments.length}
            </span>
          </div>

          {completedAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedAssignments.map(assignment => (
                <Link href={`/manager/assignment/${assignment.id}`} key={assignment.id} className="block group opacity-80 hover:opacity-100 transition-opacity">
                  <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200 hover:border-emerald-200 hover:bg-white hover:shadow-sm transition-all duration-300 relative h-full flex flex-col">
                    <div className="absolute top-4 right-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                    </div>

                    <div className="mb-4 pr-8">
                      <div className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                        Driver
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {assignment.driverName || 'Unknown Driver'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200/60">
                      <div>
                        <div className="text-xs text-gray-500 mb-1 font-medium">Quantity</div>
                        <div className="font-medium text-gray-700">{assignment.assignedQuantity} units</div>
                      </div>
                      
                      {assignment.completedAt && (
                        <div className="text-right">
                          <div className="text-xs text-emerald-500 mb-1 font-semibold uppercase tracking-wider">Completed</div>
                          <div className="text-sm font-semibold text-gray-700">
                            {new Date(assignment.completedAt || '').toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-gray-500 font-medium">
              No completed assignments yet.
            </div>
          )}
        </section>

      </div>
    </main>
  )
}
