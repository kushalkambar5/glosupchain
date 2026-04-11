# app/utils/driver_assignment.py
#
# Driver Assignment Engine — Smart + Transparent
# ─────────────────────────────────────────────────────────────────────────────
# Given a list of free drivers and a delivery job, assigns the minimum number
# of drivers needed (nearest first by Euclidean distance) and returns each
# driver's full route: their location → source → destination.
#
# Each driver route now includes:
#   • "selection_reason"  – why that specific path was chosen
#   • "impacting_news"    – exact news/event DB rows that penalised the route
#   • "winner_reason"     – (leg_2 only) why rank-1 route beat the alternatives
# ─────────────────────────────────────────────────────────────────────────────

import math
import json as _json
from typing import List, Dict, Tuple, Optional, Any
from app.core.config import get_db_connection
from app.utils.smart_routing import get_best_route


# ══════════════════════════════════════════════════════════════════════════════
#  JSON SANITY HELPER  — PostgreSQL jsonb rejects Infinity / NaN
# ══════════════════════════════════════════════════════════════════════════════

def _sanitize_for_json(obj: Any) -> Any:
    """Recursively replace float('inf'), float('-inf'), float('nan') with None."""
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(i) for i in obj]
    return obj


# ══════════════════════════════════════════════════════════════════════════════
#  DB ON-WORK FLAG & DB HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _fetch_route(route_id: str) -> Optional[Dict]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, src_lat, src_lon, dest_lat, dest_lon,
                       goods_amount, manager_id
                FROM   routes
                WHERE  id = %s
                """,
                (str(route_id),),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f"Error fetching route {route_id}: {e}")
        return None
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _fetch_free_drivers() -> List[Dict]:
    conn = None
    free_drivers = []
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # First, fetch all drivers and users
            cur.execute(
                """
                SELECT  d.user_id   AS driver_id,
                        d.id        AS profile_id,
                        d.lat,
                        d.lon,
                        d.capacity,
                        u.work_done
                FROM    drivers d
                JOIN    users   u  ON u.id = d.user_id
                WHERE   (u.role       = 'driver' OR u.role IS NULL)
                ORDER BY d.created_at
                """
            )
            rows = cur.fetchall()
            
            for d in rows:
                driver_dict = dict(d)
                try:
                    cur.execute('SELECT "onWork" FROM drivers WHERE id = %s', (str(driver_dict["profile_id"]),))
                    on_work_row = cur.fetchone()
                    if on_work_row:
                        # RealDictCursor might return 'onWork' or 'onwork' depending on case sensitivity
                        on_work = on_work_row.get("onWork") or on_work_row.get("onwork", False)
                        if not on_work and (driver_dict.get("work_done") is None or not driver_dict.get("work_done")):
                            free_drivers.append(driver_dict)
                    elif not driver_dict.get("work_done"):
                        free_drivers.append(driver_dict)
                except Exception as e:
                    conn.rollback()
                    print(f"Warning: onWork check failed for {driver_dict['driver_id']}: {e}")
                    if not driver_dict.get("work_done"):
                        free_drivers.append(driver_dict)
            return free_drivers
    except Exception as e:
        print(f"Error fetching free drivers: {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def _insert_assignment(
    manager_id:        str,
    driver_id:         str,
    profile_id:        str,
    route_id:          str,
    route_type:        str,
    assigned_quantity: float,
    best_route:        dict,
) -> str:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE users
                SET work_done = true
                WHERE id = %s
                """,
                (str(driver_id),)
            )
            
            try:
                cur.execute('UPDATE drivers SET "onWork" = true WHERE id = %s', (str(profile_id),))
            except Exception as e:
                conn.rollback()
                print(f"Warning: could not update onWork for {profile_id}: {e}")

            cur.execute(
                """
                INSERT INTO assignments
                    (manager_id, driver_id, route_id,
                     route_type, assigned_quantity,
                     work_done, best_route, assigned_at)
                VALUES
                    (%s, %s, %s, %s, %s,
                     false, %s::jsonb, now())
                RETURNING id
                """,
                (
                    str(manager_id),
                    str(driver_id),
                    str(route_id),
                    route_type,
                    float(assigned_quantity),
                    _json.dumps(_sanitize_for_json(best_route), default=str),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return str(row["id"])
    except Exception as e:
        print(f"Error inserting assignment for driver {driver_id}: {e}")
        raise
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════════════════════
#  TUNEABLE PARAMETERS
# ══════════════════════════════════════════════════════════════════════════════

MAX_DRIVERS_ALLOWED = 10    # Safety cap — never assign more than this many drivers


# ══════════════════════════════════════════════════════════════════════════════
#  DISTANCE HELPER  (plain Euclidean on lat/lon — fast ranking)
# ══════════════════════════════════════════════════════════════════════════════

def _euclidean(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2)


# ══════════════════════════════════════════════════════════════════════════════
#  CORE LOGIC
# ══════════════════════════════════════════════════════════════════════════════

def _sort_drivers_by_proximity(
    drivers: List[Dict],
    src_lat: float,
    src_lon: float,
) -> List[Dict]:
    """
    Returns drivers sorted by Euclidean distance to the source (nearest first).
    Attaches 'distance_to_source' to each driver dict for transparency.
    """
    for d in drivers:
        d["distance_to_source"] = _euclidean(d["lat"], d["lon"], src_lat, src_lon)
    return sorted(drivers, key=lambda d: d["distance_to_source"])


def _select_minimum_drivers(
    sorted_drivers: List[Dict],
    goods_amount:   float,
) -> List[Dict]:
    """
    Greedily picks the nearest drivers until cumulative capacity >= goods_amount.
    """
    assigned       = []
    total_capacity = 0.0

    for driver in sorted_drivers:
        if total_capacity >= goods_amount:
            break
        assigned.append(driver)
        total_capacity += driver["capacity"]
        if len(assigned) >= MAX_DRIVERS_ALLOWED:
            break

    return assigned


# ══════════════════════════════════════════════════════════════════════════════
#  ROUTE BUILDER  — uses get_best_route for full scoring context
# ══════════════════════════════════════════════════════════════════════════════

def _extract_route_info(scored_routes: List[Dict]) -> List[Dict]:
    """
    From a list of scored routes (get_best_route output), extract for ALL routes:
      - route_rank      : rank of the route (1 is best)
      - nodes           : [{lat, lon}, …]  (geometry of the route)
      - selection_reason: natural language explanation of the score
      - winner_reason   : (for rank 1) why this route beat others
      - impacting_news  : list of events that affected this route
      - factors         : readable breakdown of traffic, weather, news
      - duration_min    : estimated time in minutes
      - distance_m      : total distance in meters
    """
    if not scored_routes:
        return [{
            "route_rank":       None,
            "nodes":            [],
            "selection_reason": "No route could be computed.",
            "winner_reason":    "",
            "impacting_news":    [],
            "factors":          {},
            "duration_min":     None,
            "distance_m":       None,
        }]

    extracted_routes = []

    for route in scored_routes:
        coords = route.get("geometry", {}).get("coordinates", [])
        nodes  = [{"lat": c[1], "lon": c[0]} for c in coords]   # OSRM: [lon, lat]

        factors_data = route.get("factors", {})
        news_items   = route.get("impacting_news", [])

        # Build readable traffic summary
        tf = factors_data.get("avg_traffic_multiplier", 1.0)
        if tf > 2.0:
            traffic_str = f"heavy congestion (traffic delay ×{tf:.2f})"
        elif tf > 1.3:
            traffic_str = f"moderate congestion (traffic delay ×{tf:.2f})"
        elif tf > 1.05:
            traffic_str = f"slight congestion (traffic delay ×{tf:.2f})"
        else:
            traffic_str = "clear roads"

        # Build readable weather summary
        wf = factors_data.get("avg_weather_speed_factor", 1.0)
        if wf < 0.6:
            weather_str = f"severe weather slowing traffic to {round(wf*100)}% of normal speed"
        elif wf < 0.85:
            weather_str = f"adverse weather (speed reduced to {round(wf*100)}%)"
        elif wf < 0.97:
            weather_str = f"minor weather impact (speed at {round(wf*100)}%)"
        else:
            weather_str = "good weather"

        # List impacting news headlines
        news_list = []
        if news_items:
            for ev in news_items:
                title = ev.get("title") or ev.get("event_type") or "Unknown event"
                lat   = ev.get("center_lat", "unknown")
                lon   = ev.get("center_lon", "unknown")
                news_list.append(f"\"{title}\" at lat: {lat}, lon: {lon}")
        else:
            news_list = ["no impacting news events"]

        human_factors = {
            "traffic": traffic_str,
            "weather": weather_str,
            "news":    news_list
        }

        extracted_routes.append({
            "route_rank":       route.get("route_rank"),
            "nodes":            nodes,
            "selection_reason": route.get("selection_reason", ""),
            "reason":           route.get("selection_reason", ""),  # Alias for backward compatibility
            "winner_reason":    route.get("winner_reason", ""),
            "impacting_news":    route.get("impacting_news", []),
            "factors":          human_factors,
            "duration_min":     route.get("estimated_duration_min"),
            "distance_m":       route.get("distance_m"),
        })

    return extracted_routes




def assign_drivers(route_id: str) -> Dict:
    """
    Main function. Given a route id, hits the DB, fetches free drivers,
    assigns the minimal needed, creates DB assignments, and returns a summary.
    """

    # ── 1. Fetch route ────────────────────────────────────────────────────────
    try:
        route = _fetch_route(route_id)
    except Exception as e:
        return {
            "success": False,
            "message": f"Database connection error: {e}",
        }
    if not route:
        return {
            "success": False,
            "message": f"Route '{route_id}' not found in the database (or DB unreachable).",
        }

    src_lat      = float(route["src_lat"])
    src_lon      = float(route["src_lon"])
    dest_lat     = float(route["dest_lat"])
    dest_lon     = float(route["dest_lon"])
    goods_amount = float(route["goods_amount"])
    manager_id   = str(route["manager_id"])

    # ── 2. Fetch free drivers ─────────────────────────────────────────────────
    free_drivers = _fetch_free_drivers()
    if not free_drivers:
        return {
            "success":  False,
            "message":  "No free drivers currently available.",
            "route_id": str(route_id),
        }

    total_fleet_cap = sum(d["capacity"] for d in free_drivers)
    if total_fleet_cap < goods_amount:
        return {
            "success":             False,
            "message": (
                f"Insufficient fleet capacity. Need {goods_amount} units, "
                f"free drivers total only {total_fleet_cap} units."
            ),
            "route_id":             str(route_id),
            "goods_amount":         goods_amount,
            "total_fleet_capacity": total_fleet_cap,
        }

    # ── 3. Select minimum drivers ─────────────────────────────────────────────
    sorted_drivers = _sort_drivers_by_proximity(free_drivers, src_lat, src_lon)
    assigned       = _select_minimum_drivers(sorted_drivers, goods_amount)

    total_capacity = sum(d["capacity"] for d in assigned)

    # ── 4. Build routes + 5. Write assignments ────────────────────────────────
    remaining_goods = int(round(goods_amount))
    assigned_count  = len(assigned)

    for i, driver in enumerate(assigned):
        if i == assigned_count - 1:
            goods_share = remaining_goods
        else:
            goods_share = int(round((driver["capacity"] / total_capacity) * goods_amount))
            remaining_goods -= goods_share
            
        driver_id   = str(driver["driver_id"])

        # Leg 1: driver current location → source
        leg1_scored = get_best_route(driver["lat"], driver["lon"], src_lat, src_lon)
        leg1        = _extract_route_info(leg1_scored)

        # Leg 2: source → destination
        leg2_scored = get_best_route(src_lat, src_lon, dest_lat, dest_lon)
        leg2        = _extract_route_info(leg2_scored)

        route_payload = {
            "leg_1_driver_to_source": leg1,
            "leg_2_source_to_dest":   leg2,
        }

        # Insert assignment into DB + flag user and driver statuses
        _insert_assignment(
            manager_id        = manager_id,
            driver_id         = driver_id,
            profile_id        = str(driver["profile_id"]),
            route_id          = str(route_id),
            route_type        = "roads",
            assigned_quantity = goods_share,
            best_route        = route_payload,
        )

    return {
        "success":          True,
        "message":          f"{len(assigned)} driver(s) assigned and saved to DB.",
        "route_id":         str(route_id),
        "goods_amount":     goods_amount,
        "total_drivers":    len(assigned),
        "total_capacity":   total_capacity,
    }