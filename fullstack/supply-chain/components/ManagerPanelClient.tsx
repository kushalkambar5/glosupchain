'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  Map, 
  Clock, 
  Package, 
  CheckCircle, 
  Truck, 
  ChevronRight, 
  LayoutDashboard, 
  Users, 
  Navigation,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import RoadManagerRouteForm from './RoadManagerRouteForm'

interface ManagerPanelClientProps {
  managerRoutes: any[]
  pendingRoutes: any[]
  activeRoutes: any[]
  completedRoutes: any[]
  allAssignments: any[]
  uniqueDrivers: any[]
}

export default function ManagerPanelClient({
  managerRoutes,
  pendingRoutes,
  activeRoutes,
  completedRoutes,
  allAssignments,
  uniqueDrivers,
}: ManagerPanelClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const displayAssignments =
    activeTab === 'active'
      ? allAssignments.filter((a) => !a.assignment.workDone)
      : activeTab === 'completed'
        ? allAssignments.filter((a) => a.assignment.workDone)
        : allAssignments

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Road Management</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-sm text-gray-500 font-medium lowercase">real-time optimization active</p>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-3 bg-gray-100/50 p-1 rounded-xl border border-gray-200">
              <div className="px-4 py-1.5 rounded-lg bg-white shadow-sm border border-gray-200">
                <span className="text-xs font-bold text-gray-700 uppercase">System Status</span>
              </div>
              <span className="px-3 py-1 text-xs font-bold text-green-700 uppercase">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Navigation className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-gray-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Routes</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{managerRoutes.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <AlertCircle className="w-4 h-4 text-orange-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Pending Sync</p>
              <p className="text-3xl font-bold text-orange-600 tracking-tight">{pendingRoutes.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500 overflow-hidden">
                    D{i}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Deliveries</p>
              <p className="text-3xl font-bold text-indigo-600 tracking-tight">{activeRoutes.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">+24%</div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fulfilled Orders</p>
              <p className="text-3xl font-bold text-green-600 tracking-tight">{completedRoutes.length}</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-12">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`group mb-6 text-white px-8 py-4 rounded-2xl font-bold shadow-xl transition-all duration-300 flex items-center gap-3 ${
              showCreateForm 
                ? 'bg-gray-900 hover:bg-black ring-4 ring-gray-100' 
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 ring-4 ring-blue-50'
            }`}
          >
            {showCreateForm ? (
              <>✕ Close Creator</>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current opacity-80 group-hover:scale-110 transition" />
                Initialise New Assignment
              </>
            )}
          </button>

          {showCreateForm && (
            <div className="mb-12 animate-in fade-in slide-in-from-top-6 duration-500">
              <RoadManagerRouteForm />
            </div>
          )}
        </div>

        {/* Regional Drivers Table */}
        <div className="bg-white rounded-3xl shadow-xs border border-gray-200 mb-12 overflow-hidden ring-1 ring-black/5">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30 flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Regional Distribution</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500">
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Driver Identity</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Network Node</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Load Factor</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Operational Status</th>
                  <th className="px-8 py-4 text-right font-bold uppercase text-[10px] tracking-widest pr-10">Intelligence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uniqueDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-medium">
                      <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      Awaiting regional driver connectivity...
                    </td>
                  </tr>
                ) : (
                  uniqueDrivers.slice(0, 10).map((driver) => {
                    const driverAssignmentCount = allAssignments.filter(
                      (a) => a.driverUser?.id === driver.driverUser?.id
                    ).length

                    return (
                      <tr key={driver.driverUser?.id} className="hover:bg-blue-50/30 transition group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-bold text-blue-600 border border-blue-200 shadow-sm">
                              {driver.driverUser?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{driver.driverUser?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500 font-medium">ID: {driver.driverUser?.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-gray-600 font-medium">Regional-Hub-01</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500" style={{ width: `${Math.min(driverAssignmentCount * 25, 100)}%` }} />
                             </div>
                             <span className="text-xs font-bold text-gray-700">{driverAssignmentCount} pts</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          {driver.driverProfile?.onWork ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 ring-4 ring-green-50 shadow-sm">
                              ACTIVE EN-ROUTE
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 ring-4 ring-gray-50">
                              STANDBY MODE
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right pr-10">
                          <Link
                            href={`/manager/assignment/${allAssignments.find((a) => a.driverUser?.id === driver.driverUser?.id)?.assignment?.id}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold transition group-hover:translate-x-1"
                          >
                            Access Detail
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Assignments Segment */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl text-white">
                <Navigation className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Global Assignments</h2>
            </div>
            <div className="flex gap-1.5 bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10">
              {(['all', 'active', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === tab
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Deployment Node</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Type</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Timeline</th>
                  <th className="px-8 py-4 text-left font-bold uppercase text-[10px] tracking-widest">Pipeline Status</th>
                  <th className="px-8 py-4 text-right font-bold uppercase text-[10px] tracking-widest pr-10">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center text-gray-400 font-medium">
                      No matching operational data found
                    </td>
                  </tr>
                ) : (
                  displayAssignments.map((detail) => (
                    <tr key={detail.assignment?.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          <p className="font-bold text-gray-900">{detail.driverUser?.name || 'Autonomous Asset'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2 py-1 bg-gray-100 rounded text-[9px] font-bold text-gray-600 border border-gray-200">
                          {detail.assignment?.routeType || 'STANDARD'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-gray-500 font-medium">
                        {detail.assignment?.assignedAt
                          ? new Date(detail.assignment.assignedAt).toLocaleDateString()
                          : 'REAL-TIME'}
                      </td>
                      <td className="px-8 py-5">
                        {detail.assignment?.workDone ? (
                          <div className="flex items-center gap-2">
                             <CheckCircle className="w-4 h-4 text-green-500" />
                             <span className="text-[10px] font-bold text-green-700 tracking-tight uppercase">Fulfilled</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                             <span className="text-[10px] font-bold text-indigo-700 tracking-tight uppercase">Propagating</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right pr-10">
                        <Link
                          href={`/manager/assignment/${detail.assignment?.id}`}
                          className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 font-bold text-[10px] tracking-widest uppercase transition inline-block"
                        >
                          View Logs
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational Highlights */}
        {managerRoutes.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Active Operation Clusters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {activeRoutes.slice(0, 3).map((route, idx) => (
                <div key={route.route.id} className="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:translate-y-[-8px] transition-all duration-500 ring-1 ring-black/5">
                  <div className="h-40 bg-linear-to-br from-indigo-500 to-blue-700 relative flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                    <Truck className="w-16 h-16 text-white opacity-90 group-hover:scale-125 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
                      LIVE STREAM
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-black text-xl text-gray-900 tracking-tight mb-1">NODE {route.route.id.slice(0, 5).toUpperCase()}</h3>
                        <p className="text-xs text-gray-500 font-bold tracking-widest italic uppercase">Vector Propagation active</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Navigation className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Payload Units</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(route.route.goodsAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Asset Count</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{route.assignments.length}</p>
                      </div>
                    </div>

                    <Link
                      href={`/manager/assignment/${route.assignments[0]?.assignment?.id}`}
                      className="w-full flex items-center justify-center gap-3 bg-gray-900 group-hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-gray-200 group-hover:shadow-blue-200 uppercase text-[11px] tracking-[0.2em]"
                    >
                      Initialize Inspection Node
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
