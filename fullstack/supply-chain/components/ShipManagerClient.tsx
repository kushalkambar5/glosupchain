'use client'

import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ExternalLink, Globe, Tag, X, Loader2, MapPin } from 'lucide-react'
import ShipManagerForm from '@/components/ShipManagerForm'
import ShipRouteMapClient from '@/components/ShipRouteMapClient'

interface ShipReroute {
  id: number
  userId: string
  shipId: number
  affectedByNews: any
  affectedByWeather: any
  suggestion: string
  bestRoute: any
  createdAt: string
}

interface NewsItem {
  id: number
  title: string
  description: string | null
  link: string | null
  imageUrl: string | null
  country: string | null
  category: string | null
  sourceUrl: string | null
  sourceName: string | null
  sourceIcon: string | null
  pubDate: string | null
}

export default function ShipManagerClient() {
  const [selectedReroute, setSelectedReroute] = useState<ShipReroute | null>(null)
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)

  useEffect(() => {
    const savedReroute = localStorage.getItem('selectedReroute')
    if (savedReroute) {
      try {
        setSelectedReroute(JSON.parse(savedReroute))
      } catch (e) {
        console.error('Failed to parse saved reroute', e)
      }
    }
  }, [])

  // Fetch news details when reroute changes
  const fetchNews = useCallback(async (newsIds: number[]) => {
    if (!newsIds || newsIds.length === 0) {
      setNewsItems([])
      return
    }
    setNewsLoading(true)
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: newsIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewsItems(data.news || [])
      }
    } catch (err) {
      console.error('Failed to fetch news:', err)
    } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedReroute?.affectedByNews) {
      const ids = Array.isArray(selectedReroute.affectedByNews)
        ? selectedReroute.affectedByNews
        : []
      fetchNews(ids)
    } else {
      setNewsItems([])
    }
  }, [selectedReroute, fetchNews])

  return (
    <div className="space-y-6">
      {/* Ship Selector */}
      <ShipManagerForm onRerouteSelect={(reroute) => setSelectedReroute(reroute)} />

      {/* Stats Cards */}
      {selectedReroute && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-tight">Ship ID</p>
            <p className="text-base md:text-lg font-bold text-gray-900 truncate">
              {selectedReroute.shipId}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-tight">Route ID</p>
            <p className="text-base md:text-lg font-bold text-gray-900 truncate">
              {selectedReroute.id}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm col-span-2 md:col-span-1">
            <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-tight">Created At</p>
            <p className="text-xs md:text-sm font-bold text-gray-900">
              {new Date(selectedReroute.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Route Map */}
      {selectedReroute && selectedReroute.bestRoute && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              Optimized Route
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Green solid: optimized | Red dashed: original
            </p>
          </div>
          <div className="h-[350px] sm:h-[500px]">
            <ShipRouteMapClient
              originalRoute={selectedReroute.bestRoute}
              bestRoute={selectedReroute.bestRoute}
              reasons={selectedReroute.suggestion ? [selectedReroute.suggestion] : []}
            />
          </div>
        </div>
      )}

      {/* Suggestions */}
      {selectedReroute && selectedReroute.suggestion && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Route Suggestion
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed italic">
            "{selectedReroute.suggestion}"
          </p>
        </div>
      )}

      {/* Affected by News — Interactive Cards */}
      {selectedReroute && selectedReroute.affectedByNews && selectedReroute.affectedByNews.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2 bg-blue-50/30">
            <Newspaper className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-gray-900 text-sm md:text-base">Affected by News</h3>
            <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-100/50 px-2.5 py-1 rounded-full uppercase tracking-tighter">
              {selectedReroute.affectedByNews.length} articles
            </span>
          </div>

          {newsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
              <span className="text-xs text-gray-400 font-medium tracking-tight">Updating news feed...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {newsItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedNews(item)}
                  className="w-full text-left px-4 py-4 hover:bg-blue-50/50 transition-all duration-200 flex items-center gap-3 md:gap-4 group"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200/60 shadow-sm relative">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-6 h-6 text-gray-200" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      {item.country && (
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight">
                          <MapPin className="w-3 h-3 text-gray-300" />
                          {item.country}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 uppercase tracking-tight">
                          <Tag className="w-3 h-3 text-blue-200" />
                          {item.category}
                        </span>
                      )}
                      {item.sourceName && (
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
                          {item.sourceName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow icon visible on hover or mobile always for guidance */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 border border-gray-100 md:border-transparent">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}

              {newsItems.length === 0 && !newsLoading && (
                <div className="px-4 py-12 text-center flex flex-col items-center">
                   <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                   <Newspaper className="w-6 h-6 text-gray-200" />
                   </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Feed Empty</p>
                  <p className="text-xs text-gray-300 mt-1">No relevant news items found for this route.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Affected by Weather */}
      {selectedReroute && selectedReroute.affectedByWeather && selectedReroute.affectedByWeather.length > 0 && (
        <div className="bg-orange-50/50 rounded-xl border border-orange-200/60 p-4 shadow-sm">
          <h3 className="font-bold text-orange-900 mb-3 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
            Route Weather Obstacles
          </h3>
          <div className="space-y-2">
            {selectedReroute.affectedByWeather.map((weather: any, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-white/60 p-2.5 rounded-lg border border-orange-100 text-xs sm:text-sm text-orange-800 font-medium"
              >
                <div className="w-1 h-1 rounded-full bg-orange-300 mt-1.5 shrink-0"></div>
                <span>{weather.condition || weather.description || JSON.stringify(weather)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── News Detail Popup Modal ── */}
      {selectedNews && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedNews(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

          <div
            className="relative bg-white w-full sm:max-w-xl max-h-[92vh] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-up sm:animate-modal-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Dismiss for mobile */}
            <div className="sm:hidden w-full flex justify-center py-2 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-xl flex items-center justify-center transition-all border border-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <X className="w-5 h-5 text-gray-900" />
            </button>

            {/* Scrollable area */}
            <div className="overflow-y-auto flex-1">
              {/* Cover Image */}
              <div className="w-full h-64 sm:h-72 bg-gray-100 relative group">
                {selectedNews.imageUrl ? (
                  <img
                    src={selectedNews.imageUrl}
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-200 bg-gray-50">
                    <Newspaper className="w-16 h-16 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-300">No Hero Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 sm:opacity-40"></div>
              </div>

              {/* Body Content */}
              <div className="px-6 py-6 sm:px-8">
                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedNews.country && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <MapPin className="w-3 h-3" />
                      {selectedNews.country}
                    </span>
                  )}
                  {selectedNews.category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-blue-50 text-blue-700 border border-blue-100">
                      <Tag className="w-3 h-3" />
                      {selectedNews.category}
                    </span>
                  )}
                  {selectedNews.sourceName && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-gray-50 text-gray-600 border border-gray-100">
                      <Globe className="w-3 h-3" />
                      {selectedNews.sourceName}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-[1.2] mb-6 decoration-blue-500/30 underline-offset-4 tracking-tight">
                  {selectedNews.title}
                </h2>

                {selectedNews.description && (
                  <div className="text-base text-gray-600 leading-[1.7] mb-10 font-medium bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50">
                    {selectedNews.description}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                  {selectedNews.link && (
                    <a
                      href={selectedNews.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Full Coverage
                    </a>
                  )}
                  {selectedNews.sourceUrl && (
                    <a
                      href={selectedNews.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full bg-gray-900 text-white rounded-2xl py-4 font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                      <Globe className="w-5 h-5" />
                      Publisher Hub
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global animations for modal */}
      <style jsx global>{`
        @keyframes modal-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes modal-center {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-modal-up { animation: modal-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-modal-center { animation: modal-center 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  )
}

