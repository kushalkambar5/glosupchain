# Smart Route AI Engine 🚀

A highly optimized, database-driven autonomous logistics orchestrator built with **FastAPI**. This system handles the entire lifecycle of a delivery job—from identifying required resources to AI-powered routing and automated fleet assignment.

## 🌟 Key Features

- **Autonomous Fleet Assignment**: Triggered by a single `route_id`, the system reads requirements, finds available drivers, and assigns them in real-time.
- **Nearest-Driver Priority**: Uses **Euclidean distance ranking** to ensure the closest available trucks (`onWork = false`) are dispatched first.
- **AI-Powered Route Scoring**:
  - **OSRM Maps**: Generates precise pathing with geometric downsampling.
  - **TomTom Traffic**: Real-time congestion analysis and automatic closure blacklisting.
  - **WeatherAPI Hazard Detection**: Dynamic speed penalties for extreme weather (rain, fog, wind).
  - **2-Hour Temporal News**: Strictly filters global/local news events from the **last 2 hours** to ensure decisions are based on the latest hazards (protests, accidents, or disasters).
- **Intelligent Load Balancing**: Distributed goods proportionally across assigned drivers, rounded to the nearest **integer**, and capped strictly at each truck's maximum capacity.
- **Explainable Decision Path**: Every assignment includes a `selection_reason` and `winner_reason` explaining *why* a specific route was chosen over alternatives.

---

## 🛠️ Tech Stack & Setup

- **Backend**: Python 3.10+, FastAPI
- **Database**: PostgreSQL (psycopg2 with RealDictCursor)
- **Schema Alignment**: Fully synchronized with **Drizzle-ORM** conventions (`onWork`, `work_done`).

### 1. Installation
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Set the following variables in your environment or `.env` file:
```bash
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db_name>"
TOMTOM_API_KEY="your_api_key"
WEATHER_API_KEY="your_api_key"
```

### 3. Run the Service
```bash
uvicorn app.main:app --reload --port 8000
```

---

## 📡 API Reference

### `POST /api/v1/assign`
The master orchestration endpoint. It bypasses the need for client-side logic—simply provide the Route ID.

**Request:**
```json
{
  "route_id": "b70e713e-3ed9-4356-abe4-f4eb0c5230db"
}
```

**What the system does internally:**
1.  **Fetches** source, destination, and goods units from the `routes` table.
2.  **Filters** drivers currently not assigned (`onWork = false`).
3.  **Assigns** the nearest trucks required to cover the load.
4.  **Computes** optimal routes using live Traffic, Weather, and News.
5.  **Persists** the `best_route` JSON directly into the `assignments` table.
6.  **Locks** the fleet by setting `onWork = true` and `work_done = true` in the DB.

---

## 📁 System Architecture

- **`app/api/routes.py`**: API Gateway and request handling.
- **`app/utils/driver_assignment.py`**: The "Orchestrator"—handles DB interaction, proximity ranking, and load distribution.
- **`app/utils/smart_routing.py`**: The "Intelligence"—parallelized (ThreadPoolExecutor) fetching of live scoring data.
- **`app/utils/news.py`**: The "Event Monitor"—enforces the 2-hour sliding window on news hazards.
- **`app/core/config.py`**: Central connection pooling for the Postgres supply chain DB.
