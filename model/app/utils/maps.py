import requests
import math
from concurrent.futures import ThreadPoolExecutor, as_completed

def haversine(lon1, lat1, lon2, lat2):
    R = 6371.0 # Earth radius in km
    dlon = math.radians(lon2 - lon1)
    dlat = math.radians(lat2 - lat1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def resample_geometry(coords, nodes_per_km=20):
    if len(coords) < 2:
        return coords
        
    total_dist = 0
    cum_dists = [0]
    for i in range(1, len(coords)):
        d = haversine(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1])
        total_dist += d
        cum_dists.append(total_dist)
        
    num_nodes = max(2, int(total_dist * nodes_per_km))
    if num_nodes >= len(coords):
        return coords
        
    step = total_dist / (num_nodes - 1)
    new_coords = [coords[0]]
    current_dist = step
    
    idx = 1
    for _ in range(num_nodes - 2):
        while idx < len(cum_dists) and cum_dists[idx] < current_dist:
            idx += 1
            
        if idx >= len(coords):
            break
            
        d1 = cum_dists[idx-1]
        d2 = cum_dists[idx]
        segment_len = d2 - d1
        
        if segment_len == 0:
            new_coords.append(coords[idx])
        else:
            fraction = (current_dist - d1) / segment_len
            lon = coords[idx-1][0] + (coords[idx][0] - coords[idx-1][0]) * fraction
            lat = coords[idx-1][1] + (coords[idx][1] - coords[idx-1][1]) * fraction
            new_coords.append([lon, lat])
            
        current_dist += step
        
    new_coords.append(coords[-1])
    return new_coords

def get_routes(src_lat, src_lon, dest_lat, dest_lon, alternatives=True):
    """
    Fetch routes from OSRM public API, returning at least 3 routes by splitting paths if needed.
    """
    
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    
    def fetch_routes(slat, slon, dlat, dlon):
        coords = f"{slon},{slat};{dlon},{dlat}"
        params = {
            "alternatives": str(alternatives).lower(),
            "overview": "full",
            "geometries": "geojson"
        }
        url = base_url + coords
        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e)}

    data = fetch_routes(src_lat, src_lon, dest_lat, dest_lon)
    if "error" in data:
        return data

    routes = data.get("routes", [])
    
    if len(routes) >= 3 or not routes:
        for r in routes:
            r["geometry"]["coordinates"] = resample_geometry(r["geometry"]["coordinates"], nodes_per_km=1)
        data["routes"] = routes[:3]
        return data

    best_route = routes[0]
    coords = best_route["geometry"]["coordinates"]
    
    # Build candidate waypoints to try in parallel
    candidate_fracs = [1/2, 1/3, 2/3]  # Cap at 3 — enough variation; limits extra HTTP calls
    waypoints = []
    for frac in candidate_fracs:
        idx = int(len(coords) * frac)
        if 0 < idx < len(coords) - 1:
            mid_lon, mid_lat = coords[idx]
            waypoints.append((mid_lat, mid_lon))

    def fetch_split(mid_lat, mid_lon):
        p1 = fetch_routes(src_lat, src_lon, mid_lat, mid_lon)
        p2 = fetch_routes(mid_lat, mid_lon, dest_lat, dest_lon)
        return p1, p2

    with ThreadPoolExecutor(max_workers=len(waypoints) or 1) as wp_pool:
        split_futures = {wp_pool.submit(fetch_split, wlat, wlon): (wlat, wlon)
                         for wlat, wlon in waypoints}

        for fut in as_completed(split_futures):
            if len(routes) >= 3:
                break
            try:
                part1, part2 = fut.result()
            except Exception:
                continue
            if "error" in part1 or "error" in part2:
                continue
            routes1 = part1.get("routes", [])
            routes2 = part2.get("routes", [])
            for r1 in routes1:
                if len(routes) >= 3:
                    break
                for r2 in routes2:
                    if len(routes) >= 3:
                        break
                    routes.append({
                        "geometry": {
                            "coordinates": r1["geometry"]["coordinates"] + r2["geometry"]["coordinates"][1:],
                            "type": "LineString"
                        },
                        "legs":        r1.get("legs", []) + r2.get("legs", []),
                        "distance":    r1.get("distance", 0) + r2.get("distance", 0),
                        "duration":    r1.get("duration", 0) + r2.get("duration", 0),
                        "weight":      r1.get("weight", 0)   + r2.get("weight", 0),
                        "weight_name": r1.get("weight_name", "routability")
                    })

    for r in routes:
        r["geometry"]["coordinates"] = resample_geometry(r["geometry"]["coordinates"], nodes_per_km=1)
    data["routes"] = routes[:3]
    return data
