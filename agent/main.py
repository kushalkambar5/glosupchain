from fastapi import FastAPI
from contextlib import asynccontextmanager
from db.init_db import init_db

from api.chatbot_routes import router as chatbot_router
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the DB
    init_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="Supply Chain API",
    description="Agentic endpoints for the Global Supply Chain",
    lifespan=lifespan
)

# Important: allowing CORS so the frontend can stream the data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chatbot_router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Supply Chain Agent API is running!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)