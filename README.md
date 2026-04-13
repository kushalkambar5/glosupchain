# Global Supply Chain (Glosupchain) 🌐🚢🚛

A comprehensive, AI-powered logistics and supply chain management system that optimizes maritime and land-based cargo movement using real-time news, weather, and traffic data.

## 🚀 Overview

Glosupchain leverages the **Google Gemini API** (via LangGraph) to proactively identify supply chain risks and automate operational decisions. Whether it's rerouting a vessel to avoid a storm or automatically assigning the best driver for a land-based task, the platform ensures resilience in an unpredictable global environment.

---

## ✨ Key Features

### ⛴️ Maritime Intelligence: Ship Rerouting
- **Live AIS Tracking**: Monitors vessel positions and destinations using real-time telemetry from `aisstream.io`.
- **Dynamic Hazard Detection**: Intersects ship paths with real-time news and weather alerts.
- **AI-Powered Rerouting**: Generates safe, precise maritime waypoints using **Gemini 2.5 Flash Lite** to bypass hazardous zones (storms, port strikes, etc.).

### 🚛 Land Logistics: Smart Driver Assignment
- **Autonomous Fleet Allocation**: Finds the nearest available drivers based on proximity and truck capacity.
- **AI-Scored Routing**: Calculates optimal paths by analyzing live traffic, localized weather, and news events.
- **Intelligent Load Balancing**: Proportionally distributes goods across a fleet while respecting maximum truck capacities.

### 📰 Supply Chain Risk Monitoring
- **LLM-Driven News Analysis**: Filters global news for events like strikes, disasters, or geopolitical instability that could impact supply chains.
- **Hazard Visualization**: Estimates the center coordinates and radius of impact for threats, displaying them on a global dashboard.

### 💬 Integrated AI Chatbot Assistant
- **Real-time Tools**: Fetches instantaneous weather and news updates for any location.
- **Long-term Memory**: Remembers user preferences and past logistics concerns across sessions.

---

## 📁 Project Structure

```text
glosupchain/
├── agent/             # Python FastAPI backend (LangGraph, Gemini Agent)
├── fullstack/         # Next.js 15 Frontend and Drizzle ORM
├── model/             # Python ML Service for smart driver assignment
└── ... (Shared configurations and migrations)
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, Drizzle ORM, Tailwind CSS (Modern Glassmorphism UI).
- **Agent Backend**: Python (FastAPI), LangGraph, LangChain, **Google Gemini 1.5/2.5 Flash**.
- **ML Service Backend**: Python, FastAPI, OSRM (Maps), TomTom (Traffic).
- **Database**: PostgreSQL (psycopg2 & Drizzle).
- **Data Integrations**: OpenWeather, NewsAPI, TomTom, AIS Stream.

---

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL Database

### 2. Setup Agent Backend
```bash
cd agent
# Create virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure .env (see agent/.env.example)
# DATABASE_URL, GOOGLE_API_KEY

# Run the agent
python main.py
```

### 3. Setup ML Service
```bash
cd model
# Install dependencies
pip install -r requirements.txt

# Configure .env (see model/.env.example)
# TOMTOM_API_KEY, WEATHER_API_KEY

# Run the ML service
python app/run_app.py
```

### 4. Setup Frontend
```bash
cd fullstack/supply-chain
# Install dependencies
npm install

# Configure .env
# NEXTAUTH_SECRET, ML_SERVICE_URL, NEXT_PUBLIC_AGENT_SERVICE_URL

# Run the development server
npm run dev
```

---

## 📡 API Reference

- **Agent API**: `http://localhost:8000` (FastAPI)
- **ML Service**: `http://localhost:8080/api/v1/assign` (Autonomous assignment)
- **Frontend**: `http://localhost:3000`

---

## 👨‍💻 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

---

## 📄 License

This project is licensed under the MIT License.
