# app/utils/smart_routing.py
#
# Smart Dynamic Routing Engine — Optimised for speed + full decision transparency
# ─────────────────────────────────────────────────────────────────────────────
# Changelog over previous version
# ─────────────────────────────────────────────────────────────────────────────
# • _news_delay_factor()  → now returns (factor, [impacting_events])
#   where each impacting event contains the exact row from the DB plus
#   computed proximity / severity_scale so the caller can explain exactly
#   which news headline forced a route to be penalised.
#
# • _score_route()        → collects all impacting news events across ALL
#   sample points and deduplicates them.  Result dict now includes:
#       "impacting_news"  : list of event dicts with explanation fields
#
# • get_best_route()      → computes a natural-language "selection_reason"
#   per route AND a top-level "winner_reason" explaining why route #1 won,
#   listing the exact news items that affected losing routes differently.
#
# • driver_assignment.py  → calls get_best_route (not _nodes) so it can
#   surface the same reasoning to the caller.
# ─────────────────────────────────────────────────────────────────────────────

import sys
import os
import math
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
from typing import Dict, List, Tuple, Optional

# Allow direct execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.utils.maps    import get_routes
from app.utils.traffic import get_traffic
from app.utils.weather import get_latest_weather
from app.utils.news    import get_shipway_results


# ══════════════════════════════════════════════════════════════════════════════
#  TUNEABLE PARAMETERS
# ══════════════════════════════════════════════════════════════════════════════

SAMPLE_INTERVAL_KM      = 10.0  # Traffic/weather sample spacing along route
MAX_TRAFFIC_CALLS       = 30    # Hard cap on traffic calls per route
WEATHER_GRID_DEG        = 0.5   # ~55 km grid cell for weather dedup
NEWS_MIN_SEVERITY       = 1     # Skip events at or below this severity level
NEWS_MAX_DELAY_FACTOR   = 0.50  # Max extra time fraction from news (50 %)
WIND_THRESHOLD_KPH      = 60    # Wind speed that starts adding penalty
WIND_PENALTY_PER_10KPH  = 0.02  # Extra 2 % speed loss per 10 kph above threshold
MAX_WORKERS             = 40    # Thread pool size for parallel API calls
DEDUP_GRID_DEG          = 0.05  # ~5 km dedup grid for shared point cache
API_TIMEOUT_S           = 5     # Hard timeout for every external HTTP call (seconds)

# ── Persistent pool (avoids per-request creation overhead) ───────────────────
_POOL = ThreadPoolExecutor(max_workers=MAX_WORKERS)

SEVERITY_MAP: Dict[str, int] = {
    "low": 1, "medium": 2, "high": 3, "critical": 4,
}

WEATHER_SPEED_PENALTY: Dict[str, float] = {
    "sunny": 0.00, "clear": 0.00, "partly cloudy": 0.03,
    "cloudy": 0.05, "overcast": 0.05, "mist": 0.10,
    "fog": 0.20, "freezing fog": 0.30,
    "light rain": 0.10, "moderate rain": 0.20,
    "heavy rain": 0.30, "torrential": 0.40,
    "light snow": 0.20, "moderate snow": 0.35,
    "heavy snow": 0.50, "blizzard": 0.65,
    "thunderstorm": 0.35, "sleet": 0.25,
    "haze": 0.08, "smoke": 0.10, "dust": 0.12, "sandstorm": 0.40,
}


# ══════════════════════════════════════════════════════════════════════════════
#  GEOMETRY HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return R * 2 * math.asin(math.sqrt(a))


def _route_bbox(coords: List[List[float]], pad_km: float = 20.0) -> Tuple[float, float, float, float]:
    pad_deg = pad_km / 111.0
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    return (min(lats) - pad_deg, min(lons) - pad_deg,
            max(lats) + pad_deg, max(lons) + pad_deg)


def _snap(lat: float, lon: float, grid: float) -> Tuple[float, float]:
    return (round(lat / grid) * grid, round(lon / grid) * grid)


# ══════════════════════════════════════════════════════════════════════════════
#  SAMPLING  (deduplicated across routes)
# ══════════════════════════════════════════════════════════════════════════════

def _sample_route_points(coords: List[List[float]]) -> List[Tuple[float, float]]:
    sampled: List[Tuple[float, float]] = []
    if not coords:
        return sampled
    acc = 0.0
    prev_lat, prev_lon = coords[0][1], coords[0][0]
    sampled.append((prev_lat, prev_lon))
    for lon, lat in coords[1:]:
        acc += _haversine_km(prev_lat, prev_lon, lat, lon)
        if acc >= SAMPLE_INTERVAL_KM:
            sampled.append((lat, lon))
            acc = 0.0
        prev_lat, prev_lon = lat, lon
    last = (coords[-1][1], coords[-1][0])
    if sampled[-1] != last:
        sampled.append(last)
    if len(sampled) > MAX_TRAFFIC_CALLS:
        step    = len(sampled) / MAX_TRAFFIC_CALLS
        sampled = [sampled[int(i * step)] for i in range(MAX_TRAFFIC_CALLS)]
    return sampled


def _build_all_sample_points(routes):
    route_points: Dict[int, List[Tuple[float, float]]] = {}
    seen_keys: Dict[Tuple[float, float], Tuple[float, float]] = {}
    unique: List[Tuple[float, float]] = []
    for idx, route in enumerate(routes):
        pts = _sample_route_points(route["geometry"]["coordinates"])
        route_points[idx] = pts
        for pt in pts:
            key = _snap(pt[0], pt[1], DEDUP_GRID_DEG)
            if key not in seen_keys:
                seen_keys[key] = pt
                unique.append(pt)
    return route_points, unique


# ══════════════════════════════════════════════════════════════════════════════
#  PARALLEL API FETCH
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_all_parallel(unique_points, weather_cache):
    traffic_results: Dict[Tuple[float, float], Dict] = {}
    weather_needed: Dict[Tuple[float, float], Tuple[float, float]] = {}
    for lat, lon in unique_points:
        key = _snap(lat, lon, WEATHER_GRID_DEG)
        if key not in weather_cache and key not in weather_needed:
            weather_needed[key] = (lat, lon)

    def fetch_traffic(pt):
        return "traffic", pt, get_traffic(pt[0], pt[1])

    def fetch_weather(key_pt):
        key, (lat, lon) = key_pt
        return "weather", key, get_latest_weather(lat, lon)

    futures = (
        [_POOL.submit(fetch_traffic, pt) for pt in unique_points] +
        [_POOL.submit(fetch_weather, kv) for kv in weather_needed.items()]
    )
    n_futures = len(futures)
    n_waves   = max(1, -(-n_futures // MAX_WORKERS))   # ceiling division
    outer_timeout = API_TIMEOUT_S * n_waves * 2
    try:
        for future in as_completed(futures, timeout=outer_timeout):
            try:
                kind, key, data = future.result(timeout=API_TIMEOUT_S)
                if kind == "traffic":
                    traffic_results[key] = data
                else:
                    weather_cache[key] = data
            except (FuturesTimeoutError, TimeoutError, Exception):
                pass
    except (FuturesTimeoutError, TimeoutError):
        for f in futures:
            f.cancel()
    except Exception:
        for f in futures:
            f.cancel()

    return traffic_results, weather_cache


# ══════════════════════════════════════════════════════════════════════════════
#  FACTOR CALCULATORS
# ══════════════════════════════════════════════════════════════════════════════

def _weather_speed_factor(weather: Dict) -> float:
    if "error" in weather:
        return 1.0
    condition = weather.get("condition", "").lower()
    penalty   = max((v for k, v in WEATHER_SPEED_PENALTY.items() if k in condition), default=0.0)
    wind = weather.get("wind_kph", 0.0)
    if wind > WIND_THRESHOLD_KPH:
        penalty += ((wind - WIND_THRESHOLD_KPH) / 10.0) * WIND_PENALTY_PER_10KPH
    return max(0.0, 1.0 - penalty)


def _traffic_time_factor(traffic: Dict) -> float:
    if traffic.get("road_closure"):
        return 999.0
    if "error" in traffic:
        return 1.0
    current  = traffic.get("current_speed",   0.0)
    freeflow = traffic.get("free_flow_speed", 1.0)
    if freeflow <= 0 or current <= 0:
        return 1.0
    return max(1.0, freeflow / current)


def _news_delay_factor(
    lat: float, lon: float, events: List[Dict]
) -> Tuple[float, List[Dict]]:
    """
    Returns (delay_factor, [impacting_event_dicts]).

    Each impacting event dict contains the original DB row PLUS:
        "_proximity"     : 0-1  (1 = at epicentre, 0 = at edge of radius)
        "_severity_scale": 0-1  (scaled severity above NEWS_MIN_SEVERITY)
        "_delay_contribution": fractional delay this event added
        "_distance_km"  : actual distance from this sample point to event centre
    """
    max_sev        = max(SEVERITY_MAP.values())
    total_extra    = 0.0
    impacting: List[Dict] = []

    for ev in events:
        sev_num = SEVERITY_MAP.get(str(ev.get("severity", "low")).lower(), 0)
        if sev_num <= NEWS_MIN_SEVERITY:
            continue
        radius = ev.get("radius_km", 0)
        if radius <= 0:
            continue
        dist = _haversine_km(lat, lon, ev["center_lat"], ev["center_lon"])
        if dist >= radius:
            continue

        proximity     = 1.0 - (dist / radius)
        sev_scale     = (sev_num - NEWS_MIN_SEVERITY) / (max_sev - NEWS_MIN_SEVERITY)
        contribution  = proximity * sev_scale * NEWS_MAX_DELAY_FACTOR
        total_extra  += contribution

        impacting.append({
            **ev,                                        # all original DB columns
            "_proximity":          round(proximity, 4),
            "_severity_scale":     round(sev_scale, 4),
            "_delay_contribution": round(contribution, 4),
            "_distance_km":        round(dist, 3),
        })

    return 1.0 + min(total_extra, NEWS_MAX_DELAY_FACTOR), impacting


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTE SCORER  (pure CPU, no I/O)
# ══════════════════════════════════════════════════════════════════════════════

def _build_dedup_index(traffic_results: Dict) -> Dict:
    """Pre-build a snap-key → result dict so _score_route lookups are O(1)."""
    return {_snap(p[0], p[1], DEDUP_GRID_DEG): v for p, v in traffic_results.items()}


def _score_route(route, route_idx, sample_points, traffic_results, weather_cache,
                 news_events, dedup_index: Optional[Dict] = None):
    traffic_factors, weather_factors, news_factors = [], [], []
    all_impacting_news: Dict[int, Dict] = {}   # keyed by event id (or object id) to dedup

    if dedup_index is None:
        dedup_index = _build_dedup_index(traffic_results)

    for lat, lon in sample_points:
        dedup_key = _snap(lat, lon, DEDUP_GRID_DEG)
        traffic   = traffic_results.get((lat, lon)) or dedup_index.get(dedup_key, {})
        tf = _traffic_time_factor(traffic)
        if tf >= 999:                                      # road closed → bail early
            return {
                "route_index":            route_idx,
                "base_duration_s":        route["duration"],
                "estimated_duration_s":   float("inf"),
                "estimated_duration_min": float("inf"),
                "distance_m":             route["distance"],
                "road_closed":            True,
                "geometry":               route.get("geometry", {}),
                "impacting_news":         [],
                "selection_reason":       "This route passes through a road closure and is unavailable.",
            }
        traffic_factors.append(tf)

        w_key = _snap(lat, lon, WEATHER_GRID_DEG)
        weather_factors.append(_weather_speed_factor(weather_cache.get(w_key, {})))

        nf, impacting = _news_delay_factor(lat, lon, news_events)
        news_factors.append(nf)

        # Deduplicate impacting events by their DB id (fall back to title)
        for ev_info in impacting:
            ev_key = ev_info.get("id") or ev_info.get("title", id(ev_info))
            if ev_key not in all_impacting_news:
                all_impacting_news[ev_key] = ev_info
            else:
                # Keep the entry with the highest contribution for this route
                if ev_info["_delay_contribution"] > all_impacting_news[ev_key]["_delay_contribution"]:
                    all_impacting_news[ev_key] = ev_info

    n                 = len(sample_points)
    avg_traffic       = sum(traffic_factors) / n if n > 0 else 1.0
    avg_weather       = sum(weather_factors) / n if n > 0 else 1.0
    avg_news          = sum(news_factors)    / n if n > 0 else 1.0
    weather_time_mult = (1.0 / avg_weather) if avg_weather > 0 else 1.0
    final_s           = route["duration"] * avg_traffic * weather_time_mult * avg_news

    impacting_list = sorted(
        all_impacting_news.values(),
        key=lambda e: e["_delay_contribution"],
        reverse=True,
    )

    return {
        "route_index":            route_idx,
        "base_duration_s":        route["duration"],
        "estimated_duration_s":   round(final_s) if n > 0 else route["duration"],
        "estimated_duration_min": round(final_s / 60.0, 1) if n > 0 else round(route["duration"] / 60.0, 1),
        "distance_m":             route["distance"],
        "road_closed":            False,
        "traffic_calls_used":     n,
        "factors": {
            "avg_traffic_multiplier":   round(avg_traffic,       3),
            "avg_weather_speed_factor": round(avg_weather,       3),
            "weather_time_multiplier":  round(weather_time_mult, 3),
            "avg_news_delay_factor":    round(avg_news,          3),
        },
        "impacting_news": impacting_list,
        "geometry":       route.get("geometry", {}),
    }


# ══════════════════════════════════════════════════════════════════════════════
#  SELECTION REASON BUILDER  (natural language explanation)
# ══════════════════════════════════════════════════════════════════════════════

def _build_selection_reason(scored: Dict) -> str:
    """
    Returns a one-paragraph human-readable explanation of this route's score.
    Lists the exact news events that impacted it.
    """
    if scored.get("road_closed"):
        return "Route is blocked by a road closure."

    factors   = scored.get("factors", {})
    news_list = scored.get("impacting_news", [])
    parts     = []

    # Traffic
    tf = factors.get("avg_traffic_multiplier", 1.0)
    if tf > 2.0:
        parts.append(f"heavy congestion (traffic delay ×{tf:.2f})")
    elif tf > 1.3:
        parts.append(f"moderate congestion (traffic delay ×{tf:.2f})")
    elif tf > 1.05:
        parts.append(f"slight congestion (traffic delay ×{tf:.2f})")

    # Weather
    wf = factors.get("avg_weather_speed_factor", 1.0)
    if wf < 0.6:
        parts.append(f"severe weather slowing traffic to {round(wf*100)}% of normal speed")
    elif wf < 0.85:
        parts.append(f"adverse weather (speed reduced to {round(wf*100)}%)")
    elif wf < 0.97:
        parts.append(f"minor weather impact (speed at {round(wf*100)}%)")

    # News
    if news_list:
        news_parts = []
        for ev in news_list[:5]:   # cap at 5 headlines
            title       = ev.get("title") or ev.get("event_type") or "Unknown event"
            severity    = ev.get("severity", "unknown")
            dist_km     = ev.get("_distance_km", 0)
            contrib_pct = round(ev.get("_delay_contribution", 0) * 100, 1)
            news_parts.append(
                f'"{title}" (severity={severity}, {dist_km} km from route, +{contrib_pct}% delay)'
            )
        parts.append("news events: " + "; ".join(news_parts))

    if not parts:
        return "No significant traffic, weather, or news issues detected on this route."

    return "Route penalised by: " + " | ".join(parts) + "."


def _build_winner_reason(winner: Dict, others: List[Dict]) -> str:
    """
    Explains why the winning route was chosen over the alternatives,
    explicitly calling out news events that made other routes worse.
    """
    if not others:
        return "Only one viable route was available."

    winner_min  = winner.get("estimated_duration_min", 0)
    winner_news = winner.get("impacting_news", [])

    lines = [
        f"Route #{winner['route_rank']} selected as the fastest "
        f"(estimated {winner_min} min, "
        f"{round(winner['distance_m'] / 1000, 1)} km)."
    ]

    # Describe why the winner is clean / fast
    wf = winner.get("factors", {}).get("avg_weather_speed_factor", 1.0)
    tf = winner.get("factors", {}).get("avg_traffic_multiplier", 1.0)
    clean_notes = []
    if tf <= 1.05:
        clean_notes.append("clear roads")
    if wf >= 0.97:
        clean_notes.append("good weather")
    if not winner_news:
        clean_notes.append("no impacting news events")
    if clean_notes:
        lines.append("Conditions on this route: " + ", ".join(clean_notes) + ".")

    if winner_news:
        titles = [ev.get("title") or ev.get("event_type") or "event" for ev in winner_news[:3]]
        lines.append(
            f"Even with news impact ({'; '.join(titles)}), "
            "this route remained the fastest option."
        )

    # Describe why each loser lost
    for alt in others:
        alt_rank = alt.get("route_rank", "?")
        alt_min  = alt.get("estimated_duration_min", 0)
        diff_min = round(alt_min - winner_min, 1) if isinstance(alt_min, (int, float)) and isinstance(winner_min, (int, float)) else "?"

        if alt.get("road_closed"):
            lines.append(f"Route #{alt_rank} was excluded: road closure detected.")
            continue

        loser_parts = []
        alt_tf = alt.get("factors", {}).get("avg_traffic_multiplier", 1.0)
        alt_wf = alt.get("factors", {}).get("avg_weather_speed_factor", 1.0)
        if alt_tf > tf + 0.1:
            loser_parts.append(f"heavier traffic (×{alt_tf:.2f} vs ×{tf:.2f})")
        if alt_wf < wf - 0.05:
            loser_parts.append(f"worse weather ({round(alt_wf*100)}% vs {round(wf*100)}% speed)")

        # News events exclusive to this loser (not in winner)
        winner_news_ids = {
            ev.get("id") or ev.get("title") for ev in winner_news
        }
        exclusive_news = [
            ev for ev in alt.get("impacting_news", [])
            if (ev.get("id") or ev.get("title")) not in winner_news_ids
        ]
        if exclusive_news:
            for ev in exclusive_news[:3]:
                title       = ev.get("title") or ev.get("event_type") or "event"
                severity    = ev.get("severity", "unknown")
                dist_km     = ev.get("_distance_km", 0)
                contrib_pct = round(ev.get("_delay_contribution", 0) * 100, 1)
                loser_parts.append(
                    f'news: "{title}" (severity={severity}, '
                    f'{dist_km} km from route, +{contrib_pct}% delay)'
                )

        reason_str = "; ".join(loser_parts) if loser_parts else "slightly longer base distance"
        lines.append(
            f"Route #{alt_rank} is +{diff_min} min slower due to: {reason_str}."
        )

    return " ".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def get_best_route(src_lat: float, src_lon: float, dest_lat: float, dest_lon: float) -> List[Dict]:
    """
    Returns routes sorted by estimated travel time (fastest first).

    Each route in the returned list now includes:
        "impacting_news"   : list of exact news/event DB rows that penalised this route
        "selection_reason" : human-readable explanation of this route's score
        "route_rank"       : 1 = best

    The first element (rank-1) also includes a top-level key:
        "winner_reason"    : why this route beat the alternatives, naming the
                             exact news events that made other routes worse.

    Execution timeline
    ──────────────────
    t=0   get_routes()              1 network call  ~300 ms
    t=1   get_shipway_results()     1 DB call       ~50 ms
    t=2   sample + dedup            pure CPU        <1 ms
    t=3   pre-filter news to bbox   pure CPU        <1 ms
    t=4   parallel fetch            all traffic + weather in ONE batch
                                    wall time ≈ slowest single call ~200 ms
    t=5   score routes              pure CPU        <1 ms
    ──────────────────────────────────────────────────────────────────────────
    Total ≈ 650 ms  vs  v1 sequential ≈ 10–30 seconds
    """
    # ── Fire routes + news DB call in parallel ────────────────────────────────
    routes_fut = _POOL.submit(get_routes, src_lat, src_lon, dest_lat, dest_lon, True)
    news_fut   = _POOL.submit(get_shipway_results, 1000)

    try:
        routes = routes_fut.result(timeout=30).get("routes", [])
    except Exception:
        routes = []
    try:
        all_news = news_fut.result(timeout=10)
    except Exception:
        all_news = []
    # ─────────────────────────────────────────────────────────────────────────

    if not routes:
        return []

    route_points, unique_points = _build_all_sample_points(routes)

    # Pre-filter news: only events inside the union bounding box of all routes
    all_coords = [
        c for r in routes
        if "geometry" in r and "coordinates" in r["geometry"]
        for c in r["geometry"]["coordinates"]
    ]

    if all_coords:
        min_lat, min_lon, max_lat, max_lon = _route_bbox(all_coords, pad_km=20.0)
        relevant_news = [
            ev for ev in all_news
            if (SEVERITY_MAP.get(str(ev.get("severity", "low")).lower(), 0) > NEWS_MIN_SEVERITY
                and min_lat <= ev["center_lat"] <= max_lat
                and min_lon <= ev["center_lon"] <= max_lon)
        ]
    else:
        relevant_news = []

    weather_cache: Dict = {}
    traffic_results, weather_cache = _fetch_all_parallel(unique_points, weather_cache)

    dedup_index = _build_dedup_index(traffic_results)
    results = [
        _score_route(route, idx, route_points[idx], traffic_results, weather_cache, relevant_news, dedup_index)
        for idx, route in enumerate(routes)
    ]

    results.sort(key=lambda x: x["estimated_duration_s"])
    for rank, r in enumerate(results, start=1):
        r["route_rank"]        = rank
        r["selection_reason"]  = _build_selection_reason(r)

    # Build the winner explanation (needs rank already set)
    if results:
        winner = results[0]
        others = results[1:]
        winner["winner_reason"] = _build_winner_reason(winner, others)

    return results


def get_best_route_nodes(
    src_lat: float, src_lon: float, dest_lat: float, dest_lon: float
) -> List[Dict]:
    """
    Convenience wrapper that returns only the coordinate nodes of the
    single best (fastest) route as a list of {"lat": …, "lon": …} dicts.

    Returns an empty list when no routes are found.

    Example output:
        [
            {"lat": 12.9716, "lon": 77.5946},
            {"lat": 13.1012, "lon": 77.6021},
            …
        ]
    """
    routes = get_best_route(src_lat, src_lon, dest_lat, dest_lon)
    if not routes:
        return []

    best   = routes[0]                          # rank-1 = fastest
    coords = best.get("geometry", {}).get("coordinates", [])
    # OSRM geometry uses [lon, lat] ordering → flip to {lat, lon}
    return [{"lat": c[1], "lon": c[0]} for c in coords]


if __name__ == "__main__":
    import json
    result = get_best_route(12.9716, 77.5946, 12.9141, 74.8560)
    if result:
        r = result[0]
        print("Winner reason:", r.get("winner_reason"))
        print("Impacting news:", json.dumps(r.get("impacting_news"), indent=2, default=str))
    else:
        print("No routes found.")
