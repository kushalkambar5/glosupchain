import { SunMedium, Newspaper, AlertTriangle } from 'lucide-react'

interface Reason {
  type: string
  severity: string
  description: string
  affected_waypoint: string
}

interface InfoCardsProps {
  reasons: Reason[]
  weatherData: any
  newsData: any
  originalRoute: any
  bestRoute: any
}

export default function InfoCards({
  reasons,
  weatherData,
  newsData,
  originalRoute,
  bestRoute,
}: InfoCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 p-4">

      {/* Weather card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1.5"><SunMedium className="w-3.5 h-3.5" /> Weather</h3>
        {weatherData?.alerts?.length > 0 ? (
          weatherData.alerts.map((alert: string, i: number) => (
            <p key={i} className="text-xs text-blue-800">• {alert}</p>
          ))
        ) : (
          <p className="text-xs text-blue-400">No weather alerts</p>
        )}
        {weatherData?.source && (
          <p className="text-xs text-blue-300 mt-2">Source: {weatherData.source}</p>
        )}
      </div>

      {/* News card */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
        <h3 className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1.5"><Newspaper className="w-3.5 h-3.5" /> News</h3>
        {newsData?.headlines?.length > 0 ? (
          newsData.headlines.map((headline: string, i: number) => (
            <p key={i} className="text-xs text-purple-800">• {headline}</p>
          ))
        ) : (
          <p className="text-xs text-purple-400">No news alerts</p>
        )}
        {newsData?.source && (
          <p className="text-xs text-purple-300 mt-2">Source: {newsData.source}</p>
        )}
      </div>

      {/* Why changed card */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
        <h3 className="text-xs font-medium text-yellow-600 mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Why Changed</h3>
        {reasons?.length > 0 ? (
          reasons.map((r, i) => (
            <div key={i} className="mb-1">
              {/* <p className="text-xs text-yellow-800">• {r.description || r}</p> */}
              {r.severity && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  r.severity === 'high'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-yellow-100 text-yellow-600'
                }`}>
                  {r.severity}
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-yellow-400">No changes — route is optimal</p>
        )}
      </div>

    </div>
  )
}